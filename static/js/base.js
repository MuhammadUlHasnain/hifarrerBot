// main.js

document.addEventListener('DOMContentLoaded', function() {
    // Navigation active state
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links .nav-item');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Mobile navigation toggle (if you plan to add a mobile menu)
    const createMobileMenu = () => {
        const nav = document.querySelector('.nav-links');
        const burger = document.createElement('div');
        burger.className = 'mobile-menu-toggle';
        burger.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;

        burger.addEventListener('click', () => {
            nav.classList.toggle('active');
            burger.classList.toggle('active');
        });

        document.querySelector('.nav-container').appendChild(burger);
    };

    // Add mobile menu if screen width is less than 768px
    if (window.innerWidth < 768) {
        createMobileMenu();
    }

    // Handle window resize
    let timeout = null;
    window.addEventListener('resize', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const mobileMenu = document.querySelector('.mobile-menu-toggle');
            if (window.innerWidth < 768 && !mobileMenu) {
                createMobileMenu();
            } else if (window.innerWidth >= 768 && mobileMenu) {
                mobileMenu.remove();
                document.querySelector('.nav-links').classList.remove('active');
            }
        }, 250);
    });

    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Handle flash messages/alerts
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        // Add close button to alerts
        const closeButton = document.createElement('button');
        closeButton.className = 'alert-close';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', () => {
            alert.remove();
        });
        alert.appendChild(closeButton);

        // Auto-hide alerts after 5 seconds
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                alert.remove();
            }, 300);
        }, 5000);
    });

    // Add loading indicator for links and forms
    const addLoadingState = () => {
        const loader = document.createElement('div');
        loader.className = 'loading-indicator';
        document.body.appendChild(loader);
    };

    const removeLoadingState = () => {
        const loader = document.querySelector('.loading-indicator');
        if (loader) {
            loader.remove();
        }
    };

    // Add loading state to form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', () => {
            addLoadingState();
        });
    });

    // Add loading state to navigation (except for hash links)
    document.querySelectorAll('a:not([href^="#"])').forEach(link => {
        link.addEventListener('click', () => {
            addLoadingState();
        });
    });

    // Remove loading state when page is fully loaded
    window.addEventListener('load', removeLoadingState);
});

// Add corresponding CSS to base.css
const style = document.createElement('style');
style.textContent = `
    .loading-indicator {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: linear-gradient(to right, #5A35E1, #311D7B);
        animation: loading 1s infinite linear;
        z-index: 9999;
    }

    @keyframes loading {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }

    .mobile-menu-toggle {
        display: none;
        flex-direction: column;
        justify-content: space-between;
        width: 30px;
        height: 21px;
        cursor: pointer;
        z-index: 1000;
    }

    .mobile-menu-toggle span {
        display: block;
        width: 100%;
        height: 3px;
        background-color: #311D7B;
        transition: all 0.3s ease;
    }

    .mobile-menu-toggle.active span:nth-child(1) {
        transform: translateY(9px) rotate(45deg);
    }

    .mobile-menu-toggle.active span:nth-child(2) {
        opacity: 0;
    }

    .mobile-menu-toggle.active span:nth-child(3) {
        transform: translateY(-9px) rotate(-45deg);
    }

    @media screen and (max-width: 768px) {
        .mobile-menu-toggle {
            display: flex;
        }

        .nav-links {
            display: none;
            position: fixed;
            top: 60px;
            left: 0;
            width: 100%;
            background: white;
            padding: 1rem;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .nav-links.active {
            display: flex;
            flex-direction: column;
        }

        .nav-links a {
            padding: 0.5rem 0;
        }
    }

    .alert {
        position: relative;
        padding-right: 35px;
    }

    .alert-close {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        opacity: 0.5;
    }

    .alert-close:hover {
        opacity: 1;
    }

    .nav-item.active {
        color: #5A35E1;
        font-weight: bold;
    }
`;

document.head.appendChild(style);

function togglePassword() {
    const passwordInput = document.getElementById('password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
}
