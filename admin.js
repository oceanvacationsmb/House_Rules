(function(){
let data,currentSlug;
let cloudEnabled=false,publishedBase={},publishQueue=Promise.resolve(),publishTimer,pendingSaves=0,saveFailed=false;
const API="https://shared-calendar-api.onrender.com/api/guides";
const SESSION_KEY="oceanGuidePublishSession";
const STORAGE_KEY = "oceanPropertyGuidesV28";
const ADMIN_AUTH_KEY = "oceanAdminUnlocked";
const ADMIN_PASSWORDS = ["ocean123++", "05960596"];

async function api(path,options={}){
 const response=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(sessionStorage.getItem(SESSION_KEY)||''),...options.headers},signal:AbortSignal.timeout(90000)});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to connect to GitHub.');return result;
}
function status(message,error=false){let el=document.getElementById('publishStatus');if(!el){el=document.createElement('p');el.id='publishStatus';el.setAttribute('role','status');document.querySelector('.admin-head').append(el);}el.textContent=message;el.style.color=error?'#b91c1c':'#166534';}
function queuePublish(slug,property){
 if(!cloudEnabled)return;
 pendingSaves++;status('Saving changes to GitHub…');
 publishQueue=publishQueue.then(async()=>{
  try{const result=await api('/properties/'+encodeURIComponent(slug),{method:'PUT',body:JSON.stringify({property,baseProperty:publishedBase[slug]})});publishedBase[slug]=clone(result.property);saveFailed=false;if(pendingSaves===1)status(result.unchanged?'All changes saved to GitHub.':'Saved to GitHub. The public page updates when publishing finishes, usually within a couple of minutes.');}
  catch(error){saveFailed=true;status('Not published: '+error.message+' Your browser draft is kept.',true);}
  finally{pendingSaves--;}
 });
}
function clone(x){return JSON.parse(JSON.stringify(x));}
function load(){const base=clone(PROPERTY_GUIDES);try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(saved&&typeof saved==='object'&&!Array.isArray(saved))return {...base,...saved};}catch(e){} return base;}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function download(filename,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function props(){return Object.values(data).sort((a,b)=>String(a.propertyName).localeCompare(String(b.propertyName),undefined,{numeric:true}));}

function previewUrl(page){const url=new URL(page,window.location.href);url.searchParams.set('preview','1');return url.href;}
function renderLinks(){
  document.getElementById('pageLinks').innerHTML=props().map(p=>`<a href="${esc(previewUrl(p.page))}" target="_blank">${esc(p.propertyName)} -> ${esc(p.page)}</a>`).join('');
}

function renderList(){
  document.getElementById('propertyList').innerHTML=props().map(p=>`<button class="${p.slug===currentSlug?'active':''}" data-slug="${esc(p.slug)}"><b>${esc(p.propertyName)}</b><small>${esc(p.page)} - ${esc(p.address)}</small></button>`).join('');
  document.querySelectorAll('#propertyList button').forEach(b=>b.onclick=()=>{updateCurrent(false);currentSlug=b.dataset.slug;render();});
}

function renderEditor(){
  const p=data[currentSlug]||props()[0];
  currentSlug=p.slug;
  const ed=document.getElementById('editor');
  ed.innerHTML=`
    <h2>Edit ${esc(p.propertyName)}</h2>
    <div class="local-links">
      <a href="${esc(previewUrl(p.page))}" target="_blank">Preview browser draft: ${esc(p.page)}</a>
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
    <p class="small-muted">${cloudEnabled?"Changes automatically save to GitHub after you pause typing. Save to GitHub saves immediately. Public pages update after GitHub finishes publishing.":"Browser drafts only. GitHub publishing has not been connected yet."}</p>`;

  ed.querySelector('#saveBtn').textContent=cloudEnabled?'Save to GitHub':'Save Browser Draft';
  ed.querySelector('#saveBtn').onclick=()=>updateCurrent(true);
  ed.oninput=()=>{if(!cloudEnabled)return;clearTimeout(publishTimer);status('Unsaved changes…');publishTimer=setTimeout(()=>updateCurrent(false),2000);};
  ed.querySelector('#exportBtn').onclick=()=>{updateCurrent(false);download('data.js','const PROPERTY_GUIDES = '+JSON.stringify(data,null,2)+';\n');};
  ed.querySelector('#resetBtn').onclick=()=>{if(confirm('Clear local saved edits?')){localStorage.removeItem(STORAGE_KEY);data=clone(cloudEnabled?publishedBase:PROPERTY_GUIDES);currentSlug=props()[0].slug;render();}};
  ed.querySelector('#addSec').onclick=()=>{updateCurrent(false);p.sections.push({title:'New Section',icon:'📌',color:'gray',details:''});save();renderEditor();if(cloudEnabled)queuePublish(currentSlug,clone(p));};
  ed.querySelectorAll('.removeSec').forEach(btn=>btn.onclick=e=>{const i=+e.target.closest('.edit-section').dataset.i;updateCurrent(false);p.sections.splice(i,1);save();renderEditor();if(cloudEnabled)queuePublish(currentSlug,clone(p));});
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
  clearTimeout(publishTimer);publishTimer=null;
  if(cloudEnabled)queuePublish(currentSlug,clone(p));
  else if(showAlert)alert('Draft saved in this browser. GitHub publishing is not connected yet.');
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
  form.onsubmit=async(event)=>{
    event.preventDefault();
    const password=input.value.trim();
    if(cloudEnabled){try{error.textContent='Connecting…';const result=await api('/session',{method:'POST',body:JSON.stringify({password})});sessionStorage.setItem(SESSION_KEY,result.session);window.location.reload();}catch(problem){error.textContent=problem.message;}return;}
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

window.addEventListener('beforeunload',event=>{if(publishTimer||pendingSaves||saveFailed){event.preventDefault();event.returnValue='Changes are not yet saved to GitHub.';}});
window.addEventListener('DOMContentLoaded',async()=>{
 try{cloudEnabled=(await api('/status')).ready;}catch(error){cloudEnabled=false;}
 if(cloudEnabled){
  if(!sessionStorage.getItem(SESSION_KEY)){showAdminLogin();return;}
  try{const latest=await api('/data');publishedBase=clone(latest.data);data=clone(latest.data);}catch(error){showAdminLogin();document.getElementById('adminLoginError').textContent=error.message;return;}
 }else{
  if(sessionStorage.getItem(ADMIN_AUTH_KEY)!=='1'){showAdminLogin();return;}
  data=load();
 }
 currentSlug=props()[0]?.slug;render();
 const note=document.querySelector('.admin-note');if(note&&cloudEnabled)note.textContent='Changes automatically save to GitHub after you pause typing. You can also use Save to GitHub. Public pages update after publishing finishes.';
 status(cloudEnabled?'Connected to GitHub. All changes saved.':'GitHub publishing is not configured. Edits are browser drafts only.',!cloudEnabled);
});
})();
