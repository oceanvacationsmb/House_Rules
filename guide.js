
function escapeHtml(value){return String(value||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

function normalizeBodyText(text, sectionTitle){
  let raw = String(text || "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\s*•\s*/g, "\n")
    .replace(/\s*🚫\s*/g, "\n")
    .replace(/\s*💲\s*/g, "\n")
    .replace(/\s*⚠️\s*/g, "\n")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  raw = raw.replace(/^(POOL POLICY|Pool Policy|HOUSE RULES|House Rules|PARKING POLICY|Parking Policy|PARKING INFORMATION|Parking Information|TRASH PICKUP|Trash Pickup|TRASH DISPOSAL|Trash Disposal|POOL AND ACCESS INFORMATION|Pool Access|BBQ GRILL POLICY|BBQ Grill Usage Guidelines|BBQ GRILL|Checkout Instructions|PROPERTY ACCESS & AMENITIES|Pool Rules|PROPERTY NOTES|Supplies Provided \(startup only\)|SUPPLIES PROVIDED \(startup only\))\s*[:—-]?\s*/i, "").trim();
  raw = raw.replace(/^Sorry\s*\n\s*Sorry,?/gim, "Sorry,");
  raw = raw
    .replace(/April 1\s*[–-]\s*September 15/g, "April 1 – September 15")
    .replace(/September 15\s*[–-]\s*April 1/g, "September 15 – April 1")
    .replace(/April 1st\s*[–-]\s*October 1st/g, "April 1st – October 1st")
    .replace(/October 1st\s*[–-]\s*April 1st/g, "October 1st – April 1st");
  return raw;
}

function linesFromText(text, sectionTitle){
  let raw = normalizeBodyText(text, sectionTitle);
  if(!raw) return [];
  let parts = raw.split(/\n+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
  // If there are no explicit lines, split only on strong sentence boundaries.
  if(parts.length <= 1){
    parts = raw.split(/(?<=[.!?])\s+(?=(?:The booking person|Young children|No |Do not |Please |If |Pool Maintenance:|Maintenance & Schedule:|Fee Notice:|Children and infants|Swim at your own risk|Absolutely NO GLASS|Sorry,))/).map(s=>s.trim()).filter(Boolean);
  }
  // Merge accidental fragments.
  const out=[];
  for(let i=0;i<parts.length;i++){
    let p=parts[i];
    if(/^(The|No|Do|Please|Pool|Children|Swim|Absolutely|Sorry)$/i.test(p) && parts[i+1]){
      parts[i+1]=p+' '+parts[i+1];
      continue;
    }
    out.push(p);
  }
  return out;
}

function formatLineHtml(line){
  let safe = escapeHtml(line)
    .replace(/April 1\s*–\s*September 15/g, '<span class="nowrap">April 1 – September 15</span>')
    .replace(/September 15\s*–\s*April 1/g, '<span class="nowrap">September 15 – April 1</span>')
    .replace(/April 1st\s*–\s*October 1st/g, '<span class="nowrap">April 1st – October 1st</span>')
    .replace(/October 1st\s*–\s*April 1st/g, '<span class="nowrap">October 1st – April 1st</span>')
    .replace(/\$150/g, '<span class="nowrap">$150</span>')
    .replace(/\$100/g, '<span class="nowrap">$100</span>')
    .replace(/\$75/g, '<span class="nowrap">$75</span>')
    .replace(/\$50/g, '<span class="nowrap">$50</span>')
    .replace(/\$35/g, '<span class="nowrap">$35</span>')
    .replace(/\$25/g, '<span class="nowrap">$25</span>');
  return safe;
}

function getData(){try{const saved=localStorage.getItem("oceanPropertyGuidesV8ButtonsCleanText");if(saved)return JSON.parse(saved);}catch(e){} return PROPERTY_GUIDES;}
function getPropertySlug(){if(window.PROPERTY_SLUG)return window.PROPERTY_SLUG;const params=new URLSearchParams(window.location.search);return params.get("p")||Object.keys(getData())[0];}
function setListingImage(imageUrl){if(!imageUrl)return;const el=document.getElementById("listingImage");if(el)el.style.backgroundImage=`linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.12)), url("${imageUrl}")`;}
async function tryLoadGuestyPreviewImage(guestyUrl){if(!guestyUrl)return;const cached=sessionStorage.getItem("guestyPreviewImage:"+guestyUrl);if(cached){setListingImage(cached);return;}try{const response=await fetch("https://api.microlink.io/?url="+encodeURIComponent(guestyUrl));if(!response.ok)return;const result=await response.json();const imageUrl=result&&result.data&&result.data.image&&result.data.image.url;if(imageUrl){sessionStorage.setItem("guestyPreviewImage:"+guestyUrl,imageUrl);setListingImage(imageUrl);}}catch(e){console.log("Preview image could not be loaded automatically.",e);}}

function sectionClass(section){
  const title=(section.title||'').toLowerCase();
  const details=(section.details||'').toLowerCase();
  if(title.includes('basic house rules') || title.includes('pool') || title.includes('checkout') || title.includes('supplies') || title.includes('trash')) return 'wide';
  if(details.length>520) return 'wide';
  return '';
}

function shouldShowSection(section){
  const title=(section.title||'').toLowerCase();
  const details=(section.details||'').toLowerCase();
  if(title.includes('elevator') && /no elevator!?/.test(details) && !/unless added|additional fee|available/.test(details)) return false;
  return true;
}

function badge(icon,label){return `<span class="tag">${icon}<span>${escapeHtml(label)}</span></span>`;}
function getTags(section){
  const title=(section.title||'').toLowerCase();
  const details=(section.details||'').toLowerCase();
  const tags=[];
  if(title.includes('basic house rules')){
    if(/25 years/.test(details)) tags.push(badge('🔞','25+ to book'));
    else if(/21 years/.test(details)) tags.push(badge('🔞','21+ to book'));
    if(/no smoking/.test(details)) tags.push(badge('🚭','No smoking'));
    if(/no pets|no animals/.test(details)) tags.push(badge('🐾','No pets'));
    if(/no parties/.test(details)) tags.push(badge('🎉','No parties'));
    if(/no loud music/.test(details)) tags.push(badge('🔇','Quiet hours'));
  }
  if(title.includes('pool')){
    if(/private/.test(details)) tags.push(badge('🏊','Private pool'));
    else if(/shared/.test(details)) tags.push(badge('🏊','Shared pool'));
    if(/not heated/.test(details)) tags.push(badge('❄️','Not heated'));
    if(/no diving/.test(details)) tags.push(badge('🚫','No diving'));
    if(/no glass/.test(details)) tags.push(badge('🥤','No glass'));
    if(/no food/.test(details)) tags.push(badge('🍽️','No food'));
    if(/no lifeguard/.test(details)) tags.push(badge('⚠️','No lifeguard'));
  }
  if(title.includes('parking')){
    if(/\b(\d+)\b/.test(details)) tags.push(badge('🚗','See parking details'));
    if(/towed|towing/.test(details)) tags.push(badge('🚧','Towing enforced'));
  }
  if(title.includes('elevator')){
    if(/\$150/.test(details)) tags.push(badge('🛗','$150 add-on'));
    if(/must be able to climb stairs/.test(details)) tags.push(badge('🪜','Stairs required'));
  }
  if(title.includes('trash')){
    if(/fee/.test(details)) tags.push(badge('🗑️','Bag all trash'));
  }
  if(title.includes('supplies')){
    tags.push(badge('🧺','Startup supply only'));
  }
  return tags.join('');
}

function renderContent(section){
  const lines=linesFromText(section.details, section.title);
  if(!lines.length) return '<p class="card-lead">Information will be provided if applicable.</p>';
  let lead='';
  let items=lines.slice();
  if(items.length && items[0].length<160 && !/^(No |Do not |Please |If )/i.test(items[0])){
    lead=items.shift();
  }
  let html='';
  if(lead) html += `<p class="card-lead">${formatLineHtml(lead)}</p>`;
  if(items.length){
    html += `<ul class="info-list">${items.map(line=>`<li>${formatLineHtml(line)}</li>`).join('')}</ul>`;
  }
  return html;
}

function makeSection(section){
  const klass=sectionClass(section);
  const tags=getTags(section);
  return `<article class="info-card ${section.color||''} ${klass}">
    <div class="card-head">
      <div class="card-icon">${section.icon||'📌'}</div>
      <div class="card-title">${escapeHtml(section.title)}</div>
    </div>
    ${tags?`<div class="tag-row">${tags}</div>`:''}
    <div class="card-content">${renderContent(section)}</div>
  </article>`;
}

function showMissingProperty(){
  document.getElementById("propertyName").textContent="Guide Not Found";
  document.getElementById("sections").innerHTML=`<article class="info-card red wide"><div class="card-head"><div class="card-icon">⚠️</div><div class="card-title">Guide Not Found</div></div><div class="card-content"><p class="card-lead">Please check the guide link or contact us for assistance.</p></div></article>`;
}

function loadGuide(){
  const data=getData();
  const slug=getPropertySlug();
  if(!data||!data[slug]){showMissingProperty();return;}
  const guide=data[slug];
  document.title=`${guide.propertyName} | House Rules`;
  document.getElementById("propertyName").textContent=guide.propertyName||"House Rules";
  const listing=document.getElementById("listingLink");
  if(listing)listing.href=guide.guestyUrl||"#";
  if(guide.heroImage)setListingImage(guide.heroImage);
  if(guide.guestyUrl)tryLoadGuestyPreviewImage(guide.guestyUrl);
  const sections=(guide.sections||[]).filter(shouldShowSection);
  document.getElementById("sections").innerHTML=sections.map(makeSection).join('');
}
loadGuide();
