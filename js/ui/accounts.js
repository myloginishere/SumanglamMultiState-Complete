import db from '../db.js';

function maskAadhaar(a){ return a ? a.replace(/^(\d{4})(\d{4})(\d{4})$/, '$1-$2-XXXX') : ''; }

export async function renderAccountsPage(container){
  container.innerHTML = `
    <h2>Accounts Management</h2>
    <section>
      <h3>Add / Edit Account</h3>
      <form id="accountForm">
        <input type="hidden" name="id" />
        <h4>Account Holder Details</h4>
        <label>Name <input name="name" required pattern="[A-Za-z ]{2,50}"></label>
        <label>Date of Birth <input name="dob" type="date" required></label>
        <label>Aadhaar <input name="aadhaar" required pattern="\\d{12}" maxlength="12"></label>
        <label>Address <textarea name="address" required rows="3"></textarea></label>
        <label>Monthly Salary <input name="monthly_salary" type="number" required min="1" step="0.01"></label>
        
        <h4>Guarantor 1 Details</h4>
        <label>Name <input name="guarantor1_name" required></label>
        <label>Date of Birth <input name="guarantor1_dob" type="date" required></label>
        <label>Aadhaar <input name="guarantor1_aadhaar" required pattern="\\d{12}" maxlength="12"></label>
        <label>Address <textarea name="guarantor1_address" required rows="2"></textarea></label>
        
        <h4>Guarantor 2 Details</h4>
        <label>Name <input name="guarantor2_name" required></label>
        <label>Date of Birth <input name="guarantor2_dob" type="date" required></label>
        <label>Aadhaar <input name="guarantor2_aadhaar" required pattern="\\d{12}" maxlength="12"></label>
        <label>Address <textarea name="guarantor2_address" required rows="2"></textarea></label>
        
        <button type="submit">Save Account</button>
        <button type="button" id="btnResetAccount">Reset</button>
      </form>
    </section>
    <hr/>
    <section>
      <h3>All Accounts</h3>
      <input type="text" id="searchAccounts" placeholder="Search by name or Aadhaar..." style="margin-bottom:10px;">
      <table class="table" id="accountsTable">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>DOB</th><th>Aadhaar</th><th>Monthly Salary</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  `;

  const tbody = container.querySelector('#accountsTable tbody');
  const form = container.querySelector('#accountForm');
  const btnReset = container.querySelector('#btnResetAccount');
  const searchInput = container.querySelector('#searchAccounts');

  async function loadAccounts(searchTerm = ''){
    let accounts = await db.accounts.orderBy('name').toArray();
    
    if(searchTerm){
      const term = searchTerm.toLowerCase();
      accounts = accounts.filter(acc => 
        acc.name.toLowerCase().includes(term) || 
        acc.aadhaar.includes(term)
      );
    }
    
    tbody.innerHTML = '';
    if (!accounts.length){
      tbody.innerHTML = '<tr><td colspan="7">No accounts found</td></tr>';
      return;
    }
    
    for (const acc of accounts){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${acc.id}</td>
        <td>${acc.name}</td>
        <td>${acc.dob}</td>
        <td>${maskAadhaar(acc.aadhaar)}</td>
        <td>₹${acc.monthly_salary.toLocaleString()}</td>
        <td>${acc.isActive === false ? 'Inactive' : 'Active'}</td>
        <td>
          <button data-edit="${acc.id}">Edit</button>
          <button data-view="${acc.id}">View Details</button>
          <button data-toggle="${acc.id}">${acc.isActive === false ? 'Activate' : 'Deactivate'}</button>
        </td>`;
      tbody.appendChild(tr);
    }
  }

  async function saveAccount(evt){
    evt.preventDefault();
    const fd = new FormData(form);
    const id = Number(fd.get('id')||'');
    
    const accountData = {
      name: fd.get('name').toString().trim(),
      dob: fd.get('dob').toString(),
      aadhaar: fd.get('aadhaar').toString().trim(),
      address: fd.get('address').toString().trim(),
      monthly_salary: parseFloat(fd.get('monthly_salary')),
      guarantor1_name: fd.get('guarantor1_name').toString().trim(),
      guarantor1_dob: fd.get('guarantor1_dob').toString(),
      guarantor1_aadhaar: fd.get('guarantor1_aadhaar').toString().trim(),
      guarantor1_address: fd.get('guarantor1_address').toString().trim(),
      guarantor2_name: fd.get('guarantor2_name').toString().trim(),
      guarantor2_dob: fd.get('guarantor2_dob').toString(),
      guarantor2_aadhaar: fd.get('guarantor2_aadhaar').toString().trim(),
      guarantor2_address: fd.get('guarantor2_address').toString().trim(),
    };

    // Uniqueness checks
    const existingAadhaar = await db.accounts.where('aadhaar').equals(accountData.aadhaar).first();
    const existingG1 = await db.accounts.where('guarantor1_aadhaar').equals(accountData.guarantor1_aadhaar).first();
    const existingG2 = await db.accounts.where('guarantor2_aadhaar').equals(accountData.guarantor2_aadhaar).first();
    
    if (!id && existingAadhaar) return alert('Account with this Aadhaar already exists');
    if (id && existingAadhaar && existingAadhaar.id !== id) return alert('Account with this Aadhaar already exists');
    
    if (accountData.aadhaar === accountData.guarantor1_aadhaar || 
        accountData.aadhaar === accountData.guarantor2_aadhaar ||
        accountData.guarantor1_aadhaar === accountData.guarantor2_aadhaar) {
      return alert('All Aadhaar numbers must be unique');
    }

    try {
      if (!id){
        await db.accounts.add({ 
          ...accountData, 
          isActive: true, 
          createdAt: new Date().toISOString() 
        });
      } else {
        await db.accounts.update(id, accountData);
      }
      
      form.reset();
      await loadAccounts();
      alert('Account saved successfully');
    } catch(error) {
      alert('Error saving account: ' + error.message);
    }
  }

  tbody.addEventListener('click', async (e)=>{
    const editId = e.target.getAttribute('data-edit');
    const viewId = e.target.getAttribute('data-view');
    const togId = e.target.getAttribute('data-toggle');
    
    if (editId){
      const acc = await db.accounts.get(Number(editId));
      form.id.value = acc.id;
      form.name.value = acc.name;
      form.dob.value = acc.dob;
      form.aadhaar.value = acc.aadhaar;
      form.address.value = acc.address;
      form.monthly_salary.value = acc.monthly_salary;
      form.guarantor1_name.value = acc.guarantor1_name;
      form.guarantor1_dob.value = acc.guarantor1_dob;
      form.guarantor1_aadhaar.value = acc.guarantor1_aadhaar;
      form.guarantor1_address.value = acc.guarantor1_address;
      form.guarantor2_name.value = acc.guarantor2_name;
      form.guarantor2_dob.value = acc.guarantor2_dob;
      form.guarantor2_aadhaar.value = acc.guarantor2_aadhaar;
      form.guarantor2_address.value = acc.guarantor2_address;
    }
    
    if (viewId){
      const acc = await db.accounts.get(Number(viewId));
      alert(`Account Details:\\nName: ${acc.name}\\nAadhaar: ${acc.aadhaar}\\nSalary: ₹${acc.monthly_salary}\\nGuarantor 1: ${acc.guarantor1_name}\\nGuarantor 2: ${acc.guarantor2_name}`);
    }
    
    if (togId){
      const acc = await db.accounts.get(Number(togId));
      await db.accounts.update(acc.id, { isActive: acc.isActive === false ? true : false });
      await loadAccounts();
    }
  });

  searchInput.addEventListener('input', (e) => {
    loadAccounts(e.target.value);
  });

  form.addEventListener('submit', saveAccount);
  btnReset.addEventListener('click', ()=> form.reset());
  await loadAccounts();
}