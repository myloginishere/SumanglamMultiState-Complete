import db from '../db.js';

function maskAadhaar(a){ return a ? a.replace(/^(\d{4})(\d{4})(\d{4})$/, '$1-$2-XXXX') : ''; }

export async function renderOperatorsPage(container){
  container.innerHTML = `
    <h2>Operators</h2>
    <section>
      <h3>Add / Edit</h3>
      <form id="opForm">
        <input type="hidden" name="id" />
        <label>Name <input name="name" required pattern="[A-Za-z ]{2,50}"></label>
        <label>Aadhaar <input name="aadhaar" required pattern="\\d{12}"></label>
        <label>Username <input name="username" required pattern="[A-Za-z0-9._-]{3,20}"></label>
        <label>Password <input name="password" type="password" required minlength="8"></label>
        <label><input type="checkbox" name="isAdmin"> Admin</label>
        <button type="submit">Save</button>
        <button type="button" id="btnReset">Reset</button>
      </form>
    </section>
    <section>
      <h3>All Operators</h3>
      <table class="table" id="opTable">
        <thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Aadhaar</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody></tbody>
      </table>
    </section>
  `;

  const tbody = container.querySelector('#opTable tbody');
  const form = container.querySelector('#opForm');
  const btnReset = container.querySelector('#btnReset');

  async function load(){
    const list = await db.operators.toArray();
    tbody.innerHTML = '';
    if (!list.length){
      tbody.innerHTML = '<tr><td colspan="7">No operators found</td></tr>';
      return;
    }
    for (const o of list){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.id}</td>
        <td>${o.name}</td>
        <td>${o.username}</td>
        <td>${maskAadhaar(o.aadhaar)}</td>
        <td>${o.isAdmin ? 'Admin' : 'Operator'}</td>
        <td>${o.isActive === false ? 'Inactive' : 'Active'}</td>
        <td>
          <button data-edit="${o.id}">Edit</button>
          <button data-toggle="${o.id}">${o.isActive === false ? 'Activate' : 'Deactivate'}</button>
        </td>`;
      tbody.appendChild(tr);
    }
  }

  async function save(evt){
    evt.preventDefault();
    const fd = new FormData(form);
    const id = Number(fd.get('id')||'');
    const name = fd.get('name').toString().trim();
    const aadhaar = fd.get('aadhaar').toString().trim();
    const username = fd.get('username').toString().trim();
    const password = fd.get('password').toString();
    const isAdmin = fd.get('isAdmin') === 'on';

    // uniqueness checks
    const duUser = await db.operators.where('username').equals(username).first();
    const duAad = await db.operators.where('aadhaar').equals(aadhaar).first();
    if (!id && duUser) return alert('Username already exists');
    if (!id && duAad) return alert('Aadhaar already exists');
    if (id){
      if (duUser && duUser.id !== id) return alert('Username already exists');
      if (duAad && duAad.id !== id) return alert('Aadhaar already exists');
    }

    if (!id){
      await db.operators.add({ name,aadhaar,username,password,isAdmin,isActive:true, createdAt:new Date().toISOString() });
    } else {
      await db.operators.update(id, { name,aadhaar,username, ...(password?{password}:{}) , isAdmin });
    }

    form.reset();
    await load();
    alert('Saved');
  }

  tbody.addEventListener('click', async (e)=>{
    const editId = e.target.getAttribute('data-edit');
    const togId = e.target.getAttribute('data-toggle');
    if (editId){
      const rec = await db.operators.get(Number(editId));
      form.id.value = rec.id;
      form.name.value = rec.name;
      form.aadhaar.value = rec.aadhaar;
      form.username.value = rec.username;
      form.password.value = '';
      form.isAdmin.checked = !!rec.isAdmin;
    }
    if (togId){
      const rec = await db.operators.get(Number(togId));
      if (rec.isAdmin){
        // ensure at least one admin remains active
        const admins = await db.operators.where('isAdmin').equals(1).toArray();
        const activeAdmins = admins.filter(a=>a.isActive!==false && a.id!==rec.id);
        if (activeAdmins.length===0) return alert('Cannot deactivate the last admin');
      }
      await db.operators.update(rec.id, { isActive: rec.isActive===false ? true : false });
      await load();
    }
  });

  form.addEventListener('submit', save);
  btnReset.addEventListener('click', ()=> form.reset());
  await load();
}
