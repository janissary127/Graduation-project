/* =========================================================
 * CARD PICK — app.js (Flask + JSON 연동 버전)
 *  - 공통 헤더 주입(카드픽봇 포함)  ← Flask 라우트(/, /recommend ...)
 *  - 히어로: 데이터 있으면 데이터 기반, 없으면 기존 더미 슬라이드
 *  - 혜택 라인: 데이터(발급사 목록) → 없으면 기존 더미
 *  - 검색 모달
 *  - 비교 페이지 카드 선택(피커): 데이터 기반(id 저장) → 없으면 기존 더미(객체 저장) 폴백
 *  - 헤더 뱃지/활성 메뉴
 *  - 플로팅 챗봇 위젯 + 헤더 '카드픽봇' 연동
 * =======================================================*/

/* ------------------------ 전역 상태 ------------------------ */
const LS_KEY_V1 = "cp_selected_cards_v1"; // id 기반(데이터 모드)
const LS_KEY_V0 = "cp_selected_cards";    // 객체 기반(네 기존 방식) — 폴백/마이그레이션용
let selectedIds = [null, null, null];     // 데이터 모드: id 저장
let selectedObjs = [null, null, null];    // 폴백 모드: 객체 저장
let useDataMode = false;                  // 카드 JSON을 성공적으로 불렀으면 true

let RAW = [];          // 원본 JSON
let CARDS = [];        // 정규화 데이터: {id,name,issuer,type,promo,desc,details,image}
let pickerType = "credit";
let pickerIssuer = "전체";
let pickerKeyword = "";
let currentSlot = null;

let heroIndex = 0, heroTimer = null;

/* ------------------------ 유틸 ------------------------ */
const esc = (s)=> (s||s===0) ? String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[c])) : "";
const $   = (q,sc=document)=> sc.querySelector(q);
const $$  = (q,sc=document)=> [...sc.querySelectorAll(q)];

/* =========================================================
 * (A) 공통 헤더 템플릿(Flask 라우트) & 주입
 * =======================================================*/
function buildGlobalHeaderHTML(){
  return `
  <header class="site-header">
    <div class="container header__inner">
      <a href="/" class="brand" aria-label="CARD PICK 홈">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="3" fill="#111827"></rect>
          <rect x="4" y="9"  width="16" height="2" rx="1" fill="#fff" opacity=".75"></rect>
          <rect x="4" y="13" width="6"  height="2" rx="1" fill="#fff" opacity=".75"></rect>
        </svg>
        <strong class="brand__text">CARD PICK</strong>
      </a>

      <nav class="nav" aria-label="주요">
        <a href="#" class="nav-bot" data-nav="bot" id="navBot" title="대화형 추천 챗봇 열기">카드픽봇</a>
        <a href="/recommend" data-nav="recommend">카드픽추천</a>
        <a href="/browse"    data-nav="browse">카드찾기</a>
        <a href="/charts"    data-nav="charts">인기차트</a>
        <a href="/deals"     data-nav="deals">혜택·이벤트</a>
        <a href="/compare"   data-nav="compare">비교함</a>
      </nav>

      <div class="header__icons">
        <button id="openSearch" class="icon-btn" aria-label="검색 열기">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="#111827" stroke-width="2"></circle>
            <path d="M20 20L16.65 16.65" stroke="#111827" stroke-width="2" stroke-linecap="round"></path>
          </svg>
        </button>
        <a href="/compare" class="icon-btn" aria-label="비교함">
          <span class="icon-with-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 3v18M17 3v18M4 7h6M14 17h6"
                    stroke="#111827" stroke-width="2" stroke-linecap="round"></path>
            </svg>
            <span id="compareBadge" class="badge" style="display:none">0</span>
          </span>
        </a>
      </div>
    </div>
  </header>`;
}
function mountGlobalHeader(){
  const html = buildGlobalHeaderHTML();
  const wrap = document.createElement("div");
  wrap.innerHTML = html.trim();
  const newHeader = wrap.firstElementChild;
  const oldHeader = document.querySelector(".site-header");
  if (oldHeader) oldHeader.replaceWith(newHeader);
  else document.body.insertBefore(newHeader, document.body.firstChild);
}

/* =========================================================
 * (B) 데이터 로드: /api/cards → 실패 시 /static/data/card_list.json
 * =======================================================*/
async function loadCards(){
  async function j(url){
    const r = await fetch(url, {cache:"no-store"});
    if(!r.ok) throw new Error(`${r.status} @ ${url}`);
    return r.json();
  }
  try{
    let json;
    try { json = await j("/api/cards"); }                 // 백엔드 API(있으면 이걸로)
    catch { json = await j("/static/data/card_list.json"); } // 정적 폴백

    RAW = Array.isArray(json) ? json : (json.cards || json.items || json.list || []);
    CARDS = RAW.map(it=>{
      const id = String(it.team_id ?? it.id ?? it.teamId ?? Math.random());
      return {
        id,
        name: it.name ?? it.title ?? "Unnamed Card",
        issuer: it.corp ?? it.issuer ?? "기타",
        type: (it.type ?? "credit").toLowerCase(), // credit | check
        promo: it.promo ?? "",
        desc: it.desc1 ?? it.description ?? "",
        details: it.details ?? [],
        image: it.image ?? ""
      };
    });
    useDataMode = CARDS.length > 0;
  }catch(e){
    console.warn("카드 JSON 로드 실패(더미 모드로 진행):", e);
    useDataMode = false;
  }
}

/* =========================================================
 * (C) 히어로: 데이터 → 없으면 기존 더미 슬라이드
 * =======================================================*/
const dummySlides = [
  { badge:"대화형 추천 챗봇 오픈", title:"말로 끝내는 카드 추천", desc:"챗봇에게 내 소비 습관만 알려주세요!",
    stack:[ {c1:"#ffdede",c2:"#ffb8b8",r:"-10deg"}, {c1:"#edf2ff",c2:"#cfd8ff",r:"-2deg"}, {c1:"#ffeec2",c2:"#ffd27a",r:"6deg"}, {c1:"#e7fef1",c2:"#bdfadc",r:"14deg"} ] },
  { badge:"연회비 캐시백 모음", title:"연 최대 45만원 혜택", desc:"연회비를 상쇄하는 강력한 웰컴 혜택.",
    stack:[ {c1:"#e6fffb",c2:"#b7f4ef",r:"-12deg"}, {c1:"#fff7d1",c2:"#ffe69b",r:"-2deg"}, {c1:"#f3e8ff",c2:"#dab6ff",r:"10deg"} ] },
  { badge:"트래블 · 프리미엄", title:"라운지 · 해외 적립 2배", desc:"여행자에게 꼭 필요한 혜택, 한번에.",
    stack:[ {c1:"#e8f0ff",c2:"#cbe0ff",r:"-8deg"}, {c1:"#dbfff7",c2:"#b0ffe9",r:"0deg"}, {c1:"#ffe2e2",c2:"#ffcaca",r:"8deg"} ] },
];

function renderHero(){
  const track = $("#heroTrack"), dots = $("#heroDots");
  if(!(track && dots)) return;

  if(useDataMode){
    const slides = CARDS.filter(p=>p.promo).slice(0,3);
    if(slides.length){
      track.innerHTML = slides.map(s=>`
        <article class="hero__slide">
          <div class="hero__inner">
            <div class="hero__image">
              ${s.image ? `<img src="${esc(s.image)}" alt="${esc(s.name)}">`
                        : `<div class="hero-image-placeholder" aria-hidden="true">${esc(s.name)}</div>`}
            </div>
            <div class="hero__copy">
              <div class="kicker">${esc(s.issuer)}</div>
              <h2>${esc(s.promo)}</h2>
              <p>${esc(s.desc||"")}</p>
            </div>
          </div>
        </article>`).join("");
      dots.innerHTML = slides.map((_,i)=>`<button class="hero__dot" aria-selected="${i===0}" aria-label="${i+1}번째 배너"></button>`).join("");
      bindHeroNav();
      heroIndex=0; updateHero(); startHeroAuto();
      return;
    }
  }

  // 데이터 없으면: 네 기존 더미 슬라이드 사용
  track.innerHTML = dummySlides.map(s=>`
    <article class="hero__slide">
      <div class="hero__inner">
        <div class="hero__image">
          <div class="stack">
            ${s.stack.map((c,i)=>`<div class="card" style="--c1:${c.c1};--c2:${c.c2};--r:${c.r};z-index:${10-i}"></div>`).join("")}
          </div>
        </div>
        <div class="hero__copy">
          <div class="kicker">${esc(s.badge)}</div>
          <h2>${esc(s.title)}</h2>
          <p>${esc(s.desc)}</p>
        </div>
      </div>
    </article>`).join("");
  dots.innerHTML = dummySlides.map((_,i)=>`<button class="hero__dot" aria-selected="${i===0}"></button>`).join("");
  bindHeroNav();
  startHeroAuto(); updateHero();
}
function bindHeroNav(){
  const prev=$(".hero__nav--prev"), next=$(".hero__nav--next");
  if(prev&&next){
    prev.onclick=()=>{stopHeroAuto();goHero(heroIndex-1);startHeroAuto();};
    next.onclick=()=>{stopHeroAuto();goHero(heroIndex+1);startHeroAuto();};
    [prev,next].forEach(b=>{ b.addEventListener("mouseenter",stopHeroAuto); b.addEventListener("mouseleave",startHeroAuto); });
  }
  const viewport=$(".hero__viewport");
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
}
function goHero(n){
  const len = $$("#heroTrack .hero__slide").length || (useDataMode ? 1 : dummySlides.length);
  heroIndex=(n+len)%len; updateHero();
}
function updateHero(){ const track=$("#heroTrack"); const dots=$$("#heroDots .hero__dot"); if(track) track.style.transform=`translateX(-${heroIndex*100}%)`; dots.forEach((b,i)=>b?.setAttribute("aria-selected",String(i===heroIndex))); }
function startHeroAuto(){ stopHeroAuto(); heroTimer=setInterval(()=>goHero(heroIndex+1),5000); }
function stopHeroAuto(){ if(heroTimer) clearInterval(heroTimer); }

/* =========================================================
 * (D) 혜택 라인: 데이터(발급사) → 없으면 기존 더미
 * =======================================================*/
const dummyBenefit = [
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

function renderBenefit(){
  const list=$("#benefitList"); if(!list) return;

  if(useDataMode){
    const issuers = [...new Set(CARDS.map(p=>p.issuer))].slice(0,24);
    if(issuers.length){
      list.innerHTML = issuers.map(issuer=>{
        const short = issuer.length<=3 ? issuer : issuer.split(" ")[0].slice(0,3);
        return `
          <li class="benefit__item">
            <div class="brand-circle">${esc(short)}</div>
            <div class="benefit__label">카드 상품 보기</div>
            <div class="benefit__issuer">${esc(issuer)}</div>
          </li>`;
      }).join("");
      bindBenefitNav();
      return;
    }
  }

  // 데이터 없으면 기존 더미 라인
  list.innerHTML = dummyBenefit.map(item=>`
    <li class="benefit__item">
      <div class="brand-circle" style="background:${item.color}">${esc(item.short)}</div>
      <div class="benefit__label">${esc(item.label)}</div>
      <div class="benefit__issuer">${esc(item.name)}</div>
    </li>`).join("");
  bindBenefitNav();
}
function bindBenefitNav(){
  const viewport=$("#benefitViewport"), prev=$("#benefitPrev"), next=$("#benefitNext");
  if(!(viewport&&prev&&next)) return;
  const cardWidth=170+8, step=cardWidth*3;
  function update(){ prev.disabled=viewport.scrollLeft<=0; const max=viewport.scrollWidth-viewport.clientWidth-2; next.disabled=viewport.scrollLeft>=max; }
  prev.onclick=()=>{viewport.scrollBy({left:-step,behavior:"smooth"}); setTimeout(update,320);};
  next.onclick=()=>{viewport.scrollBy({left: step,behavior:"smooth"}); setTimeout(update,320);};
  viewport.addEventListener("scroll",update,{passive:true});
  viewport.addEventListener("wheel",e=>{ if(Math.abs(e.deltaX)<Math.abs(e.deltaY)){ viewport.scrollBy({left:e.deltaY,behavior:"auto"}); e.preventDefault(); } },{passive:false});
  update();
}

/* =========================================================
 * (E) 검색 모달 (기존 유지)
 * =======================================================*/
function initSearchModal(){
  const openBtn=$("#openSearch"); const modal=$("#searchModal"); if(!(openBtn&&modal)) return;
  const backdrop=$("#searchBackdrop"); const closeBtn=$("#searchClose"); const input=$("#searchInput");
  const recentWrap=$("#recentList"); const recentToggle=$("#recentToggle"); const hotWrap=$("#hotList"); const suggestWrap=$("#suggestList"); const submitBtn=$("#searchSubmit");

  const HOT=["카페/배달","연회비 1만원 이하","해외 적립","교통/통신","간편결제","무실적"];
  const SUGGEST=[{k:"챗봇",t:"대화로 카드 찾기 시작",e:"💬"},{k:"인기",t:"이번 달 HOT 카드",e:"🔥"},{k:"해외",t:"수수료/라운지/적립 비교",e:"🌍"},{k:"생활",t:"교통/통신/구독",e:"🚇"}];

  const RECENT_KEY="cp_recent_search";
  const getRecents=()=>{ try{return JSON.parse(localStorage.getItem(RECENT_KEY)||"[]");}catch{return[]} };
  const setRecents=l=>localStorage.setItem(RECENT_KEY,JSON.stringify(l.slice(0,10)));

  function renderRecents(){
    const r=getRecents();
    if(!r.length){ recentWrap.classList.add("muted"); recentWrap.textContent="최근 검색한 내용이 없습니다."; return; }
    recentWrap.classList.remove("muted");
    recentWrap.innerHTML=r.map(v=>`<button class="chip" data-q="${esc(v)}">${esc(v)}</button>`).join("");
  }
  function renderHot(){ hotWrap.innerHTML=HOT.map((v,i)=>`<button class="chip ${i<1?"hot":""}" data-q="${esc(v)}">${esc(v)}</button>`).join(""); }
  function renderSuggest(){ suggestWrap.innerHTML=SUGGEST.map(s=>`<div class="suggest-card"><div class="k">${esc(s.k)}</div><div class="t">${esc(s.t)}</div><div class="e">${esc(s.e)}</div></div>`).join(""); }

  function open(){ modal.classList.add("is-open"); modal.setAttribute("aria-hidden","false"); document.body.classList.add("no-scroll"); renderRecents(); renderHot(); renderSuggest(); setTimeout(()=>input.focus(),0); bindTrap(); }
  function close(){ modal.classList.remove("is-open"); modal.setAttribute("aria-hidden","true"); document.body.classList.remove("no-scroll"); unbindTrap(); openBtn.focus(); }

  function performSearch(q){
    const query=(q ?? input.value).trim();
    if(!query){ input.focus(); return; }
    if(recentToggle?.checked){ const r=getRecents().filter(v=>v!==query); r.unshift(query); setRecents(r); }
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

/* =========================================================
 * (F) 비교 페이지 — 데이터 모드 우선(id 저장), 폴백은 기존 객체 저장
 * =======================================================*/
function loadSelected(){
  try{
    // 1) 데이터 모드(id)
    const rawV1 = localStorage.getItem(LS_KEY_V1);
    if(rawV1){ selectedIds = JSON.parse(rawV1); if(Array.isArray(selectedIds)&&selectedIds.length===3){ useDataMode = useDataMode || true; return; } }
    // 2) 폴백(네 기존 객체 저장)
    const rawV0 = localStorage.getItem(LS_KEY_V0);
    if(rawV0){ selectedObjs = JSON.parse(rawV0); if(Array.isArray(selectedObjs)&&selectedObjs.length===3) return; }
  }catch{}
}
function saveSelected(){
  try{
    if(useDataMode){ localStorage.setItem(LS_KEY_V1, JSON.stringify(selectedIds)); }
    else { localStorage.setItem(LS_KEY_V0, JSON.stringify(selectedObjs)); }
  }catch{}
}

function openPicker(slotIndex){
  currentSlot=slotIndex;
  const modal=$("#pickerModal"); const chipsWrap=$("#issuerChips"); const input=$("#pickerKeyword");
  if(!modal||!chipsWrap||!input) return;

  $$(".picker-tab").forEach(btn=>{
    btn.classList.toggle("is-active",btn.dataset.type===pickerType);
    btn.setAttribute("aria-selected",String(btn.dataset.type===pickerType));
  });

  const issuers=["전체", ...(useDataMode ? [...new Set(CARDS.map(p=>p.issuer))] : CARD_ISSUERS.filter(i=>i!=="전체"))].slice(0,50);
  chipsWrap.innerHTML = issuers.map(n=>`<button class="chip ${n===pickerIssuer?"on":""}" data-issuer="${esc(n)}">${esc(n)}</button>`).join("");
  chipsWrap.onclick = (e)=>{
    const b=e.target.closest(".chip"); if(!b) return;
    pickerIssuer=b.getAttribute("data-issuer");
    $$("#issuerChips .chip").forEach(c=>c.classList.toggle("on",c===b));
    renderPickerList();
  };

  input.value=pickerKeyword;
  input.oninput=()=>{ pickerKeyword=input.value.trim(); renderPickerList(); };

  $$(".picker-tab").forEach(btn=>{
    btn.onclick=()=>{
      pickerType=btn.dataset.type;
      $$(".picker-tab").forEach(t=>{ t.classList.toggle("is-active",t===btn); t.setAttribute("aria-selected",String(t===btn)); });
      renderPickerList();
    };
  });

  renderPickerList();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");
  $("#pickerBackdrop")?.addEventListener("click", closePicker, {once:true});
  $("#pickerClose")?.addEventListener("click", closePicker, {once:true});
}
function closePicker(){ const modal=$("#pickerModal"); if(!modal) return; modal.classList.remove("is-open"); modal.setAttribute("aria-hidden","true"); currentSlot=null; }

function renderPickerList(){
  const list=$("#pickerList"); if(!list) return;
  const q = pickerKeyword.toLowerCase();

  // 데이터 모드
  if(useDataMode){
    let items = CARDS.filter(p=>p.type===pickerType);
    if(pickerIssuer!=="전체") items = items.filter(p=>p.issuer===pickerIssuer);
    if(q) items = items.filter(p=>p.name.toLowerCase().includes(q) || (p.promo||"").toLowerCase().includes(q));
    if(!items.length){ list.innerHTML=`<div class="muted" style="padding:16px 6px;">조건에 맞는 카드가 없습니다.</div>`; return; }

    list.innerHTML = items.map(p=>`
      <div class="picker-item" data-id="${p.id}" role="option" tabindex="0">
        <div class="picker-thumb">
          <img src="${esc(p.image||"")}" alt="${esc(p.name)}" class="card-img" onerror="this.style.display='none'">
        </div>
        <div class="picker-info">
          <div class="picker-name">${esc(p.name)}</div>
          <div class="picker-issuer">${esc(p.issuer)} ${p.promo ? `· ${esc(p.promo)}` : ""}</div>
        </div>
      </div>`).join("");

    list.onclick = (e)=>{ const item=e.target.closest(".picker-item"); if(!item) return; const card=CARDS.find(x=>x.id===item.dataset.id); applyCard(card); closePicker(); };
    list.onkeydown = (e)=>{ if(e.key==="Enter"){ const item=e.target.closest(".picker-item"); if(!item) return; const card=CARDS.find(x=>x.id===item.dataset.id); applyCard(card); closePicker(); } };
    return;
  }

  // 폴백 모드(네 기존 더미)
  let items = CARD_PRODUCTS.filter(p=>p.type===pickerType);
  if(pickerIssuer!=="전체") items=items.filter(p=>p.issuer===pickerIssuer);
  if(q) items=items.filter(p=>p.name.toLowerCase().includes(q));
  if(!items.length){ list.innerHTML=`<div class="muted" style="padding:16px 6px;">조건에 맞는 카드가 없습니다.</div>`; return; }

  list.innerHTML = items.map(p=>`
    <div class="picker-item" data-id="${p.id}" role="option" tabindex="0">
      <div class="picker-thumb" style="--c1:${p.c1};--c2:${p.c2}"></div>
      <div><div class="picker-name">${esc(p.name)}</div><div class="picker-issuer">${esc(p.issuer)}</div></div>
    </div>`).join("");

  list.onclick = (e)=>{ const item=e.target.closest(".picker-item"); if(!item) return; const card=items.find(x=>x.id===item.dataset.id); applyCard(card); closePicker(); };
  list.onkeydown = (e)=>{ if(e.key==="Enter"){ const item=e.target.closest(".picker-item"); if(!item) return; const card=items.find(x=>x.id===item.dataset.id); applyCard(card); closePicker(); } };
}

function applyCard(card){
  if(currentSlot==null || !card) return;
  if(useDataMode){
    selectedIds[currentSlot]=card.id;
    renderSlot(currentSlot); saveSelected();
  }else{
    selectedObjs[currentSlot]=card;
    renderSlot(currentSlot); saveSelected();
  }
}

function renderSlot(i){
  const target = $(`.slot-target[data-slot="${i}"]`);
  const label  = $(`#slot-name-${i}`);
  if(!target||!label) return;

  if(useDataMode){
    const id = selectedIds[i];
    if(!id){ target.classList.remove("selected"); target.innerHTML=`<span class="plus">+</span>`; label.textContent="카드를 선택해 주세요."; return; }
    const card = CARDS.find(p=>p.id===id);
    if(!card){ selectedIds[i]=null; saveSelected(); renderSlot(i); return; }
    target.classList.add("selected");
    target.innerHTML = `
      <div class="slot-mini" title="${esc(card.name)}">
        <img src="${esc(card.image||"")}" alt="${esc(card.name)}" class="slot-img" onerror="this.style.display='none'">
      </div>`;
    label.textContent = card.name;
    return;
  }

  // 폴백 모드
  const card = selectedObjs[i];
  if(!card){ target.classList.remove("selected"); target.innerHTML=`<span class="plus">+</span>`; label.textContent="카드를 선택해 주세요."; return; }
  target.classList.add("selected");
  target.innerHTML = `<div class="slot-mini" style="--c1:${card.c1};--c2:${card.c2}" title="${esc(card.name)}"></div>`;
  label.textContent = card.name;
}

function clearSlot(idx){
  if(useDataMode){ selectedIds[idx]=null; }
  else           { selectedObjs[idx]=null; }
  renderSlot(idx); saveSelected();
}

function initCompareSlots(){
  if(!document.querySelector(".compare-page")) return;
  loadSelected();
  [0,1,2].forEach(i=>renderSlot(i));

  $$(".slot-target").forEach(btn=>{
    btn.addEventListener("click",()=>openPicker(Number(btn.getAttribute("data-slot"))));
    btn.addEventListener("keydown",(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); openPicker(Number(btn.getAttribute("data-slot"))); }});
  });
  $$(".slot-clear").forEach(btn=>{
    btn.addEventListener("click",(e)=>{ e.stopPropagation(); clearSlot(Number(btn.getAttribute("data-clear"))); });
  });
}

/* =========================================================
 * (G) 헤더 상태(뱃지 & 활성 메뉴)
 * =======================================================*/
function initHeaderState(){
  const badge = $("#compareBadge");
  function updateBadge(){
    if(!badge) return;
    try{
      const arr = useDataMode
        ? (JSON.parse(localStorage.getItem(LS_KEY_V1)||"[]")||[]).filter(Boolean)
        : (JSON.parse(localStorage.getItem(LS_KEY_V0)||"[]")||[]).filter(Boolean);
      if(arr.length>0){ badge.textContent=arr.length; badge.style.display="inline-block"; }
      else { badge.style.display="none"; }
    }catch{}
  }
  updateBadge(); window.addEventListener("storage",(e)=>{ if([LS_KEY_V1,LS_KEY_V0].includes(e.key)) updateBadge(); });

  const p = location.pathname.toLowerCase();
  const keys = ["recommend","browse","charts","deals","compare","/"];
  const hit  = keys.find(k => k==="/" ? p==="/" : p.includes(k));
  const map  = { recommend:"recommend", browse:"browse", charts:"charts", deals:"deals", compare:"compare", "/":"" };
  const key  = hit ? map[hit] : "";
  if (key) { const el = document.querySelector(`.nav a[data-nav="${key}"]`); el?.classList.add("is-active"); }
}

/* =========================================================
 * (H) 플로팅 챗봇 위젯 (기존 유지, 링크는 Flask 경로)
 * =======================================================*/
function insertChatWidget(){
  if($("#cpChatDrawer")) return;
  const fab = document.createElement("button");
  fab.className="cp-chat-fab"; fab.id="cpChatFab"; fab.setAttribute("aria-label","챗봇 열기");
  fab.innerHTML=`<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-4l-4 4v-4H8a4 4 0 0 1-4-4V6z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
  document.body.appendChild(fab);

  const drawer=document.createElement("section");
  drawer.className="cp-chat-drawer"; drawer.id="cpChatDrawer";
  drawer.setAttribute("role","dialog"); drawer.setAttribute("aria-modal","false"); drawer.setAttribute("aria-hidden","true");
  drawer.innerHTML=`
    <div class="cp-chat-head">
      <div class="cp-chat-title"><span class="dot"></span> CARD PICK BOT</div>
      <button class="cp-chat-close" id="cpChatClose" aria-label="닫기">닫기</button>
    </div>
    <div class="cp-chat-log" id="cpChatLog" aria-live="polite"></div>
    <div class="cp-chat-suggest" id="cpChatSuggest"></div>
    <form class="cp-chat-input" id="cpChatForm">
      <input id="cpChatInput" type="text" placeholder="예) 카페/배달 자주 쓰고, 연회비는 저렴하게" />
      <button class="cp-chat-send" type="submit">보내기</button>
    </form>`;
  document.body.appendChild(drawer);

  const log=$("#cpChatLog"), suggest=$("#cpChatSuggest"), form=$("#cpChatForm"), input=$("#cpChatInput"), closeBtn=$("#cpChatClose");
  const SUG=["카페/배달 많이 써요","연회비 1만원 이하","해외 결제 자주해요","교통/통신 절약","간편결제 많이 써요"];
  suggest.innerHTML=SUG.map(s=>`<button type="button" class="cp-chip" data-msg="${esc(s)}">${esc(s)}</button>`).join("");

  function open(){ drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden","false"); setTimeout(()=>input.focus(),0); }
  function close(){ drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden","true"); fab.focus(); }
  fab.addEventListener("click",()=>{ open(); if(!log.dataset.welcome){ addBot("안녕하세요! 소비 패턴을 알려주시면 맞춤 카드를 추천해 드릴게요. 예) 카페/배달, 연회비 1만원 이하"); log.dataset.welcome="1"; }});
  closeBtn.addEventListener("click",close);

  suggest.addEventListener("click",(e)=>{ const b=e.target.closest(".cp-chip"); if(!b) return; input.value=b.getAttribute("data-msg"); form.requestSubmit(); });
  form.addEventListener("submit",(e)=>{ e.preventDefault(); const q=(input.value||"").trim(); if(!q) return input.focus(); addUser(q); input.value=""; setTimeout(()=> addBot(genAnswer(q)), 350); });

  function addUser(t){ const el=document.createElement("div"); el.className="cp-msg user"; el.textContent=t; log.appendChild(el); log.scrollTop=log.scrollHeight; }
  function addBot(h){ const el=document.createElement("div"); el.className="cp-msg bot"; el.innerHTML=h; log.appendChild(el); log.scrollTop=log.scrollHeight; }
  function genAnswer(q){
    const s=q.toLowerCase();
    if(/카페|배달|편의점/.test(s)) return `<strong>추천: 삼성 taptap O</strong><br/>• 카페/배달 상시 적립 · 간편결제 추가<br/>→ <a href="/compare">비교함</a>에서 더 보기`;
    if(/해외|여행|라운지|마일/.test(s)) return `<strong>추천: 스카이패스 계열</strong><br/>• 해외 적립/라운지 강점<br/>→ <a href="/compare">비교함</a>에서 조건 비교`;
    if(/교통|통신|구독/.test(s)) return `<strong>추천: KB My WE:SH</strong><br/>• 교통/통신/구독 생활영역 특화<br/>→ <a href="/compare">비교함</a> 이동`;
    if(/연회비|만원|저렴/.test(s)) return `<strong>추천: 현대 ZERO Edition2</strong><br/>• 무실적/낮은 연회비 구간<br/>→ <a href="/compare">비교함</a>에서 대안도 확인`;
    return `원하시는 혜택 키워드를 알려주세요. 예) "카페/배달", "해외 적립", "교통/통신", "연회비 1만원 이하"`;
  }
  window.CPChat={ open, close };
}

/* =========================================================
 * (I) 초기화
 * =======================================================*/
document.addEventListener("DOMContentLoaded", async ()=>{
  // 1) 공통 헤더 주입 및 상태
  mountGlobalHeader();
  initHeaderState();

  // 2) 챗봇 위젯 + 헤더 연동
  insertChatWidget();
  const navBot = $("#navBot");
  if(navBot){
    navBot.setAttribute("aria-expanded","false");
    navBot.addEventListener("click",(e)=>{ e.preventDefault(); if(!window.CPChat) insertChatWidget(); window.CPChat.open(); navBot.setAttribute("aria-expanded","true"); });
  }

  // 3) 검색 모달
  initSearchModal();

  // 4) 카드 데이터 로드 → UI 렌더 (히어로/혜택/비교)
  await loadCards();
  if($("#heroTrack")) renderHero();
  if($("#benefitList")) renderBenefit();
  if($(".compare-page")) initCompareSlots();

  // 5) 히어로 키보드 제어
  if($("#heroTrack")){
    document.addEventListener("keydown",e=>{
      if(e.key==="ArrowLeft"){e.preventDefault();goHero(heroIndex-1);}
      if(e.key==="ArrowRight"){e.preventDefault();goHero(heroIndex+1);}
    });
  }
});

/* =========================================================
 * (J) 폴백에 필요한 네 기존 더미 카드/발급사(삭제 금지)
 * =======================================================*/
const CARD_ISSUERS=["전체","신한카드","삼성카드","현대카드","롯데카드","KB국민카드","우리카드","하나카드","NH농협카드","IBK기업은행","BC 바로카드","네이버페이","현대백화점"];
const CARD_PRODUCTS=[
  {id:"mr-life",name:"신한카드 Mr.Life",issuer:"신한카드",type:"credit",c1:"#ffeded",c2:"#ffc3c3"},
  {id:"taptap-o",name:"삼성카드 taptap O",issuer:"삼성카드",type:"credit",c1:"#ffe6f1",c2:"#ffc7de"},
  {id:"sky-miles",name:"삼성 & MILEAGE PLATINUM (스카이패스)",issuer:"삼성카드",type:"credit",c1:"#eaf2ff",c2:"#cfe0ff"},
  {id:"id-select-all",name:"삼성 iD SELECT ALL",issuer:"삼성카드",type:"credit",c1:"#eef2f7",c2:"#dde6f3"},
  {id:"kb-wesh",name:"KB국민 My WE:SH",issuer:"KB국민카드",type:"credit",c1:"#f9f4e7",c2:"#ead9b6"},
  {id:"hy-zero2",name:"현대 ZERO Edition2",issuer:"현대카드",type:"credit",c1:"#e8f0ff",c2:"#c7d8ff"},
  {id:"lotte-loca",name:"롯데 LOCA Likit",issuer:"롯데카드",type:"credit",c1:"#e8f8ff",c2:"#bdf0ff"},
  {id:"woori-point",name:"우리 카드의정석 POINT",issuer:"우리카드",type:"credit",c1:"#e6fff4",c2:"#b9fbe0"},
  {id:"hana-clubsk",name:"하나카드 CLUB SK",issuer:"하나카드",type:"credit",c1:"#eafff9",c2:"#c5fff0"},
  {id:"nh-good",name:"NH농협 올바른 체크",issuer:"NH농협카드",type:"check",c1:"#f5fff0",c2:"#e0ffd1"},
  {id:"ibk-daily",name:"IBK 일상의기쁨 체크",issuer:"IBK기업은행",type:"check",c1:"#f0f7ff",c2:"#d7e7ff"},
  {id:"kb-simple",name:"KB국민 탄탄대로 체크",issuer:"KB국민카드",type:"check",c1:"#fff4eb",c2:"#ffe0c8"},
];
