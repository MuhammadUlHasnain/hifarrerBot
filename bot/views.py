from datetime import datetime
from decimal import Decimal

import pytz
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout, get_user_model
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, csrf_exempt
from django.shortcuts import redirect
import logging
from .models import TradingUser, TradingBot
from .serializers import TradingBotSerializer, TradingUserSerializer
import json
import ccxt
import uuid

User = get_user_model()
# Class-based Views

logger = logging.getLogger(__name__)
# Set the logging level
logger.setLevel(logging.INFO)
# Create a file handler
file_handler = logging.FileHandler("views.log")
file_handler.setLevel(logging.INFO)
# Create a formatter and set the format
formatter = logging.Formatter(f"{datetime.now(pytz.timezone('Asia/Karachi'))} - %(levelname)s - %(message)s")
file_handler.setFormatter(formatter)
# Add the file handler to the logger
logger.addHandler(file_handler)

def home(request):
    """Home page view"""
    context = {
        'page_title': 'Home',
    }
    return render(request, 'base.html', context)


@method_decorator(csrf_exempt, name='dispatch')
class WebhookSignalView(View):
    """
    Webhook endpoint for receiving trading signals and executing trades
    """

    def post(self, request):
        try:
            raw_data = request.body.decode('utf-8').strip('"')
            data = json.loads(raw_data)
            # Get the trading bot by webhook URL
            bot = get_object_or_404(TradingBot, bot_id=data['bot_id'])
            user = bot.user

            # # Parse the incoming webhook data
            # try:
            #     data = json.loads(request.body)
            #     logger.info(f"Received signal: {data}")
            # except json.JSONDecodeError:
            #     return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)

            # Validate the webhook data
            # required_fields = ["bot_id", "side", "timestamp"]
            # for field in required_fields:
            #     if field not in data:
            #         return JsonResponse(
            #             {"status": "error", "message": f"Missing required field: {field}"},
            #             status=400
            #         )

            # Verify the bot ID matches
            # if data["bot_id"] != bot.generate_pair_key():
            #     return JsonResponse(
            #         {"status": "error", "message": "Invalid bot ID"},
            #         status=403
            #     )

            # Check if bot is active
            if not bot.is_active:
                logger.info("status: Bot is not active")
                return JsonResponse(
                    {"status": "error", "message": "Bot is not active"},
                    status=403
                )

            # Check user account status
            if user.account_status != 'active':
                logger.info(f'status: User account is {user.account_status}')
                return JsonResponse(
                    {"status": "error", "message": f"User account is {user.account_status}"},
                    status=403
                )

            # Extract trading parameters
            side = data["side"].lower()
            if side not in ["buy", "sell"]:
                logger.info(f'Error: {user.username} - {bot.trading_pair} Invalid side, must be buy or sell')
                return JsonResponse(
                    {"status": "error", "message": "Invalid side, must be 'buy' or 'sell'"},
                    status=400
                )

            # Get trading pair
            trading_pair = data.get("Pair", bot.trading_pair)
            if not trading_pair:
                logger.info(f'Error: {user.username} - {bot.trading_pair} -> No trading pair specified')
                return JsonResponse(
                    {"status": "error", "message": "No trading pair specified"},
                    status=400
                )

            # Determine position size
            position_size = None
            if bot.use_tradingView_position_size:
                position_size = data.get("position_size")
                if not position_size:
                    logger.info(f'Error: {user.username} - {bot.trading_pair} TradingView position size enabled but not provided')
                    return JsonResponse(
                        {"status": "error", "message": "TradingView position size enabled but not provided"},
                        status=400
                    )
                try:
                    position_size = Decimal(position_size)
                except:
                    logger.info(f'Error: {user.username} - {bot.trading_pair} Invalid position size format')
                    return JsonResponse(
                        {"status": "error", "message": "Invalid position size format"},
                        status=400
                    )
            else:
                position_size = bot.position_size
            # Execute the trade
            try:
                trade_result = self.execute_trade(
                    user=user,
                    exchange=user.preferred_exchange,
                    side=side,
                    trading_pair=trading_pair,
                    position_size=position_size
                )

                # Update bot statistics
                bot.last_trade_time = timezone.now()
                bot.total_trades += 1
                bot.save()

                return JsonResponse({
                    "status": "success",
                    "message": f"Trade executed: {side} {position_size} of {trading_pair}",
                    "trade_details": trade_result
                })

            except Exception as e:
                logger.error(f"Trade execution error: {str(e)}")
                return JsonResponse(
                    {"status": "error", "message": f"Trade execution failed: {str(e)}"},
                    status=500
                )

        except Exception as e:
            logger.error(f"Webhook processing error: {str(e)}")
            return JsonResponse(
                {"status": "error", "message": f"Server error: {str(e)}"},
                status=500
            )

    def execute_trade(self, user, exchange, side, trading_pair, position_size):
        """
        Execute trade on the specified exchange using CCXT
        """
        # Initialize the exchange
        if exchange == 'coinbase':
            if not user.coinbase_api_key or not user.coinbase_api_secret:
                raise ValueError("Coinbase API credentials not configured")

            exchange_instance = ccxt.coinbase({
                'apiKey': user.coinbase_api_key,
                'secret': user.coinbase_api_secret,
                'password': "",
            })
        elif exchange == 'binanceus':
            # You would add binance credentials here
            raise NotImplementedError("Binance US integration not implemented yet")
        else:
            raise ValueError(f"{exchange} Coming Soon")

        # Format the trading pair as required by the exchange
        # CCXT typically uses format like 'BTC/USD'
        if '/' not in trading_pair:
            # Handle potential format issues
            if '-' in trading_pair:
                trading_pair = trading_pair.replace('-', '/')

        # Load markets to ensure the trading pair is valid
        exchange_instance.load_markets()
        if trading_pair not in exchange_instance.markets:
            raise ValueError(f"Trading pair {trading_pair} not available on {exchange}")

        # Check account balance
        balance = exchange_instance.fetch_balance()

        # Execute the trade
        if side == 'buy':
            order = exchange_instance.create_market_buy_order(
                symbol=trading_pair,
                amount=position_size
            )
        else:  # sell
            order = exchange_instance.create_market_sell_order(
                symbol=trading_pair,
                amount=position_size
            )

        return {
            'order_id': order['id'],
            'status': order['status'],
            'timestamp': order['timestamp'],
            'amount': order['amount'],
            'price': order.get('price'),
            'cost': order.get('cost')
        }
def dashboard(request):
    if not request.user.is_authenticated:
        return redirect('bot:login')

    # Get all bots for the current user
    bots = TradingBot.objects.filter(user=request.user)
    print(bots.last().name, bots.last().position_size, bots.last().use_tradingView_position_size, bots.last().user.preferred_exchange)
    if not bots.exists():
        # Create a new bot if none exists
        bot = TradingBot(user=request.user)
        message = bot.create_message()
        url = bot.generate_webhook_url()
        bot.webhook_message = message
        bot.webhook_url = url
        bot.save()

        # Redirect to create bot page
        return redirect('bot:create_bot')

    for bot in bots:
        if not bot.name or not bot.trading_pair:
            return redirect('bot:bot_setup')

    context = {
        'bots': bots,
        'exchange': bots.last().user.preferred_exchange,
        'page_title': 'Dashboard'
    }

    return render(request, 'dashboard.html', context)

def bot_setup(request):
    if not request.user.is_authenticated:
        return redirect('bot:login')
    try:
        bot = TradingBot.objects.get(user=request.user)
        context = {
            'webhook_message': bot.webhook_message,
            'webhook_url': bot.webhook_url,
            'bot_name': bot.name if bot.name else '',
            'trading_pair': bot.trading_pair if bot.trading_pair else '',
            'position_size': bot.position_size if bot.position_size else '',
            'is_active': bot.is_active if hasattr(bot, 'is_active') else True,
            'use_tradingview': bot.use_tradingView_position_size if hasattr(bot, 'use_tradingView_position_size') else True }
    except TradingBot.DoesNotExist:
        messages.error(request, 'No bot found. Please create one first.')
        return redirect('bot:create_bot')
    except TradingBot.MultipleObjectsReturned:
        # If multiple bots exist, get the first one
        bot = TradingBot.objects.filter(user=request.user).first()
        context = {
            'message': bot.webhook_message,
            'url': bot.webhook_url,
            'bot_name': bot.name if bot.name else '',
            'trading_pair': bot.trading_pair if bot.trading_pair else '',
            'position_size': bot.position_size if bot.position_size else '',
            'is_active': bot.is_active if hasattr(bot, 'is_active') else True,
            'use_tradingview': bot.use_tradingView_position_size if hasattr(bot, 'use_tradingView_position_size') else True
        }



    if request.method == 'POST':
        bot_name = request.POST.get('bot_name')
        trading_pair = request.POST.get('trading_pair')
        use_tradingview = request.POST.get('position_option') == 'true'
        position_size = request.POST.get('position_size') if not use_tradingview else None
        print('data', bot_name, trading_pair, use_tradingview, position_size)

        errors = False
        error_messages = []

        if not bot_name:
            error_messages.append('Please name the bot.')
            errors = True
        if not trading_pair:
            error_messages.append('Please enter a trading pair.')
            errors = True
        if not use_tradingview and not position_size:
            error_messages.append('Please enter the position size.')
            errors = True

        if errors:
            for message in error_messages:
                messages.error(request, message)
            return render(request, 'bot_setup.html', context)
        else:
            bot.name = bot_name
            bot.trading_pair = trading_pair
            bot.use_tradingView_position_size = use_tradingview
            bot.position_size = position_size
            bot.is_active = True
            bot.save()

            messages.success(request, 'Bot setup completed successfully!')
            return redirect('bot:dashboard')

    return render(request, 'bot_setup.html', context)



def create_bot(request):
    if not request.user.is_authenticated:
        print('user not logged in')
        return redirect('bot:login')

    # Check if the user already has a bot
    try:
        bot = TradingBot.objects.get(user=request.user)
    except TradingBot.DoesNotExist:
        # Create a new bot if one doesn't exist
        bot = TradingBot(user=request.user)
        message = bot.create_message()
        url = bot.generate_webhook_url()
        bot.webhook_message = message
        bot.webhook_url = url
        bot.save()

    if request.method == 'POST':
        exchange = request.POST.get('exchange', '').strip()
        api_key = request.POST.get('api_key', '').strip()
        private_key = request.POST.get('private_key', '').strip()

        # Store errors
        errors = False

        # Validate fields
        if not exchange:
            print('select exchange')
            messages.error(request, 'Please select an exchange.')
            errors = True
        if not api_key:
            print('api key is required')
            messages.error(request, 'API Key is required.')
            errors = True
        if not private_key:
            print('private key is required')
            messages.error(request, 'Secret Key is required.')
            errors = True

        if errors:
            print('redirecting to create_bot')
            return redirect('bot:create_bot')

        exchange_name_map = {
            'CB': 'coinbase',
            'BN': 'binance',
            # Add other exchanges as needed
        }

        exchange_name = exchange_name_map.get(exchange, exchange.lower())
        validation_result = validate_credentials(exchange_name, api_key, private_key)
        print('exchange name', exchange_name)
        print('validation result', validation_result)
        if validation_result.get('success'):
            # Save exchange to bot
            bot.exchange = exchange
            bot.save()

            # Save API credentials to the user
            user = request.user
            if exchange == 'CB':  # Coinbase
                user.coinbase_api_key = api_key
                user.coinbase_api_secret = private_key
            elif exchange == 'BN':  # Binance
                user.binance_api_key = api_key
                user.binance_api_secret = private_key

            user.preferred_exchange = exchange
            user.save()
            messages.success(request, 'Bot validated successfully!')
            print('bot validated, now returning to bot setup')
            return redirect('bot:bot_setup')

        else:

            # Get the error message from the validation result
            error_msg = validation_result.get('error', 'Invalid API credentials. Please try again.')
            messages.error(request, error_msg)
            print('validation error, redirecting to create bot')
            return redirect('bot:create_bot')

    return render(request, 'create_bot.html')


@csrf_exempt
def validate_api(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Login First')
        return redirect('bot:login')
        # return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            api_key = data.get("api_key")
            exchange_name = data.get("exchange", "coinbase").lower()
            secret = data.get("private_key")

            # Handle newlines for Coinbase
            if exchange_name == "coinbase" and secret:
                secret = secret.replace("\\n", "\n")

            # Validate the API credentials
            result = check_exchange_credentials(exchange_name, api_key, secret)
            return JsonResponse(result)

        except json.JSONDecodeError:
            return JsonResponse({"success": False, "error": "Invalid data format"})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

    return JsonResponse({"success": False, "error": "Invalid request method"})


def check_exchange_credentials(exchange_name, api_key, secret):
    """Helper function to validate exchange credentials"""
    if not api_key or not secret:
        return {"success": False, "error": "API key and secret are required"}

    try:
        if exchange_name == "coinbase":
            exchange = ccxt.coinbase({
                'apiKey': api_key,
                'secret': secret,
                'password': "",
            })
        elif exchange_name == "binance":
            exchange = ccxt.binance({
                'apiKey': api_key,
                'secret': secret,
            })
        else:
            return {"success": False, "error": f"Unsupported exchange: {exchange_name}"}

        # Try to fetch balance to verify credentials
        balance = exchange.fetch_balance()

        # If we get here, credentials are valid
        if balance:
            return {"success": 'API Validated'}
        else:
            return {"success": False, "error": "Invalid API credentials"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def validate_credentials(exchange_name, api_key, secret):
    """Helper function to validate exchange credentials directly (non-AJAX)"""
    # Handle newlines for Coinbase
    if exchange_name.lower() == "coinbase" and secret:
        secret = secret.replace("\\n", "\n")

    # Use the same validation function as the API endpoint
    return check_exchange_credentials(exchange_name, api_key, secret)

# @api_view(["GET", "POST"])
# def test_api(request):
#     if request.method == "POST" or request.method == "GET":
#         bot = TradingUser.objects.filter().last()
#         serializer = TradingUserSerializer(bot)
#         dat = serializer.data
#         print(dat)
#         exchange = ccxt.coinbase({
#             'apiKey': dat['coinbase_api_key'],
#             'secret': dat['coinbase_api_secret'],
#             'password': ""
#         })
#         data = exchange.fetch_balance()
#         if data is not None:
#             return JsonResponse({"success": True, "data": data})
#         else:
#             return JsonResponse({"success": False})

def signup(request):
    if request.method == 'POST':
        # Get form data
        name = request.POST.get('name', '').strip()
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        password1 = request.POST.get('password1', '')
        password2 = request.POST.get('password2', '')
        terms_accepted = request.POST.get('terms_accepted') == 'on'

        errors = {}

        # Validate required fields
        if not name:
            errors['name'] = ['This field is required.']
        if not username:
            errors['username'] = ['This field is required.']
        if not email:
            errors['email'] = ['This field is required.']
        if not password1:
            errors['password1'] = ['This field is required.']
        if not password2:
            errors['password2'] = ['This field is required.']
        if not terms_accepted:
            errors['terms_accepted'] = ['You must accept the terms and conditions.']

        # Validate email format
        if email and '@' not in email:
            errors['email'] = ['Enter a valid email address.']

        # Check if passwords match
        if password1 and password2 and password1 != password2:
            errors['password2'] = ['Passwords do not match.']

        # Validate password strength
        if password1:
            try:
                validate_password(password1)
            except ValidationError as e:
                errors['password1'] = list(e.messages)

        # Check if username is unique
        if username and not errors.get('username'):
            if TradingUser.objects.filter(username=username).exists():
                errors['username'] = ['This username is already taken.']

        # Check if email is unique
        if email and not errors.get('email'):
            if TradingUser.objects.filter(email=email).exists():
                errors['email'] = ['This email is already registered.']

        # If there are any errors, return them
        if errors:
            for field, error_list in errors.items():
                for error in error_list:
                    messages.error(request, f"{field}: {error}")
            return redirect('bot:signup')

        # If no errors, create the user
        try:
            user = TradingUser.objects.create_user(
                username=username,
                email=email,
                password=password1,
                first_name=name
            )
            bot = TradingBot(user=user)
            message = bot.create_message()
            url = bot.generate_webhook_url()
            bot.webhook_message = message
            bot.webhook_url = url
            bot.save()

            messages.success(request, 'Account created successfully! Please log in.')
            return redirect('bot:login')

        except IntegrityError as e:
            messages.error(request, 'Error creating account. Try again.')
            return redirect('bot:signup')

    # If GET request, just render the signup page
    return render(request, 'signup.html')


def login_view(request):
    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        remember_me = request.POST.get('remember_me') == 'on'

        # Validate required fields
        if not email or not password:
            messages.error(request, "Email and password are required.")
            return redirect("bot:login")  # Use namespaced URL

        # Try to authenticate with email as username (since USERNAME_FIELD is 'email')
        user = authenticate(request, username=email, password=password)

        if user:
            # Login successful
            login(request, user)

            # Handle "Remember Me" option
            if not remember_me:
                request.session.set_expiry(0)  # Session expires when browser closes

            messages.success(request, "Login successful!")

            # Check if user has a bot and redirect accordingly
            try:
                bot = TradingBot.objects.get(user=request.user)
                if bot.name and bot.trading_pair:  # Check if bot setup is complete
                    print(bot.name, bot.trading_pair)
                    print('redirecting to dashboard')
                    return redirect('bot:dashboard')
                else:
                    print(bot.name, bot.trading_pair)
                    print('redirecting to create bot')
                    return redirect('bot:create_bot')
            except TradingBot.DoesNotExist:
                return redirect("bot:create_bot")  # Redirect to create bot
        else:
            messages.error(request, "Invalid email or password.")
            return redirect("bot:login")

    return render(request, 'login.html')


@login_required
def logout_view(request):
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('bot:login')