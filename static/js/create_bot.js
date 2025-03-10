/**
 * Trading Bot UI - Main JavaScript
 * Handles exchange selection and API validation
 */
document.addEventListener('DOMContentLoaded', function() {
    // ============================================================
    // EXCHANGE SELECTION FUNCTIONALITY
    // ============================================================
    const exchangeButtons = document.querySelectorAll('.exchange-btn');
    const selectedExchangeInput = document.getElementById('selected-exchange') ||
                                 document.createElement('input'); // Fallback if element doesn't exist

    // Create hidden input for exchange if it doesn't exist
    if (!document.getElementById('selected-exchange')) {
        selectedExchangeInput.type = 'hidden';
        selectedExchangeInput.id = 'selected-exchange';
        selectedExchangeInput.name = 'exchange';
        document.querySelector('form') && document.querySelector('form').appendChild(selectedExchangeInput);
    }

    // Add click event listener to each exchange button
    exchangeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent any default behavior

            // Remove active class from all buttons
            exchangeButtons.forEach(btn => {
                btn.classList.remove('active');
            });

            // Add active class to the clicked button
            this.classList.add('active');

            // Update the hidden input with the selected exchange value
            // const exchangeValue = this.getAttribute('data-exchange');
            // selectedExchangeInput.value = exchangeValue;

            const exchangeValue = this.getAttribute('data-exchange').toLowerCase();
            selectedExchangeInput.value = exchangeValue === 'coinbase' ? 'coinbase' : 'binance';

            // Update any visible exchange field if it exists
            const exchangeField = document.getElementById('exchange');
            if (exchangeField) {
                exchangeField.value = exchangeValue;
            }

            console.log('Selected exchange:', exchangeValue);
        });
    });

    // ============================================================
    // VALIDATE BUTTON FUNCTIONALITY
    // ============================================================
    const validateBtn = document.getElementById('validate-btn');

    // Modified to work without requiring a form with specific ID
    if (validateBtn) {
        validateBtn.addEventListener('click', function(e) {
            e.preventDefault();

            // Clear previous error messages
            clearErrorMessages();

            // Get form data
            const exchange = selectedExchangeInput.value;
            const apiKey = document.getElementById('api-key')?.value || '';
            const privateKey = document.getElementById('private-key')?.value || '';

            // Basic validation
            if (!exchange) {
            addErrorMessage('selected-exchange', 'Please select an exchange', '.exchange-selection');
            return;
            }
            if (!apiKey) {
                addErrorMessage('api-key', 'API Key is required');
                return;
            }
            if (!privateKey) {
                addErrorMessage('private-key', 'Private Key is required');
                return;
        }
            let isValid = validateFormFields(exchange, apiKey, privateKey);

            if (!isValid) {
                return;
            }

            // Show loading state
            setButtonLoadingState(validateBtn, true);

            const formData = {
            exchange: exchange,
            api_key: apiKey,
            private_key: privateKey
        };

        submitFormData(formData);
        });
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * Clears all error messages from the form
     */
    function clearErrorMessages() {
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

        // Also clear any alert messages
        const messagesDiv = document.querySelector('.messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = '';
        }
    }

    /**
     * Validates the form fields and shows error messages if needed
     * @param {string} exchange - The selected exchange
     * @param {string} apiKey - The API key
     * @param {string} privateKey - The private key
     * @returns {boolean} - True if validation passes, false otherwise
     */
    function validateFormFields(exchange, apiKey, privateKey) {
        let isValid = true;

        if (!exchange) {
            // Add error to the exchange selection div instead of the hidden input
            addErrorMessage('selected-exchange', 'Please select an exchange', '.exchange-selection');
            isValid = false;
        }

        if (!apiKey) {
            addErrorMessage('api-key', 'API Key is required');
            isValid = false;
        }

        if (!privateKey) {
            addErrorMessage('private-key', 'Private Key is required');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Adds an error message below a form field
     * @param {string} fieldId - The ID of the field
     * @param {string} message - The error message
     * @param {string} alternateParentSelector - Optional selector for parent element
     */
    function addErrorMessage(fieldId, message, alternateParentSelector = null) {
        const field = document.getElementById(fieldId);
        if (!field && !alternateParentSelector) {
            console.error(`Field with ID '${fieldId}' not found`);
            return;
        }

        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        if (field) {
            // Add error class to the field
            field.classList.add('error');

            // Add error message after the field
            field.parentNode.insertBefore(errorDiv, field.nextSibling);
        } else if (alternateParentSelector) {
            // Use the alternate parent selector
            const parentElement = document.querySelector(alternateParentSelector);
            if (parentElement) {
                parentElement.appendChild(errorDiv);
            }
        }
    }

    /**
     * Sets the button to loading state or back to normal
     * @param {HTMLElement} button - The button element
     * @param {boolean} isLoading - Whether to set loading state or not
     */
    function setButtonLoadingState(button, isLoading) {
        if (isLoading) {
            button.originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = 'Validating...';
        } else {
            button.disabled = false;
            button.innerHTML = button.originalText || 'Validate';
        }
    }

    /**
     * Validates API credentials by sending an AJAX request
     * @param {string} exchange - The selected exchange
     * @param {string} apiKey - The API key
     * @param {string} privateKey - The private key
     * @returns {Promise} - A promise that resolves with the response data
     */
    function validateApiCredentials(exchange, apiKey, privateKey) {
        return fetch('/validate-api/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'  // Add this to indicate AJAX request
            },
            body: JSON.stringify({
                exchange: exchange,
                api_key: apiKey,
                private_key: privateKey
            })
        })
        .then(response => {
        // Check if response is a redirect
        if (response.type === 'opaqueredirect') {
            // This means we got redirected - likely due to authentication issues
            throw new Error('Authentication required. Please log in and try again.');
        }

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        // Check content type to avoid parsing non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // Clone the response so we can both check its text and still use it later
            return response.clone().text().then(text => {
                console.error('Server returned non-JSON response:', text.substring(0, 500) + '...');
                throw new Error('Server returned non-JSON response. Check console for details.');
            });
        }

        return response.json();
    });

    }

    /**
     * Handles the validation response
     * @param {Object} data - The response data
     */
    function handleValidationResponse(data) {
        const messagesDiv = document.querySelector('.messages') || createMessagesDiv();

        if (data.success) {
            // Show success message
            messagesDiv.innerHTML = '<div class="alert alert-success">API credentials validated successfully!</div>';

            // Create a form dynamically to submit the data
            const formData = {
                exchange: document.getElementById('selected-exchange').value,
                api_key: document.getElementById('api-key').value,
                private_key: document.getElementById('private-key').value
            };

            // Create and submit a form
            submitFormData(formData);
        } else {
            // Show error message
            const errorMessage = data.error || 'Invalid API credentials. Please try again.';
            messagesDiv.innerHTML = `<div class="alert alert-danger">${errorMessage}</div>`;
        }
    }

    /**
     * Creates and submits a form with the provided data
     * @param {Object} formData - The data to submit
     */
    function submitFormData(formData) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = window.location.href; // Submit to the current URL

        // Add CSRF token
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrfmiddlewaretoken';
            csrfInput.value = csrfToken;
            form.appendChild(csrfInput);
        }

        // Add form data
        Object.entries(formData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });

        // Append form to body and submit
        document.body.appendChild(form);
        form.submit();
    }

    /**
     * Handles validation errors
     * @param {Error} error - The error object
     */
    function handleValidationError(error) {
        console.error('Error:', error);

        const messagesDiv = document.querySelector('.messages') || createMessagesDiv();
messagesDiv.innerHTML = `<div class="alert alert-danger">${error.message || 'An error occurred while validating your credentials. Please try again.'}</div>`;
    }

    /**
     * Creates a messages div if it doesn't exist
     * @returns {HTMLElement} - The messages div
     */
    function createMessagesDiv() {
        const messagesDiv = document.createElement('div');
        messagesDiv.className = 'messages';

        // Insert at the beginning of the create-bot-container
        const container = document.querySelector('.create-bot-container');
        if (container) {
            container.insertBefore(messagesDiv, container.firstChild.nextSibling); // Insert after the h2
        } else {
            document.body.insertBefore(messagesDiv, document.body.firstChild);
        }

        return messagesDiv;
    }

    /**
     * Gets the CSRF token from cookies
     * @returns {string} - The CSRF token
     */
    function getCsrfToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 'csrftoken'.length + 1) === ('csrftoken=')) {
                    cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});
