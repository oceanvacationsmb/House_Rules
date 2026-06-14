(function(){
let data,currentSlug;
const STORAGE_KEY = "oceanPropertyGuidesV28";
const ADMIN_AUTH_KEY = "oceanAdminUnlocked";
const ADMIN_PASSWORDS = ["ocean123++", "05960596"];

function clone(x){return JSON.parse(JSON.stringify(x));}
function load(){try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)return JSON.parse(saved);}catch(e){} return clone(PROPERTY_GUIDES);}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function download(filename,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function props(){return Object.values(data).sort((a,b)=>String(a.propertyName).localeCompare(String(b.propertyName),undefined,{numeric:true}));}

function renderLinks(){
  document.getElementById('pageLinks').innerHTML=props().map(p=>`<a href="${esc(p.page)}" target="_blank">${esc(p.propertyName)} -> ${esc(p.page)}</a>`).join('');
}

function renderList(){
  document.getElementById('propertyList').innerHTML=props().map(p=>`<button class="${p.slug===currentSlug?'active':''}" data-slug="${esc(p.slug)}"><b>${esc(p.propertyName)}</b><small>${esc(p.page)} - ${esc(p.address)}</small></button>`).join('');
  document.querySelectorAll('#propertyList button').forEach(b=>b.onclick=()=>{currentSlug=b.dataset.slug;render();});
}

function renderEditor(){
  const p=data[currentSlug]||props()[0];
  currentSlug=p.slug;
  const ed=document.getElementById('editor');
  ed.innerHTML=`
    <h2>Edit ${esc(p.propertyName)}</h2>
    <div class="local-links">
      <a href="${esc(p.page)}" target="_blank">Open local page: ${esc(p.page)}</a>
      ${p.guestyUrl?`<a href="${esc(p.guestyUrl)}" target="_blank">Open Guesty listing</a>`:''}
    </div>
    <label>Property Name</label>
    <input id="propertyNameInput" value="${esc(p.propertyName)}">
    <label>Address</label>
    <input id="addressInput" value="${esc(p.address)}">
    <label>Guesty URL</label>
    <input id="guestyInput" value="${esc(p.guestyUrl||'')}">
    <label>Local Page File</label>
    <input id="pageInput" value="${esc(p.page)}">
    <label>Quick Parking Text</label>
    <input id="parkingInput" value="${esc(p.parkingSpaces||'')}">
    <label class="check-row"><input id="golfCartsInput" type="checkbox" ${p.golfCartsAllowed?'checked':''}> Golf carts allowed</label>
    <h3>Sections</h3>
    <div id="sectionEdits">${(p.sections||[]).map((s,i)=>`
      <div class="edit-section" data-i="${i}">
        <label>Title</label>
        <input class="secTitle" value="${esc(s.title)}">
        <label>Icon</label>
        <input class="secIcon" value="${esc(s.icon||'📌')}">
        <label>Color Class</label>
        <input class="secColor" value="${esc(s.color||'gray')}">
        <label>Details</label>
        <textarea class="secDetails">${esc(s.details||'')}</textarea>
        <div class="toolbar"><button class="admin-btn danger removeSec" type="button">Remove Section</button></div>
      </div>
    `).join('')}</div>
    <div class="toolbar">
      <button class="admin-btn secondary" id="addSec" type="button">Add Section</button>
      <button class="admin-btn" id="saveBtn" type="button">Save Changes</button>
      <button class="admin-btn secondary" id="exportBtn" type="button">Export data.js</button>
      <button class="admin-btn danger" id="resetBtn" type="button">Reset Browser Edits</button>
    </div>
    <p class="small-muted">Saved changes stay in this browser and will display on local property pages opened from this same folder/browser.</p>`;

  ed.querySelector('#saveBtn').onclick=()=>updateCurrent(true);
  ed.querySelector('#exportBtn').onclick=()=>{updateCurrent(false);download('data.js','const PROPERTY_GUIDES = '+JSON.stringify(data,null,2)+';\n');};
  ed.querySelector('#resetBtn').onclick=()=>{if(confirm('Clear local saved edits?')){localStorage.removeItem(STORAGE_KEY);data=clone(PROPERTY_GUIDES);currentSlug=props()[0].slug;render();}};
  ed.querySelector('#addSec').onclick=()=>{p.sections.push({title:'New Section',icon:'📌',color:'gray',details:''});renderEditor();};
  ed.querySelectorAll('.removeSec').forEach(btn=>btn.onclick=e=>{const i=+e.target.closest('.edit-section').dataset.i;p.sections.splice(i,1);renderEditor();});
}

function updateCurrent(showAlert){
  const p=data[currentSlug];
  p.propertyName=document.getElementById('propertyNameInput').value.trim();
  p.address=document.getElementById('addressInput').value.trim();
  p.guestyUrl=document.getElementById('guestyInput').value.trim();
  p.page=document.getElementById('pageInput').value.trim();
  p.parkingSpaces=document.getElementById('parkingInput').value.trim();
  p.golfCartsAllowed=document.getElementById('golfCartsInput').checked;
  p.sections=[...document.querySelectorAll('#sectionEdits .edit-section')].map(div=>({
    title:div.querySelector('.secTitle').value,
    icon:div.querySelector('.secIcon').value,
    color:div.querySelector('.secColor').value,
    details:div.querySelector('.secDetails').value
  }));
  save();
  if(showAlert)alert('Saved. Open the local page link to review.');
  renderLinks();
  renderList();
}

function render(){renderLinks();renderList();renderEditor();}

function showAdminLogin(){
  const shell=document.querySelector('.admin-shell');
  if(!shell)return;
  shell.innerHTML=`
    <div class="admin-login">
      <div class="admin-login-card">
        <div class="brand-pill"><span class="brand-name">Ocean Vacations</span><span class="divider">|</span><span>Admin</span></div>
        <h1>Guest Guide Settings</h1>
        <p>Enter the admin password to continue.</p>
        <form id="adminLoginForm">
          <label for="adminPassword">Password</label>
          <input id="adminPassword" type="password" autocomplete="current-password" autofocus>
          <button class="admin-btn" type="submit">Unlock Admin</button>
          <div class="admin-login-error" id="adminLoginError" aria-live="polite"></div>
        </form>
      </div>
    </div>`;
  const form=shell.querySelector('#adminLoginForm');
  const input=shell.querySelector('#adminPassword');
  const error=shell.querySelector('#adminLoginError');
  form.onsubmit=(event)=>{
    event.preventDefault();
    const password=input.value.trim();
    if(ADMIN_PASSWORDS.includes(password)){
      sessionStorage.setItem(ADMIN_AUTH_KEY,'1');
      window.location.reload();
      return;
    }
    error.textContent='Incorrect password.';
    input.value='';
    input.focus();
  };
}

window.addEventListener('DOMContentLoaded',()=>{
  if(sessionStorage.getItem(ADMIN_AUTH_KEY)!=='1'){
    showAdminLogin();
    return;
  }
  data=load();
  currentSlug=props()[0]?.slug;
  render();
});
})();
