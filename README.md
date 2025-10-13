# SumanglamMultiState - Complete Banking Software

🏦 **Complete banking software for Sumanglam Multi State Society with full IndexedDB persistence**

## ✨ Features

### 🔐 **Authentication & Security**
- Secure login system with role-based access (Admin/Operator)
- Session management with automatic timeout
- Complete audit trail for all operations
- Admin-only access controls for sensitive functions

### 👥 **Operator Management** (Admin Only)
- Add, edit, and manage operators
- Unique username and Aadhaar validation
- Role assignment (Admin/Regular Operator)
- Activate/deactivate operators
- Cannot delete last admin user (safety feature)

### 📋 **Account Management**
- Create accounts with unique Aadhaar validation
- Complete account holder details (Name, DOB, Aadhaar, Address, Salary)
- Two guarantors per account with full details
- Document upload simulation
- Search and filter functionality
- Account activation/deactivation

### 💰 **Loan Management**
- **Automated Eligibility Checking**: Monthly Salary × 36
- **EMI Calculation**: Standard banking formula `EMI = [P × R × (1+R)^N] / [(1+R)^N - 1]`
- **Age-based Tenure Limits**: Maximum until retirement age (58)
- **EMI Capacity Validation**: Total EMI ≤ 50% of monthly salary
- **Outstanding Balance Tracking**: Separate principal and interest
- **Payment Processing**: Record EMI payments with automatic balance updates
- **Loan Closure**: Automatic status change when fully paid

### 🏦 **Fixed Deposits (FD)**
- Create FD accounts with configurable interest rates
- **Maturity Calculations**: Compound interest formula
- Interest rate tiers by tenure (1yr, 2yr, 3yr+)
- Maturity date tracking and notifications
- FD certificates generation
- Premature closure options

### 📈 **Recurring Deposits (RD)**
- Create RD accounts with monthly collection scheduling
- **Collection Tracking**: Record monthly RD collections
- **Maturity Calculations**: Series compound interest formula
- Collection reminders for pending months
- RD certificates generation
- Flexible collection amounts

### 📊 **Comprehensive Reports**
- **Monthly EMI Report**: Account-wise EMI list with outstanding balances
- **Upcoming Maturities**: FD/RD renewals for next month
- **Daily Reminders**: Missed EMIs, pending RD collections, overdue maturities
- **Summary Dashboard**: Portfolio statistics and recent activities
- **Export Functionality**: All reports can be printed or exported

### 📜 **Certificate Generation**
- **Auto-generated Certificates**: Loan completion, FD opening, RD opening
- **Professional Templates**: With signature spaces for Secretary and Director
- **Certificate Tracking**: Unique numbering and regeneration capability
- **PDF Format**: Ready for printing and official use

### ⚙️ **System Configuration** (Admin Only)
- **Interest Rate Management**: Configure loan, FD, and RD rates
- **System Parameters**: Max loan amounts, eligibility multipliers, EMI limits
- **Data Export/Import**: Complete database backup and restore
- **Database Statistics**: Real-time record counts and system health

## 🗄️ **Persistence Technology**

**IndexedDB with Dexie.js** - All data persists across browser sessions when served over HTTP:

- **9 Object Stores**: operators, accounts, loans, loan_payments, fixed_deposits, recurring_deposits, rd_collections, system_config, certificates
- **Transactional Updates**: Atomic operations ensure data integrity
- **Indexed Queries**: Fast lookups and filtering
- **Offline Capability**: Works without internet connection
- **No Server Required**: Pure client-side persistence

## 🚀 **Quick Start**

### **Prerequisites**
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- HTTP server (for persistence - do not open as file://)

### **Option 1: VS Code Live Server** (Recommended)
1. Install VS Code with "Live Server" extension
2. Open the project folder in VS Code
3. Right-click `index.html` → "Open with Live Server"
4. Browser opens automatically with HTTP server

### **Option 2: Node.js http-server**
```bash
npx http-server -p 8000
# Then open: http://localhost:8000
```

### **Option 3: PHP Built-in Server**
```bash
php -S localhost:8000
# Then open: http://localhost:8000
```

## 🔑 **Default Login**

```
Username: admin
Password: admin123
```

**⚠️ Important**: Change the default password immediately after first login!

## 📋 **Testing Persistence**

1. **Login** as admin with default credentials
2. **Add operators** with different roles
3. **Create accounts** with unique Aadhaar numbers
4. **Process loans** with automatic eligibility validation
5. **Record payments** and verify balance updates
6. **Create FD/RD** and verify maturity calculations
7. **Generate reports** and verify data consistency
8. **Close browser** completely
9. **Reopen** http://localhost:8000
10. **Verify** all data persists perfectly!

## 💼 **Business Rules**

### **Loan Eligibility**
- Basic eligibility = Monthly Salary × 36
- Existing loans reduce available eligibility
- Total EMI cannot exceed 50% of monthly salary
- Maximum tenure: 10 years or until retirement age (58)
- Configurable maximum loan amount

### **Interest Calculations**
- **Loans**: Monthly reducing balance with standard EMI formula
- **Fixed Deposits**: Annual compounding
- **Recurring Deposits**: Monthly compounding for investment series

## 🏗️ **Technical Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │◄──►│   IndexedDB     │◄──►│ Service Worker  │
│   (Frontend)    │    │   (Database)    │    │   (Caching)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
   User Interface         Persistent Storage        Offline Assets
   - HTML/CSS/JS         - Dexie.js Wrapper        - Static Cache
   - Form Validation     - Transaction Support     - HTTP Cache
   - Real-time Updates   - Indexed Lookups         - Offline Ready
```

## 🔧 **Configuration**

### **Default System Settings**
- Loan Interest Rate: 12%
- FD Rates: 7.5% (1yr), 8% (2yr), 8.5% (3yr)
- RD Rate: 7%
- Max Loan Amount: ₹10,00,000
- Retirement Age: 58 years
- Loan Eligibility: Salary × 36
- Max EMI: 50% of salary

## 🛡️ **Security Features**

- **Password Security**: Secure password requirements and validation
- **Session Management**: Automatic timeout and secure session handling
- **Input Validation**: Comprehensive sanitization and validation
- **Access Control**: Role-based permissions (Admin vs Operator)
- **Audit Logging**: Complete transaction trail with operator identification
- **Data Integrity**: Transactional operations prevent data corruption

## 🔄 **Backup & Recovery**

### **Data Export**
- Complete database export to JSON format
- Includes all tables with timestamps
- Downloadable backup files
- Version-controlled export format

### **Data Import**
- Restore from JSON backup files
- Data validation before import
- Complete database replacement
- Rollback capability

---

**Built with ❤️ for Sumanglam Multi State Society**  
*Complete Banking Software with Full IndexedDB Persistence*