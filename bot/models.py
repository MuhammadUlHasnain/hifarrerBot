from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
import uuid



class TradingUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('account_status', 'active')
        return self.create_user(email, password, **extra_fields)




class TradingUser(AbstractUser):
    # Basic Authentication
    email = models.EmailField(_('email address'), unique=True)
    is_email_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)

    # Trading API Connections
    class ExchangeChoices(models.TextChoices):
        COINBASE = 'coinbase', _('Coinbase')
        BINANCE_US = 'binanceus', _('Binance US')

    preferred_exchange = models.CharField(
        max_length=30,
        choices=ExchangeChoices,
        default=ExchangeChoices.COINBASE
    )

    # API Keys (encrypted)
    coinbase_api_key = models.CharField(max_length=255, blank=True)
    coinbase_api_secret = models.TextField(max_length=255, blank=True)


    # Trading Preferences
    max_active_bots = models.IntegerField(default=3)
    default_trade_size_usd = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=100.00,
        validators=[MinValueValidator(0)]
    )

    # Risk Management
    max_daily_trades = models.IntegerField(default=10)
    max_position_size = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )



    # Account Status
    account_status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('suspended', 'Suspended'),
            ('demo', 'Demo Mode')
        ],
        default='demo'
    )

    # Tracking
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def get_active_bots(self):
        return self.tradingbot_set.filter(is_active=True)

    def can_create_bot(self):
        return self.tradingbot_set.filter(is_active=True).count() < self.max_active_bots

    def get_daily_pnl(self):
        # Calculate daily profit/loss
        pass


class TradingBot(models.Model):
    bot_id = models.CharField(max_length=100,unique=True, blank=False, null=False)
    user = models.ForeignKey(TradingUser, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, blank=True)

    # Rest of your fields...


    # Bot Configuration
    trading_pair = models.CharField(max_length=20, blank=True, null=True)  # e.g., "BTC/USD"
    use_tradingView_position_size = models.BooleanField(default=False)

    # Strategy Parameters
    webhook_message = models.JSONField(blank=True)
    webhook_url = models.URLField(unique=True, blank=True)
    position_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Bot Status
    is_active = models.BooleanField(default=False)
    last_trade_time = models.DateTimeField(null=True)
    total_trades = models.IntegerField(default=0)


    def create_message(self):
        data = {"bot_id": self.bot_id,
                "Pair": "{{syminfo.basecurrency}}/{{syminfo.currency}}",
                "position_size": "{{strategy.position_size}}",
                "exchange": self.user.preferred_exchange,
                "timestamp": "{{time}}",
                "side": "{{strategy.order.action}}"
                }
        return data

    def generate_pair_key(self):
        """Generate a unique key in format xxxxx-xxxxx-xxxxx"""
        return f"{uuid.uuid4().hex[:5]}-{uuid.uuid4().hex[:5]}-{uuid.uuid4().hex[:5]}"

    def save(self, *args, **kwargs):
        if not self.bot_id:
            # Generate key only if it doesn't exist
            while True:
                id = self.generate_pair_key()
                if not TradingBot.objects.filter(bot_id=id).exists():
                    self.bot_id = id
                    self.webhook_url = f"https://signalsbot.app/webhook/{self.bot_id}"
                    break
        if not self.webhook_message:
            self.webhook_message = self.create_message()
        super().save(*args, **kwargs)

    def generate_webhook_url(self):
        return f"https://signalsbot.app/webhook/{self.bot_id}"

    def __str__(self):
        return self.name



