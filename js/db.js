/**
 * Database Configuration and Schema
 * IndexedDB database setup using Dexie.js for Sumanglam Banking Software
 */

// Import Dexie (assuming it's loaded globally)
const Dexie = window.Dexie;

if (!Dexie) {
    throw new Error('Dexie.js library not loaded. Please include dexie.min.js before this script.');
}

/**
 * Database Schema Definition
 * Defines all tables, indexes, and relationships for the banking system
 */
const db = new Dexie('sumanglam-banking-db');

db.version(1).stores({
    // Operators table - system users (admin and regular operators)
    operators: '++id, &username, &aadhaar, isAdmin, isActive, createdAt, lastLogin',
    
    // Accounts table - customer accounts with guarantor information
    accounts: `
        ++id, 
        &aadhaar, 
        name, 
        dob, 
        address, 
        monthly_salary, 
        guarantor1_aadhaar, 
        guarantor2_aadhaar, 
        isActive, 
        createdAt, 
        createdBy
    `,
    
    // Loans table - loan accounts with EMI and balance tracking
    loans: `
        ++id, 
        account_id, 
        principal_amount, 
        interest_rate, 
        tenure_months, 
        emi_amount, 
        outstanding_principal, 
        outstanding_interest, 
        status, 
        disbursement_date, 
        maturity_date, 
        created_by, 
        created_at
    `,
    
    // Loan payments table - EMI payment records
    loan_payments: `
        ++id, 
        loan_id, 
        payment_amount, 
        principal_component, 
        interest_component, 
        payment_date, 
        payment_month, 
        is_late, 
        late_fee, 
        operator_id, 
        created_at
    `,
    
    // Fixed deposits table
    fixed_deposits: `
        ++id, 
        account_id, 
        principal_amount, 
        interest_rate, 
        tenure_months, 
        maturity_amount, 
        deposit_date, 
        maturity_date, 
        status, 
        auto_renewal, 
        created_by, 
        created_at
    `,
    
    // Recurring deposits table
    recurring_deposits: `
        ++id, 
        account_id, 
        monthly_amount, 
        interest_rate, 
        tenure_months, 
        total_collected, 
        maturity_amount, 
        start_date, 
        maturity_date, 
        status, 
        created_by, 
        created_at
    `,
    
    // RD collections table - monthly collection records
    rd_collections: `
        ++id, 
        rd_id, 
        collection_amount, 
        collection_date, 
        collection_month, 
        is_late, 
        late_fee, 
        operator_id, 
        created_at
    `,
    
    // System configuration table
    system_config: `
        &config_key, 
        config_value, 
        description, 
        updated_by, 
        updated_at
    `,
    
    // Certificates table - generated certificates tracking
    certificates: `
        ++id, 
        certificate_type, 
        account_id, 
        reference_id, 
        certificate_number, 
        issue_date, 
        file_path, 
        generated_by, 
        created_at
    `
});

/**
 * Database Event Handlers
 */
db.operators.hook('creating', function (primKey, obj, trans) {
    obj.createdAt = new Date().toISOString();
    obj.isActive = obj.isActive !== false; // Default to true
});

db.accounts.hook('creating', function (primKey, obj, trans) {
    obj.createdAt = new Date().toISOString();
    obj.isActive = obj.isActive !== false; // Default to true
});

db.loans.hook('creating', function (primKey, obj, trans) {
    obj.created_at = new Date().toISOString();
    obj.status = obj.status || 'ACTIVE';
    obj.outstanding_interest = obj.outstanding_interest || 0;
});

db.loan_payments.hook('creating', function (primKey, obj, trans) {
    obj.created_at = new Date().toISOString();
    obj.is_late = obj.is_late || false;
    obj.late_fee = obj.late_fee || 0;
});

db.fixed_deposits.hook('creating', function (primKey, obj, trans) {
    obj.created_at = new Date().toISOString();
    obj.status = obj.status || 'ACTIVE';
    obj.auto_renewal = obj.auto_renewal || false;
});

db.recurring_deposits.hook('creating', function (primKey, obj, trans) {
    obj.created_at = new Date().toISOString();
    obj.status = obj.status || 'ACTIVE';
    obj.total_collected = obj.total_collected || 0;
});

db.rd_collections.hook('creating', function (primKey, obj, trans) {
    obj.created_at = new Date().toISOString();
    obj.is_late = obj.is_late || false;
    obj.late_fee = obj.late_fee || 0;
});

db.system_config.hook('creating', function (primKey, obj, trans) {
    obj.updated_at = new Date().toISOString();
});

db.system_config.hook('updating', function (modifications, primKey, obj, trans) {
    modifications.updated_at = new Date().toISOString();
});

db.certificates.hook('creating', function (primKey, obj, trans) {
    obj.created_at = new Date().toISOString();
    obj.issue_date = obj.issue_date || new Date().toISOString().split('T')[0];
});

/**
 * Database Utility Functions
 */

/**
 * Initialize default system configuration
 */
export async function initializeSystemConfig() {
    const existingConfig = await db.system_config.count();
    
    if (existingConfig === 0) {
        const defaultConfig = [
            { config_key: 'loan_interest_rate', config_value: '12.0', description: 'Default loan interest rate (%)' },
            { config_key: 'fd_interest_rate_1yr', config_value: '7.5', description: '1 year FD interest rate (%)' },
            { config_key: 'fd_interest_rate_2yr', config_value: '8.0', description: '2 year FD interest rate (%)' },
            { config_key: 'fd_interest_rate_3yr', config_value: '8.5', description: '3+ year FD interest rate (%)' },
            { config_key: 'rd_interest_rate', config_value: '7.0', description: 'RD interest rate (%)' },
            { config_key: 'max_loan_amount', config_value: '1000000', description: 'Maximum loan amount (₹)' },
            { config_key: 'retirement_age', config_value: '58', description: 'Retirement age (years)' },
            { config_key: 'max_loan_tenure_years', config_value: '10', description: 'Maximum loan tenure (years)' },
            { config_key: 'loan_eligibility_multiplier', config_value: '36', description: 'Loan eligibility multiplier (salary × N)' },
            { config_key: 'max_emi_percentage', config_value: '50', description: 'Maximum EMI as % of salary' },
            { config_key: 'min_fd_amount', config_value: '10000', description: 'Minimum FD amount (₹)' },
            { config_key: 'min_rd_amount', config_value: '1000', description: 'Minimum RD monthly amount (₹)' }
        ];
        
        await db.system_config.bulkAdd(defaultConfig);
        console.log('Default system configuration initialized');
    }
}

/**
 * Get configuration value by key
 */
export async function getConfigValue(key, defaultValue = null) {
    try {
        const config = await db.system_config.get(key);
        return config ? config.config_value : defaultValue;
    } catch (error) {
        console.error('Error getting config value:', error);
        return defaultValue;
    }
}

/**
 * Set configuration value
 */
export async function setConfigValue(key, value, updatedBy = null) {
    try {
        await db.system_config.put({
            config_key: key,
            config_value: value.toString(),
            updated_by: updatedBy,
            updated_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error setting config value:', error);
        throw error;
    }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth() {
    try {
        const tables = [
            'operators', 'accounts', 'loans', 'loan_payments',
            'fixed_deposits', 'recurring_deposits', 'rd_collections',
            'system_config', 'certificates'
        ];
        
        const health = {};
        
        for (const table of tables) {
            health[table] = await db[table].count();
        }
        
        return {
            status: 'healthy',
            tables: health,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Export database for backup
 */
export async function exportDatabase() {
    try {
        const data = {
            operators: await db.operators.toArray(),
            accounts: await db.accounts.toArray(),
            loans: await db.loans.toArray(),
            loan_payments: await db.loan_payments.toArray(),
            fixed_deposits: await db.fixed_deposits.toArray(),
            recurring_deposits: await db.recurring_deposits.toArray(),
            rd_collections: await db.rd_collections.toArray(),
            system_config: await db.system_config.toArray(),
            certificates: await db.certificates.toArray(),
            export_metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0',
                database_name: db.name
            }
        };
        
        return data;
    } catch (error) {
        console.error('Error exporting database:', error);
        throw error;
    }
}

/**
 * Handle database open event
 */
db.ready(async function() {
    console.log('Database opened successfully:', db.name);
    await initializeSystemConfig();
});

// Export the database instance as default
export default db;