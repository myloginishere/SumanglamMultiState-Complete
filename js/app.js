import { ensureAdminSeed, currentUser } from './auth.js';
import { routeTo, renderNavbar } from './ui/router.js';
import db from './db.js';

/**
 * Main Application Bootstrap
 * Initializes the banking application with database, authentication, and routing
 */
async function initializeApp() {
    try {
        console.log('Initializing Sumanglam Banking System...');
        
        // Initialize IndexedDB and create default admin if needed
        await ensureAdminSeed();
        
        // Set up initial navigation
        renderNavbar();
        
        // Set up routing
        const currentRoute = location.hash || '#/dashboard';
        await routeTo(currentRoute);
        
        // Set up hash change listener for client-side routing
        window.addEventListener('hashchange', async () => {
            await routeTo(location.hash);
        });
        
        console.log('Sumanglam Banking System initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Display error to user
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="card">
                    <h2 style="color: #e74c3c;">Initialization Error</h2>
                    <p>Failed to initialize the banking system. Please refresh the page and try again.</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button onclick="location.reload()">Reload Application</button>
                </div>
            `;
        }
    }
}

/**
 * Register Service Worker for offline capability and caching
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('Service Worker registered successfully:', registration.scope);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }
}

/**
 * Set up global error handling
 */
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        
        // You could send error reports to a logging service here
        // For now, we'll just log to console
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        
        // Prevent the default browser behavior
        event.preventDefault();
    });
}

/**
 * Add some useful global utilities
 */
function setupGlobalUtils() {
    // Global notification function
    window.showNotification = function(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `info-box ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    };
    
    // Global format currency function
    window.formatCurrency = function(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };
    
    // Global format date function
    window.formatDate = function(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return new Intl.DateTimeFormat('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    };
}

/**
 * Add CSS animations
 */
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .fade-in {
            animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Initialize everything when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupErrorHandling();
        setupGlobalUtils();
        addAnimationStyles();
        registerServiceWorker();
        initializeApp();
    });
} else {
    // DOM is already ready
    setupErrorHandling();
    setupGlobalUtils();
    addAnimationStyles();
    registerServiceWorker();
    initializeApp();
}

// Export for potential use by other modules
export { initializeApp };