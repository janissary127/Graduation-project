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

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = (input.value || "").trim();
      if (!q) return input.focus();
      addUser(q);
      input.value = "";

      // 로딩 메시지 추가
      addBot("추천 카드를 찾고 있습니다...");

      try {
        const answer = await genAnswer(q);
        // 마지막 메시지(로딩) 제거
        if (log.lastChild && log.lastChild.classList.contains('bot')) {
          log.removeChild(log.lastChild);
        }
        addBot(answer);
      } catch (error) {
        // 마지막 메시지(로딩) 제거
        if (log.lastChild && log.lastChild.classList.contains('bot')) {
          log.removeChild(log.lastChild);
        }
        addBot("추천 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
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

  async function genAnswer(q) {
    try {
      // API 호출
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: q })
      });

      if (!response.ok) {
        throw new Error('API 호출 실패');
      }

      const data = await response.json();

      // 추천 카드가 없는 경우
      if (!data.success || !data.recommendations || data.recommendations.length === 0) {
        return `관련 키워드를 찾지 못했습니다. 조금 더 구체적으로 입력해 주세요.<br/>예) "스타벅스 자주 가요", "대중교통 이용", "영화 많이 봐요"`;
      }

      // 상위 2개 카드만 선택
      const topCards = data.recommendations.slice(0, 2);

      // 카드 정보 HTML 생성
      let html = '<div class="cp-card-list">';

      topCards.forEach((card, index) => {
        const cardName = esc(card.name || '');
        const cardCorp = esc(card.corp || '');
        const benefits = card.benefits || [];

        // 혜택은 최대 3개만 표시
        const benefitList = benefits.slice(0, 3).map(b => `• ${esc(b)}`).join('<br/>');

        html += `
          <div class="cp-card-item">
            <strong>${index + 1}. ${cardName}</strong> <span style="color: #6b7280; font-size: 0.9em;">(${cardCorp})</span><br/>
            <div style="margin-top: 4px; font-size: 0.9em; line-height: 1.4;">
              ${benefitList}
            </div>
          </div>
        `;
      });

      html += '</div>';
      html += `<div style="margin-top: 12px; font-size: 0.9em; color: #6b7280;">→ <a href="/browse" style="color: #2563eb;">카드찾기</a>에서 더 많은 카드를 확인해보세요</div>`;

      return html;

    } catch (error) {
      console.error('추천 API 오류:', error);
      throw error;
    }
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

  async function sendExternal(q) {
    createIfNeeded();
    addUser(q);

    // 로딩 메시지 추가
    addBot("추천 카드를 찾고 있습니다...");

    try {
      const answer = await genAnswer(q);
      // 마지막 메시지(로딩) 제거
      if (log.lastChild && log.lastChild.classList.contains('bot')) {
        log.removeChild(log.lastChild);
      }
      addBot(answer);
    } catch (error) {
      // 마지막 메시지(로딩) 제거
      if (log.lastChild && log.lastChild.classList.contains('bot')) {
        log.removeChild(log.lastChild);
      }
      addBot("추천 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
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
