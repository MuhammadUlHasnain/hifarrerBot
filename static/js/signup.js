document.addEventListener('DOMContentLoaded', function() {
    // Password visibility toggle
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            // Toggle icon (you'll need to update the icon accordingly)
            this.querySelector('img').src = type === 'password'
                ? "{% static 'images/eye-icon.svg' %}"
                : "{% static 'images/eye-slash-icon.svg' %}";
        });
    }

    // Form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Add your form validation here
            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }

            // Add your form submission logic here
            // You might want to use fetch() to submit to your Django backend
        });
    }

    // Social login buttons
    const googleBtn = document.querySelector('.google');
    const appleBtn = document.querySelector('.apple');

    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            // Add Google sign-in logic
        });
    }

    if (appleBtn) {
        appleBtn.addEventListener('click', function() {
            // Add Apple sign-in logic
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
                    // Password visibility toggle
                    const passwordInput = document.getElementById('password');
                    const togglePasswordButton = document.querySelector('.toggle-password');
                    const confirmPasswordInput = document.getElementById('confirm_password');

                    if (togglePasswordButton) {
                        togglePasswordButton.addEventListener('click', function () {
                            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                            passwordInput.setAttribute('type', type);

                            // Update eye icon (optional)
                            const eyeIcon = this.querySelector('img');
                            if (type === 'password') {
                                eyeIcon.style.opacity = '1';
                            } else {
                                eyeIcon.style.opacity = '0.7';
                            }

                            confirmPasswordInput.setAttribute('type', type);
                        });
                    }
                })