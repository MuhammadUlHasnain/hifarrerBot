from django.contrib import admin
from .models import *
# Register your models here.

admin.site.register(TradingUser)
admin.site.register(TradingBot)

admin.site.site_header = 'Pro Bot'
admin.site.site_title = 'Pro Bot'
admin.site.index_title = 'Pro Bot'