# project/urls.py (main urls.py)
from django.contrib import admin
from django.shortcuts import redirect
from django.urls import path, include, re_path
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('bot.urls')),

    re_path(r'^.*$', lambda request: redirect('/api/signup/')),


]
