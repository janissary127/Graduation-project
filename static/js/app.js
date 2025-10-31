/* =========================================================
 * CARD PICK — app.js (합본 최종)
 *
 * 주요 기능
 *  - 공통 헤더 주입(카드픽봇/차트/이벤트/아이콘 제거, 최소 메뉴만)
 *  - 검색 모달(버튼 없으면 자동 미동작)
 *  - 히어로/혜택 가로 슬라이더(섹션 없으면 미동작)
 *  - 비교 페이지 카드 선택(피커) + 로컬스토리지 저장
 *  - 비교함 뱃지(요소 없으면 스킵), 현재 메뉴 active
 *  - 비교 테이블 자동 렌더(renderComparisonTable)
 *  - 플로팅 챗봇 위젯 + 홈 입력바 연동
 * =======================================================*/

/* ------------------------ 전역 상태 ------------------------ */
const LS_KEY_V1 = "cp_selected_cards_v1"; // id 기반(데이터 모드)
const LS_KEY_V0 = "cp_selected_cards";    // 객체 기반(폴백/이전방식)
let selectedIds = [null, null, null];
let selectedObjs = [null, null, null];
let useDataMode = false;

let RAW = [];
let CARDS = [];
let pickerType = "credit";
let pickerIssuer = "전체";
let pickerKeyword = "";
let currentSlot = null;

let heroIndex = 0, heroTimer = null;

/* ------------------------ 유틸 ------------------------ */
const esc = (s) => (s || s === 0)
  ? String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
  : "";

const $  = (q, sc = document) => sc.querySelector(q);
const $$ = (q, sc = document) => [...sc.querySelectorAll(q)];

/* =========================================================
 * (A) 공통 헤더 템플릿 & 주입
 *   └ 요청 반영: 카드픽봇/인기차트/혜택·이벤트/검색·비교 아이콘 제거
 * =======================================================*/
function buildGlobalHeaderHTML() {
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
        <a href="/recommend" data-nav="recommend">카드픽추천</a>
        <a href="/browse"    data-nav="browse">카드찾기</a>
        <a href="/compare"   data-nav="compare">비교함</a>
      </nav>

      <!-- 아이콘 영역 비움 -->
      <div class="header__icons"></div>
    </div>
  </header>`;
}

function mountGlobalHeader() {
  const wrap = document.createElement("div");
  wrap.innerHTML = buildGlobalHeaderHTML().trim();
  const newHeader = wrap.firstElementChild;
  const oldHeader = document.querySelector(".site-header");
  if (oldHeader) oldHeader.replaceWith(newHeader);
  else document.body.insertBefore(newHeader, document.body.firstChild);
}

/* =========================================================
 * (B) 카드 데이터 로드 (/api/cards → 실패 시 로컬 JSON)
 * =======================================================*/
async function loadCards() {
  async function j(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} @ ${url}`);
    return r.json();
  }
  try {
    let json;
    try { json = await j("/api/cards"); }
    catch { json = await j("/static/data/card_list.json"); }

    RAW = Array.isArray(json) ? json : (json.cards || json.items || json.list || []);

    CARDS = RAW.map((it, idx) => {
      const baseId = (it.team_id ?? it.id ?? it.teamId ?? `card`);
      const id = String(`${baseId}_${idx}`);
      return {
        id,
        name:   it.name ?? it.title ?? "Unnamed Card",
        issuer: it.corp ?? it.issuer ?? "기타",
        type:  (it.type ?? "credit").toLowerCase(),
        promo:  it.promo ?? "",
        desc:   it.desc1 ?? it.description ?? "",
        details: it.details ?? [],
        image:   it.image ?? "",
        rawId:   it.id ?? it.team_id ?? it.teamId ?? undefined
      };
    });

    useDataMode = CARDS.length > 0;
  } catch (e) {
    console.warn("카드 JSON 로드 실패(더미 모드):", e);
    useDataMode = false;
    RAW = [];
    CARDS = [];
  }
}

/* =========================================================
 * (C) 히어로(캐러셀) — 페이지에 없으면 미동작
 * =======================================================*/
const dummySlides = [
  { badge:"대화형 추천 챗봇 오픈", title:"말로 끝내는 카드 추천", desc:"챗봇에게 내 소비 습관만 알려주세요!",
    stack:[{c1:"#ffdede",c2:"#ffb8b8",r:"-10deg"},{c1:"#edf2ff",c2:"#cfd8ff",r:"-2deg"},{c1:"#ffeec2",c2:"#ffd27a",r:"6deg"},{c1:"#e7fef1",c2:"#bdfadc",r:"14deg"}]},
  { badge:"연회비 캐시백 모음", title:"연 최대 45만원 혜택", desc:"연회비를 상쇄하는 강력한 웰컴 혜택.",
    stack:[{c1:"#e6fffb",c2:"#b7f4ef",r:"-12deg"},{c1:"#fff7d1",c2:"#ffe69b",r:"-2deg"},{c1:"#f3e8ff",c2:"#dab6ff",r:"10deg"}]},
  { badge:"트래블 · 프리미엄", title:"라운지 · 해외 적립 2배", desc:"여행자에게 꼭 필요한 혜택, 한번에.",
    stack:[{c1:"#e8f0ff",c2:"#cbe0ff",r:"-8deg"},{c1:"#dbfff7",c2:"#b0ffe9",r:"0deg"},{c1:"#ffe2e2",c2:"#ffcaca",r:"8deg"}]},
];

function renderHero() {
  const track = $("#heroTrack"), dots = $("#heroDots");
  if (!(track && dots)) return;

  if (useDataMode) {
    const slides = CARDS.filter(p => p.promo).slice(0, 3);
    if (slides.length) {
      track.innerHTML = slides.map(s => `
        <article class="hero__slide">
          <div class="hero__inner">
            <div class="hero__image">
              ${s.image ? `<img src="${esc(s.image)}" alt="${esc(s.name)}">`
                        : `<div class="hero-image-placeholder" aria-hidden="true">${esc(s.name)}</div>`}
            </div>
            <div class="hero__copy">
              <div class="kicker">${esc(s.issuer)}</div>
              <h2>${esc(s.promo)}</h2>
              <p>${esc(s.desc || "")}</p>
            </div>
          </div>
        </article>`).join("");

      dots.innerHTML = slides.map((_, i) =>
        `<button class="hero__dot" aria-selected="${i===0}" aria-label="${i+1}번째 배너"></button>`
      ).join("");

      bindHeroNav(); heroIndex = 0; updateHero(); startHeroAuto();
      return;
    }
  }

  // 폴백 더미
  track.innerHTML = dummySlides.map(s => `
    <article class="hero__slide">
      <div class="hero__inner">
        <div class="hero__image">
          <div class="stack">
            ${s.stack.map((c,i)=>`
              <div class="card" style="--c1:${c.c1};--c2:${c.c2};--r:${c.r};z-index:${10-i}"></div>`
            ).join("")}
          </div>
        </div>
        <div class="hero__copy">
          <div class="kicker">${esc(s.badge)}</div>
          <h2>${esc(s.title)}</h2>
          <p>${esc(s.desc)}</p>
        </div>
      </div>
    </article>`).join("");

  dots.innerHTML = dummySlides.map((_, i) =>
    `<button class="hero__dot" aria-selected="${i===0}"></button>`
  ).join("");

  bindHeroNav(); startHeroAuto(); updateHero();
}
function bindHeroNav() {
  const prev=$(".hero__nav--prev"), next=$(".hero__nav--next");
  if (prev && next) {
    prev.onclick=()=>{ stopHeroAuto(); goHero(heroIndex-1); startHeroAuto(); };
    next.onclick=()=>{ stopHeroAuto(); goHero(heroIndex+1); startHeroAuto(); };
    [prev,next].forEach(b=>{ b.addEventListener("mouseenter",stopHeroAuto); b.addEventListener("mouseleave",startHeroAuto); });
  }
  const viewport=$(".hero__viewport");
  if (viewport) {
    let startX=null;
    const getX=e=>e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX;
    const isOnNav=t=>t && t.closest?.(".hero__nav");
    const down=e=>{ if(isOnNav(e.target)) return; startX=getX(e); };
    const up=e=>{
      if(startX==null) return;
      const diff=getX(e)-startX;
      if(Math.abs(diff)>40) diff<0?goHero(heroIndex+1):goHero(heroIndex-1);
      startX=null;
    };
    viewport.addEventListener("pointerdown",down);
    viewport.addEventListener("pointerup",up);
    viewport.addEventListener("touchstart",down,{passive:true});
    viewport.addEventListener("touchend",up,{passive:true});
  }
}
function goHero(n){ const len=$$("#heroTrack .hero__slide").length || (useDataMode?1:dummySlides.length); heroIndex=(n+len)%len; updateHero(); }
function updateHero(){ const track=$("#heroTrack"); const dots=$$("#heroDots .hero__dot"); if(track) track.style.transform=`translateX(-${heroIndex*100}%)`; dots.forEach((b,i)=>b?.setAttribute("aria-selected",String(i===heroIndex))); }
function startHeroAuto(){ stopHeroAuto(); heroTimer=setInterval(()=>goHero(heroIndex+1),5000); }
function stopHeroAuto(){ if(heroTimer) clearInterval(heroTimer); }

/* =========================================================
 * (D) 혜택 라인 (홈 섹션 제거 시 자동 미동작)
 * =======================================================*/
const dummyBenefit = [
  { short:"S",    name:"삼성카드",     label:"최대 93.8만원 받기", color:"#0066ff" },
  { short:"LOCA", name:"롯데카드",     label:"최대 45만원 받기",   color:"#6a5de3" },
  { short:"우리", name:"우리카드",     label:"최대 32.5만원 받기",  color:"#0071c2" },
  { short:"신한", name:"신한카드",     label:"최대 29만원 받기",   color:"#3762ff" },
  { short:"KB",   name:"KB국민카드",   label:"최대 23만원 받기",   color:"#8b6a45" },
  { short:"현대", name:"현대카드",     label:"최대 20만원 받기",   color:"#1f2937" },
  { short:"IBK",  name:"IBK기업은행",  label:"최대 17.5만원 받기", color:"#0090ff" },
  { short:"NH",   name:"NH농협카드",   label:"최대 12만원 받기",   color:"#0f62ae" },
  { short:"쿠팡", name:"쿠팡 와우카드", label:"연 최대 62만원 혜택", color:"#ef4444" },
];
function renderBenefit() {
  const list = $("#benefitList");
  if (!list) return;

  if (useDataMode) {
    const issuers = [...new Set(CARDS.map(p => p.issuer))].slice(0, 24);
    if (issuers.length) {
      list.innerHTML = issuers.map(issuer => {
        const short = issuer.length <= 3 ? issuer : issuer.split(" ")[0].slice(0,3);
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

  // 폴백
  list.innerHTML = dummyBenefit.map(item => `
    <li class="benefit__item">
      <div class="brand-circle" style="background:${item.color}">${esc(item.short)}</div>
      <div class="benefit__label">${esc(item.label)}</div>
      <div class="benefit__issuer">${esc(item.name)}</div>
    </li>`).join("");
  bindBenefitNav();
}
function bindBenefitNav() {
  const viewport=$("#benefitViewport"), prev=$("#benefitPrev"), next=$("#benefitNext");
  if (!(viewport && prev && next)) return;
  const cardWidth = 170 + 8, step = cardWidth * 3;

  function update(){
    prev.disabled = viewport.scrollLeft <= 0;
    const max = viewport.scrollWidth - viewport.clientWidth - 2;
    next.disabled = viewport.scrollLeft >= max;
  }
  prev.onclick=()=>{ viewport.scrollBy({left:-step,behavior:"smooth"}); setTimeout(update,320); };
  next.onclick=()=>{ viewport.scrollBy({left: step,behavior:"smooth"}); setTimeout(update,320); };

  viewport.addEventListener("scroll",update,{passive:true});
  viewport.addEventListener("wheel",e=>{
    if(Math.abs(e.deltaX)<Math.abs(e.deltaY)){ viewport.scrollBy({left:e.deltaY,behavior:"auto"}); e.preventDefault(); }
  },{passive:false});
  update();
}

/* =========================================================
 * (E) 검색 모달 (헤더 버튼 제거되어도 모달 구조는 유지)
 * =======================================================*/
function initSearchModal() {
  const openBtn = $("#openSearch");
  const modal   = $("#searchModal");
  if (!(openBtn && modal)) return;

  const backdrop = $("#searchBackdrop");
  const closeBtn = $("#searchClose");
  const input    = $("#searchInput");
  const recentWrap  = $("#recentList");
  const recentToggle= $("#recentToggle");
  const hotWrap     = $("#hotList");
  const suggestWrap = $("#suggestList");
  const submitBtn   = $("#searchSubmit");

  const HOT = ["카페/배달","연회비 1만원 이하","해외 적립","교통/통신","간편결제","무실적"];
  const SUGGEST = [
    { k:"챗봇", t:"대화로 카드 찾기 시작", e:"💬" },
    { k:"인기", t:"이번 달 HOT 카드",      e:"🔥" },
    { k:"해외", t:"수수료/라운지/적립 비교", e:"✈️" },
    { k:"생활", t:"교통/통신/구독",        e:"🚇" }
  ];

  const RECENT_KEY="cp_recent_search";
  const getRecents=()=>{ try{return JSON.parse(localStorage.getItem(RECENT_KEY)||"[]");}catch{return[];} };
  const setRecents=l=>localStorage.setItem(RECENT_KEY,JSON.stringify(l.slice(0,10)));

  function renderRecents(){
    const r=getRecents();
    if(!r.length){ recentWrap.classList.add("muted"); recentWrap.textContent="최근 검색한 내용이 없습니다."; return; }
    recentWrap.classList.remove("muted");
    recentWrap.innerHTML=r.map(v=>`<button class="chip" data-q="${esc(v)}">${esc(v)}</button>`).join("");
  }
  function renderHot(){
    hotWrap.innerHTML=HOT.map((v,i)=>`<button class="chip ${i<1?"hot":""}" data-q="${esc(v)}">${esc(v)}</button>`).join("");
  }
  function renderSuggest(){
    suggestWrap.innerHTML=SUGGEST.map(s=>`
      <div class="suggest-card">
        <div class="k">${esc(s.k)}</div><div class="t">${esc(s.t)}</div><div class="e">${esc(s.e)}</div>
      </div>`).join("");
  }

  function open(){
    modal.classList.add("is-open"); modal.setAttribute("aria-hidden","false"); document.body.classList.add("no-scroll");
    renderRecents(); renderHot(); renderSuggest(); setTimeout(()=>input.focus(),0); bindTrap();
  }
  function close(){
    modal.classList.remove("is-open"); modal.setAttribute("aria-hidden","true"); document.body.classList.remove("no-scroll");
    unbindTrap(); openBtn.focus();
  }
  function performSearch(q){
    const query=(q ?? input.value).trim(); if(!query){ input.focus(); return; }
    if (recentToggle?.checked){ const r=getRecents().filter(v=>v!==query); r.unshift(query); setRecents(r); }
    console.log("검색:", query); close();
  }

  openBtn.addEventListener("click",open);
  closeBtn?.addEventListener("click",close);
  backdrop?.addEventListener("click",close);
  submitBtn?.addEventListener("click",()=>performSearch());
  input?.addEventListener("keydown",e=>{ if(e.key==="Enter") performSearch(); if(e.key==="Escape") close(); });

  modal.addEventListener("click",e=>{
    const b=e.target.closest?.(".chip"); if(!b) return;
    const q=b.getAttribute("data-q"); input.value=q; performSearch(q);
  });
  document.addEventListener("keydown",e=>{ if(!modal.classList.contains("is-open")) return; if(e.key==="Escape") close(); });

  // focus trap
  let trapHandler=null;
  function bindTrap(){
    trapHandler=e=>{
      if(e.key!=="Tab") return;
      const focusables=modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
      const list=[...focusables].filter(el=>!el.hasAttribute("disabled") && el.offsetParent!==null);
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
 * (F) 비교 페이지 — 로컬 저장/선택/슬롯 렌더
 * =======================================================*/

function loadSelected() {
  try {
    const rawV1 = localStorage.getItem(LS_KEY_V1);
    if (rawV1) {
      const arr = JSON.parse(rawV1);
      if (Array.isArray(arr) && arr.length === 3) {
        selectedIds = arr; useDataMode = true; return;
      }
    }
    const rawV0 = localStorage.getItem(LS_KEY_V0);
    if (rawV0) {
      const arr = JSON.parse(rawV0);
      if (Array.isArray(arr) && arr.length === 3) { selectedObjs = arr; return; }
    }
  } catch (e) { console.warn("loadSelected parse error", e); }
}
function saveSelected() {
  try {
    if (useDataMode) localStorage.setItem(LS_KEY_V1, JSON.stringify(selectedIds));
    else             localStorage.setItem(LS_KEY_V0, JSON.stringify(selectedObjs));
  } catch (e) { console.warn("saveSelected error", e); }
}

/* --- 이미지 유틸 --- */
const TRANSPARENT_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function imagePathForName(name, ext = ".jpg") {
  if (!name) return "";
  if (/^(\/|https?:\/\/)/.test(name)) return name;
  const filename = name.trim();
  return "/static/img/" + encodeURIComponent(filename) + ext;
}
function handleCardImgLoad(img) {
  try {
    const dataBase = img.dataset.srcBase || img.dataset.src;
    if (!dataBase) return;
    const baseNoExt = dataBase.replace(/\.(jpg|png|webp|jpeg)$/i, "");
    if (img.src.indexOf(baseNoExt) === -1 && img.src.indexOf(dataBase) === -1) return;
    img.classList.add("rotate-left");
  } catch (e) { console.warn("handleCardImgLoad()", e); }
}
function handleSlotImageError(img) {
  try {
    let tries = Number(img.dataset.tryIndex || 0);
    if (tries >= 2) { img.src = "/static/img/no-image.png"; return; }
    img.dataset.tryIndex = tries + 1;

    const tryExts = [".jpg", ".png", ".webp"];
    const currentExt = (img.dataset.currentExt || ".jpg");
    const nextIdx = Math.max(0, tryExts.indexOf(currentExt)) + 1;
    const nextExt = tryExts[nextIdx] || ".png";
    img.dataset.currentExt = nextExt;

    const base = img.dataset.srcBase;
    if (base) {
      img.dataset.src = base + nextExt;
      img.src = img.dataset.src;
    } else {
      const origName = img.dataset.name || img.getAttribute("alt") || "";
      img.src = imagePathForName(origName, nextExt);
    }
  } catch (e) { img.src = "/static/img/no-image.png"; }
}
function setupLazyLoading(container) {
  const imgs = Array.from(container.querySelectorAll('img[data-src]'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target; observer.unobserve(img);
          img.loading = img.loading || "lazy"; img.decoding = img.decoding || "async";
          if (!('fetchpriority' in img) && img.dataset.priority === 'high') img.setAttribute('fetchpriority','high');
          img.src = img.dataset.src; img.removeAttribute('data-src');
        }
      });
    }, { root: container, rootMargin: "200px", threshold: 0.01 });
    imgs.forEach(img => observer.observe(img));
  } else {
    imgs.forEach(img => { img.loading = img.loading || "lazy"; img.decoding = img.decoding || "async"; img.src = img.dataset.src; img.removeAttribute('data-src'); });
  }
}
function handleSlotImageLoad(img) {
  img.style.transition=''; img.style.transform=''; img.style.position=''; img.style.top=''; img.style.left='';
  img.style.maxWidth=''; img.style.maxHeight=''; img.style.width=''; img.style.height=''; img.style.objectFit='contain';

  const w=img.naturalWidth, h=img.naturalHeight; if(!w||!h) return;
  const container=img.closest('.slot-mini'); if(!container) return;

  const cw=container.clientWidth||120, ch=container.clientHeight||74;
  if (h > w) {
    try {
      const canvas=document.createElement('canvas'); canvas.width=cw; canvas.height=ch; const ctx=canvas.getContext('2d');
      const scale=Math.min(cw/h, ch/w);
      ctx.translate(cw/2, ch/2); ctx.rotate(-Math.PI/2); ctx.scale(scale, scale); ctx.drawImage(img, -w/2, -h/2, w, h);
      img.src=canvas.toDataURL('image/png'); img.style.width='100%'; img.style.height='100%'; img.style.objectFit='contain'; img.style.display='block';
    } catch { img.style.transform='rotate(-90deg)'; img.style.maxWidth='100%'; img.style.maxHeight='100%'; img.style.objectFit='contain'; }
  } else {
    img.style.width='100%'; img.style.height='100%'; img.style.objectFit='contain'; img.style.display='block';
  }
}

function openPicker(slotIndex) {
  currentSlot = slotIndex;
  const modal = $("#pickerModal");
  const chipsWrap = $("#issuerChips");
  const input = $("#pickerKeyword");
  if (!modal || !chipsWrap || !input) return;

  // 탭(active) 초기화
  $$(".picker-tab").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.type === pickerType);
    btn.setAttribute("aria-selected", String(btn.dataset.type === pickerType));
  });

  const issuers = [
    "전체",
    ...(useDataMode ? [...new Set(CARDS.map(p => p.issuer))]
                   : CARD_ISSUERS.filter(i => i !== "전체"))
  ].slice(0, 50);

  chipsWrap.innerHTML = issuers.map(n =>
    `<button class="chip ${n === pickerIssuer ? "on" : ""}" data-issuer="${esc(n)}">${esc(n)}</button>`
  ).join("");

  chipsWrap.onclick = (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    pickerIssuer = b.getAttribute("data-issuer");
    $$("#issuerChips .chip").forEach(c => c.classList.toggle("on", c === b));
    renderPickerList();
  };

  input.value = pickerKeyword;
  input.oninput = () => { pickerKeyword = input.value.trim(); renderPickerList(); };

  $$(".picker-tab").forEach(btn => {
    btn.onclick = () => {
      pickerType = btn.dataset.type;
      $$(".picker-tab").forEach(t => {
        t.classList.toggle("is-active", t === btn);
        t.setAttribute("aria-selected", String(t === btn));
      });
      renderPickerList();
    };
  });

  renderPickerList();

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  $("#pickerBackdrop")?.addEventListener("click", closePicker, { once: true });
  $("#pickerClose")?.addEventListener("click", closePicker, { once: true });
}
function closePicker() {
  const modal = $("#pickerModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  currentSlot = null;
}

function renderPickerList() {
  const list = $("#pickerList"); if (!list) return;
  const q = pickerKeyword.toLowerCase();

  // 데이터 모드
  if (useDataMode) {
    let items = CARDS.filter(p => p.type === pickerType);
    if (pickerIssuer !== "전체") items = items.filter(p => p.issuer === pickerIssuer);
    if (q) items = items.filter(p => p.name.toLowerCase().includes(q) || (p.promo || "").toLowerCase().includes(q));

    if (!items.length) { list.innerHTML = `<div class="muted" style="padding:16px 6px;">조건에 맞는 카드가 없습니다.</div>`; return; }

    list.innerHTML = items.map(p => {
      const src  = (p.image && p.image.length) ? p.image : imagePathForName(p.name, ".jpg");
      const base = src.replace(/\.(jpg|png|webp|jpeg)$/i, "");
      const extMatch = src.match(/\.(jpg|png|webp|jpeg)$/i);
      const ext  = extMatch ? extMatch[0] : ".jpg";
      return `
      <div class="picker-item" data-id="${p.id}" role="option" tabindex="0">
        <div class="picker-thumb">
          <img src="${TRANSPARENT_PLACEHOLDER}"
               alt="${esc(p.name)}"
               class="card-img"
               width="160" height="100"
               data-name="${esc(p.name)}"
               data-name-raw="${p.name}"
               data-src="${base + ext}"
               data-src-base="${base}"
               data-current-ext="${ext}"
               data-try-index="0"
               data-priority="${items.indexOf(p) < 6 ? 'high' : 'low'}"
               onload="handleCardImgLoad(this)"
               onerror="handleSlotImageError(this)">
        </div>
        <div class="picker-info">
          <div class="picker-name">${esc(p.name)}</div>
          <div class="picker-issuer">${esc(p.issuer)} ${p.promo ? `· ${esc(p.promo)}` : ""}</div>
        </div>
      </div>`;
    }).join("");

    list.onclick = (e) => {
      const item = e.target.closest(".picker-item"); if (!item) return;
      const card = CARDS.find(x => x.id === item.dataset.id);
      applyCard(card); closePicker();
    };
    list.onkeydown = (e) => {
      if (e.key === "Enter") {
        const item = e.target.closest(".picker-item"); if (!item) return;
        const card = CARDS.find(x => x.id === item.dataset.id);
        applyCard(card); closePicker();
      }
    };

    requestAnimationFrame(() => setupLazyLoading(list));
    return;
  }

  // 폴백 모드
  let items = CARD_PRODUCTS.filter(p => p.type === pickerType);
  if (pickerIssuer !== "전체") items = items.filter(p => p.issuer === pickerIssuer);
  if (q) items = items.filter(p => p.name.toLowerCase().includes(q));

  if (!items.length) { list.innerHTML = `<div class="muted" style="padding:16px 6px;">조건에 맞는 카드가 없습니다.</div>`; return; }

  list.innerHTML = items.map(p => `
    <div class="picker-item" data-id="${p.id}" role="option" tabindex="0">
      <div class="picker-thumb" style="--c1:${p.c1};--c2:${p.c2}">
        <img src="${TRANSPARENT_PLACEHOLDER}"
             alt="${esc(p.name)}"
             class="card-img"
             width="160" height="100"
             data-name="${esc(p.name)}"
             data-src="${imagePathForName(p.name, '.jpg')}"
             data-src-base="${imagePathForName(p.name, '')}"
             data-current-ext=".jpg"
             data-try-index="0"
             data-priority="${items.indexOf(p) < 6 ? 'high' : 'low'}"
             onload="handleCardImgLoad(this)"
             onerror="handleSlotImageError(this)">
      </div>
      <div>
        <div class="picker-name">${esc(p.name)}</div>
        <div class="picker-issuer">${esc(p.issuer)}</div>
      </div>
    </div>`).join("");

  list.onclick = (e) => {
    const item = e.target.closest(".picker-item"); if (!item) return;
    const card = items.find(x => x.id === item.dataset.id);
    applyCard(card); closePicker();
  };
  list.onkeydown = (e) => {
    if (e.key === "Enter") {
      const item = e.target.closest(".picker-item"); if (!item) return;
      const card = items.find(x => x.id === item.dataset.id);
      applyCard(card); closePicker();
    }
  };

  requestAnimationFrame(() => setupLazyLoading(list));
}

function applyCard(card) {
  if (currentSlot == null || !card) return;
  if (useDataMode) {
    selectedIds[currentSlot] = card.id;
  } else {
    selectedObjs[currentSlot] = card;
  }
  renderSlot(currentSlot);
  saveSelected();
  renderComparisonTable();
}

function renderSlot(i) {
  const target = $(`.slot-target[data-slot="${i}"]`);
  const label  = $(`#slot-name-${i}`);
  if (!target || !label) return;

  if (useDataMode) {
    const id = selectedIds[i];
    if (!id) {
      target.classList.remove("selected");
      target.innerHTML = `<span class="plus">+</span>`;
      label.textContent = "카드를 선택해 주세요.";
      return;
    }
    const card = CARDS.find(p => p.id === id);
    if (!card) { selectedIds[i] = null; saveSelected(); renderSlot(i); return; }

    target.classList.add("selected");
    const initialSrc = card.image && card.image.length ? card.image : imagePathForName(card.name, ".jpg");

    target.innerHTML = `
      <div class="slot-mini" title="${esc(card.name)}">
        <img src="${esc(initialSrc)}"
             alt="${esc(card.name)}"
             class="slot-img"
             data-name="${esc(card.name)}"
             data-try-index="0"
             onload="handleSlotImageLoad(this)"
             onerror="handleSlotImageError(this)">
      </div>`;
    label.textContent = card.name;
    return;
  }

  const card = selectedObjs[i];
  if (!card) {
    target.classList.remove("selected");
    target.innerHTML = `<span class="plus">+</span>`;
    label.textContent = "카드를 선택해 주세요.";
    return;
  }
  target.classList.add("selected");
  target.innerHTML = `
    <div class="slot-mini" style="--c1:${card.c1};--c2:${card.c2}" title="${esc(card.name)}"></div>`;
  label.textContent = card.name;
}

function clearSlot(idx) {
  if (useDataMode) selectedIds[idx] = null;
  else             selectedObjs[idx] = null;
  renderSlot(idx);
  saveSelected();
  renderComparisonTable();
}

function initCompareSlots() {
  if (!document.querySelector(".compare-page")) return;
  loadSelected();
  [0,1,2].forEach(i => renderSlot(i));

  $$(".slot-target").forEach(btn => {
    btn.addEventListener("click", () => openPicker(Number(btn.getAttribute("data-slot"))));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker(Number(btn.getAttribute("data-slot"))); }
    });
  });

  $$(".slot-clear").forEach(btn => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); clearSlot(Number(btn.getAttribute("data-clear"))); });
  });

  renderComparisonTable();
}

/* -------------------- 비교 테이블 렌더링 -------------------- */
function fmt(s){ return (s===null || s===undefined) ? "" : String(s); }

function getCardDataForSlot(i){
  if (useDataMode) { const id = selectedIds[i]; if (!id) return null; return CARDS.find(c => c.id === id) || null; }
  return selectedObjs[i] || null;
}

function renderComparisonTable() {
  const wrap = $("#compareGrid");
  if (!wrap) return;

  const cols = [0,1,2].map(i => {
    const card = getCardDataForSlot(i);
    if (!card) {
      return `
        <div class="compare-column">
          <div class="compare-col__head">
            <div class="compare-col__thumb"><div style="width:72px;height:72px;border-radius:6px;background:#f5f5f5;display:inline-block;"></div></div>
            <div class="compare-col__name">카드를 선택해 주세요.</div>
            <div class="compare-col__issuer">&nbsp;</div>
          </div>
          <div class="compare-rows">
            <div class="compare-row"><div class="row-title">이벤트</div><div class="row-content muted">-</div></div>
            <div class="compare-row"><div class="row-title">연회비</div><div class="row-content muted">-</div></div>
            <div class="compare-row"><div class="row-title">전월실적</div><div class="row-content muted">-</div></div>
            <div class="compare-row"><div class="row-title">주요혜택</div><div class="row-content muted">-</div></div>
          </div>
        </div>`;
    }

    // RAW 매칭
    let raw = null;
    if (useDataMode && Array.isArray(RAW) && RAW.length) raw = findRawForCard(card, RAW);

    const imgSrc = card.image && card.image.length ? card.image : imagePathForName(card.name, ".jpg");

    // 주요 혜택
    let benefits = [];
    if (raw && Array.isArray(raw.benefits) && raw.benefits.length) benefits = raw.benefits;
    else if (Array.isArray(card.benefits) && card.benefits.length)  benefits = card.benefits;
    else if (card.desc) benefits = [card.desc];

    const promo = raw?.promo ?? card.promo ?? "";
    const perf  = (raw && (raw.performance || raw['전월실적'] || raw.performanceText)) || card?.performance || "";
    const desc1 = raw?.desc1 ?? raw?.description ?? card.desc ?? "";

    let detailHtml = "";
    const details = (raw && Array.isArray(raw.details) && raw.details.length) ? raw.details : (Array.isArray(card.details) ? card.details : []);
    if (details.length) {
      detailHtml = details.slice(0,3).map(d => {
        const title = d.dt_i || (d.dt_texts && d.dt_texts.join(", ")) || "";
        const paras = (Array.isArray(d.dd_paragraphs) ? d.dd_paragraphs : []);
        const snippet = paras.slice(0,2).join(" / ");
        return `<div class="detail-block"><strong>${esc(title)}</strong><div>${esc(snippet)}</div></div>`;
      }).join("");
    }

    const benefitsHtml = benefits.length
      ? `<ul class="benefit-list">${benefits.slice(0,6).map(b=>`<li>${esc(b)}</li>`).join("")}</ul>`
      : `<div class="row-content muted">세부 혜택 정보 없음</div>`;

    return `
      <div class="compare-column" data-slot="${i}">
        <div class="compare-col__head">
          <div class="compare-col__name">${esc(card.name)}</div>
          <div class="compare-col__issuer">${esc(card.issuer || "")}</div>
          ${promo ? `<div class="compare-col__promo">${esc(promo)}</div>` : ""}
        </div>

        <div class="compare-rows">
          <div class="compare-row">
            <div class="row-title">이벤트</div>
            <div class="row-content">${promo ? esc(promo) : (desc1 ? esc(desc1) : "—")}</div>
          </div>

          <div class="compare-row">
            <div class="row-title">연회비</div>
            <div class="row-content">${esc(raw?.annual_fee ?? raw?.연회비 ?? raw?.fee ?? "정보 없음")}</div>
          </div>

          <div class="compare-row">
            <div class="row-title">전월실적</div>
            <div class="row-content">${esc(perf || raw?.performance || raw?.전월실적 || "정보 없음")}</div>
          </div>

          <div class="compare-row">
            <div class="row-title">주요혜택</div>
            <div class="row-content">${benefitsHtml}</div>
          </div>

          ${detailHtml ? `<div class="compare-row"><div class="row-title">상세</div><div class="row-content">${detailHtml}</div></div>` : ""}
        </div>
      </div>`;
  });

  wrap.innerHTML = cols.join("");
}

// 안전한 RAW 매칭 헬퍼
function findRawForCard(card, RAW) {
  if (!card || !Array.isArray(RAW)) return null;

  if (card.rawId) {
    const byRawId = RAW.find(r => String(r.id ?? r.team_id ?? r.rawId) === String(card.rawId));
    if (byRawId) return byRawId;
  }

  const norm = str => (str || "").toString().trim().toLowerCase();
  const cardName = norm(card.name);

  const byName = RAW.find(r => norm(r.name) === cardName);
  if (byName) return byName;

  const byTeam = RAW.find(r => {
    const rid = r.team_id ?? r.id ?? r.teamId ?? "";
    if (!rid) return false;
    if (card.id && String(card.id).indexOf(String(rid)) === 0) return true;
    return false;
  });
  if (byTeam) return byTeam;

  const byPartial = RAW.find(r => norm(r.name).includes(cardName) || cardName.includes(norm(r.name)));
  if (byPartial) return byPartial;

  return null;
}

/* =========================================================
 * (G) 헤더 상태(비교함 뱃지 & 현재 페이지 active)
 *   └ compareBadge 요소 없으면 자동 스킵
 * =======================================================*/
function initHeaderState() {
  const badge = $("#compareBadge");

  function updateBadge() {
    if (!badge) return;
    try {
      const arr = useDataMode
        ? (JSON.parse(localStorage.getItem(LS_KEY_V1) || "[]") || []).filter(Boolean)
        : (JSON.parse(localStorage.getItem(LS_KEY_V0) || "[]") || []).filter(Boolean);

      if (arr.length > 0) { badge.textContent = arr.length; badge.style.display = "inline-block"; }
      else { badge.style.display = "none"; }
    } catch { /* noop */ }
  }

  updateBadge();
  window.addEventListener("storage", (e) => { if ([LS_KEY_V1, LS_KEY_V0].includes(e.key)) updateBadge(); });

  // active 메뉴
  const p = location.pathname.toLowerCase();
  const keys = ["recommend","browse","charts","deals","compare","/"];
  const hit = keys.find(k => k === "/" ? p === "/" : p.includes(k));
  const map = { recommend:"recommend", browse:"browse", charts:"charts", deals:"deals", compare:"compare", "/":"" };
  const key = hit ? map[hit] : "";
  if (key) { const el = document.querySelector(`.nav a[data-nav="${key}"]`); el?.classList.add("is-active"); }
}

/* =========================================================
 * (H) 플로팅 챗봇 위젯
 * =======================================================*/
function insertChatWidget() {
  if ($("#cpChatDrawer")) return;

  // FAB
  const fab = document.createElement("button");
  fab.className = "cp-chat-fab"; fab.id = "cpChatFab"; fab.setAttribute("aria-label","챗봇 열기");
  fab.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-4l-4 4v-4H8a4 4 0 0 1-4-4V6z"
            stroke="currentColor" stroke-width="2" fill="none"
            stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>`;
  document.body.appendChild(fab);

  // Drawer
  const drawer = document.createElement("section");
  drawer.className = "cp-chat-drawer"; drawer.id = "cpChatDrawer";
  drawer.setAttribute("role","dialog"); drawer.setAttribute("aria-modal","false"); drawer.setAttribute("aria-hidden","true");
  drawer.innerHTML = `
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

  // 내부 핸들러
  const log = $("#cpChatLog");
  const suggest = $("#cpChatSuggest");
  const form = $("#cpChatForm");
  const input = $("#cpChatInput");
  const closeBtn = $("#cpChatClose");

  const SUG = ["카페/배달 많이 써요","연회비 1만원 이하","해외 결제 자주해요","교통/통신 절약","간편결제 많이 써요"];
  suggest.innerHTML = SUG.map(s => `<button type="button" class="cp-chip" data-msg="${esc(s)}">${esc(s)}</button>`).join("");

  function addUser(t){ const el=document.createElement("div"); el.className="cp-msg user"; el.textContent=t; log.appendChild(el); log.scrollTop=log.scrollHeight; }
  function addBot(h){  const el=document.createElement("div"); el.className="cp-msg bot";  el.innerHTML=h;  log.appendChild(el); log.scrollTop=log.scrollHeight; }
  function genAnswer(q){
    const s=q.toLowerCase();
    if (/카페|배달|편의점/.test(s)) return `<strong>추천: 삼성 taptap O</strong><br/>• 카페/배달 상시 적립 · 간편결제 추가<br/>→ <a href="/compare">비교함</a>에서 더 보기`;
    if (/해외|여행|라운지|마일/.test(s)) return `<strong>추천: 스카이패스 계열</strong><br/>• 해외 적립/라운지 강점<br/>→ <a href="/compare">비교함</a>에서 조건 비교`;
    if (/교통|통신|구독/.test(s))        return `<strong>추천: KB My WE:SH</strong><br/>• 교통/통신/구독 생활영역 특화<br/>→ <a href="/compare">비교함</a> 이동`;
    if (/연회비|만원|저렴/.test(s))       return `<strong>추천: 현대 ZERO Edition2</strong><br/>• 무실적/낮은 연회비 구간<br/>→ <a href="/compare">비교함</a>에서 대안도 확인`;
    return `원하시는 혜택 키워드를 알려주세요. 예) "카페/배달", "해외 적립", "교통/통신", "연회비 1만원 이하"`;
  }

  function open(){ drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden","false"); setTimeout(()=>input.focus(),0);
    if(!log.dataset.welcome){ addBot("안녕하세요! 소비 패턴을 알려주시면 맞춤 카드를 추천해 드릴게요. 예) 카페/배달, 연회비 1만원 이하"); log.dataset.welcome="1"; } }
  function close(){ drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden","true"); fab.focus(); }

  function sendExternal(q){ addUser(q); setTimeout(()=>addBot(genAnswer(q)),350); }

  fab.addEventListener("click",()=>{ open(); });
  closeBtn.addEventListener("click",close);

  suggest.addEventListener("click",(e)=>{ const b=e.target.closest(".cp-chip"); if(!b) return; input.value=b.getAttribute("data-msg"); form.requestSubmit(); });

  form.addEventListener("submit",(e)=>{ e.preventDefault(); const q=(input.value||"").trim(); if(!q) return input.focus(); addUser(q); input.value=""; setTimeout(()=>addBot(genAnswer(q)),350); });

  window.CPChat = { open, close, sendExternal };
}

/* =========================================================
 * (I) 홈화면: 큰 입력창 & 추천카드 → 챗봇 연결
 * =======================================================*/
function initHomeAsk() {
  const form = $("#homeAskForm");
  const input = $("#homeAskInput");
  const grid  = $(".gpt-suggest-grid");
  if (!form || !input) return;

  function launchChatWith(q){ if (!window.CPChat) insertChatWidget(); window.CPChat.open(); window.CPChat.sendExternal(q); }

  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const q=(input.value||"").trim(); if(!q){ input.focus(); return; }
    launchChatWith(q); input.value="";
  });

  if (grid) {
    grid.addEventListener("click",(e)=>{
      const card=e.target.closest(".gpt-suggest-card"); if(!card) return;
      const q=card.getAttribute("data-q") || card.querySelector(".gpt-card-title")?.textContent || "";
      if(!q) return; launchChatWith(q);
    });
  }
}

/* =========================================================
 * (J) 초기화
 * =======================================================*/
document.addEventListener("DOMContentLoaded", async () => {
  mountGlobalHeader();
  initHeaderState();

  insertChatWidget();

  // navBot 버튼은 제거되었지만 방어적으로 유지
  const navBot = $("#navBot");
  if (navBot) {
    navBot.setAttribute("aria-expanded","false");
    navBot.addEventListener("click",(e)=>{
      e.preventDefault();
      if (!window.CPChat) insertChatWidget();
      window.CPChat.open();
      navBot.setAttribute("aria-expanded","true");
    });
  }

  initSearchModal();

  await loadCards();
  if ($("#heroTrack"))   renderHero();
  if ($("#benefitList")) renderBenefit();
  if ($(".compare-page")) initCompareSlots();

  if ($("#heroTrack")) {
    document.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); goHero(heroIndex - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); goHero(heroIndex + 1); }
    });
  }

  initHomeAsk();
});

/* =========================================================
 * (K) 폴백 더미 데이터
 * =======================================================*/
const CARD_ISSUERS = [
  "전체","신한카드","삼성카드","현대카드","롯데카드",
  "KB국민카드","우리카드","하나카드","NH농협카드",
  "IBK기업은행","BC 바로카드","네이버페이","현대백화점"
];

const CARD_PRODUCTS = [
  { id:"mr-life",       name:"신한카드 Mr.Life",           issuer:"신한카드",    type:"credit", c1:"#ffeded", c2:"#ffc3c3" },
  { id:"taptap-o",      name:"삼성카드 taptap O",          issuer:"삼성카드",    type:"credit", c1:"#ffe6f1", c2:"#ffc7de" },
  { id:"sky-miles",     name:"삼성 & MILEAGE PLATINUM (스카이패스)", issuer:"삼성카드", type:"credit", c1:"#eaf2ff", c2:"#cfe0ff" },
  { id:"id-select-all", name:"삼성 iD SELECT ALL",         issuer:"삼성카드",    type:"credit", c1:"#eef2f7", c2:"#dde6f3" },
  { id:"kb-wesh",       name:"KB국민 My WE:SH",            issuer:"KB국민카드",  type:"credit", c1:"#f9f4e7", c2:"#ead9b6" },
  { id:"hy-zero2",      name:"현대 ZERO Edition2",         issuer:"현대카드",    type:"credit", c1:"#e8f0ff", c2:"#c7d8ff" },
  { id:"lotte-loca",    name:"롯데 LOCA Likit",            issuer:"롯데카드",    type:"credit", c1:"#e8f8ff", c2:"#bdf0ff" },
  { id:"woori-point",   name:"우리 카드의정석 POINT",      issuer:"우리카드",    type:"credit", c1:"#e6fff4", c2:"#b9fbe0" },
  { id:"hana-clubsk",   name:"하나카드 CLUB SK",           issuer:"하나카드",    type:"credit", c1:"#eafff9", c2:"#c5fff0" },
  { id:"nh-good",       name:"NH농협 올바른 체크",         issuer:"NH농협카드",  type:"check",  c1:"#f5fff0", c2:"#e0ffd1" },
  { id:"ibk-daily",     name:"IBK 일상의기쁨 체크",        issuer:"IBK기업은행", type:"check",  c1:"#f0f7ff", c2:"#d7e7ff" },
  { id:"kb-simple",     name:"KB국민 탄탄대로 체크",       issuer:"KB국민카드",  type:"check",  c1:"#fff4eb", c2:"#ffe0c8" },
];
