from rest_framework import serializers

from .models import TradingUser, TradingBot, TradingUserManager

class TradingUserSerializer(serializers.ModelSerializer):

    class Meta:
        model = TradingUser
        fields = '__all__'

class TradingBotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradingBot
        fields = '__all__'

class TradingUserManagerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradingUserManager
        fields = '__all__'

