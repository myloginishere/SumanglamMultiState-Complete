import db from '../db.js';
import { currentUser } from '../auth.js';

export async function renderConfigPage(container){
  container.innerHTML = `
    <h2>System Configuration</h2>
    <p><em>Admin Only Section</em></p>
    
    <section>
      <h3>Interest Rates Configuration</h3>
      <form id="ratesForm">
        <h4>Loan Interest Rates</h4>
        <label>Default Loan Rate (%) 
          <input name="loan_interest_rate" type="number" step="0.01" required>
        </label>
        
        <h4>Fixed Deposit Interest Rates</h4>
        <label>1 Year FD Rate (%) 
          <input name="fd_interest_rate_1yr" type="number" step="0.01" required>
        </label>
        <label>2 Year FD Rate (%) 
          <input name="fd_interest_rate_2yr" type="number" step="0.01" required>
        </label>
        <label>3 Year FD Rate (%) 
          <input name="fd_interest_rate_3yr" type="number" step="0.01" required>
        </label>
        
        <h4>Recurring Deposit Interest Rates</h4>
        <label>Default RD Rate (%) 
          <input name="rd_interest_rate" type="number" step="0.01" required>
        </label>
        
        <button type="submit">Update Interest Rates</button>
      </form>
    </section>
    
    <hr/>
    
    <section>
      <h3>System Parameters</h3>
      <form id="paramsForm">
        <label>Maximum Loan Amount (₹) 
          <input name="max_loan_amount" type="number" required>
        </label>
        <label>Retirement Age (Years) 
          <input name="retirement_age" type="number" min="55" max="70" required>
        </label>
        <label>Maximum Loan Tenure (Years) 
          <input name="max_loan_tenure_years" type="number" min="1" max="15" required>
        </label>
        <label>Loan Eligibility Multiplier 
          <input name="loan_eligibility_multiplier" type="number" min="24" max="48" required>
        </label>
        <label>Maximum EMI Percentage of Salary (%) 
          <input name="max_emi_percentage" type="number" min="30" max="70" step="1" required>
        </label>
        <label>Minimum FD Amount (₹) 
          <input name="min_fd_amount" type="number" required>
        </label>
        <label>Minimum RD Amount (₹) 
          <input name="min_rd_amount" type="number" required>
        </label>
        
        <button type="submit">Update System Parameters</button>
      </form>
    </section>
    
    <hr/>
    
    <section>
      <h3>Data Management</h3>
      <div style="margin:20px 0;">
        <button id="btnExportData">Export All Data</button>
        <button id="btnImportData">Import Data</button>
        <input type="file" id="fileImport" accept=".json" style="display:none;">
      </div>
      
      <h4>Database Statistics</h4>
      <div id="dbStats" style="background:#f8f9fa;padding:15px;">
        Loading statistics...
      </div>
    </section>
    
    <hr/>
    
    <section>
      <h3>System Audit Log</h3>
      <div id="auditLog">
        <p>Audit logging feature - would show recent system changes and admin activities</p>
      </div>
    </section>
  `;

  const ratesForm = container.querySelector('#ratesForm');
  const paramsForm = container.querySelector('#paramsForm');
  const dbStats = container.querySelector('#dbStats');
  const btnExportData = container.querySelector('#btnExportData');
  const btnImportData = container.querySelector('#btnImportData');
  const fileImport = container.querySelector('#fileImport');
  
  // Default configuration values
  const defaultConfig = {
    loan_interest_rate: 12.0,
    fd_interest_rate_1yr: 7.5,
    fd_interest_rate_2yr: 8.0,
    fd_interest_rate_3yr: 8.5,
    rd_interest_rate: 7.0,
    max_loan_amount: 1000000,
    retirement_age: 58,
    max_loan_tenure_years: 10,
    loan_eligibility_multiplier: 36,
    max_emi_percentage: 50,
    min_fd_amount: 10000,
    min_rd_amount: 1000
  };
  
  async function loadConfiguration(){
    // Load existing config or use defaults
    const existingConfig = await db.system_config.toArray();
    const configMap = Object.fromEntries(existingConfig.map(cfg => [cfg.config_key, cfg.config_value]));
    
    // Populate forms with existing or default values
    Object.keys(defaultConfig).forEach(key => {
      const value = configMap[key] || defaultConfig[key];
      const input = container.querySelector(`[name="${key}"]`);
      if(input) input.value = value;
    });
  }
  
  async function saveConfig(configData, formName){
    const user = currentUser();
    
    try {
      // Save each config item
      for(const [key, value] of Object.entries(configData)){
        await db.system_config.put({
          config_key: key,
          config_value: value.toString(),
          updated_by: user.id,
          updated_at: new Date().toISOString()
        });
      }
      
      alert(`${formName} updated successfully`);
    } catch(error) {
      alert('Error saving configuration: ' + error.message);
    }
  }
  
  async function updateInterestRates(evt){
    evt.preventDefault();
    
    const formData = new FormData(ratesForm);
    const ratesConfig = {
      loan_interest_rate: parseFloat(formData.get('loan_interest_rate')),
      fd_interest_rate_1yr: parseFloat(formData.get('fd_interest_rate_1yr')),
      fd_interest_rate_2yr: parseFloat(formData.get('fd_interest_rate_2yr')),
      fd_interest_rate_3yr: parseFloat(formData.get('fd_interest_rate_3yr')),
      rd_interest_rate: parseFloat(formData.get('rd_interest_rate'))
    };
    
    await saveConfig(ratesConfig, 'Interest Rates');
  }
  
  async function updateSystemParams(evt){
    evt.preventDefault();
    
    const formData = new FormData(paramsForm);
    const paramsConfig = {
      max_loan_amount: parseInt(formData.get('max_loan_amount')),
      retirement_age: parseInt(formData.get('retirement_age')),
      max_loan_tenure_years: parseInt(formData.get('max_loan_tenure_years')),
      loan_eligibility_multiplier: parseInt(formData.get('loan_eligibility_multiplier')),
      max_emi_percentage: parseInt(formData.get('max_emi_percentage')),
      min_fd_amount: parseInt(formData.get('min_fd_amount')),
      min_rd_amount: parseInt(formData.get('min_rd_amount'))
    };
    
    await saveConfig(paramsConfig, 'System Parameters');
  }
  
  async function loadDatabaseStats(){
    try {
      const stats = {
        operators: await db.operators.count(),
        accounts: await db.accounts.count(),
        loans: await db.loans.count(),
        loan_payments: await db.loan_payments.count(),
        fixed_deposits: await db.fixed_deposits.count(),
        recurring_deposits: await db.recurring_deposits.count(),
        rd_collections: await db.rd_collections.count(),
        system_config: await db.system_config.count(),
        certificates: await db.certificates.count() || 0
      };
      
      const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);
      
      dbStats.innerHTML = `
        <h4>Database Statistics</h4>
        <div style="display:flex;gap:20px;flex-wrap:wrap;">
          <div><strong>Operators:</strong> ${stats.operators}</div>
          <div><strong>Accounts:</strong> ${stats.accounts}</div>
          <div><strong>Loans:</strong> ${stats.loans}</div>
          <div><strong>Loan Payments:</strong> ${stats.loan_payments}</div>
          <div><strong>Fixed Deposits:</strong> ${stats.fixed_deposits}</div>
          <div><strong>Recurring Deposits:</strong> ${stats.recurring_deposits}</div>
          <div><strong>RD Collections:</strong> ${stats.rd_collections}</div>
          <div><strong>System Config:</strong> ${stats.system_config}</div>
          <div><strong>Certificates:</strong> ${stats.certificates}</div>
        </div>
        <p style="margin-top:15px;"><strong>Total Records:</strong> ${totalRecords}</p>
        <p><em>Last Updated: ${new Date().toLocaleString()}</em></p>
      `;
    } catch(error) {
      dbStats.innerHTML = '<p style="color:red;">Error loading database statistics</p>';
    }
  }
  
  async function exportData(){
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
        certificates: await db.certificates.toArray() || [],
        export_date: new Date().toISOString(),
        export_version: '1.0'
      };
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `sumanglam-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      alert('Data exported successfully');
    } catch(error) {
      alert('Error exporting data: ' + error.message);
    }
  }
  
  async function importData(file){
    try {
      const fileText = await file.text();
      const data = JSON.parse(fileText);
      
      // Validate data structure
      const requiredTables = ['operators', 'accounts', 'loans', 'system_config'];
      for(const table of requiredTables){
        if(!data[table]){
          throw new Error(`Invalid backup file: missing ${table} data`);
        }
      }
      
      if(!confirm(`This will replace all existing data with the backup from ${data.export_date || 'unknown date'}. Continue?`)){
        return;
      }
      
      // Clear existing data
      await db.transaction('rw', db.operators, db.accounts, db.loans, db.loan_payments, 
                          db.fixed_deposits, db.recurring_deposits, db.rd_collections, 
                          db.system_config, db.certificates, async () => {
        await db.operators.clear();
        await db.accounts.clear();
        await db.loans.clear();
        await db.loan_payments.clear();
        await db.fixed_deposits.clear();
        await db.recurring_deposits.clear();
        await db.rd_collections.clear();
        await db.system_config.clear();
        await db.certificates.clear();
        
        // Import new data
        if(data.operators?.length) await db.operators.bulkAdd(data.operators);
        if(data.accounts?.length) await db.accounts.bulkAdd(data.accounts);
        if(data.loans?.length) await db.loans.bulkAdd(data.loans);
        if(data.loan_payments?.length) await db.loan_payments.bulkAdd(data.loan_payments);
        if(data.fixed_deposits?.length) await db.fixed_deposits.bulkAdd(data.fixed_deposits);
        if(data.recurring_deposits?.length) await db.recurring_deposits.bulkAdd(data.recurring_deposits);
        if(data.rd_collections?.length) await db.rd_collections.bulkAdd(data.rd_collections);
        if(data.system_config?.length) await db.system_config.bulkAdd(data.system_config);
        if(data.certificates?.length) await db.certificates.bulkAdd(data.certificates);
      });
      
      alert('Data imported successfully');
      location.reload(); // Refresh to show imported data
    } catch(error) {
      alert('Error importing data: ' + error.message);
    }
  }
  
  // Event listeners
  ratesForm.addEventListener('submit', updateInterestRates);
  paramsForm.addEventListener('submit', updateSystemParams);
  
  btnExportData.addEventListener('click', exportData);
  btnImportData.addEventListener('click', () => fileImport.click());
  
  fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file) importData(file);
  });
  
  // Initialize
  await loadConfiguration();
  await loadDatabaseStats();
  
  // Refresh stats every 30 seconds
  setInterval(loadDatabaseStats, 30000);
}