/* =========================================================
 * CARD PICK — app.js (JSON 기반)
 * - data/card_list.json을 그대로 사용 (더미 데이터 없음)
 * - 검색 모달 (통합 검색)
 * - 비교 페이지: 카드 선택 팝업 + 저장/복원/해제
 * - 카드 색상 관련 스타일은 주석 처리(이미지로 대체 예정)
 * =======================================================*/

/* 저장 키 & 상태 */
const SELECTED_KEY = "cp_selected_cards_v1";
let selectedCardIds = [null, null, null]; // 슬롯별 선택된 카드 id
let cardData = [];       // 원본 JSON 전체 구조(여기에 400+ 레코드가 들어있음)
let CARD_PRODUCTS = [];  // Picker에서 사용할 간단한 배열: { id, name, issuer, type, promo, desc, details, image }

let pickerType = "credit";
let pickerIssuer = "전체";
let pickerKeyword = "";
let currentSlot = null;

/* =========================================================
 * 카드 목록 로드
 * - 경로: ../data/card_list.json (프로젝트 구조에 맞게 조정 가능)
 * - JSON 구조를 유연하게 처리 (배열 또는 객체 내 배열)
 * =======================================================*/
async function loadCardList() {
  try {
    // static 경로에서 불러오기 (권장)
    const res = await fetch("/static/data/card_list.json");
    if (!res.ok) throw new Error("card_list.json 로드 실패: " + res.status);
    const json = await res.json();

    // 파일에 따라 유연하게 카드 배열 추출
    cardData = Array.isArray(json) ? json : (json.cards || json.items || json.list || []);

    // 최소한의 필드로 변환
    CARD_PRODUCTS = cardData.map(item => {
      const id = String(item.team_id ?? item.id ?? item.teamId ?? Math.random());
      return {
        id,
        name: item.name ?? item.title ?? "Unnamed Card",
        issuer: item.corp ?? item.issuer ?? "기타",
        type: item.type ?? "credit",
        promo: item.promo ?? "",
        desc: item.desc1 ?? item.description ?? "",
        details: item.details ?? [],
        // image 필드: 나중에 이미지가 업로드되면 이 필드에 경로를 넣어주세요.
        image: item.image ?? "" // 빈 문자열이면 이미지 미등록 상태
        // 과거에 사용하던 색상(c1,c2)은 이미지로 대체할 계획이므로 제거/주석 처리.
        // c1: item.c1 ?? "#f0f4f8",
        // c2: item.c2 ?? "#dde6f3",
      };
    });

    // Picker/Compare UI 초기화 (데이터 준비 후)
    if (document.querySelector(".compare-page")) initCompareSlots();

    // 혜택(발급사) 라인과 히어로 섹션도 업데이트
    renderBenefit();
    renderHeroFromData();

  } catch (err) {
    console.error("카드 목록 로드 에러:", err);
  }
}

/* =========================================================
 * 히어로: data 기반 (상위 3개 카드의 promo/이름 사용)
 * - 더미 슬라이드는 제거됨
 * =======================================================*/
function renderHeroFromData() {
  const track = document.getElementById("heroTrack");
  const dots = document.getElementById("heroDots");
  if (!(track && dots)) return;

  // cardData에서 promo가 있는 상위 3개 항목을 히어로로 사용
  const slides = CARD_PRODUCTS.filter(p => p.promo).slice(0, 3);
  if (!slides.length) {
    track.innerHTML = `<div class="muted">히어로 배너에 사용할 카드 프로모션이 없습니다.</div>`;
    dots.innerHTML = "";
    return;
  }

  track.innerHTML = slides.map((s) => `
    <article class="hero__slide">
      <div class="hero__inner">
        <div class="hero__image">
          <!-- 이미지 기반으로 대체 예정 -->
          <div class="hero-image-placeholder" aria-hidden="true">${s.name}</div>
        </div>
        <div class="hero__copy">
          <div class="kicker">${escapeHtml(s.issuer)}</div>
          <h2>${escapeHtml(s.promo)}</h2>
          <p>${escapeHtml(s.desc || "")}</p>
        </div>
      </div>
    </article>
  `).join("");

  dots.innerHTML = slides.map((_, i) => `<button class="hero__dot" aria-selected="${i === 0 ? "true" : "false"}" aria-label="${i + 1}번째 배너"></button>`).join("");

  // 간단한 인덱스 관리
  heroIndex = 0;
  updateHero();
  startHeroAuto();
}

let heroIndex = 0;
let heroTimer = null;
function goHero(n) { heroIndex = (n + (document.querySelectorAll("#heroTrack .hero__slide").length)) % document.querySelectorAll("#heroTrack .hero__slide").length; updateHero(); }
function updateHero() {
  const track = document.getElementById("heroTrack");
  const dots = document.querySelectorAll("#heroDots .hero__dot");
  if (track) track.style.transform = `translateX(-${heroIndex * 100}%)`;
  dots.forEach((b, i) => b?.setAttribute("aria-selected", String(i === heroIndex)));
}
function startHeroAuto() { stopHeroAuto(); heroTimer = setInterval(() => goHero(heroIndex + 1), 5000); }
function stopHeroAuto() { if (heroTimer) { clearInterval(heroTimer); heroTimer = null; } }

/* =========================================================
 * 혜택 라인: 발급사 목록을 cardData에서 뽑아서 렌더
 * - 더미 benefitItems 제거
 * =======================================================*/
function renderBenefit() {
  const list = document.getElementById("benefitList");
  if (!list) return;

  const issuers = Array.from(new Set(CARD_PRODUCTS.map(p => p.issuer))).slice(0, 12);
  if (!issuers.length) {
    list.innerHTML = `<li class="muted">표시할 카드사가 없습니다.</li>`;
    return;
  }

  list.innerHTML = issuers.map((issuer) => {
    // 임시 약칭: 첫 글자 또는 앞 글자 사용
    const short = issuer.length <= 3 ? issuer : issuer.split(" ")[0].slice(0, 3);
    return `
      <li class="benefit__item">
        <div class="brand-circle">${escapeHtml(short)}</div>
        <div class="benefit__label">카드 상품 보기</div>
        <div class="benefit__issuer">${escapeHtml(issuer)}</div>
      </li>
    `;
  }).join("");
}

/* =========================================================
 * 검색 모달 (통합 검색)
 * - 기존 로직 유지 (최근검색 저장 등)
 * =======================================================*/
function initSearchModal() {
  const openBtn = document.getElementById("openSearch");
  const modal = document.getElementById("searchModal");
  if (!(openBtn && modal)) return;

  const backdrop = document.getElementById("searchBackdrop");
  const closeBtn = document.getElementById("searchClose");
  const input = document.getElementById("searchInput");
  const recentWrap = document.getElementById("recentList");
  const recentToggle = document.getElementById("recentToggle");
  const hotWrap = document.getElementById("hotList");
  const suggestWrap = document.getElementById("suggestList");
  const submitBtn = document.getElementById("searchSubmit");

  const HOT = ["현금캐백", "실적", "포인트", "해외적립", "연회비혜택"];
  const SUGGEST = [
    { k: "HOT", t: "퀴즈/행운 이벤트 바로가기", e: "🎁" },
    { k: "글로벌", t: "해외 적립/수수료 비교", e: "🌍" },
  ];

  const RECENT_KEY = "cp_recent_search";
  const getRecents = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } };
  const setRecents = (list) => localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)));

  function renderRecents() {
    const r = getRecents();
    if (!r.length) {
      recentWrap.classList.add("muted");
      recentWrap.textContent = "최근 검색한 내용이 없습니다.";
      return;
    }
    recentWrap.classList.remove("muted");
    recentWrap.innerHTML = r.map((v) => `<button class="chip" data-q="${v}">${escapeHtml(v)}</button>`).join("");
  }
  function renderHot() { hotWrap.innerHTML = HOT.map((v, i) => `<button class="chip ${i < 2 ? "hot" : ""}" data-q="${v}">${escapeHtml(v)}</button>`).join(""); }
  function renderSuggest() { suggestWrap.innerHTML = SUGGEST.map(s => `<div class="suggest-card"><div class="k">${escapeHtml(s.k)}</div><div class="t">${escapeHtml(s.t)}</div><div class="e">${escapeHtml(s.e)}</div></div>`).join(""); }

  function open() { modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false"); renderRecents(); renderHot(); renderSuggest(); setTimeout(() => input.focus(), 0); bindTrap(); }
  function close() { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); unbindTrap(); openBtn.focus(); }

  function performSearch(q) {
    const query = (q ?? input.value).trim();
    if (!query) { input.focus(); return; }
    if (recentToggle?.checked) {
      const r = getRecents().filter(v => v !== query);
      r.unshift(query);
      setRecents(r);
    }
    console.log("검색:", query);
    // 실제 검색/라우팅 로직은 여기에 연결하세요.
    close();
  }

  openBtn.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
  submitBtn?.addEventListener("click", () => performSearch());

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") performSearch();
    if (e.key === "Escape") close();
  });

  modal.addEventListener("click", (e) => {
    const b = e.target.closest?.(".chip");
    if (!b) return;
    const q = b.getAttribute("data-q");
    input.value = q;
    performSearch(q);
  });

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
  });

  // focus trap
  let trapHandler = null;
  function bindTrap() {
    trapHandler = (e) => {
      if (e.key !== "Tab") return;
      const focusables = modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
      const list = [...focusables].filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    modal.addEventListener("keydown", trapHandler);
  }
  function unbindTrap() {
    if (trapHandler) { modal.removeEventListener("keydown", trapHandler); trapHandler = null; }
  }
}

/* =========================================================
 * 비교 페이지 — Picker / 슬롯 관련
 * - CARD_PRODUCTS는 loadCardList()에서 생성됨
 * - 카드 색상(배경)은 이미지로 대체 예정: 스타일 관련 코드는 주석 처리
 * =======================================================*/
function saveSelected() {
  try { localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedCardIds)); } catch { }
}
function loadSelected() {
  try {
    const raw = localStorage.getItem(SELECTED_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length === 3) selectedCardIds = arr;
  } catch { }
}

function openPicker(slotIndex) {
  currentSlot = slotIndex;
  const modal = document.getElementById("pickerModal");
  const chipsWrap = document.getElementById("issuerChips");
  const input = document.getElementById("pickerKeyword");
  if (!modal || !chipsWrap || !input) return;

  // 탭 상태 동기화
  document.querySelectorAll(".picker-tab").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.type === pickerType);
    btn.setAttribute("aria-selected", String(btn.dataset.type === pickerType));
  });

  // 카드사 칩 렌더 (데이터 기반)
  const issuers = ["전체", ...Array.from(new Set(CARD_PRODUCTS.map(p => p.issuer)))].slice(0, 50);
  chipsWrap.innerHTML = issuers.map(n => `<button class="chip ${n === pickerIssuer ? "on" : ""}" data-issuer="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("");

  chipsWrap.onclick = (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    pickerIssuer = b.getAttribute("data-issuer");
    chipsWrap.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === b));
    renderPickerList();
  };

  // 검색
  input.value = pickerKeyword;
  input.oninput = () => { pickerKeyword = input.value.trim(); renderPickerList(); };

  // 탭
  document.querySelectorAll(".picker-tab").forEach((btn) => {
    btn.onclick = () => {
      pickerType = btn.dataset.type;
      document.querySelectorAll(".picker-tab").forEach((t) => t.classList.toggle("is-active", t === btn));
      document.querySelectorAll(".picker-tab").forEach((t) => t.setAttribute("aria-selected", String(t === btn)));
      renderPickerList();
    };
  });

  renderPickerList();

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("pickerBackdrop")?.addEventListener("click", closePicker);
  document.getElementById("pickerClose")?.addEventListener("click", closePicker);
}

function closePicker() {
  const modal = document.getElementById("pickerModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  currentSlot = null;
}

function renderPickerList() {
  const list = document.getElementById("pickerList");
  if (!list) return;
  const q = pickerKeyword.toLowerCase();

  let items = CARD_PRODUCTS.filter((p) => p.type === pickerType);
  if (pickerIssuer !== "전체") items = items.filter((p) => p.issuer === pickerIssuer);
  if (q) items = items.filter((p) => p.name.toLowerCase().includes(q) || (p.promo ?? "").toLowerCase().includes(q));

  if (!items.length) {
    list.innerHTML = `<div class="muted" style="padding:16px 6px;">조건에 맞는 카드가 없습니다.</div>`;
    return;
  }

  list.innerHTML = items.map((p) => `
    <div class="picker-item" data-id="${p.id}" role="option" tabindex="0">
      <div class="picker-thumb">
        <!-- 이미지가 준비되면 아래 img 태그에 p.image 경로를 넣어 사용하세요. -->
        <img src="${escapeHtml(p.image || "")}" alt="${escapeHtml(p.name)}" class="card-img" onerror="this.style.display='none'">
        <!-- 과거에 카드 색상으로 표현하던 부분 (이미지로 대체 예정)
        <div class="picker-thumb-color" style="--c1:${"#ccc"};--c2:${"#eee"}"></div>
        -->
      </div>
      <div class="picker-info">
        <div class="picker-name">${escapeHtml(p.name)}</div>
        <div class="picker-issuer">${escapeHtml(p.issuer)} ${p.promo ? `· ${escapeHtml(p.promo)}` : ""}</div>
      </div>
    </div>
  `).join("");

  // 클릭/키보드 선택
  list.onclick = (e) => {
    const item = e.target.closest(".picker-item"); if (!item) return;
    const card = CARD_PRODUCTS.find(x => x.id === item.dataset.id);
    applyCardToSlot(card);
    closePicker();
  };
  list.onkeydown = (e) => {
    if (e.key === "Enter") {
      const item = e.target.closest(".picker-item"); if (!item) return;
      const card = CARD_PRODUCTS.find(x => x.id === item.dataset.id);
      applyCardToSlot(card);
      closePicker();
    }
  };
}

/* 슬롯 렌더 / 적용 / 해제 */
function renderSlot(i) {
  const target = document.querySelector(`.slot-target[data-slot="${i}"]`);
  const label = document.getElementById(`slot-name-${i}`);
  if (!target || !label) return;
  const id = selectedCardIds[i];
  if (!id) {
    target.classList.remove("selected");
    target.innerHTML = `<span class="plus">+</span>`;
    label.textContent = "카드를 선택해 주세요.";
    return;
  }
  const card = CARD_PRODUCTS.find(p => p.id === id);
  if (!card) {
    selectedCardIds[i] = null;
    saveSelected();
    renderSlot(i);
    return;
  }

  target.classList.add("selected");
  target.innerHTML = `
    <div class="slot-mini" title="${escapeHtml(card.name)}">
      <!-- 이미지가 준비되면 아래 img 사용 (현재는 빈 src 일 수 있음) -->
      <img src="${escapeHtml(card.image || "")}" alt="${escapeHtml(card.name)}" class="slot-img" onerror="this.style.display='none'">
      <!-- 색상기반 미리보기(주석 처리) -->
      <!-- <div class="slot-mini-color" style="--c1:${card.c1};--c2:${card.c2}"></div> -->
    </div>
  `;
  label.textContent = card.name;
}

function applyCardToSlot(card) {
  if (currentSlot == null || !card) return;
  selectedCardIds[currentSlot] = card.id;
  renderSlot(currentSlot);
  saveSelected();
}

function clearSlot(idx) {
  selectedCardIds[idx] = null;
  renderSlot(idx);
  saveSelected();
}

/* 슬롯 초기화 & 이벤트 */
function initCompareSlots() {
  loadSelected();
  [0, 1, 2].forEach(i => renderSlot(i));

  document.querySelectorAll(".slot-target").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-slot"));
      openPicker(idx);
    });
  });

  document.querySelectorAll(".slot-clear").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = Number(btn.getAttribute("data-clear"));
      clearSlot(idx);
    });
  });
}

/* 카드 상세 보기 (간단한 모달) */
function showCardDetail(card) {
  const modal = document.getElementById("cardDetailModal");
  if (!modal) return;
  const title = modal.querySelector(".detail-title");
  const body = modal.querySelector(".detail-body");
  title.textContent = card.name;
  body.innerHTML = `
    <div class="detail-issuer">${escapeHtml(card.issuer)}</div>
    <div class="detail-promo">${escapeHtml(card.promo || "")}</div>
    <div class="detail-desc">${escapeHtml(card.desc || "")}</div>
    <div class="detail-more">${(card.details && card.details.length) ? `<pre style="white-space:pre-wrap;max-height:200px;overflow:auto">${escapeHtml(JSON.stringify(card.details, null, 2))}</pre>` : ""}</div>
  `;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  modal.querySelector(".detail-close")?.addEventListener("click", () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }, { once: true });
}

/* 유틸: 간단 이스케이프 */
function escapeHtml(s) {
  if (!s && s !== 0) return "";
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* =========================================================
 * 초기화
 * - loadCardList()를 먼저 호출하여 CARD_PRODUCTS를 만들고 그 후 Compare 등을 바인딩
 * =======================================================*/
document.addEventListener("DOMContentLoaded", async () => {
  // UI들 초기화(있을 경우)
  initSearchModal();

  // 카드 목록 로드 (비동기)
  await loadCardList();

  // Compare 페이지가 있으면 슬롯 초기화 (loadCardList 내부에서도 안전하게 호출됨)
  if (document.querySelector(".compare-page")) {
    initCompareSlots();
  }

  // 히어로 키보드 제어
  if (document.getElementById("heroTrack")) {
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goHero(heroIndex - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); goHero(heroIndex + 1); }
    });
  }
});
