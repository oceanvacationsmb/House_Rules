(function(){
let data,currentSlug,unsavedChanges=false;
function save(){unsavedChanges=true;}
function status(message,error=false){let el=document.getElementById('publishStatus');if(!el){el=document.createElement('p');el.id='publishStatus';el.setAttribute('role','status');document.querySelector('.admin-head').append(el);}el.textContent=message;el.style.cssText='background:#fff;padding:14px 18px;border-radius:12px;line-height:1.5';el.style.color=error?'#b91c1c':'#166534';}
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
    <p class="small-muted">Download data.js to keep your changes, then upload that file to GitHub to update the public pages.</p>`;

  ed.querySelector('#saveBtn').textContent='Download data.js';
  ed.querySelector('#saveBtn').onclick=()=>{updateCurrent(false);download('data.js','const PROPERTY_GUIDES = '+JSON.stringify(data,null,2)+';\n');unsavedChanges=false;status('Downloaded data.js. Upload it to GitHub and commit to publish your changes.');};
  ed.oninput=()=>{unsavedChanges=true;status('Edits are not published. Download data.js when finished.');};
  ed.querySelector('#exportBtn').textContent='Open GitHub Upload';
  ed.querySelector('#exportBtn').onclick=()=>{updateCurrent(false);window.open('https://github.com/oceanvacationsmb/House_Rules/upload/main','_blank','noopener');};
  ed.querySelector('#addSec').onclick=()=>{updateCurrent(false);p.sections.push({title:'New Section',icon:'📌',color:'gray',details:''});save();renderEditor();};
  ed.querySelectorAll('.removeSec').forEach(btn=>btn.onclick=e=>{const i=+e.target.closest('.edit-section').dataset.i;updateCurrent(false);p.sections.splice(i,1);save();renderEditor();});
}

function updateCurrent(showAlert){
  const p=data[currentSlug];
  const previous=JSON.stringify(p);
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
  if(JSON.stringify(p)!==previous)save();
  renderLinks();
  renderList();
}

function render(){renderLinks();renderList();renderEditor();}

window.addEventListener('beforeunload',event=>{if(unsavedChanges){event.preventDefault();event.returnValue='Download your edited data.js before leaving.';}});
window.addEventListener('DOMContentLoaded',async()=>{
 data=clone(PROPERTY_GUIDES);
 document.getElementById('editor').textContent='Loading property guides…';
 try{
  const response=await fetch('data.js?admin='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Unavailable');
  const source=await response.text();
  const latest=JSON.parse(source.trim().replace(/^const\s+PROPERTY_GUIDES\s*=\s*/,'').replace(/;\s*$/,''));
  if(latest&&typeof latest==='object'&&!Array.isArray(latest))data=latest;
 }catch(error){}
 currentSlug=data['1670']?'1670':props()[0]?.slug;render();
 status('Editor ready. No login required. Download data.js and upload it to GitHub to publish edits.');
});
})();
