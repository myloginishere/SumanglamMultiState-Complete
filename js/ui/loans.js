import db from '../db.js';
import { currentUser } from '../auth.js';

function calculateEMI(principal, annualRate, tenureMonths) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return principal / tenureMonths;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
         (Math.pow(1 + monthlyRate, tenureMonths) - 1);
}

function calculateAge(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export async function renderLoansPage(container){
  container.innerHTML = `
    <h2>Loans Management</h2>
    
    <section>
      <h3>Check Eligibility & Create Loan</h3>
      <form id="loanForm">
        <input type="hidden" name="id" />
        <label>Select Account 
          <select name="account_id" id="accountSelect" required>
            <option value="">-- Select Account --</option>
          </select>
        </label>
        <div id="eligibilityInfo" style="background:#f0f8ff;padding:10px;margin:10px 0;display:none;"></div>
        
        <label>Loan Amount <input name="loan_amount" type="number" required min="1" step="0.01"></label>
        <label>Interest Rate (%) <input name="interest_rate" type="number" required step="0.01" value="12"></label>
        <label>Tenure (Months) <input name="tenure_months" type="number" required min="1" max="120"></label>
        
        <div id="emiInfo" style="background:#f8f8f0;padding:10px;margin:10px 0;display:none;"></div>
        
        <button type="submit">Create Loan</button>
        <button type="button" id="btnCheckEligibility">Check Eligibility</button>
        <button type="button" id="btnResetLoan">Reset</button>
      </form>
    </section>
    
    <hr/>
    
    <section>
      <h3>Loan Payments</h3>
      <form id="paymentForm">
        <label>Select Loan 
          <select name="loan_id" id="loanSelect" required>
            <option value="">-- Select Active Loan --</option>
          </select>
        </label>
        <div id="loanInfo" style="background:#fff8f0;padding:10px;margin:10px 0;display:none;"></div>
        
        <label>Payment Amount <input name="payment_amount" type="number" required min="1" step="0.01"></label>
        <label>Payment Date <input name="payment_date" type="date" required></label>
        
        <button type="submit">Record Payment</button>
      </form>
    </section>
    
    <hr/>
    
    <section>
      <h3>All Loans</h3>
      <input type="text" id="searchLoans" placeholder="Search by account name..." style="margin-bottom:10px;">
      <table class="table" id="loansTable">
        <thead>
          <tr>
            <th>Loan ID</th><th>Account</th><th>Principal</th><th>Rate %</th><th>EMI</th><th>Outstanding</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  `;

  const accountSelect = container.querySelector('#accountSelect');
  const loanSelect = container.querySelector('#loanSelect');
  const loanForm = container.querySelector('#loanForm');
  const paymentForm = container.querySelector('#paymentForm');
  const loansTable = container.querySelector('#loansTable tbody');
  const searchInput = container.querySelector('#searchLoans');
  const eligibilityInfo = container.querySelector('#eligibilityInfo');
  const emiInfo = container.querySelector('#emiInfo');
  const loanInfo = container.querySelector('#loanInfo');
  
  async function loadAccounts(){
    const accounts = await db.accounts.where('isActive').equals(true).toArray();
    accountSelect.innerHTML = '<option value="">-- Select Account --</option>';
    for(const acc of accounts){
      accountSelect.innerHTML += `<option value="${acc.id}">${acc.name} (${acc.aadhaar})</option>`;
    }
  }
  
  async function loadActiveLoans(){
    const loans = await db.loans.where('status').equals('ACTIVE').toArray();
    loanSelect.innerHTML = '<option value="">-- Select Active Loan --</option>';
    
    for(const loan of loans){
      const account = await db.accounts.get(loan.account_id);
      loanSelect.innerHTML += `<option value="${loan.id}">Loan #${loan.id} - ${account.name} (₹${loan.outstanding_principal.toLocaleString()})</option>`;
    }
  }
  
  async function checkEligibility(){
    const accountId = parseInt(accountSelect.value);
    if(!accountId) {
      eligibilityInfo.style.display = 'none';
      return;
    }
    
    const account = await db.accounts.get(accountId);
    const existingLoans = await db.loans.where('account_id').equals(accountId).and(loan => loan.status === 'ACTIVE').toArray();
    
    const basicEligibility = account.monthly_salary * 36;
    const existingOutstanding = existingLoans.reduce((sum, loan) => sum + loan.outstanding_principal + loan.outstanding_interest, 0);
    const availableEligibility = basicEligibility - existingOutstanding;
    
    const existingEMI = existingLoans.reduce((sum, loan) => sum + loan.emi_amount, 0);
    const maxEMI = account.monthly_salary * 0.5;
    const availableEMICapacity = maxEMI - existingEMI;
    
    const age = calculateAge(account.dob);
    const maxTenureYears = Math.min(10, 58 - age);
    const maxTenureMonths = maxTenureYears * 12;
    
    eligibilityInfo.innerHTML = `
      <h4>Eligibility Details</h4>
      <strong>Account:</strong> ${account.name}<br/>
      <strong>Monthly Salary:</strong> ₹${account.monthly_salary.toLocaleString()}<br/>
      <strong>Basic Eligibility:</strong> ₹${basicEligibility.toLocaleString()}<br/>
      <strong>Existing Outstanding:</strong> ₹${existingOutstanding.toLocaleString()}<br/>
      <strong>Available Eligibility:</strong> ₹${availableEligibility.toLocaleString()}<br/>
      <strong>Available EMI Capacity:</strong> ₹${availableEMICapacity.toLocaleString()}<br/>
      <strong>Max Tenure:</strong> ${maxTenureMonths} months (Age: ${age}, Retirement: 58)<br/>
      <strong>Status:</strong> ${availableEligibility > 0 && availableEMICapacity > 0 ? '<span style="color:green">Eligible</span>' : '<span style="color:red">Not Eligible</span>'}
    `;
    eligibilityInfo.style.display = 'block';
  }
  
  async function calculateEMIDisplay(){
    const loanAmount = parseFloat(loanForm.loan_amount.value) || 0;
    const interestRate = parseFloat(loanForm.interest_rate.value) || 0;
    const tenureMonths = parseInt(loanForm.tenure_months.value) || 0;
    
    if(loanAmount && interestRate && tenureMonths){
      const emi = calculateEMI(loanAmount, interestRate, tenureMonths);
      const totalAmount = emi * tenureMonths;
      const totalInterest = totalAmount - loanAmount;
      
      emiInfo.innerHTML = `
        <h4>EMI Calculation</h4>
        <strong>Monthly EMI:</strong> ₹${emi.toFixed(2)}<br/>
        <strong>Total Amount:</strong> ₹${totalAmount.toFixed(2)}<br/>
        <strong>Total Interest:</strong> ₹${totalInterest.toFixed(2)}
      `;
      emiInfo.style.display = 'block';
    } else {
      emiInfo.style.display = 'none';
    }
  }
  
  async function showLoanInfo(){
    const loanId = parseInt(loanSelect.value);
    if(!loanId){
      loanInfo.style.display = 'none';
      return;
    }
    
    const loan = await db.loans.get(loanId);
    const account = await db.accounts.get(loan.account_id);
    
    loanInfo.innerHTML = `
      <h4>Loan Details</h4>
      <strong>Account:</strong> ${account.name}<br/>
      <strong>Principal:</strong> ₹${loan.principal_amount.toLocaleString()}<br/>
      <strong>EMI Amount:</strong> ₹${loan.emi_amount.toFixed(2)}<br/>
      <strong>Outstanding Principal:</strong> ₹${loan.outstanding_principal.toFixed(2)}<br/>
      <strong>Outstanding Interest:</strong> ₹${loan.outstanding_interest.toFixed(2)}<br/>
      <strong>Total Outstanding:</strong> ₹${(loan.outstanding_principal + loan.outstanding_interest).toFixed(2)}
    `;
    loanInfo.style.display = 'block';
  }
  
  async function loadLoans(searchTerm = ''){
    const loans = await db.loans.orderBy('id').reverse().toArray();
    const accounts = await db.accounts.toArray();
    const accountMap = Object.fromEntries(accounts.map(acc => [acc.id, acc]));
    
    let filteredLoans = loans;
    if(searchTerm){
      const term = searchTerm.toLowerCase();
      filteredLoans = loans.filter(loan => {
        const account = accountMap[loan.account_id];
        return account && account.name.toLowerCase().includes(term);
      });
    }
    
    loansTable.innerHTML = '';
    if (!filteredLoans.length){
      loansTable.innerHTML = '<tr><td colspan="8">No loans found</td></tr>';
      return;
    }
    
    for (const loan of filteredLoans){
      const account = accountMap[loan.account_id];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${loan.id}</td>
        <td>${account ? account.name : 'Unknown'}</td>
        <td>₹${loan.principal_amount.toLocaleString()}</td>
        <td>${loan.interest_rate}%</td>
        <td>₹${loan.emi_amount.toFixed(2)}</td>
        <td>₹${(loan.outstanding_principal + loan.outstanding_interest).toFixed(2)}</td>
        <td>${loan.status}</td>
        <td>
          <button data-view="${loan.id}">View Details</button>
          ${loan.status === 'ACTIVE' ? `<button data-schedule="${loan.id}">EMI Schedule</button>` : ''}
        </td>`;
      loansTable.appendChild(tr);
    }
  }
  
  async function createLoan(evt){
    evt.preventDefault();
    const user = currentUser();
    
    const accountId = parseInt(loanForm.account_id.value);
    const loanAmount = parseFloat(loanForm.loan_amount.value);
    const interestRate = parseFloat(loanForm.interest_rate.value);
    const tenureMonths = parseInt(loanForm.tenure_months.value);
    
    // Eligibility check
    const account = await db.accounts.get(accountId);
    const existingLoans = await db.loans.where('account_id').equals(accountId).and(loan => loan.status === 'ACTIVE').toArray();
    
    const basicEligibility = account.monthly_salary * 36;
    const existingOutstanding = existingLoans.reduce((sum, loan) => sum + loan.outstanding_principal + loan.outstanding_interest, 0);
    const availableEligibility = basicEligibility - existingOutstanding;
    
    if(loanAmount > availableEligibility){
      alert(`Loan amount exceeds eligibility. Available: ₹${availableEligibility.toLocaleString()}`);
      return;
    }
    
    const existingEMI = existingLoans.reduce((sum, loan) => sum + loan.emi_amount, 0);
    const emi = calculateEMI(loanAmount, interestRate, tenureMonths);
    const maxEMI = account.monthly_salary * 0.5;
    
    if((existingEMI + emi) > maxEMI){
      alert(`Total EMI exceeds 50% of salary. Available EMI capacity: ₹${(maxEMI - existingEMI).toFixed(2)}`);
      return;
    }
    
    const age = calculateAge(account.dob);
    const maxTenureMonths = Math.min(10, 58 - age) * 12;
    if(tenureMonths > maxTenureMonths){
      alert(`Tenure exceeds maximum allowed. Max tenure: ${maxTenureMonths} months`);
      return;
    }
    
    try {
      const disbursementDate = new Date();
      const maturityDate = new Date(disbursementDate);
      maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);
      
      await db.loans.add({
        account_id: accountId,
        principal_amount: loanAmount,
        interest_rate: interestRate,
        tenure_months: tenureMonths,
        emi_amount: emi,
        outstanding_principal: loanAmount,
        outstanding_interest: 0,
        status: 'ACTIVE',
        disbursement_date: disbursementDate.toISOString().split('T')[0],
        maturity_date: maturityDate.toISOString().split('T')[0],
        created_by: user.id,
        created_at: new Date().toISOString()
      });
      
      loanForm.reset();
      eligibilityInfo.style.display = 'none';
      emiInfo.style.display = 'none';
      await loadLoans();
      await loadActiveLoans();
      alert('Loan created successfully');
    } catch(error) {
      alert('Error creating loan: ' + error.message);
    }
  }
  
  async function recordPayment(evt){
    evt.preventDefault();
    const user = currentUser();
    
    const loanId = parseInt(paymentForm.loan_id.value);
    const paymentAmount = parseFloat(paymentForm.payment_amount.value);
    const paymentDate = paymentForm.payment_date.value;
    
    const loan = await db.loans.get(loanId);
    if(!loan || loan.status !== 'ACTIVE'){
      alert('Invalid or inactive loan');
      return;
    }
    
    const totalOutstanding = loan.outstanding_principal + loan.outstanding_interest;
    if(paymentAmount > totalOutstanding){
      alert(`Payment amount exceeds outstanding balance: ₹${totalOutstanding.toFixed(2)}`);
      return;
    }
    
    // Calculate interest and principal components
    let interestComponent = Math.min(paymentAmount, loan.outstanding_interest);
    let principalComponent = paymentAmount - interestComponent;
    
    try {
      // Record payment
      await db.loan_payments.add({
        loan_id: loanId,
        payment_amount: paymentAmount,
        principal_component: principalComponent,
        interest_component: interestComponent,
        payment_date: paymentDate,
        payment_month: paymentDate.substring(0, 7), // YYYY-MM
        operator_id: user.id,
        created_at: new Date().toISOString()
      });
      
      // Update loan outstanding
      const newOutstandingPrincipal = loan.outstanding_principal - principalComponent;
      const newOutstandingInterest = loan.outstanding_interest - interestComponent;
      const newStatus = (newOutstandingPrincipal <= 0 && newOutstandingInterest <= 0) ? 'CLOSED' : 'ACTIVE';
      
      await db.loans.update(loanId, {
        outstanding_principal: Math.max(0, newOutstandingPrincipal),
        outstanding_interest: Math.max(0, newOutstandingInterest),
        status: newStatus
      });
      
      paymentForm.reset();
      loanInfo.style.display = 'none';
      await loadLoans();
      await loadActiveLoans();
      alert('Payment recorded successfully');
    } catch(error) {
      alert('Error recording payment: ' + error.message);
    }
  }
  
  // Event listeners
  accountSelect.addEventListener('change', checkEligibility);
  container.querySelector('#btnCheckEligibility').addEventListener('click', checkEligibility);
  
  ['loan_amount', 'interest_rate', 'tenure_months'].forEach(field => {
    loanForm[field].addEventListener('input', calculateEMIDisplay);
  });
  
  loanSelect.addEventListener('change', showLoanInfo);
  
  searchInput.addEventListener('input', (e) => {
    loadLoans(e.target.value);
  });
  
  loansTable.addEventListener('click', async (e) => {
    const viewId = e.target.getAttribute('data-view');
    const scheduleId = e.target.getAttribute('data-schedule');
    
    if(viewId){
      const loan = await db.loans.get(Number(viewId));
      const account = await db.accounts.get(loan.account_id);
      const payments = await db.loan_payments.where('loan_id').equals(Number(viewId)).toArray();
      
      let paymentsList = 'No payments yet';
      if(payments.length){
        paymentsList = payments.map(p => `${p.payment_date}: ₹${p.payment_amount}`).join('\\n');
      }
      
      alert(`Loan Details:\\nAccount: ${account.name}\\nPrincipal: ₹${loan.principal_amount.toLocaleString()}\\nEMI: ₹${loan.emi_amount.toFixed(2)}\\nOutstanding: ₹${(loan.outstanding_principal + loan.outstanding_interest).toFixed(2)}\\nStatus: ${loan.status}\\n\\nPayments:\\n${paymentsList}`);
    }
    
    if(scheduleId){
      alert('EMI Schedule feature - would show detailed payment schedule');
    }
  });
  
  loanForm.addEventListener('submit', createLoan);
  paymentForm.addEventListener('submit', recordPayment);
  container.querySelector('#btnResetLoan').addEventListener('click', () => {
    loanForm.reset();
    eligibilityInfo.style.display = 'none';
    emiInfo.style.display = 'none';
  });
  
  // Initialize
  await loadAccounts();
  await loadActiveLoans();
  await loadLoans();
  
  // Set default payment date to today
  paymentForm.payment_date.value = new Date().toISOString().split('T')[0];
}