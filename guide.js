
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

const STORAGE_KEY = "oceanPropertyGuidesV28";

function getData(){try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)return JSON.parse(saved);}catch(e){} return PROPERTY_GUIDES;}
function getPropertySlug(){if(window.PROPERTY_SLUG)return window.PROPERTY_SLUG;const params=new URLSearchParams(window.location.search);return params.get("p")||Object.keys(getData())[0];}
function setListingImage(imageUrl){if(!imageUrl)return;const el=document.getElementById("listingImage");if(el)el.style.backgroundImage=`linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.12)), url("${imageUrl}")`;}
async function tryLoadGuestyPreviewImage(guestyUrl){if(!guestyUrl)return;const cached=sessionStorage.getItem("guestyPreviewImage:"+guestyUrl);if(cached){setListingImage(cached);return;}try{const response=await fetch("https://api.microlink.io/?url="+encodeURIComponent(guestyUrl));if(!response.ok)return;const result=await response.json();const imageUrl=result&&result.data&&result.data.image&&result.data.image.url;if(imageUrl){sessionStorage.setItem("guestyPreviewImage:"+guestyUrl,imageUrl);setListingImage(imageUrl);}}catch(e){console.log("Preview image could not be loaded automatically.",e);}}

function sectionClass(section){
  const title=(section.title||'').toLowerCase();
  const details=(section.details||'').toLowerCase();
  if(title.includes('basic house rules') || title.includes('responsibilities') || title.includes('pool') || title.includes('checkout') || title.includes('supplies') || title.includes('trash') || title.includes('parking') || title.includes('golf carts')) return 'wide';
  if(details.length>520) return 'wide';
  return '';
}

function sectionSlug(title){
  const normalized = String(title || "").toLowerCase();
  if(normalized === "rules" || normalized.includes("basic house rules")) return "rules";
  if(normalized.includes("responsibilities")) return "responsibilities";
  if(normalized.includes("report issues")) return "report-issues";
  if(normalized.includes("supplies")) return "supplies";
  if(normalized.includes("parking")) return "parking";
  if(normalized.includes("golf carts")) return "golf-carts";
  if(normalized.includes("elevator") || normalized.includes("stairs")) return "elevator";
  if(normalized.includes("pool") || normalized.includes("amenities")) return "pool";
  if(normalized.includes("ac") || normalized.includes("heat") || normalized.includes("refrigerator")) return "ac-heat";
  if(normalized.includes("trash")) return "trash";
  if(normalized.includes("garbage disposal") || normalized.includes("toilets")) return "toilets";
  if(normalized.includes("pest")) return "pest";
  if(normalized.includes("cleaning") || normalized.includes("maintenance")) return "maintenance";
  if(normalized.includes("refund") || normalized.includes("cancellation")) return "refunds";
  if(normalized.includes("bbq") || normalized.includes("grill")) return "bbq";
  if(normalized.includes("laundry")) return "laundry";
  if(normalized.includes("tv") || normalized.includes("streaming")) return "tv";
  if(normalized.includes("checkout")) return "checkout";
  if(normalized.includes("forgot")) return "forgot";
  return String(title || "section")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function scrollToHashTarget(){
  if(!window.location.hash)return;
  const rawHash=decodeURIComponent(window.location.hash.slice(1)).trim();
  if(!rawHash)return;
  const targetId=sectionSlug(rawHash);
  const target=document.getElementById(targetId) || document.getElementById(rawHash);
  if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
}

function shouldShowSection(section){
  const title=(section.title||'').toLowerCase();
  const details=(section.details||'').toLowerCase();
  if(title.includes('elevator') && /no elevator!?/.test(details) && !/unless added|additional fee|available/.test(details)) return false;
  return true;
}

function sectionOrder(section){
  const title=(section.title||'').toLowerCase();
  if(title.includes('basic house rules')) return 10;
  if(title.includes('responsibilities')) return 15;
  if(title.includes('report issues')) return 18;
  if(title.includes('supplies provided')) return 20;
  if(title.includes('parking')) return 30;
  if(title.includes('golf carts')) return 35;
  if(title.includes('elevator') || title.includes('stairs')) return 40;
  if(title.includes('pool') || title.includes('amenities')) return 50;
  if(title.includes('ac') || title.includes('heat') || title.includes('refrigerator')) return 60;
  if(title.includes('garbage disposal') || title.includes('toilets')) return 70;
  if(title.includes('forgot')) return 999;
  return 100;
}

function normalizeSectionTitle(section){
  if((section.title||'').toLowerCase().includes('forgot')) {
    return {...section, title: 'Forgot something?'};
  }
  return section;
}

function normalizeParkingSection(guide, section){
  if(!(section.title || '').toLowerCase().includes('parking') || !guide.parkingSpaces) return section;
  const parkingText = String(guide.parkingSpaces).trim();
  const details = String(section.details || '').trim();
  if(!details) return {...section, details: parkingText};

  const lines = details.split('\n').map(line => line.trim()).filter(Boolean);
  let firstLine = lines[0] || '';
  let remaining = lines.slice(1);
  const compact = value => String(value || "")
    .toLowerCase()
    .replace(/\bthe\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
  const compactParking = compact(parkingText);
  const compactFirst = compact(firstLine);

  if(firstLine.toLowerCase().startsWith(parkingText.toLowerCase())){
    firstLine = firstLine.slice(parkingText.length).replace(/^[\s.:-]+/, '').trim();
    if(firstLine) remaining.unshift(firstLine);
  } else if(compactFirst === compactParking){
    remaining = lines.slice(1);
  } else if(!details.toLowerCase().includes(parkingText.toLowerCase())){
    remaining = lines;
  }

  return {...section, details: [parkingText, ...remaining].join('\n')};
}

function golfCartSection(){
  return {
    title: 'Golf Carts',
    icon: '🛺',
    color: 'green',
    details: 'Golf carts allowed.\nPlease arrange delivery for after arrival and pickup at least 2 hours before departure.\nIf the golf cart is delivered too early, picked up late, or left improperly, it may be towed at the guest expense.\nGuests are responsible for securing the golf cart during the stay.\nOcean Vacations is not responsible for theft, loss, or damage to golf carts.'
  };
}

function getGuideSections(guide){
  const sections = (guide.sections || []).slice();
  if(guide.golfCartsAllowed && !sections.some(section => (section.title || '').toLowerCase().includes('golf carts'))){
    sections.push(golfCartSection());
  }
  return sections;
}

function isCalloutLine(line, sectionTitle){
  const title = String(sectionTitle || '').toLowerCase();
  if(!title.includes('trash')) return false;
  if(/please do not block the trash carts/i.test(line)) return false;
  return /roll carts|push carts|place carts at the curb|please do not block the trash carts|return carts from the street|return them by|return by/i.test(line);
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
    html += `<ul class="info-list">${items.map(line=>isCalloutLine(line, section.title) ? `<li class="line-callout">${formatLineHtml(line)}</li>` : `<li>${formatLineHtml(line)}</li>`).join('')}</ul>`;
  }
  return html;
}

function makeSection(section){
  const klass=sectionClass(section);
  return `<article class="info-card ${section.color||''} ${klass}" id="${sectionSlug(section.title)}">
    <div class="card-head">
      <div class="card-icon">${section.icon||'📌'}</div>
      <div class="card-title">${escapeHtml(section.title)}</div>
    </div>
    <div class="card-content">${renderContent(section)}</div>
  </article>`;
}

function renderGuideOverview(guide, sections){
  const main = document.querySelector("main");
  if(!main) return;

  const existingOverview = main.querySelector(".guide-overview");
  if(existingOverview) existingOverview.remove();
  const existingNav = main.querySelector(".section-nav");
  if(existingNav) existingNav.remove();

  const navItems = sections
    .map((section) => `<a href="#${sectionSlug(section.title)}">${escapeHtml(section.title)}</a>`)
    .join("");

  main.insertAdjacentHTML("afterbegin", `
    <section class="guide-overview" aria-label="Guest guide overview">
      <div>
        <span class="overline">Booked guest guide</span>
        <h2>Welcome to ${escapeHtml(guide.propertyName || "your Ocean Vacations stay")}</h2>
        <p>Please review the details below before arrival. Access codes and private Wi-Fi details are sent separately, so this page stays safe to share.</p>
      </div>
      <div class="support-card">
        <span>Need help?</span>
        <strong>Ocean Vacations</strong>
        <a href="mailto:oceanvacationsmb@gmail.com">oceanvacationsmb@gmail.com</a>
      </div>
    </section>
    <nav class="section-nav" aria-label="Guide sections">${navItems}</nav>
  `);
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
  document.getElementById("propertyName").textContent="Guest Welcome Guide";
  const brandName=document.querySelector(".brand-name");
  if(brandName) brandName.textContent="";
  const miniLabel=document.querySelector(".mini-label");
  if(miniLabel) miniLabel.textContent="";
  const quickGrid=document.querySelector(".quick-grid.quick-times");
  const introCard=document.querySelector(".intro-card");
  const titleWrap=document.querySelector(".title-wrap");
  if(introCard && titleWrap && introCard.previousElementSibling !== titleWrap){
    titleWrap.insertAdjacentElement("afterend", introCard);
  }
  const quickCards=document.querySelectorAll(".quick-grid.quick-times .quick-card");
  if(quickCards[0]){
    const checkInText=quickCards[0].querySelector("p");
    if(checkInText) checkInText.textContent="Starts at 4:00 PM";
    const checkInNote=quickCards[0].querySelector(".quick-note");
    if(checkInNote) checkInNote.textContent="Early check-in and luggage drop-off are unavailable. Please do not arrive before 4:00 PM.";
    else quickCards[0].querySelector("div")?.insertAdjacentHTML("beforeend", '<span class="quick-note">Early check-in and luggage drop-off are unavailable. Please do not arrive before 4:00 PM.</span>');
  }
  if(quickCards[1]){
    const checkOutText=quickCards[1].querySelector("p");
    if(checkOutText) checkOutText.textContent="10:00 AM";
    const checkOutNote=quickCards[1].querySelector(".quick-note");
    if(checkOutNote) checkOutNote.textContent="No late checkout. Our cleaning and maintenance team will arrive at the property at 10:00 AM.";
    else quickCards[1].querySelector("div")?.insertAdjacentHTML("beforeend", '<span class="quick-note">No late checkout. Our cleaning and maintenance team will arrive at the property at 10:00 AM.</span>');
  }
  document.querySelector(".arrival-note")?.remove();
  const introText=document.querySelector(".intro-card p");
  if(introText) introText.textContent="This page includes the house rules and property-use instructions for this property. Private access details, door codes, and Wi-Fi information will be sent 48 hours before arrival at 4:00 PM ET.";
  const listing=document.getElementById("listingLink");
  if(listing)listing.href=guide.guestyUrl||"#";
  if(guide.heroImage)setListingImage(guide.heroImage);
  if(guide.guestyUrl)tryLoadGuestyPreviewImage(guide.guestyUrl);
  const sections=getGuideSections(guide)
    .filter(shouldShowSection)
    .map(section => normalizeParkingSection(guide, section))
    .map(normalizeSectionTitle)
    .sort((a,b)=>sectionOrder(a)-sectionOrder(b));
  document.getElementById("sections").innerHTML=sections.map(makeSection).join('');
  setTimeout(scrollToHashTarget, 80);
}
loadGuide();
window.addEventListener("hashchange", scrollToHashTarget);
