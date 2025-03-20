document.addEventListener("DOMContentLoaded", function () {
    // Initial state check for position size input
    const initialOption = document.querySelector('input[name="position_option"]:checked');
    if (initialOption) {
        const positionSizeInput = document.getElementById('position_size');
        const positionSizeDiv = positionSizeInput.parentElement;
        positionSizeDiv.style.display = initialOption.value === "true" ? 'none' : 'block';
        positionSizeInput.disabled = initialOption.value === "true";
    }

    // Toggle position size input based on radio selection
    document.querySelectorAll('input[name="position_option"]').forEach(option => {
        option.addEventListener('change', function() {
            const positionSizeInput = document.getElementById('position_size');
            const positionSizeDiv = positionSizeInput.parentElement;

            if (this.value === "true") { // TradingView decide
                positionSizeDiv.style.display = 'none';
                positionSizeInput.disabled = true;
                positionSizeInput.value = '';
            } else { // Enter size manually
                positionSizeDiv.style.display = 'block';
                positionSizeInput.disabled = false;
            }
        });
    });

    // Add validation for position size input
    document.getElementById('position_size').addEventListener('input', function(e) {
        // Allow only numbers and decimal point
        this.value = this.value.replace(/[^0-9.]/g, '');

        // Prevent multiple decimal points
        if ((this.value.match(/\./g) || []).length > 1) {
            this.value = this.value.slice(0, -1);
        }
    });

    // Form submission handler
    document.getElementById('botForm').addEventListener('submit', function(event) {
        event.preventDefault();

        // Clear previous error messages
        const responseElement = document.getElementById('responseMessage');
        responseElement.textContent = "";
        responseElement.className = "";

        // Basic form validation
        const botName = this.querySelector('#bot_name').value.trim();
        const tradingPair = this.querySelector('#trading_pair').value.trim();
        const useTradingView = this.querySelector('input[name="position_option"]:checked').value === "true";
        const positionSize = this.querySelector('#position_size').value.trim();

        let isValid = true;
        const errors = [];

        if (!botName) {
            errors.push("Bot name is required");
            isValid = false;
        }

        if (!tradingPair) {
            errors.push("Trading pair is required");
            isValid = false;
        }

        if (!useTradingView && !positionSize) {
            errors.push("Position size is required when not using TradingView");
            isValid = false;
        }

        if (!isValid) {
            responseElement.className = "error-message";
            const errorList = document.createElement('ul');
            errors.forEach(error => {
                const li = document.createElement('li');
                li.textContent = error;
                errorList.appendChild(li);
            });
            responseElement.innerHTML = '';
            responseElement.appendChild(errorList);
            return;
        }

        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = "Processing...";
        submitButton.disabled = true;

        const formData = new FormData(this);
        const botStatus = document.querySelector('input[name="bot_status"]:checked').value;
        formData.set('is_active', botStatus);

        // Log form data being sent
        console.log('Form data being sent:');
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + pair[1]);
        }

        fetch(window.location.href, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: formData
        })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            if (response.redirected) {
                window.location.href = response.url;
                return;
            }

            return response.json().catch(error => {
                console.error('JSON parsing error:', error);
                throw new Error('Failed to parse response as JSON');
            });
        })
        .then(data => {
            if (!data) return;

            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            console.log('Response data:', data);

            if (data.success) {
                responseElement.textContent = "Bot setup completed successfully!";
                responseElement.className = "success-message";

                // Redirect to dashboard after success
                setTimeout(() => {
                    window.location.href = data.redirect || '/api/dashboard/';
                }, 1000);
            } else {
                responseElement.className = "error-message";
                if (Array.isArray(data.errors)) {
                    const errorList = document.createElement('ul');
                    data.errors.forEach(error => {
                        const li = document.createElement('li');
                        li.textContent = error;
                        errorList.appendChild(li);
                    });
                    responseElement.innerHTML = '';
                    responseElement.appendChild(errorList);
                } else {
                    responseElement.textContent = data.message || `Error: ${JSON.stringify(data, null, 2)}` || "An error occurred. Please check your inputs.";
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            responseElement.textContent = "An unexpected error occurred. Please try again.";
            responseElement.className = "error-message";
        });
    });
});
