/* =========================================================
 * CARD PICK — app.js (전체)
 * =======================================================*/

/* ---------- 히어로 데이터 ---------- */
const slides = [
  { badge:"10월 한정 캐시백 이벤트", title:"최대 93.8만원 혜택", desc:"지난달보다 오른 최대 캐시백 금액 확인하세요!",
    stack:[ {c1:"#ffdede",c2:"#ffb8b8",r:"-10deg"}, {c1:"#edf2ff",c2:"#cfd8ff",r:"-2deg"}, {c1:"#ffeec2",c2:"#ffd27a",r:"6deg"}, {c1:"#e7fef1",c2:"#bdfadc",r:"14deg"} ] },
  { badge:"연회비 캐시백 프로모션", title:"연 최대 45만원 혜택", desc:"연회비를 상쇄하는 강력한 웰컴 혜택 모음.",
    stack:[ {c1:"#e6fffb",c2:"#b7f4ef",r:"-12deg"}, {c1:"#fff7d1",c2:"#ffe69b",r:"-2deg"}, {c1:"#f3e8ff",c2:"#dab6ff",r:"10deg"} ] },
  { badge:"트래블 · 프리미엄", title:"공항 라운지 · 해외 적립 2배", desc:"여행자에게 꼭 필요한 혜택을 한 번에.",
    stack:[ {c1:"#e8f0ff",c2:"#cbe0ff",r:"-8deg"}, {c1:"#dbfff7",c2:"#b0ffe9",r:"0deg"}, {c1:"#ffe2e2",c2:"#ffcaca",r:"8deg"} ] },
];

/* ---------- 혜택 행 데이터 ---------- */
const benefitItems = [
  { short:"S", name:"삼성카드", label:"최대 93.8만원 받기", color:"#0066ff" },
  { short:"LOCA", name:"롯데카드", label:"최대 45만원 받기", color:"#6a5de3" },
  { short:"우리", name:"우리카드", label:"최대 32.5만원 받기", color:"#0071c2" },
  { short:"신한", name:"신한카드", label:"최대 29만원 받기", color:"#3762ff" },
  { short:"KB", name:"KB국민카드", label:"최대 23만원 받기", color:"#8b6a45" },
  { short:"현대", name:"현대카드", label:"최대 20만원 받기", color:"#1f2937" },
  { short:"IBK", name:"IBK기업은행", label:"최대 17.5만원 받기", color:"#0090ff" },
  { short:"NH", name:"NH농협카드", label:"최대 12만원 받기", color:"#0f62ae" },
  { short:"쿠팡", name:"쿠팡 와우카드", label:"연 최대 62만원 혜택", color:"#ef4444" },
];

/* =========================
 * 히어로 슬라이더
 * =======================*/
let heroIndex = 0, heroTimer = null;

function renderHero(){
  const track=document.getElementById("heroTrack");
  const dots=document.getElementById("heroDots");
  if(!(track&&dots)) return;

  track.innerHTML = slides.map(s=>`
    <article class="hero__slide">
      <div class="hero__inner">
        <div class="hero__image">
          <div class="stack">
            ${s.stack.map((c,i)=>`<div class="card" style="--c1:${c.c1};--c2:${c.c2};--r:${c.r};z-index:${10-i}"></div>`).join("")}
          </div>
        </div>
        <div class="hero__copy">
          <div class="kicker">${s.badge}</div>
          <h2>${s.title}</h2>
          <p>${s.desc}</p>
        </div>
      </div>
    </article>`).join("");

  dots.innerHTML = slides.map((_,i)=>`<button class="hero__dot" aria-selected="${i===0}"></button>`).join("");

  const prev=document.querySelector(".hero__nav--prev");
  const next=document.querySelector(".hero__nav--next");
  if(prev&&next){
    prev.onclick=()=>{stopHeroAuto();goHero(heroIndex-1);startHeroAuto();};
    next.onclick=()=>{stopHeroAuto();goHero(heroIndex+1);startHeroAuto();};
    [prev,next].forEach(b=>{
      b.addEventListener("mouseenter",stopHeroAuto);
      b.addEventListener("mouseleave",startHeroAuto);
    });
  }

  const viewport=document.querySelector(".hero__viewport");
  if(viewport){
    let startX=null;
    const getX=e=>e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX;
    const isOnNav=t=>t && t.closest?.(".hero__nav");

    const down=e=>{ if(isOnNav(e.target)) return; startX=getX(e); };
    const up=e=>{ if(startX==null) return; const diff=getX(e)-startX; if(Math.abs(diff)>40) diff<0?goHero(heroIndex+1):goHero(heroIndex-1); startX=null; };

    viewport.addEventListener("pointerdown",down);
    viewport.addEventListener("pointerup",up);
    viewport.addEventListener("touchstart",down,{passive:true});
    viewport.addEventListener("touchend",up,{passive:true});
  }

  startHeroAuto(); updateHero();
}
function goHero(n){ heroIndex=(n+slides.length)%slides.length; updateHero(); }
function updateHero(){
  const track=document.getElementById("heroTrack");
  const dots=document.querySelectorAll("#heroDots .hero__dot");
  if(track) track.style.transform=`translateX(-${heroIndex*100}%)`;
  dots.forEach((b,i)=>b?.setAttribute("aria-selected",String(i===heroIndex)));
}
function startHeroAuto(){ stopHeroAuto(); heroTimer=setInterval(()=>goHero(heroIndex+1),5000); }
function stopHeroAuto(){ if(heroTimer) clearInterval(heroTimer); }

/* =========================
 * 혜택 행 슬라이더
 * =======================*/
function renderBenefit(){
  const list=document.getElementById("benefitList");
  if(!list) return;

  list.innerHTML = benefitItems.map(item=>`
    <li class="benefit__item">
      <div class="brand-circle" style="background:${item.color}">${item.short}</div>
      <div class="benefit__label">${item.label}</div>
      <div class="benefit__issuer">${item.name}</div>
    </li>`).join("");

  const viewport=document.getElementById("benefitViewport");
  const prev=document.getElementById("benefitPrev");
  const next=document.getElementById("benefitNext");
  if(!(viewport&&prev&&next)) return;

  const cardWidth=170+8, step=cardWidth*3;

  function update(){ prev.disabled=viewport.scrollLeft<=0; const max=viewport.scrollWidth-viewport.clientWidth-2; next.disabled=viewport.scrollLeft>=max; }
  prev.onclick=()=>{viewport.scrollBy({left:-step,behavior:"smooth"}); setTimeout(update,320);};
  next.onclick=()=>{viewport.scrollBy({left: step,behavior:"smooth"}); setTimeout(update,320);};
  viewport.addEventListener("scroll",update,{passive:true});
  viewport.addEventListener("wheel",e=>{ if(Math.abs(e.deltaX)<Math.abs(e.deltaY)){ viewport.scrollBy({left:e.deltaY,behavior:"auto"}); e.preventDefault(); } },{passive:false});
  update();
}

/* =========================
 * 검색 모달
 * =======================*/
function initSearchModal(){
  const openBtn=document.getElementById("openSearch");
  const modal=document.getElementById("searchModal");
  if(!(openBtn&&modal)) return;

  const backdrop=document.getElementById("searchBackdrop");
  const closeBtn=document.getElementById("searchClose");
  const input=document.getElementById("searchInput");
  const recentWrap=document.getElementById("recentList");
  const recentToggle=document.getElementById("recentToggle");
  const hotWrap=document.getElementById("hotList");
  const suggestWrap=document.getElementById("suggestList");
  const submitBtn=document.getElementById("searchSubmit");

  const HOT=["현금캐백","실적","포인트","해외적립","즉시결제","연회비혜택","트래블 라운지","바우처","배달/카페","통신비","대중교통"];
  const SUGGEST=[
    {k:"HOT",t:"퀴즈/행운 이벤트 바로가기",e:"🎁"},
    {k:"신규",t:"신한카드 처음 — 가이드",e:"🧭"},
    {k:"글로벌",t:"해외 적립/수수료 비교",e:"🌍"},
    {k:"프리미엄",t:"공항 라운지 · PP · 바우처",e:"✈️"},
    {k:"생활",t:"모빌리티/교통/통신비 모음",e:"🚇"},
  ];

  const RECENT_KEY="cp_recent_search";
  const getRecents=()=>{ try{return JSON.parse(localStorage.getItem(RECENT_KEY)||"[]");}catch{return[]} };
  const setRecents=list=>localStorage.setItem(RECENT_KEY,JSON.stringify(list.slice(0,10)));

  function renderRecents(){
    const r=getRecents();
    if(!r.length){ recentWrap.classList.add("muted"); recentWrap.textContent="최근 검색한 내용이 없습니다."; return; }
    recentWrap.classList.remove("muted");
    recentWrap.innerHTML=r.map(v=>`<button class="chip" data-q="${v}">${v}</button>`).join("");
  }
  function renderHot(){ hotWrap.innerHTML=HOT.map((v,i)=>`<button class="chip ${i<2?"hot":""}" data-q="${v}">${v}</button>`).join(""); }
  function renderSuggest(){ suggestWrap.innerHTML=SUGGEST.map(s=>`<div class="suggest-card"><div class="k">${s.k}</div><div class="t">${s.t}</div><div class="e">${s.e}</div></div>`).join(""); }

  function open(){
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    document.body.classList.add("no-scroll");  /* 배경 스크롤 잠금 */
    renderRecents(); renderHot(); renderSuggest();
    setTimeout(()=>input.focus(),0);
    bindTrap();
  }
  function close(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    document.body.classList.remove("no-scroll"); /* 잠금 해제 */
    unbindTrap();
    openBtn.focus();
  }

  function performSearch(q){
    const query=(q ?? input.value).trim();
    if(!query){ input.focus(); return; }
    if(recentToggle?.checked){
      const r=getRecents().filter(v=>v!==query);
      r.unshift(query); setRecents(r);
    }
    console.log("검색:",query);
    close();
  }

  openBtn.addEventListener("click",open);
  closeBtn?.addEventListener("click",close);
  backdrop?.addEventListener("click",close);
  submitBtn?.addEventListener("click",()=>performSearch());
  input?.addEventListener("keydown",e=>{ if(e.key==="Enter") performSearch(); if(e.key==="Escape") close(); });
  modal.addEventListener("click",e=>{ const b=e.target.closest?.(".chip"); if(!b) return; const q=b.getAttribute("data-q"); input.value=q; performSearch(q); });
  document.addEventListener("keydown",e=>{ if(!modal.classList.contains("is-open")) return; if(e.key==="Escape") close(); });

  let trapHandler=null;
  function bindTrap(){
    trapHandler=e=>{
      if(e.key!=="Tab") return;
      const focusables=modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
      const list=[...focusables].filter(el=>!el.hasAttribute("disabled")&&el.offsetParent!==null);
      if(!list.length) return;
      const first=list[0], last=list[list.length-1];
      if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    };
    modal.addEventListener("keydown",trapHandler);
  }
  function unbindTrap(){ if(trapHandler){ modal.removeEventListener("keydown",trapHandler); trapHandler=null; } }
}

/* =========================
 * 비교 페이지 — 카드 선택 팝업
 * =======================*/
const CARD_ISSUERS=["전체","신한카드","삼성카드","현대카드","롯데카드","KB국민카드","우리카드","하나카드","NH농협카드","IBK기업은행","BC 바로카드","네이버페이","현대백화점"];
const CARD_PRODUCTS=[
  {id:"mr-life",name:"신한카드 Mr.Life",issuer:"신한카드",type:"credit",c1:"#ffeded",c2:"#ffc3c3"},
  {id:"taptap-o",name:"삼성카드 taptap O",issuer:"삼성카드",type:"credit",c1:"#ffe6f1",c2:"#ffc7de"},
  {id:"sky-miles",name:"삼성카드 & MILEAGE PLATINUM (스카이패스)",issuer:"삼성카드",type:"credit",c1:"#eaf2ff",c2:"#cfe0ff"},
  {id:"id-select-all",name:"삼성 iD SELECT ALL 카드",issuer:"삼성카드",type:"credit",c1:"#eef2f7",c2:"#dde6f3"},
  {id:"kb-wesh",name:"KB국민 My WE:SH 카드",issuer:"KB국민카드",type:"credit",c1:"#f9f4e7",c2:"#ead9b6"},
  {id:"hy-zero2",name:"현대 ZERO Edition2",issuer:"현대카드",type:"credit",c1:"#e8f0ff",c2:"#c7d8ff"},
  {id:"lotte-loca",name:"롯데 LOCA Likit",issuer:"롯데카드",type:"credit",c1:"#e8f8ff",c2:"#bdf0ff"},
  {id:"woori-point",name:"우리카드 카드의정석 POINT",issuer:"우리카드",type:"credit",c1:"#e6fff4",c2:"#b9fbe0"},
  {id:"hana-clubsk",name:"하나카드 CLUB SK",issuer:"하나카드",type:"credit",c1:"#eafff9",c2:"#c5fff0"},
  {id:"nh-good",name:"NH농협 올바른 체크",issuer:"NH농협카드",type:"check",c1:"#f5fff0",c2:"#e0ffd1"},
  {id:"ibk-daily",name:"IBK 일상의기쁨 체크",issuer:"IBK기업은행",type:"check",c1:"#f0f7ff",c2:"#d7e7ff"},
  {id:"kb-simple",name:"KB국민 탄탄대로 체크",issuer:"KB국민카드",type:"check",c1:"#fff4eb",c2:"#ffe0c8"},
];

const SELECTED_KEY="cp_selected_cards";
let selectedCards=[null,null,null];
let pickerType="credit", pickerIssuer="전체", pickerKeyword="", currentSlot=null;

function saveSelected(){ try{localStorage.setItem(SELECTED_KEY,JSON.stringify(selectedCards));}catch{} }
function loadSelected(){ try{const raw=localStorage.getItem(SELECTED_KEY); if(!raw) return; const arr=JSON.parse(raw); if(Array.isArray(arr)&&arr.length===3) selectedCards=arr;}catch{} }

function openPicker(slotIndex){
  currentSlot=slotIndex;
  const modal=document.getElementById("pickerModal");
  const chipsWrap=document.getElementById("issuerChips");
  const input=document.getElementById("pickerKeyword");

  document.querySelectorAll(".picker-tab").forEach(btn=>{
    btn.classList.toggle("is-active",btn.dataset.type===pickerType);
    btn.setAttribute("aria-selected",String(btn.dataset.type===pickerType));
  });

  chipsWrap.innerHTML=CARD_ISSUERS.map(n=>`<button class="chip ${n===pickerIssuer?"on":""}" data-issuer="${n}">${n}</button>`).join("");
  chipsWrap.onclick=e=>{
    const b=e.target.closest(".chip"); if(!b) return;
    pickerIssuer=b.getAttribute("data-issuer");
    chipsWrap.querySelectorAll(".chip").forEach(c=>c.classList.toggle("on",c===b));
    renderPickerList();
  };

  input.value=pickerKeyword;
  input.oninput=()=>{ pickerKeyword=input.value.trim(); renderPickerList(); };

  renderPickerList();

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("no-scroll"); /* 배경 스크롤 잠금 */

  document.getElementById("pickerBackdrop").onclick=closePicker;
  document.getElementById("pickerClose").onclick=closePicker;

  document.querySelectorAll(".picker-tab").forEach(btn=>{
    btn.onclick=()=>{
      pickerType=btn.dataset.type;
      document.querySelectorAll(".picker-tab").forEach(t=>{
        t.classList.toggle("is-active",t===btn);
        t.setAttribute("aria-selected",String(t===btn));
      });
      renderPickerList();
    };
  });
}
function closePicker(){
  const modal=document.getElementById("pickerModal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("no-scroll"); /* 잠금 해제 */
  currentSlot=null;
}

function renderPickerList(){
  const list=document.getElementById("pickerList");
  const q=pickerKeyword.toLowerCase();
  let items=CARD_PRODUCTS.filter(p=>p.type===pickerType);
  if(pickerIssuer!=="전체") items=items.filter(p=>p.issuer===pickerIssuer);
  if(q) items=items.filter(p=>p.name.toLowerCase().includes(q));
  if(!items.length){ list.innerHTML=`<div class="muted" style="padding:16px 6px;">조건에 맞는 카드가 없습니다.</div>`; return; }

  list.innerHTML=items.map(p=>`
    <div class="picker-item" data-id="${p.id}" role="option">
      <div class="picker-thumb" style="--c1:${p.c1};--c2:${p.c2}"></div>
      <div><div class="picker-name">${p.name}</div><div class="picker-issuer">${p.issuer}</div></div>
    </div>`).join("");

  list.onclick=e=>{
    const item=e.target.closest(".picker-item"); if(!item) return;
    const card=items.find(x=>x.id===item.dataset.id);
    applyCardToSlot(card);
    closePicker();
  };
}

function renderSlot(i,card){
  const target=document.querySelector(`.slot-target[data-slot="${i}"]`);
  const label=document.getElementById(`slot-name-${i}`);
  if(!target||!label) return;
  if(!card){
    target.classList.remove("selected");
    target.innerHTML=`<span class="plus">+</span>`;
    label.textContent="카드를 선택해 주세요.";
    return;
  }
  target.classList.add("selected");
  target.innerHTML=`<div class="slot-mini" style="--c1:${card.c1};--c2:${card.c2}" title="${card.name}"></div>`;
  label.textContent=card.name;
}
function applyCardToSlot(card){ if(currentSlot==null) return; selectedCards[currentSlot]=card; renderSlot(currentSlot,card); saveSelected(); }
function clearSlot(idx){ selectedCards[idx]=null; renderSlot(idx,null); saveSelected(); }

function initCompareSlots(){
  loadSelected();
  [0,1,2].forEach(i=>renderSlot(i,selectedCards[i]));
  document.querySelectorAll(".slot-target").forEach(btn=>{
    btn.addEventListener("click",()=>openPicker(Number(btn.getAttribute("data-slot"))));
  });
  document.querySelectorAll(".slot-clear").forEach(btn=>{
    btn.addEventListener("click",e=>{ e.stopPropagation(); clearSlot(Number(btn.getAttribute("data-clear"))); });
  });
}

/* =========================
 * 헤더: 비교함 뱃지 & 활성 메뉴 표시 (상대경로 대응)
 * =======================*/
(function headerInit(){
  const KEY = "cp_selected_cards";
  const badge = document.getElementById("compareBadge");

  function updateBadge(){
    if(!badge) return;
    try {
      const arr = JSON.parse(localStorage.getItem(KEY) || "[]").filter(Boolean);
      if (arr.length > 0) {
        badge.textContent = arr.length;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    } catch {}
  }
  updateBadge();
  window.addEventListener("storage", (e)=> { if(e.key === KEY) updateBadge(); });

  // 현재 파일 경로에 특정 키워드가 포함되면 해당 메뉴 활성화
  const p = location.pathname.toLowerCase();
  const keys = ["recommend","browse","charts","deals","compare","index"];
  const hit = keys.find(k => p.includes(k));
  const map = { recommend:"recommend", browse:"browse", charts:"charts", deals:"deals", compare:"compare", index:"" };
  const key = hit ? map[hit] : "";
  if (key) {
    const el = document.querySelector(`.nav a[data-nav="${key}"]`);
    if (el) el.classList.add("is-active");
  }
})();

/* =========================
 * 초기화
 * =======================*/
document.addEventListener("DOMContentLoaded",()=>{
  if(document.getElementById("heroTrack")) renderHero();
  if(document.getElementById("benefitList")) renderBenefit();
  initSearchModal();

  if(document.querySelector(".compare-page")) initCompareSlots();

  if(document.getElementById("heroTrack")){
    document.addEventListener("keydown",e=>{
      if(e.key==="ArrowLeft"){e.preventDefault();goHero(heroIndex-1);}
      if(e.key==="ArrowRight"){e.preventDefault();goHero(heroIndex+1);}
    });
  }
});
