# trading/urls.py (your app urls)
from django.urls import path
from . import views
from .views import WebhookSignalView

app_name = 'bot'

urlpatterns = [
    # Web URLs
    path('home/', views.home, name='home'),  # homepage
    # path('dashboard/', views.dashboard, name='dashboard'),
    # path('signup/', views.SignUpView.as_view(), name='signup'),
    path('signup/', views.signup, name='signup'),
    # path('login/', views.LoginView.as_view(), name='login'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('create_bot/', views.create_bot, name='create_bot'),
    path("validate-api/", views.validate_api, name="validate_api"),
    path("bot_setup/", views.bot_setup, name="bot_setup"),
    path('webhook/<str:bot_id>', WebhookSignalView.as_view(), name='webhook_signal'),



    # # API URLs
    # path('api/signup/', views.SignupAPIView.as_view(), name='api_signup'),
    # path('api/login/', views.LoginAPIView.as_view(), name='api_login'),
    # path('api/logout/', views.LogoutAPIView.as_view(), name='api_logout'),
    # path('api/dashboard/', views.DashboardAPIView.as_view(), name='api_dashboard'),
]
