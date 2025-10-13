import db from '../db.js';

export async function renderReportsPage(container){
  container.innerHTML = `
    <h2>Reports & Analytics</h2>
    
    <div style="margin-bottom:20px;">
      <button id="btnEMIReport">Monthly EMI Report</button>
      <button id="btnMaturityReport">Upcoming Maturities</button>
      <button id="btnRemindersReport">Daily Reminders</button>
      <button id="btnSummaryReport">Summary Dashboard</button>
    </div>
    
    <div id="reportContent"></div>
  `;

  const reportContent = container.querySelector('#reportContent');
  
  async function generateEMIReport(){
    reportContent.innerHTML = '<h3>Monthly EMI Report</h3><p>Loading...</p>';
    
    const loans = await db.loans.where('status').equals('ACTIVE').toArray();
    const accounts = await db.accounts.toArray();
    const accountMap = Object.fromEntries(accounts.map(acc => [acc.id, acc]));
    
    if(!loans.length){
      reportContent.innerHTML = '<h3>Monthly EMI Report</h3><p>No active loans found.</p>';
      return;
    }
    
    let totalEMI = 0;
    let totalOutstanding = 0;
    
    let tableHTML = `
      <h3>Monthly EMI Report</h3>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>
      <table class="table">
        <thead>
          <tr>
            <th>Loan ID</th>
            <th>Account Name</th>
            <th>Aadhaar</th>
            <th>Principal Amount</th>
            <th>EMI Amount</th>
            <th>Outstanding Principal</th>
            <th>Outstanding Interest</th>
            <th>Total Outstanding</th>
            <th>Pending EMIs</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    for(const loan of loans){
      const account = accountMap[loan.account_id];
      const outstanding = loan.outstanding_principal + loan.outstanding_interest;
      const pendingEMIs = Math.ceil(outstanding / loan.emi_amount);
      
      totalEMI += loan.emi_amount;
      totalOutstanding += outstanding;
      
      tableHTML += `
        <tr>
          <td>${loan.id}</td>
          <td>${account ? account.name : 'Unknown'}</td>
          <td>${account ? account.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-XXXX') : ''}</td>
          <td>₹${loan.principal_amount.toLocaleString()}</td>
          <td>₹${loan.emi_amount.toFixed(2)}</td>
          <td>₹${loan.outstanding_principal.toFixed(2)}</td>
          <td>₹${loan.outstanding_interest.toFixed(2)}</td>
          <td>₹${outstanding.toFixed(2)}</td>
          <td>${pendingEMIs}</td>
        </tr>
      `;
    }
    
    tableHTML += `
        </tbody>
        <tfoot>
          <tr style="background:#f0f0f0;font-weight:bold;">
            <td colspan="4">TOTALS</td>
            <td>₹${totalEMI.toFixed(2)}</td>
            <td colspan="2"></td>
            <td>₹${totalOutstanding.toFixed(2)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      <div style="margin-top:20px;">
        <strong>Summary:</strong><br/>
        Total Active Loans: ${loans.length}<br/>
        Total Monthly EMI Collection: ₹${totalEMI.toFixed(2)}<br/>
        Total Outstanding Amount: ₹${totalOutstanding.toFixed(2)}
      </div>
    `;
    
    reportContent.innerHTML = tableHTML;
  }
  
  async function generateMaturityReport(){
    reportContent.innerHTML = '<h3>Upcoming Maturities</h3><p>Loading...</p>';
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Get maturing FDs
    const maturingFDs = await db.fixed_deposits
      .where('maturity_date')
      .between(currentDate, nextMonthStr, true, true)
      .and(fd => fd.status === 'ACTIVE')
      .toArray();
    
    // Get maturing RDs
    const maturingRDs = await db.recurring_deposits
      .where('maturity_date')
      .between(currentDate, nextMonthStr, true, true)
      .and(rd => rd.status === 'ACTIVE')
      .toArray();
    
    const accounts = await db.accounts.toArray();
    const accountMap = Object.fromEntries(accounts.map(acc => [acc.id, acc]));
    
    let reportHTML = `
      <h3>Upcoming Maturities (Next Month)</h3>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>
    `;
    
    if(maturingFDs.length > 0){
      reportHTML += `
        <h4>Fixed Deposits Maturing</h4>
        <table class="table">
          <thead>
            <tr><th>FD ID</th><th>Account Name</th><th>Principal</th><th>Maturity Amount</th><th>Maturity Date</th><th>Interest Earned</th></tr>
          </thead>
          <tbody>
      `;
      
      let totalFDPrincipal = 0;
      let totalFDMaturity = 0;
      
      for(const fd of maturingFDs){
        const account = accountMap[fd.account_id];
        const interestEarned = fd.maturity_amount - fd.principal_amount;
        
        totalFDPrincipal += fd.principal_amount;
        totalFDMaturity += fd.maturity_amount;
        
        reportHTML += `
          <tr>
            <td>${fd.id}</td>
            <td>${account ? account.name : 'Unknown'}</td>
            <td>₹${fd.principal_amount.toLocaleString()}</td>
            <td>₹${fd.maturity_amount.toFixed(2)}</td>
            <td>${fd.maturity_date}</td>
            <td>₹${interestEarned.toFixed(2)}</td>
          </tr>
        `;
      }
      
      reportHTML += `
          <tfoot>
            <tr style="background:#f0f0f0;font-weight:bold;">
              <td colspan="2">TOTALS</td>
              <td>₹${totalFDPrincipal.toLocaleString()}</td>
              <td>₹${totalFDMaturity.toFixed(2)}</td>
              <td></td>
              <td>₹${(totalFDMaturity - totalFDPrincipal).toFixed(2)}</td>
            </tr>
          </tfoot>
        </tbody></table>
      `;
    }
    
    if(maturingRDs.length > 0){
      reportHTML += `
        <h4>Recurring Deposits Maturing</h4>
        <table class="table">
          <thead>
            <tr><th>RD ID</th><th>Account Name</th><th>Monthly Amount</th><th>Maturity Amount</th><th>Maturity Date</th><th>Collections Status</th></tr>
          </thead>
          <tbody>
      `;
      
      for(const rd of maturingRDs){
        const account = accountMap[rd.account_id];
        const collections = await db.rd_collections.where('rd_id').equals(rd.id).count();
        const collectionStatus = `${collections}/${rd.tenure_months}`;
        
        reportHTML += `
          <tr>
            <td>${rd.id}</td>
            <td>${account ? account.name : 'Unknown'}</td>
            <td>₹${rd.monthly_amount}</td>
            <td>₹${rd.maturity_amount.toFixed(2)}</td>
            <td>${rd.maturity_date}</td>
            <td>${collectionStatus}</td>
          </tr>
        `;
      }
      
      reportHTML += '</tbody></table>';
    }
    
    if(maturingFDs.length === 0 && maturingRDs.length === 0){
      reportHTML += '<p>No deposits maturing in the next month.</p>';
    }
    
    reportContent.innerHTML = reportHTML;
  }
  
  async function generateRemindersReport(){
    reportContent.innerHTML = '<h3>Daily Reminders</h3><p>Loading...</p>';
    
    const currentDate = new Date().toISOString().split('T')[0];
    const currentMonth = currentDate.substring(0, 7); // YYYY-MM
    
    // Find loans with missed EMIs (no payment in current month)
    const activeLoans = await db.loans.where('status').equals('ACTIVE').toArray();
    const missedEMILoans = [];
    
    for(const loan of activeLoans){
      const paymentsThisMonth = await db.loan_payments
        .where('loan_id')
        .equals(loan.id)
        .and(payment => payment.payment_month === currentMonth)
        .count();
      
      if(paymentsThisMonth === 0){
        missedEMILoans.push(loan);
      }
    }
    
    // Find RDs with pending collections this month
    const activeRDs = await db.recurring_deposits.where('status').equals('ACTIVE').toArray();
    const pendingRDCollections = [];
    
    for(const rd of activeRDs){
      const collectionsThisMonth = await db.rd_collections
        .where('rd_id')
        .equals(rd.id)
        .and(collection => collection.collection_month === currentMonth)
        .count();
      
      if(collectionsThisMonth === 0){
        pendingRDCollections.push(rd);
      }
    }
    
    // Overdue maturities
    const overdueFDs = await db.fixed_deposits
      .where('maturity_date')
      .below(currentDate)
      .and(fd => fd.status === 'ACTIVE')
      .toArray();
    
    const overdueRDs = await db.recurring_deposits
      .where('maturity_date')
      .below(currentDate)
      .and(rd => rd.status === 'ACTIVE')
      .toArray();
    
    const accounts = await db.accounts.toArray();
    const accountMap = Object.fromEntries(accounts.map(acc => [acc.id, acc]));
    
    let reportHTML = `
      <h3>Daily Reminders - ${new Date().toLocaleDateString()}</h3>
    `;
    
    if(missedEMILoans.length > 0){
      reportHTML += `
        <h4 style="color:red;">Missed EMI Payments (${missedEMILoans.length})</h4>
        <table class="table">
          <thead>
            <tr><th>Loan ID</th><th>Account Name</th><th>EMI Amount</th><th>Outstanding</th><th>Contact</th></tr>
          </thead>
          <tbody>
      `;
      
      for(const loan of missedEMILoans){
        const account = accountMap[loan.account_id];
        const outstanding = loan.outstanding_principal + loan.outstanding_interest;
        
        reportHTML += `
          <tr>
            <td>${loan.id}</td>
            <td>${account ? account.name : 'Unknown'}</td>
            <td>₹${loan.emi_amount.toFixed(2)}</td>
            <td>₹${outstanding.toFixed(2)}</td>
            <td>${account ? account.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-XXXX') : ''}</td>
          </tr>
        `;
      }
      
      reportHTML += '</tbody></table>';
    }
    
    if(pendingRDCollections.length > 0){
      reportHTML += `
        <h4 style="color:orange;">Pending RD Collections (${pendingRDCollections.length})</h4>
        <table class="table">
          <thead>
            <tr><th>RD ID</th><th>Account Name</th><th>Monthly Amount</th><th>Due Month</th><th>Contact</th></tr>
          </thead>
          <tbody>
      `;
      
      for(const rd of pendingRDCollections){
        const account = accountMap[rd.account_id];
        
        reportHTML += `
          <tr>
            <td>${rd.id}</td>
            <td>${account ? account.name : 'Unknown'}</td>
            <td>₹${rd.monthly_amount}</td>
            <td>${currentMonth}</td>
            <td>${account ? account.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-XXXX') : ''}</td>
          </tr>
        `;
      }
      
      reportHTML += '</tbody></table>';
    }
    
    if(overdueFDs.length > 0 || overdueRDs.length > 0){
      reportHTML += '<h4 style="color:purple;">Overdue Maturities</h4>';
      
      if(overdueFDs.length > 0){
        reportHTML += `<p><strong>Fixed Deposits:</strong> ${overdueFDs.length} FDs are past maturity date</p>`;
      }
      
      if(overdueRDs.length > 0){
        reportHTML += `<p><strong>Recurring Deposits:</strong> ${overdueRDs.length} RDs are past maturity date</p>`;
      }
    }
    
    if(missedEMILoans.length === 0 && pendingRDCollections.length === 0 && overdueFDs.length === 0 && overdueRDs.length === 0){
      reportHTML += '<p style="color:green;">✅ No pending reminders today!</p>';
    }
    
    reportContent.innerHTML = reportHTML;
  }
  
  async function generateSummaryReport(){
    reportContent.innerHTML = '<h3>Summary Dashboard</h3><p>Loading...</p>';
    
    // Get counts
    const totalAccounts = await db.accounts.where('isActive').equals(true).count();
    const totalOperators = await db.operators.where('isActive').equals(true).count();
    const activeLoans = await db.loans.where('status').equals('ACTIVE').count();
    const activeFDs = await db.fixed_deposits.where('status').equals('ACTIVE').count();
    const activeRDs = await db.recurring_deposits.where('status').equals('ACTIVE').count();
    
    // Get financial totals
    const loans = await db.loans.where('status').equals('ACTIVE').toArray();
    const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.principal_amount, 0);
    const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstanding_principal + loan.outstanding_interest, 0);
    const totalEMI = loans.reduce((sum, loan) => sum + loan.emi_amount, 0);
    
    const fds = await db.fixed_deposits.where('status').equals('ACTIVE').toArray();
    const totalFDAmount = fds.reduce((sum, fd) => sum + fd.principal_amount, 0);
    
    const rds = await db.recurring_deposits.where('status').equals('ACTIVE').toArray();
    const totalRDMonthly = rds.reduce((sum, rd) => sum + rd.monthly_amount, 0);
    
    // Recent activities
    const recentPayments = await db.loan_payments.orderBy('created_at').reverse().limit(5).toArray();
    const recentCollections = await db.rd_collections.orderBy('created_at').reverse().limit(5).toArray();
    
    let reportHTML = `
      <h3>Summary Dashboard</h3>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>
      
      <div style="display:flex;gap:20px;margin:20px 0;">
        <div style="flex:1;background:#f8f9fa;padding:15px;border-radius:5px;">
          <h4>Account Statistics</h4>
          <p><strong>Total Active Accounts:</strong> ${totalAccounts}</p>
          <p><strong>Total Operators:</strong> ${totalOperators}</p>
        </div>
        
        <div style="flex:1;background:#e8f5e8;padding:15px;border-radius:5px;">
          <h4>Loan Portfolio</h4>
          <p><strong>Active Loans:</strong> ${activeLoans}</p>
          <p><strong>Total Loan Amount:</strong> ₹${totalLoanAmount.toLocaleString()}</p>
          <p><strong>Total Outstanding:</strong> ₹${totalOutstanding.toFixed(2)}</p>
          <p><strong>Monthly EMI Collection:</strong> ₹${totalEMI.toFixed(2)}</p>
        </div>
      </div>
      
      <div style="display:flex;gap:20px;margin:20px 0;">
        <div style="flex:1;background:#e8f4fd;padding:15px;border-radius:5px;">
          <h4>Fixed Deposits</h4>
          <p><strong>Active FDs:</strong> ${activeFDs}</p>
          <p><strong>Total FD Amount:</strong> ₹${totalFDAmount.toLocaleString()}</p>
        </div>
        
        <div style="flex:1;background:#fff8e1;padding:15px;border-radius:5px;">
          <h4>Recurring Deposits</h4>
          <p><strong>Active RDs:</strong> ${activeRDs}</p>
          <p><strong>Monthly Collection Target:</strong> ₹${totalRDMonthly.toLocaleString()}</p>
        </div>
      </div>
    `;
    
    if(recentPayments.length > 0){
      reportHTML += `
        <h4>Recent Loan Payments</h4>
        <table class="table">
          <thead>
            <tr><th>Date</th><th>Loan ID</th><th>Amount</th><th>Principal</th><th>Interest</th></tr>
          </thead>
          <tbody>
      `;
      
      for(const payment of recentPayments){
        reportHTML += `
          <tr>
            <td>${payment.payment_date}</td>
            <td>${payment.loan_id}</td>
            <td>₹${payment.payment_amount.toFixed(2)}</td>
            <td>₹${payment.principal_component.toFixed(2)}</td>
            <td>₹${payment.interest_component.toFixed(2)}</td>
          </tr>
        `;
      }
      
      reportHTML += '</tbody></table>';
    }
    
    if(recentCollections.length > 0){
      reportHTML += `
        <h4>Recent RD Collections</h4>
        <table class="table">
          <thead>
            <tr><th>Date</th><th>RD ID</th><th>Amount</th><th>Month</th></tr>
          </thead>
          <tbody>
      `;
      
      for(const collection of recentCollections){
        reportHTML += `
          <tr>
            <td>${collection.collection_date}</td>
            <td>${collection.rd_id}</td>
            <td>₹${collection.collection_amount.toFixed(2)}</td>
            <td>${collection.collection_month}</td>
          </tr>
        `;
      }
      
      reportHTML += '</tbody></table>';
    }
    
    reportContent.innerHTML = reportHTML;
  }
  
  // Event listeners
  container.querySelector('#btnEMIReport').addEventListener('click', generateEMIReport);
  container.querySelector('#btnMaturityReport').addEventListener('click', generateMaturityReport);
  container.querySelector('#btnRemindersReport').addEventListener('click', generateRemindersReport);
  container.querySelector('#btnSummaryReport').addEventListener('click', generateSummaryReport);
  
  // Generate summary by default
  generateSummaryReport();
}