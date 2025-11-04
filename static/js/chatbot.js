/* chatbot.js
 *
 * 플로팅 챗봇 위젯을 분리한 파일입니다.
 * 노출 API: window.Chatbot.init(), open(), close(), sendExternal(message)
 *
 * - self-contained (DOM 생성/이벤트 바인딩)
 * - idempotent: 여러번 호출해도 중복 생성 안 됨
 */

(function () {
  if (window.Chatbot) return; // 이미 로드되어 있으면 중복 방지

  let fab = null;
  let drawer = null;
  let log = null;
  let suggest = null;
  let form = null;
  let input = null;
  let closeBtn = null;

  let __inited = false;

  const SUG = [
    "카페/배달 많이 써요",
    "연회비 1만원 이하",
    "해외 결제 자주해요",
    "교통/통신 절약",
    "간편결제 많이 써요"
  ];

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function createIfNeeded() {
    if (document.getElementById("cpChatDrawer")) return; // 이미 생성됨

    // FAB
    fab = document.createElement("button");
    fab.className = "cp-chat-fab";
    fab.id = "cpChatFab";
    fab.setAttribute("aria-label", "챗봇 열기");
    fab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-4l-4 4v-4H8a4 4 0 0 1-4-4V6z"
              stroke="currentColor" stroke-width="2" fill="none"
              stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>`;
    document.body.appendChild(fab);

    // Drawer
    drawer = document.createElement("section");
    drawer.className = "cp-chat-drawer";
    drawer.id = "cpChatDrawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "false");
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <div class="cp-chat-head">
        <div class="cp-chat-title"><span class="dot"></span> CARD PICK BOT</div>
        <button class="cp-chat-close" id="cpChatClose" aria-label="닫기">닫기</button>
      </div>
      <div class="cp-chat-log" id="cpChatLog" aria-live="polite"></div>
      <div class="cp-chat-suggest" id="cpChatSuggest"></div>
      <form class="cp-chat-input" id="cpChatForm">
        <input id="cpChatInput" type="text"
               placeholder="예) 카페/배달 자주 쓰고, 연회비는 저렴하게" />
        <button class="cp-chat-send" type="submit">보내기</button>
      </form>`;
    document.body.appendChild(drawer);

    // 요소 바인딩
    log = document.getElementById("cpChatLog");
    suggest = document.getElementById("cpChatSuggest");
    form = document.getElementById("cpChatForm");
    input = document.getElementById("cpChatInput");
    closeBtn = document.getElementById("cpChatClose");

    // 추천 칩 렌더
    suggest.innerHTML = SUG.map(s => `<button type="button" class="cp-chip" data-msg="${esc(s)}">${esc(s)}</button>`).join("");

    // 이벤트 바인딩
    fab.addEventListener("click", open);
    closeBtn.addEventListener("click", close);

    suggest.addEventListener("click", (e) => {
      const b = e.target.closest(".cp-chip"); if (!b) return;
      input.value = b.getAttribute("data-msg");
      form.requestSubmit();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = (input.value || "").trim();
      if (!q) return input.focus();
      addUser(q);
      input.value = "";
      setTimeout(() => addBot(genAnswer(q)), 350);
    });

    // 초기 상태
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  }

  function addUser(t) {
    const el = document.createElement("div");
    el.className = "cp-msg user";
    el.textContent = t;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  function addBot(h) {
    const el = document.createElement("div");
    el.className = "cp-msg bot";
    el.innerHTML = h;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function genAnswer(q) {
    const s = q.toLowerCase();
    if (/카페|배달|편의점/.test(s)) {
      return `<strong>추천: 삼성 taptap O</strong><br/>• 카페/배달 상시 적립 · 간편결제 추가<br/>→ <a href="/compare">비교함</a>에서 더 보기`;
    }
    if (/해외|여행|라운지|마일/.test(s)) {
      return `<strong>추천: 스카이패스 계열</strong><br/>• 해외 적립/라운지 강점<br/>→ <a href="/compare">비교함</a>에서 조건 비교`;
    }
    if (/교통|통신|구독/.test(s)) {
      return `<strong>추천: KB My WE:SH</strong><br/>• 교통/통신/구독 생활영역 특화<br/>→ <a href="/compare">비교함</a> 이동`;
    }
    if (/연회비|만원|저렴/.test(s)) {
      return `<strong>추천: 현대 ZERO Edition2</strong><br/>• 무실적/낮은 연회비 구간<br/>→ <a href="/compare">비교함</a>에서 대안도 확인`;
    }
    return `원하시는 혜택 키워드를 알려주세요. 예) "카페/배달", "해외 적립", "교통/통신", "연회비 1만원 이하"`;
  }

  function open() {
    createIfNeeded();
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    setTimeout(() => input && input.focus(), 0);
    if (!log.dataset.welcome) {
      addBot("안녕하세요! 소비 패턴을 알려주시면 맞춤 카드를 추천해 드릴게요. 예) 카페/배달, 연회비 1만원 이하");
      log.dataset.welcome = "1";
    }
  }

  function close() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    if (fab) fab.focus();
  }

  function sendExternal(q) {
    createIfNeeded();
    addUser(q);
    setTimeout(() => addBot(genAnswer(q)), 350);
  }

  function init() {
    if (__inited) return;
    createIfNeeded();
    __inited = true;
    // expose internal flag if caller wants to check
    window.Chatbot.__inited = true;
  }

  // Expose API
  window.Chatbot = {
    init,
    open,
    close,
    sendExternal,
    // internal flag (외부에서 읽을 수 있도록)
    __inited: __inited
  };
})();
