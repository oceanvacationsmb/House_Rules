(function(){
let data,currentSlug;
let cloudEnabled=false,publishedBase={},publishQueue=Promise.resolve(),publishTimer,pendingSaves=0,saveFailed=false;
let publisher=null,adminShell='';
function save(){}
function status(message,error=false){let el=document.getElementById('publishStatus');if(!el){el=document.createElement('p');el.id='publishStatus';el.setAttribute('role','status');document.querySelector('.admin-head').append(el);}el.textContent=message;el.style.cssText='background:#fff;padding:14px 18px;border-radius:12px;line-height:1.5';el.style.color=error?'#b91c1c':'#166534';}
function queuePublish(slug,property){
 if(!cloudEnabled)return;
 pendingSaves++;status('Saving changes to GitHub…');
 publishQueue=publishQueue.then(async()=>{
  try{const result=await publisher.save(slug,property,publishedBase[slug]);publishedBase[slug]=clone(result.property);saveFailed=false;if(pendingSaves===1)status(result.unchanged?'All changes saved to GitHub.':'Saved to GitHub. The public page updates when publishing finishes, usually within a couple of minutes.');}
  catch(error){saveFailed=true;status('Not published: '+error.message+' Your edits remain on this page; use Export data.js for a backup.',true);}
  finally{pendingSaves--;}
 });
}
function clone(x){return JSON.parse(JSON.stringify(x));}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function download(filename,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function props(){return Object.values(data).sort((a,b)=>String(a.propertyName).localeCompare(String(b.propertyName),undefined,{numeric:true}));}

function previewUrl(page){return new URL(page,window.location.href).href;}
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
      <a href="${esc(previewUrl(p.page))}" target="_blank">Open published page: ${esc(p.page)}</a>
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
    </div>
    <p class="small-muted">${cloudEnabled?"Changes save directly to GitHub after you pause typing. Save to GitHub saves immediately. The public page updates after GitHub finishes publishing.":"Connect to GitHub to save."}</p>`;

  ed.querySelector('#saveBtn').textContent=cloudEnabled?'Save to GitHub':'Save Browser Draft';
  ed.querySelector('#saveBtn').onclick=()=>updateCurrent(true);
  ed.oninput=()=>{if(!cloudEnabled)return;clearTimeout(publishTimer);status('Unsaved changes…');publishTimer=setTimeout(()=>updateCurrent(false),2000);};
  ed.querySelector('#exportBtn').onclick=()=>{updateCurrent(false);download('data.js','const PROPERTY_GUIDES = '+JSON.stringify(data,null,2)+';\n');};
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
  else if(showAlert)status('Connect to GitHub before saving.',true);
  renderLinks();
  renderList();
}

function render(){renderLinks();renderList();renderEditor();}

function showAdminLogin(message=''){
 const shell=document.querySelector('.admin-shell');
 shell.innerHTML=`
 <div class="admin-login"><div class="admin-login-card">
 <div class="brand-pill"><span class="brand-name">Ocean Vacations</span><span class="divider">|</span><span>Admin</span></div>
 <h1>Connect to GitHub</h1>
 <p>Edit your property guides here and save directly to the House_Rules repository.</p>
 <form id="adminLoginForm">
 <label for="githubToken">GitHub access token</label>
 <input id="githubToken" type="password" autocomplete="off" spellcheck="false" required>
 <p class="small-muted">Use your RULES token with Contents read/write access to House_Rules. The token stays only in this open page. It is never saved in browser storage or public files.</p>
 <button class="admin-btn" type="submit">Connect to GitHub</button>
 <div class="admin-login-error" id="adminLoginError" aria-live="polite"></div>
 </form></div></div>`;
 const input=document.getElementById('githubToken'),error=document.getElementById('adminLoginError');error.textContent=message;
 document.getElementById('adminLoginForm').onsubmit=async event=>{
  event.preventDefault();error.textContent='Connecting to GitHub…';
  const candidate=new GitHubGuidePublisher({token:input.value.trim()});
  try{
   const latest=await candidate.read();publisher=candidate;input.value='';cloudEnabled=true;
   publishedBase=clone(latest.data);data=clone(latest.data);shell.innerHTML=adminShell;
   currentSlug=data['1670']?'1670':props()[0]?.slug;render();
   document.querySelector('.admin-note').textContent='Edit a property and save directly to GitHub. Changes save automatically after you pause typing. Public pages update after GitHub finishes publishing.';
   status('Connected directly to GitHub. All changes saved.');
  }catch(problem){error.textContent=problem.message;}
 };
}
window.addEventListener('beforeunload',event=>{if(publishTimer||pendingSaves||saveFailed){event.preventDefault();event.returnValue='Changes are not yet saved to GitHub.';}});
window.addEventListener('DOMContentLoaded',()=>{adminShell=document.querySelector('.admin-shell').innerHTML;showAdminLogin();});
})();
