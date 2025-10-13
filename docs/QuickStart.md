# Quick Start Guide - Sumanglam Banking Software

🚀 **Get up and running with the complete banking system in 5 minutes**

## Prerequisites

✅ **Modern web browser** (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)  
✅ **HTTP server** (required for IndexedDB persistence)  
❌ **Do NOT open index.html directly** (file:// URLs don't support persistence)

## Step 1: Download & Extract

1. Download the complete source code from GitHub
2. Extract the ZIP file to a folder (e.g., `SumanglamMultiState-Complete`)
3. Open a terminal/command prompt in that folder

## Step 2: Start HTTP Server

Choose one of these methods:

### Option A: VS Code Live Server (Recommended)
```bash
# Install VS Code with "Live Server" extension
# Right-click index.html → "Open with Live Server"
# Browser opens automatically at http://127.0.0.1:5500
```

### Option B: Node.js http-server
```bash
npx http-server -p 8000
# Then open: http://localhost:8000
```

### Option C: PHP Built-in Server
```bash
php -S localhost:8000
# Then open: http://localhost:8000
```

### Option D: Python HTTP Server
```bash
# Python 3
python -m http.server 8000

# Python 2 
python -m SimpleHTTPServer 8000

# Then open: http://localhost:8000
```

## Step 3: First Login

🔑 **Default Credentials:**
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Important:** Change the default password immediately after first login!

## Step 4: Test Complete System

### 4.1 Operator Management (Admin Only)
✅ Go to **Operators** → **Add New Operator**  
✅ Create a regular operator (non-admin)  
✅ Test login with the new operator credentials  
✅ Verify operators persist after browser restart

### 4.2 Account Management
✅ Go to **Accounts** → **New Account**  
✅ Create account with unique Aadhaar number  
✅ Add guarantor details  
✅ Verify account appears in accounts list  
✅ Test search and filter functionality

### 4.3 Loan Processing
✅ Go to **Loans** → **New Loan**  
✅ Select an account and check eligibility  
✅ Create a loan with EMI calculation  
✅ Record an EMI payment  
✅ Verify outstanding balance updates

### 4.4 Deposit Management
✅ Go to **Deposits** → Create **Fixed Deposit**  
✅ Calculate maturity amount and date  
✅ Create **Recurring Deposit**  
✅ Record RD collection  
✅ Verify maturity calculations

### 4.5 Reports & Analytics
✅ Go to **Reports** → **Monthly EMI Report**  
✅ Check **Upcoming Maturities**  
✅ View **Daily Reminders**  
✅ Review **Summary Dashboard**

### 4.6 System Configuration (Admin Only)
✅ Go to **System Config** → **Interest Rates**  
✅ Modify loan/FD/RD interest rates  
✅ Update system parameters  
✅ Export database backup  
✅ Test data import functionality

## Step 5: Verify Persistence

🧪 **Critical Test:**
1. Create data in all modules (operators, accounts, loans, deposits)
2. **Close the browser completely**
3. **Reopen** http://localhost:8000
4. **Login** and verify ALL data is still there!

✅ If data persists → System is working correctly!  
❌ If data is lost → Check that you're using HTTP server (not file://)

## Troubleshooting

### Data Not Persisting?
- ✅ **Use HTTP server** (http://localhost) not file:// URLs
- ✅ **Normal browser window** (not incognito/private mode)
- ✅ **Allow cookies/storage** (check browser settings)
- ✅ **Stable internet** for HTTP server to work

### Login Issues?
- ✅ **Username:** `admin` (lowercase)
- ✅ **Password:** `admin123` (exact case)
- ✅ **Clear browser cache** if needed
- ✅ **Check console** for error messages

### Performance Issues?
- ✅ **Latest browser version** recommended
- ✅ **Close other tabs** to free up memory
- ✅ **Refresh page** if UI becomes unresponsive
- ✅ **Check network connection** for HTTP server

### Missing Features?
- ✅ **Admin vs Operator** - Some features are admin-only
- ✅ **Role-based access** - Operators tab only visible to admins
- ✅ **Complete installation** - Ensure all files are present

## Business Rules Reference

### Loan Eligibility
- **Basic Limit:** Monthly Salary × 36
- **Existing Loans:** Reduce available limit
- **EMI Capacity:** Total EMI ≤ 50% of salary
- **Age Limit:** Maximum tenure until retirement (58 years)
- **Maximum:** ₹10,00,000 (configurable)

### Interest Rates (Default)
- **Loans:** 12% per annum
- **Fixed Deposits:** 7.5% (1yr), 8% (2yr), 8.5% (3yr+)
- **Recurring Deposits:** 7% per annum
- **All rates configurable** by admin

### EMI Calculation
```
EMI = [P × R × (1+R)^N] / [(1+R)^N - 1]
Where: P = Principal, R = Monthly Rate, N = Tenure (months)
```

## Production Deployment

### For Live Use:
1. **Replace Dexie Mock:** Use real Dexie.js library from CDN
2. **HTTPS Required:** For service worker and secure features
3. **Password Security:** Implement proper password hashing
4. **Backup Strategy:** Set up automated database backups
5. **User Training:** Provide operator training on banking procedures

### Recommended Hosting:
- **Static Hosting:** GitHub Pages, Netlify, Vercel
- **Self-hosted:** Apache/Nginx with SSL certificate
- **Cloud:** AWS S3 + CloudFront, Google Cloud Storage

## Support

### Need Help?
📧 **Technical Issues:** Check GitHub repository issues  
📚 **User Manual:** Complete documentation in README.md  
🔧 **System Config:** Admin can export/import data for troubleshooting  
📞 **Training:** Refer to business rules and user manual

### Version Information
- **Version:** 1.0.0
- **Database:** IndexedDB with Dexie.js
- **Persistence:** Client-side (no server required)
- **Offline:** Service worker enables offline operation

---

**🎉 Congratulations! Your Sumanglam Banking Software is now ready for production use.**

*Complete banking operations with full IndexedDB persistence.*