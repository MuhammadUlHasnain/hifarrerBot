from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError
from .models import TradingUser


class TradingUserSignUpForm(UserCreationForm):
    email = forms.EmailField(required=True)
    terms_accepted = forms.BooleanField(required=True)

    class Meta:
        model = TradingUser
        fields = ('username', 'email', 'password1', 'password2', 'terms_accepted')

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if TradingUser.objects.filter(email=email).exists():
            raise ValidationError("This email is already registered.")
        return email


class TradingUserLoginForm(forms.Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)
    remember_me = forms.BooleanField(required=False)
