document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.querySelector('.toggle-password');

    // Password visibility toggle
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Update eye icon
            const eyeIcon = this.querySelector('img');
            if (eyeIcon) {
                eyeIcon.style.opacity = type === 'password' ? '1' : '0.7';
            }
        });
    }

    // Social login handlers
    const socialButtons = document.querySelectorAll('.social-button');
    socialButtons.forEach(button => {
        button.addEventListener('click', function() {
            const provider = this.dataset.provider;
            if (provider === 'google') {
                window.location.href = '/api/login/google/';
            } else if (provider === 'apple') {
                window.location.href = '/api/login/apple/';
            }
        });
    });

    // Form validation and submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            // Clear any existing error messages
            const existingErrors = document.querySelectorAll('.alert-danger');
            existingErrors.forEach(error => error.remove());

            // Basic validation
            if (!emailInput.value.trim()) {
                e.preventDefault();
                showError('Please enter your email address');
                return;
            }

            if (!passwordInput.value) {
                e.preventDefault();
                showError('Please enter your password');
                return;
            }

            // Email format validation
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailInput.value.trim())) {
                e.preventDefault();
                showError('Please enter a valid email address');
                return;
            }

            // If all validations pass, the form will submit normally
        });
    }

    // Helper function to show error messages
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = message;

        const messages = document.querySelector('.messages');
        if (messages) {
            messages.innerHTML = '';
            messages.appendChild(errorDiv);
        } else {
            // If no messages container exists, insert error before the form
            loginForm.insertBefore(errorDiv, loginForm.firstChild);
        }
    }

    // Clear error messages when user starts typing
    emailInput.addEventListener('input', clearErrors);
    passwordInput.addEventListener('input', clearErrors);

    function clearErrors() {
        const errors = document.querySelectorAll('.alert-danger');
        errors.forEach(error => error.remove());
    }
});
