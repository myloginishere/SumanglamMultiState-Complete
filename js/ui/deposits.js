import db from '../db.js';
import { currentUser } from '../auth.js';

function calculateFDMaturity(principal, annualRate, tenureMonths) {
  const years = tenureMonths / 12;
  return principal * Math.pow(1 + annualRate/100, years);
}

function calculateRDMaturity(monthlyAmount, annualRate, tenureMonths) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return monthlyAmount * tenureMonths;
  return monthlyAmount * (Math.pow(1 + monthlyRate, tenureMonths) - 1) / monthlyRate;
}

export async function renderDepositsPage(container){
  container.innerHTML = `
    <h2>Deposits Management</h2>
    
    <div style="display:flex;gap:20px;">
      <div style="flex:1;">
        <h3>Fixed Deposits (FD)</h3>
        <form id="fdForm">
          <label>Select Account 
            <select name="account_id" required>
              <option value="">-- Select Account --</option>
            </select>
          </label>
          <label>Deposit Amount <input name="amount" type="number" required min="10000" step="0.01"></label>
          <label>Interest Rate (%) <input name="interest_rate" type="number" required step="0.01" value="8"></label>
          <label>Tenure (Months) <input name="tenure_months" type="number" required min="12" max="60"></label>
          <div id="fdCalculation" style="background:#f0f8ff;padding:10px;margin:10px 0;display:none;"></div>
          <button type="submit">Create FD</button>
          <button type="button" id="btnCalculateFD">Calculate Maturity</button>
        </form>
        
        <hr/>
        
        <h4>All Fixed Deposits</h4>
        <table class="table" id="fdTable">
          <thead>
            <tr><th>FD ID</th><th>Account</th><th>Principal</th><th>Rate %</th><th>Maturity Amount</th><th>Maturity Date</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      
      <div style="flex:1;">
        <h3>Recurring Deposits (RD)</h3>
        <form id="rdForm">
          <label>Select Account 
            <select name="account_id" required>
              <option value="">-- Select Account --</option>
            </select>
          </label>
          <label>Monthly Amount <input name="monthly_amount" type="number" required min="1000" step="0.01"></label>
          <label>Interest Rate (%) <input name="interest_rate" type="number" required step="0.01" value="7"></label>
          <label>Tenure (Months) <input name="tenure_months" type="number" required min="12" max="120"></label>
          <div id="rdCalculation" style="background:#f8fff0;padding:10px;margin:10px 0;display:none;"></div>
          <button type="submit">Create RD</button>
          <button type="button" id="btnCalculateRD">Calculate Maturity</button>
        </form>
        
        <hr/>
        
        <h4>All Recurring Deposits</h4>
        <table class="table" id="rdTable">
          <thead>
            <tr><th>RD ID</th><th>Account</th><th>Monthly Amount</th><th>Collected</th><th>Maturity Amount</th><th>Maturity Date</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
    
    <hr/>
    
    <section>
      <h3>RD Collections</h3>
      <form id="collectionForm">
        <label>Select RD 
          <select name="rd_id" id="rdSelect" required>
            <option value="">-- Select Active RD --</option>
          </select>
        </label>
        <div id="rdInfo" style="background:#fff8f0;padding:10px;margin:10px 0;display:none;"></div>
        <label>Collection Amount <input name="collection_amount" type="number" required min="1" step="0.01"></label>
        <label>Collection Date <input name="collection_date" type="date" required></label>
        <button type="submit">Record Collection</button>
      </form>
      
      <h4>Recent Collections</h4>
      <table class="table" id="collectionsTable">
        <thead>
          <tr><th>Date</th><th>RD ID</th><th>Account</th><th>Amount</th><th>Month</th><th>Late Fee</th></tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  `;

  const fdForm = container.querySelector('#fdForm');
  const rdForm = container.querySelector('#rdForm');
  const collectionForm = container.querySelector('#collectionForm');
  const fdTable = container.querySelector('#fdTable tbody');
  const rdTable = container.querySelector('#rdTable tbody');
  const collectionsTable = container.querySelector('#collectionsTable tbody');
  const rdSelect = container.querySelector('#rdSelect');
  const fdCalculation = container.querySelector('#fdCalculation');
  const rdCalculation = container.querySelector('#rdCalculation');
  const rdInfo = container.querySelector('#rdInfo');
  
  async function loadAccounts(){
    const accounts = await db.accounts.where('isActive').equals(true).toArray();
    
    [fdForm.account_id, rdForm.account_id].forEach(select => {
      select.innerHTML = '<option value="">-- Select Account --</option>';
      for(const acc of accounts){
        select.innerHTML += `<option value="${acc.id}">${acc.name} (${acc.aadhaar})</option>`;
      }
    });
  }
  
  async function loadActiveRDs(){
    const rds = await db.recurring_deposits.where('status').equals('ACTIVE').toArray();
    rdSelect.innerHTML = '<option value="">-- Select Active RD --</option>';
    
    for(const rd of rds){
      const account = await db.accounts.get(rd.account_id);
      rdSelect.innerHTML += `<option value="${rd.id}">RD #${rd.id} - ${account.name} (₹${rd.monthly_amount}/month)</option>`;
    }
  }
  
  async function calculateFDDisplay(){
    const amount = parseFloat(fdForm.amount.value) || 0;
    const rate = parseFloat(fdForm.interest_rate.value) || 0;
    const tenure = parseInt(fdForm.tenure_months.value) || 0;
    
    if(amount && rate && tenure){
      const maturityAmount = calculateFDMaturity(amount, rate, tenure);
      const interest = maturityAmount - amount;
      const maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + tenure);
      
      fdCalculation.innerHTML = `
        <h4>FD Maturity Calculation</h4>
        <strong>Principal Amount:</strong> ₹${amount.toLocaleString()}<br/>
        <strong>Maturity Amount:</strong> ₹${maturityAmount.toFixed(2)}<br/>
        <strong>Interest Earned:</strong> ₹${interest.toFixed(2)}<br/>
        <strong>Maturity Date:</strong> ${maturityDate.toLocaleDateString()}
      `;
      fdCalculation.style.display = 'block';
    } else {
      fdCalculation.style.display = 'none';
    }
  }
  
  async function calculateRDDisplay(){
    const monthlyAmount = parseFloat(rdForm.monthly_amount.value) || 0;
    const rate = parseFloat(rdForm.interest_rate.value) || 0;
    const tenure = parseInt(rdForm.tenure_months.value) || 0;
    
    if(monthlyAmount && rate && tenure){
      const maturityAmount = calculateRDMaturity(monthlyAmount, rate, tenure);
      const totalInvested = monthlyAmount * tenure;
      const interest = maturityAmount - totalInvested;
      const maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + tenure);
      
      rdCalculation.innerHTML = `
        <h4>RD Maturity Calculation</h4>
        <strong>Monthly Amount:</strong> ₹${monthlyAmount.toLocaleString()}<br/>
        <strong>Total Invested:</strong> ₹${totalInvested.toLocaleString()}<br/>
        <strong>Maturity Amount:</strong> ₹${maturityAmount.toFixed(2)}<br/>
        <strong>Interest Earned:</strong> ₹${interest.toFixed(2)}<br/>
        <strong>Maturity Date:</strong> ${maturityDate.toLocaleDateString()}
      `;
      rdCalculation.style.display = 'block';
    } else {
      rdCalculation.style.display = 'none';
    }
  }
  
  async function showRDInfo(){
    const rdId = parseInt(rdSelect.value);
    if(!rdId){
      rdInfo.style.display = 'none';
      return;
    }
    
    const rd = await db.recurring_deposits.get(rdId);
    const account = await db.accounts.get(rd.account_id);
    const collections = await db.rd_collections.where('rd_id').equals(rdId).toArray();
    
    const totalCollected = collections.reduce((sum, col) => sum + col.collection_amount, 0);
    const expectedAmount = rd.monthly_amount * collections.length;
    const shortfall = expectedAmount - totalCollected;
    
    rdInfo.innerHTML = `
      <h4>RD Details</h4>
      <strong>Account:</strong> ${account.name}<br/>
      <strong>Monthly Amount:</strong> ₹${rd.monthly_amount}<br/>
      <strong>Collections Done:</strong> ${collections.length} months<br/>
      <strong>Total Collected:</strong> ₹${totalCollected.toFixed(2)}<br/>
      <strong>Expected Amount:</strong> ₹${expectedAmount}<br/>
      ${shortfall > 0 ? `<strong style="color:red">Shortfall:</strong> ₹${shortfall.toFixed(2)}<br/>` : ''}
      <strong>Maturity Date:</strong> ${rd.maturity_date}
    `;
    rdInfo.style.display = 'block';
    
    // Auto-fill collection amount
    collectionForm.collection_amount.value = rd.monthly_amount;
  }
  
  async function loadFDs(){
    const fds = await db.fixed_deposits.orderBy('id').reverse().toArray();
    const accounts = await db.accounts.toArray();
    const accountMap = Object.fromEntries(accounts.map(acc => [acc.id, acc]));
    
    fdTable.innerHTML = '';
    if (!fds.length){
      fdTable.innerHTML = '<tr><td colspan="8">No fixed deposits found</td></tr>';
      return;
    }
    
    for (const fd of fds){
      const account = accountMap[fd.account_id];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fd.id}</td>
        <td>${account ? account.name : 'Unknown'}</td>
        <td>₹${fd.principal_amount.toLocaleString()}</td>
        <td>${fd.interest_rate}%</td>
        <td>₹${fd.maturity_amount.toFixed(2)}</td>
        <td>${fd.maturity_date}</td>
        <td>${fd.status}</td>
        <td>
          <button data-view-fd="${fd.id}">View</button>
          ${fd.status === 'ACTIVE' ? `<button data-close-fd="${fd.id}">Close</button>` : ''}
        </td>`;
      fdTable.appendChild(tr);
    }
  }
  
  async function loadRDs(){
    const rds = await db.recurring_deposits.orderBy('id').reverse().toArray();
    const accounts = await db.accounts.toArray();
    const accountMap = Object.fromEntries(accounts.map(acc => [acc.id, acc]));
    
    rdTable.innerHTML = '';
    if (!rds.length){
      rdTable.innerHTML = '<tr><td colspan="8">No recurring deposits found</td></tr>';
      return;
    }
    
    for (const rd of rds){
      const account = accountMap[rd.account_id];
      const collections = await db.rd_collections.where('rd_id').equals(rd.id).toArray();
      const totalCollected = collections.reduce((sum, col) => sum + col.collection_amount, 0);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${rd.id}</td>
        <td>${account ? account.name : 'Unknown'}</td>
        <td>₹${rd.monthly_amount}</td>
        <td>₹${totalCollected.toFixed(2)} (${collections.length}/${rd.tenure_months})</td>
        <td>₹${rd.maturity_amount.toFixed(2)}</td>
        <td>${rd.maturity_date}</td>
        <td>${rd.status}</td>
        <td>
          <button data-view-rd="${rd.id}">View</button>
          ${rd.status === 'ACTIVE' ? `<button data-close-rd="${rd.id}">Close</button>` : ''}
        </td>`;
      rdTable.appendChild(tr);
    }
  }
  
  async function loadCollections(){
    const collections = await db.rd_collections.orderBy('collection_date').reverse().limit(20).toArray();
    const rds = await db.recurring_deposits.toArray();
    const accounts = await db.accounts.toArray();
    const rdMap = Object.fromEntries(rds.map(rd => [rd.id, rd]));
    const accountMap = Object.fromEntries(accounts.map(acc => [acc.id, acc]));
    
    collectionsTable.innerHTML = '';
    if (!collections.length){
      collectionsTable.innerHTML = '<tr><td colspan="6">No collections found</td></tr>';
      return;
    }
    
    for (const col of collections){
      const rd = rdMap[col.rd_id];
      const account = rd ? accountMap[rd.account_id] : null;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${col.collection_date}</td>
        <td>${col.rd_id}</td>
        <td>${account ? account.name : 'Unknown'}</td>
        <td>₹${col.collection_amount}</td>
        <td>${col.collection_month}</td>
        <td>${col.late_fee || 0}</td>`;
      collectionsTable.appendChild(tr);
    }
  }
  
  async function createFD(evt){
    evt.preventDefault();
    const user = currentUser();
    
    const accountId = parseInt(fdForm.account_id.value);
    const amount = parseFloat(fdForm.amount.value);
    const interestRate = parseFloat(fdForm.interest_rate.value);
    const tenureMonths = parseInt(fdForm.tenure_months.value);
    
    const maturityAmount = calculateFDMaturity(amount, interestRate, tenureMonths);
    const depositDate = new Date();
    const maturityDate = new Date(depositDate);
    maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);
    
    try {
      await db.fixed_deposits.add({
        account_id: accountId,
        principal_amount: amount,
        interest_rate: interestRate,
        tenure_months: tenureMonths,
        maturity_amount: maturityAmount,
        deposit_date: depositDate.toISOString().split('T')[0],
        maturity_date: maturityDate.toISOString().split('T')[0],
        status: 'ACTIVE',
        created_by: user.id,
        created_at: new Date().toISOString()
      });
      
      fdForm.reset();
      fdCalculation.style.display = 'none';
      await loadFDs();
      alert('Fixed Deposit created successfully');
    } catch(error) {
      alert('Error creating FD: ' + error.message);
    }
  }
  
  async function createRD(evt){
    evt.preventDefault();
    const user = currentUser();
    
    const accountId = parseInt(rdForm.account_id.value);
    const monthlyAmount = parseFloat(rdForm.monthly_amount.value);
    const interestRate = parseFloat(rdForm.interest_rate.value);
    const tenureMonths = parseInt(rdForm.tenure_months.value);
    
    const maturityAmount = calculateRDMaturity(monthlyAmount, interestRate, tenureMonths);
    const startDate = new Date();
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);
    
    try {
      await db.recurring_deposits.add({
        account_id: accountId,
        monthly_amount: monthlyAmount,
        interest_rate: interestRate,
        tenure_months: tenureMonths,
        maturity_amount: maturityAmount,
        start_date: startDate.toISOString().split('T')[0],
        maturity_date: maturityDate.toISOString().split('T')[0],
        status: 'ACTIVE',
        created_by: user.id,
        created_at: new Date().toISOString()
      });
      
      rdForm.reset();
      rdCalculation.style.display = 'none';
      await loadRDs();
      await loadActiveRDs();
      alert('Recurring Deposit created successfully');
    } catch(error) {
      alert('Error creating RD: ' + error.message);
    }
  }
  
  async function recordCollection(evt){
    evt.preventDefault();
    const user = currentUser();
    
    const rdId = parseInt(collectionForm.rd_id.value);
    const collectionAmount = parseFloat(collectionForm.collection_amount.value);
    const collectionDate = collectionForm.collection_date.value;
    
    try {
      await db.rd_collections.add({
        rd_id: rdId,
        collection_amount: collectionAmount,
        collection_date: collectionDate,
        collection_month: collectionDate.substring(0, 7), // YYYY-MM
        late_fee: 0, // TODO: Calculate late fee based on due date
        operator_id: user.id,
        created_at: new Date().toISOString()
      });
      
      collectionForm.reset();
      rdInfo.style.display = 'none';
      await loadCollections();
      await loadRDs();
      alert('Collection recorded successfully');
    } catch(error) {
      alert('Error recording collection: ' + error.message);
    }
  }
  
  // Event listeners
  ['amount', 'interest_rate', 'tenure_months'].forEach(field => {
    fdForm[field].addEventListener('input', calculateFDDisplay);
  });
  
  ['monthly_amount', 'interest_rate', 'tenure_months'].forEach(field => {
    rdForm[field].addEventListener('input', calculateRDDisplay);
  });
  
  container.querySelector('#btnCalculateFD').addEventListener('click', calculateFDDisplay);
  container.querySelector('#btnCalculateRD').addEventListener('click', calculateRDDisplay);
  
  rdSelect.addEventListener('change', showRDInfo);
  
  fdTable.addEventListener('click', async (e) => {
    const viewId = e.target.getAttribute('data-view-fd');
    const closeId = e.target.getAttribute('data-close-fd');
    
    if(viewId){
      const fd = await db.fixed_deposits.get(Number(viewId));
      const account = await db.accounts.get(fd.account_id);
      alert(`FD Details:\\nAccount: ${account.name}\\nPrincipal: ₹${fd.principal_amount.toLocaleString()}\\nRate: ${fd.interest_rate}%\\nMaturity Amount: ₹${fd.maturity_amount.toFixed(2)}\\nMaturity Date: ${fd.maturity_date}\\nStatus: ${fd.status}`);
    }
    
    if(closeId){
      if(confirm('Are you sure you want to close this FD?')){
        await db.fixed_deposits.update(Number(closeId), { status: 'CLOSED' });
        await loadFDs();
      }
    }
  });
  
  rdTable.addEventListener('click', async (e) => {
    const viewId = e.target.getAttribute('data-view-rd');
    const closeId = e.target.getAttribute('data-close-rd');
    
    if(viewId){
      const rd = await db.recurring_deposits.get(Number(viewId));
      const account = await db.accounts.get(rd.account_id);
      const collections = await db.rd_collections.where('rd_id').equals(Number(viewId)).toArray();
      
      alert(`RD Details:\\nAccount: ${account.name}\\nMonthly Amount: ₹${rd.monthly_amount}\\nCollections: ${collections.length}/${rd.tenure_months}\\nMaturity Amount: ₹${rd.maturity_amount.toFixed(2)}\\nMaturity Date: ${rd.maturity_date}\\nStatus: ${rd.status}`);
    }
    
    if(closeId){
      if(confirm('Are you sure you want to close this RD?')){
        await db.recurring_deposits.update(Number(closeId), { status: 'CLOSED' });
        await loadRDs();
        await loadActiveRDs();
      }
    }
  });
  
  fdForm.addEventListener('submit', createFD);
  rdForm.addEventListener('submit', createRD);
  collectionForm.addEventListener('submit', recordCollection);
  
  // Initialize
  await loadAccounts();
  await loadActiveRDs();
  await loadFDs();
  await loadRDs();
  await loadCollections();
  
  // Set default collection date to today
  collectionForm.collection_date.value = new Date().toISOString().split('T')[0];
}