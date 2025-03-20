# trading/urls.py (your app urls)
from django.urls import path
from . import views

app_name = 'bot'

urlpatterns = [
    # Web URLs
    path('home/', views.home, name='home'),  # homepage
    path('signup/', views.signup, name='signup'),
    # path('login/', views.LoginView.as_view(), name='login'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('create_bot/', views.create_bot, name='create_bot'),
    path("validate-api/", views.validate_api, name="validate_api"),
    path("bot_setup/", views.bot_setup, name="bot_setup"),
    path("delete_bot/<int:bot_id>/", views.delete_bot, name="delete_bot"),
    path('webhook/', views.WebhookSignalView.as_view(), name='webhook_signal'),




]
