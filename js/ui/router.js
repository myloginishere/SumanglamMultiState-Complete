/**
 * Client-Side Router and Navigation
 * Handles routing, navigation, and page rendering for Sumanglam Banking Software
 */

import { currentUser, requireAuth, requireAdmin, handleLogin, logout } from '../auth.js';
import { renderOperatorsPage } from './operators.js';
import { renderAccountsPage } from './accounts.js';
import { renderLoansPage } from './loans.js';
import { renderDepositsPage } from './deposits.js';
import { renderReportsPage } from './reports.js';
import { renderConfigPage } from './system.js';

/**
 * Render navigation bar based on user role
 */
export function renderNavbar() {
    const navbar = document.getElementById('navbar');
    const user = currentUser();
    
    if (!user) {
        navbar.innerHTML = `
            <div>
                <strong>Sumanglam Multi State Society</strong>
                <span style="margin-left: 20px; font-size: 0.9em; opacity: 0.8;">Banking Software</span>
            </div>
        `;
        return;
    }
    
    const isAdmin = user.isAdmin;
    
    navbar.innerHTML = `
        <div style="display: flex; align-items: center; flex-wrap: wrap;">
            <strong style="margin-right: 20px;">Sumanglam Multi State Society</strong>
            <nav style="display: flex; gap: 8px; flex-wrap: wrap;">
                <a href="#/dashboard">🏠 Dashboard</a>
                ${isAdmin ? '<a href="#/operators" data-role="admin">👥 Operators</a>' : ''}
                <a href="#/accounts">📋 Accounts</a>
                <a href="#/loans">💰 Loans</a>
                <a href="#/deposits">🏦 Deposits</a>
                <a href="#/reports">📊 Reports</a>
                ${isAdmin ? '<a href="#/system" data-role="admin">⚙️ System Config</a>' : ''}
            </nav>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="font-size: 0.9em;">
                👤 ${user.name}
                ${isAdmin ? '<span style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">Admin</span>' : ''}
            </span>
            <button onclick="handleLogout()" style="font-size: 0.9em;">Logout</button>
        </div>
    `;
    
    // Make logout function available globally
    window.handleLogout = logout;
}

/**
 * Route to specific page
 */
export async function routeTo(hash) {
    const app = document.getElementById('app');
    const user = currentUser();
    
    // Remove loading class if present
    app.classList.remove('loading');
    
    // Handle authentication requirement
    if (!user && hash !== '#/login') {
        location.hash = '#/login';
        return;
    }
    
    try {
        switch (hash) {
            case '#/login':
                if (user) {
                    // Already logged in, redirect to dashboard
                    location.hash = '#/dashboard';
                    return;
                }
                renderLoginPage(app);
                break;
                
            case '#/dashboard':
            case '#/':
            case '':
                if (!requireAuth()) return;
                await renderDashboardPage(app);
                break;
                
            case '#/operators':
                if (!requireAdmin()) return;
                await renderOperatorsPage(app);
                break;
                
            case '#/accounts':
                if (!requireAuth()) return;
                await renderAccountsPage(app);
                break;
                
            case '#/loans':
                if (!requireAuth()) return;
                await renderLoansPage(app);
                break;
                
            case '#/deposits':
                if (!requireAuth()) return;
                await renderDepositsPage(app);
                break;
                
            case '#/reports':
                if (!requireAuth()) return;
                await renderReportsPage(app);
                break;
                
            case '#/system':
                if (!requireAdmin()) return;
                await renderConfigPage(app);
                break;
                
            default:
                if (!requireAuth()) return;
                render404Page(app);
                break;
        }
        
        // Update navbar after routing
        renderNavbar();
        
        // Add fade-in animation
        app.classList.add('fade-in');
        setTimeout(() => app.classList.remove('fade-in'), 300);
        
    } catch (error) {
        console.error('Routing error:', error);
        renderErrorPage(app, error);
    }
}

/**
 * Render login page
 */
function renderLoginPage(container) {
    container.innerHTML = `
        <div style="max-width: 400px; margin: 50px auto; padding: 20px;">
            <div class="card">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #0b4ea2; margin-bottom: 10px;">🏦 Sumanglam</h1>
                    <h2 style="font-size: 1.2rem; color: #666; margin: 0;">Multi State Society</h2>
                    <p style="color: #888; margin-top: 10px;">Banking Software System</p>
                </div>
                
                <form id="loginForm">
                    <div style="margin-bottom: 20px;">
                        <label for="username">
                            👤 Username
                            <input type="text" id="username" name="username" required 
                                   placeholder="Enter your username" autocomplete="username">
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label for="password">
                            🔒 Password
                            <input type="password" id="password" name="password" required 
                                   placeholder="Enter your password" autocomplete="current-password">
                        </label>
                    </div>
                    
                    <button type="submit" style="width: 100%; padding: 12px; font-size: 16px;">
                        Login to Banking System
                    </button>
                </form>
                
                <div class="info-box info" style="margin-top: 20px; font-size: 0.9em;">
                    <strong>Default Credentials:</strong><br>
                    Username: <code>admin</code><br>
                    Password: <code>admin123</code>
                </div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #888;">
                    Version 1.0 | © 2025 Sumanglam Multi State Society
                </div>
            </div>
        </div>
    `;
    
    // Attach login handler
    const loginForm = container.querySelector('#loginForm');
    loginForm.addEventListener('submit', handleLogin);
    
    // Focus on username field
    container.querySelector('#username').focus();
}

/**
 * Render dashboard page
 */
async function renderDashboardPage(container) {
    const user = currentUser();
    
    // Import database to get statistics
    const db = (await import('../db.js')).default;
    
    try {
        // Gather dashboard statistics
        const stats = {
            totalAccounts: await db.accounts.where('isActive').equals(true).count(),
            totalOperators: await db.operators.where('isActive').equals(true).count(),
            activeLoans: await db.loans.where('status').equals('ACTIVE').count(),
            activeFDs: await db.fixed_deposits.where('status').equals('ACTIVE').count(),
            activeRDs: await db.recurring_deposits.where('status').equals('ACTIVE').count()
        };
        
        // Calculate financial totals
        const loans = await db.loans.where('status').equals('ACTIVE').toArray();
        const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.principal_amount, 0);
        const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstanding_principal + loan.outstanding_interest, 0);
        
        const fds = await db.fixed_deposits.where('status').equals('ACTIVE').toArray();
        const totalFDAmount = fds.reduce((sum, fd) => sum + fd.principal_amount, 0);
        
        container.innerHTML = `
            <div class="dashboard">
                <h1>Welcome, ${user.name}!</h1>
                <p style="color: #666; margin-bottom: 30px;">
                    ${user.isAdmin ? 'Administrator' : 'Operator'} Dashboard • 
                    ${new Date().toLocaleDateString('en-IN', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </p>
                
                <div class="row">
                    <div class="col-quarter">
                        <div class="card" style="text-align: center; background: linear-gradient(135deg, #0b4ea2, #1565c0); color: white;">
                            <h3 style="color: white;">👥 Accounts</h3>
                            <div style="font-size: 2rem; font-weight: bold;">${stats.totalAccounts}</div>
                            <div style="opacity: 0.8;">Active Accounts</div>
                        </div>
                    </div>
                    
                    <div class="col-quarter">
                        <div class="card" style="text-align: center; background: linear-gradient(135deg, #27ae60, #2ecc71); color: white;">
                            <h3 style="color: white;">💰 Loans</h3>
                            <div style="font-size: 2rem; font-weight: bold;">${stats.activeLoans}</div>
                            <div style="opacity: 0.8;">Active Loans</div>
                        </div>
                    </div>
                    
                    <div class="col-quarter">
                        <div class="card" style="text-align: center; background: linear-gradient(135deg, #f39c12, #e67e22); color: white;">
                            <h3 style="color: white;">🏦 Fixed Deposits</h3>
                            <div style="font-size: 2rem; font-weight: bold;">${stats.activeFDs}</div>
                            <div style="opacity: 0.8;">Active FDs</div>
                        </div>
                    </div>
                    
                    <div class="col-quarter">
                        <div class="card" style="text-align: center; background: linear-gradient(135deg, #8e44ad, #9b59b6); color: white;">
                            <h3 style="color: white;">📈 Recurring Deposits</h3>
                            <div style="font-size: 2rem; font-weight: bold;">${stats.activeRDs}</div>
                            <div style="opacity: 0.8;">Active RDs</div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-half">
                        <div class="card">
                            <h3>💰 Financial Overview</h3>
                            <table class="table">
                                <tr><td><strong>Total Loan Portfolio:</strong></td><td>${window.formatCurrency ? window.formatCurrency(totalLoanAmount) : '₹' + totalLoanAmount.toLocaleString()}</td></tr>
                                <tr><td><strong>Outstanding Amount:</strong></td><td>${window.formatCurrency ? window.formatCurrency(totalOutstanding) : '₹' + totalOutstanding.toLocaleString()}</td></tr>
                                <tr><td><strong>FD Portfolio:</strong></td><td>${window.formatCurrency ? window.formatCurrency(totalFDAmount) : '₹' + totalFDAmount.toLocaleString()}</td></tr>
                                <tr><td><strong>Collection Efficiency:</strong></td><td>${totalLoanAmount > 0 ? ((totalLoanAmount - totalOutstanding) / totalLoanAmount * 100).toFixed(1) : 0}%</td></tr>
                            </table>
                        </div>
                    </div>
                    
                    <div class="col-half">
                        <div class="card">
                            <h3>🚀 Quick Actions</h3>
                            <div style="display: grid; gap: 10px;">
                                <button onclick="location.hash='#/accounts'">📋 Manage Accounts</button>
                                <button onclick="location.hash='#/loans'">💰 Process Loans</button>
                                <button onclick="location.hash='#/deposits'">🏦 Handle Deposits</button>
                                <button onclick="location.hash='#/reports'">📊 View Reports</button>
                                ${user.isAdmin ? '<button onclick="location.hash=\'#/operators\'" class="secondary">👥 Manage Operators</button>' : ''}
                                ${user.isAdmin ? '<button onclick="location.hash=\'#/system\'" class="secondary">⚙️ System Config</button>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                ${user.isAdmin && stats.totalOperators > 0 ? `
                    <div class="card">
                        <h3>🛡️ System Information</h3>
                        <div class="info-box info">
                            <strong>System Status:</strong> All services operational<br>
                            <strong>Total Operators:</strong> ${stats.totalOperators}<br>
                            <strong>Database:</strong> IndexedDB with ${Object.values(stats).reduce((a, b) => a + b, 0)} total records<br>
                            <strong>Last Backup:</strong> Configure automatic backups in System Config
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        container.innerHTML = `
            <div class="card">
                <h2>Dashboard</h2>
                <p>Welcome, ${user.name}!</p>
                <div class="info-box error">
                    Error loading dashboard statistics. Please try refreshing the page.
                </div>
                <div style="margin-top: 20px;">
                    <button onclick="location.hash='#/accounts'">📋 Accounts</button>
                    <button onclick="location.hash='#/loans'">💰 Loans</button>
                    <button onclick="location.hash='#/deposits'">🏦 Deposits</button>
                    <button onclick="location.hash='#/reports'">📊 Reports</button>
                </div>
            </div>
        `;
    }
}

/**
 * Render 404 page
 */
function render404Page(container) {
    container.innerHTML = `
        <div class="card" style="text-align: center; max-width: 500px; margin: 50px auto;">
            <h2>🔍 Page Not Found</h2>
            <p>The requested page could not be found.</p>
            <button onclick="location.hash='#/dashboard'">🏠 Return to Dashboard</button>
        </div>
    `;
}

/**
 * Render error page
 */
function renderErrorPage(container, error) {
    container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 50px auto;">
            <h2 style="color: #e74c3c;">⚠️ Application Error</h2>
            <p>An unexpected error occurred while loading the page.</p>
            <div class="info-box error">
                <strong>Error:</strong> ${error.message || 'Unknown error'}
            </div>
            <div style="margin-top: 20px;">
                <button onclick="location.reload()">🔄 Reload Page</button>
                <button onclick="location.hash='#/dashboard'" class="secondary">🏠 Go to Dashboard</button>
            </div>
        </div>
    `;
}