/**
 * Authentication and Session Management
 * Handles user login, session management, and user seeding for Sumanglam Banking Software
 */

import db from './db.js';

/**
 * Current user session data
 */
let currentUserSession = null;

/**
 * Session timeout duration (5 minutes in milliseconds)
 */
const SESSION_TIMEOUT = 5 * 60 * 1000;

/**
 * Session timeout handler
 */
let sessionTimeoutId = null;

/**
 * Ensure default admin user exists
 */
export async function ensureAdminSeed() {
    try {
        const adminCount = await db.operators.where('isAdmin').equals(true).count();
        
        if (adminCount === 0) {
            const defaultAdmin = {
                name: 'System Administrator',
                aadhaar: '999999999999',
                username: 'admin',
                password: 'admin123', // In production, this should be hashed
                isAdmin: true,
                isActive: true,
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            
            await db.operators.add(defaultAdmin);
            console.log('Default admin user created');
        }
    } catch (error) {
        console.error('Error ensuring admin seed:', error);
        throw error;
    }
}

/**
 * Authenticate user with username and password
 */
export async function authenticate(username, password) {
    try {
        const operator = await db.operators
            .where('username')
            .equals(username.trim())
            .first();
        
        if (!operator) {
            return {
                success: false,
                message: 'Invalid username or password'
            };
        }
        
        if (!operator.isActive) {
            return {
                success: false,
                message: 'Account is deactivated. Please contact administrator.'
            };
        }
        
        // In production, use proper password hashing (bcrypt, scrypt, etc.)
        if (operator.password !== password) {
            return {
                success: false,
                message: 'Invalid username or password'
            };
        }
        
        // Update last login timestamp
        await db.operators.update(operator.id, {
            lastLogin: new Date().toISOString()
        });
        
        // Log successful login
        await logLoginAttempt(operator.id, true);
        
        // Create session
        const sessionData = {
            id: operator.id,
            name: operator.name,
            username: operator.username,
            isAdmin: operator.isAdmin,
            loginTime: new Date().toISOString()
        };
        
        setCurrentUser(sessionData);
        startSessionTimeout();
        
        return {
            success: true,
            user: sessionData
        };
        
    } catch (error) {
        console.error('Authentication error:', error);
        return {
            success: false,
            message: 'Authentication system error. Please try again.'
        };
    }
}

/**
 * Log login attempt for audit purposes
 */
export async function logLoginAttempt(operatorId, success, ipAddress = null) {
    try {
        // In a real application, you might have a separate login_logs table
        // For now, we'll just log to console and could extend to store in IndexedDB
        
        const logEntry = {
            operatorId: operatorId,
            success: success,
            timestamp: new Date().toISOString(),
            ipAddress: ipAddress || 'unknown',
            userAgent: navigator.userAgent
        };
        
        console.log('Login attempt:', logEntry);
        
        // Could store in a login_logs table if needed:
        // await db.login_logs.add(logEntry);
        
    } catch (error) {
        console.error('Error logging login attempt:', error);
    }
}

/**
 * Set current user session
 */
export function setCurrentUser(userData) {
    currentUserSession = userData;
    
    // Store in sessionStorage for persistence across page reloads
    if (userData) {
        sessionStorage.setItem('sumanglam_session', JSON.stringify(userData));
    } else {
        sessionStorage.removeItem('sumanglam_session');
    }
}

/**
 * Get current user session
 */
export function currentUser() {
    if (currentUserSession) {
        return currentUserSession;
    }
    
    // Try to restore from sessionStorage
    try {
        const stored = sessionStorage.getItem('sumanglam_session');
        if (stored) {
            currentUserSession = JSON.parse(stored);
            
            // Check if session is expired (5 minutes)
            const loginTime = new Date(currentUserSession.loginTime);
            const now = new Date();
            const timeDiff = now.getTime() - loginTime.getTime();
            
            if (timeDiff > SESSION_TIMEOUT) {
                // Session expired
                logout();
                return null;
            }
            
            // Restart session timeout
            startSessionTimeout();
            return currentUserSession;
        }
    } catch (error) {
        console.error('Error restoring session:', error);
    }
    
    return null;
}

/**
 * Start session timeout
 */
function startSessionTimeout() {
    // Clear existing timeout
    if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
    }
    
    // Set new timeout
    sessionTimeoutId = setTimeout(() => {
        if (window.showNotification) {
            window.showNotification('Session expired due to inactivity', 'warning');
        }
        logout();
    }, SESSION_TIMEOUT);
}

/**
 * Reset session timeout (call on user activity)
 */
export function resetSessionTimeout() {
    if (currentUserSession) {
        startSessionTimeout();
    }
}

/**
 * Logout current user
 */
export function logout() {
    // Clear timeout
    if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
        sessionTimeoutId = null;
    }
    
    // Clear session
    currentUserSession = null;
    sessionStorage.removeItem('sumanglam_session');
    
    // Redirect to login
    location.hash = '#/login';
    
    console.log('User logged out');
}

/**
 * Check if user is logged in
 */
export function isLoggedIn() {
    return currentUser() !== null;
}

/**
 * Check if current user is admin
 */
export function isAdmin() {
    const user = currentUser();
    return user && user.isAdmin === true;
}

/**
 * Require authentication (redirect to login if not authenticated)
 */
export function requireAuth() {
    if (!isLoggedIn()) {
        location.hash = '#/login';
        return false;
    }
    return true;
}

/**
 * Require admin privileges
 */
export function requireAdmin() {
    if (!isLoggedIn()) {
        location.hash = '#/login';
        return false;
    }
    
    if (!isAdmin()) {
        if (window.showNotification) {
            window.showNotification('Access denied. Admin privileges required.', 'error');
        }
        location.hash = '#/dashboard';
        return false;
    }
    
    return true;
}

/**
 * Handle login form submission
 */
export async function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const username = formData.get('username');
    const password = formData.get('password');
    
    if (!username || !password) {
        if (window.showNotification) {
            window.showNotification('Please enter both username and password', 'error');
        }
        return;
    }
    
    // Disable form during authentication
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    
    try {
        const result = await authenticate(username, password);
        
        if (result.success) {
            if (window.showNotification) {
                window.showNotification(`Welcome, ${result.user.name}!`, 'success');
            }
            
            // Redirect to dashboard
            location.hash = '#/dashboard';
        } else {
            if (window.showNotification) {
                window.showNotification(result.message, 'error');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (window.showNotification) {
            window.showNotification('Login system error. Please try again.', 'error');
        }
    } finally {
        // Re-enable form
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

/**
 * Set up activity listeners to reset session timeout
 */
function setupActivityListeners() {
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activities.forEach(activity => {
        document.addEventListener(activity, resetSessionTimeout, { passive: true });
    });
}

// Initialize activity listeners when module loads
setupActivityListeners();

/**
 * Password strength validation
 */
export function validatePasswordStrength(password) {
    const requirements = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    const score = Object.values(requirements).filter(Boolean).length;
    
    return {
        requirements,
        score,
        strength: score < 3 ? 'weak' : score < 4 ? 'medium' : 'strong',
        isValid: requirements.minLength && requirements.hasUppercase && 
                requirements.hasLowercase && requirements.hasNumber
    };
}

/**
 * Generate secure password
 */
export function generateSecurePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + special;
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}