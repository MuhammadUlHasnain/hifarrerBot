document.addEventListener('DOMContentLoaded', function() {
    // Add data-label attributes for responsive tables
    const tableRows = document.querySelectorAll('.bots-table tbody tr');
    const tableHeaders = document.querySelectorAll('.bots-table thead th');

    tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
            if (index < tableHeaders.length) {
                cell.setAttribute('data-label', tableHeaders[index].textContent.trim());
            }
        });
    });

    // Handle action button clicks
    document.querySelectorAll('.action-button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();

            // Close all other open menus first
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== this.nextElementSibling) {
                    menu.style.display = 'none';
                }
            });

            // Toggle this menu
            const menu = this.nextElementSibling;
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
    });

    // Close dropdown when clicking elsewhere
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    });

    // Handle delete bot actions
    document.querySelectorAll('.delete-bot').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const botId = this.getAttribute('data-bot-id');

            if (confirm('Are you sure you want to delete this bot?')) {
                fetch(`/api/bots/${botId}/delete/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Remove the row from the table
                        const row = this.closest('tr');
                        row.parentNode.removeChild(row);

                        // Check if table is empty and add empty message if needed
                        if (document.querySelectorAll('.bots-table tbody tr').length === 0) {
                            const tbody = document.querySelector('.bots-table tbody');
                            const emptyRow = document.createElement('tr');
                            emptyRow.innerHTML = '<td colspan="5" class="no-bots-message">You don\'t have any active bots yet. Click "Create Bot" to get started.</td>';
                            tbody.appendChild(emptyRow);
                        }
                    } else {
                        alert('Failed to delete bot: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while deleting the bot');
                });
            }
        });
    });

    // Function to get CSRF token from cookies
    function getCsrfToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 'csrftoken='.length) === 'csrftoken=') {
                    cookieValue = decodeURIComponent(cookie.substring('csrftoken='.length));
                    break;
                }
            }
        }

        // If cookie method fails, try to get from the hidden input
        if (!cookieValue) {
            const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
            if (csrfInput) {
                cookieValue = csrfInput.value;
            }
        }

        return cookieValue;
    }

    // Add status toggle functionality
    document.querySelectorAll('.status-badge').forEach(badge => {
        if (badge.classList.contains('clickable')) {
            badge.addEventListener('click', function() {
                const botId = this.getAttribute('data-bot-id');
                const currentStatus = this.classList.contains('active');

                fetch(`/api/bots/${botId}/toggle-status/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        active: !currentStatus
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update UI
                        if (data.active) {
                            this.classList.remove('inactive');
                            this.classList.add('active');
                            this.innerHTML = 'Active <i class="fas fa-check-circle"></i>';
                        } else {
                            this.classList.remove('active');
                            this.classList.add('inactive');
                            this.innerHTML = 'Inactive';
                        }
                    } else {
                        alert('Failed to update bot status: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while updating the bot status');
                });
            });
        }
    });

    // Add search functionality if search box exists
    const searchInput = document.getElementById('bot-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();

            document.querySelectorAll('.bots-table tbody tr').forEach(row => {
                if (!row.classList.contains('no-results-row')) {
                    const botName = row.querySelector('.bot-name').textContent.toLowerCase();
                    const tradingPair = row.querySelector('.trading-pair').textContent.toLowerCase();
                    const exchange = row.querySelector('.exchange-name').textContent.toLowerCase();

                    if (botName.includes(searchTerm) ||
                        tradingPair.includes(searchTerm) ||
                        exchange.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });

            // Check if all rows are hidden and show a message if needed
            const visibleRows = Array.from(document.querySelectorAll('.bots-table tbody tr'))
                .filter(row => row.style.display !== 'none' && !row.classList.contains('no-results-row'));

            let noResultsRow = document.querySelector('.no-results-row');

            if (visibleRows.length === 0 && searchTerm !== '') {
                if (!noResultsRow) {
                    const tbody = document.querySelector('.bots-table tbody');
                    noResultsRow = document.createElement('tr');
                    noResultsRow.className = 'no-results-row';
                    noResultsRow.innerHTML = '<td colspan="5" class="no-bots-message">No bots match your search criteria.</td>';
                    tbody.appendChild(noResultsRow);
                } else {
                    noResultsRow.style.display = '';
                }
            } else if (noResultsRow) {
                noResultsRow.style.display = 'none';
            }
        });
    }

    // Add sorting functionality
    document.querySelectorAll('.bots-table th.sortable').forEach(header => {
        header.addEventListener('click', function() {
            const table = this.closest('table');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr:not(.no-results-row):not(.no-bots-message)'));
            const index = Array.from(this.parentNode.children).indexOf(this);
            const isAscending = this.classList.contains('asc');

            // Update sort direction indicators
            document.querySelectorAll('.bots-table th.sortable').forEach(th => {
                th.classList.remove('asc', 'desc');
            });

            this.classList.add(isAscending ? 'desc' : 'asc');

            // Sort the rows
            rows.sort((a, b) => {
                const aValue = a.children[index].textContent.trim();
                const bValue = b.children[index].textContent.trim();

                if (isAscending) {
                    return aValue.localeCompare(bValue);
                } else {
                    return bValue.localeCompare(aValue);
                }
            });

            // Remove existing rows
            rows.forEach(row => {
                tbody.removeChild(row);
            });

            // Append sorted rows
            rows.forEach(row => {
                tbody.appendChild(row);
            });
        });
    });
});
