/* recommend_bot.js
 *
 * AI 카드 추천 챗봇 - chat.py API 연동 버전
 * 서버의 Python 추천 알고리즘을 활용합니다.
 */

(function () {
  let chatLog = null;
  let chatInput = null;
  let chatForm = null;
  let resultsSection = null;
  let resultsGrid = null;

  // HTML 이스케이프
  const esc = (s) => {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  };

  // 서버 API를 통한 카드 추천
  async function getRecommendations(userInput) {
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: userInput })
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("추천 API 호출 오류:", error);
      throw error;
    }
  }

  // 봇 메시지 추가
  function addBotMessage(html) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message bot";
    msgDiv.innerHTML = `
      <div class="message-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-4l-4 4v-4H8a4 4 0 0 1-4-4V6z"
                stroke="currentColor" stroke-width="2" fill="none"></path>
        </svg>
      </div>
      <div class="message-content">${html}</div>
    `;
    chatLog.appendChild(msgDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // 사용자 메시지 추가
  function addUserMessage(text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message user";
    msgDiv.innerHTML = `
      <div class="message-content">${esc(text)}</div>
    `;
    chatLog.appendChild(msgDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // 추천 결과 렌더링
  function renderRecommendations(cards) {
    if (!cards || cards.length === 0) {
      resultsGrid.innerHTML = `
        <div class="no-results">
          <p>검색 조건에 맞는 카드를 찾지 못했습니다.</p>
          <p>다른 키워드로 다시 검색해보세요.</p>
          <p class="keyword-hint">💡 추천 키워드: 스타벅스, 배달, 영화, 대중교통, 통신, 쇼핑, 해외여행</p>
        </div>
      `;
      resultsSection.style.display = "block";
      return;
    }

    resultsGrid.innerHTML = cards.map(card => {
      const benefits = (card.benefits || []).slice(0, 3);
      const benefitsHtml = benefits.length > 0
        ? `<ul class="card-benefits">${benefits.map(b => `<li>${esc(b)}</li>`).join("")}</ul>`
        : "";

      return `
        <article class="card-result">
          <div class="card-header">
            <div class="card-corp">${esc(card.corp || "기타")}</div>
            ${card.promo ? `<div class="card-promo">${esc(card.promo)}</div>` : ""}
          </div>
          <h3 class="card-name">${esc(card.name || "Unnamed Card")}</h3>
          <div class="card-desc">${esc(card.desc1 || "")}</div>
          ${benefitsHtml}
          <div class="card-performance">
            <strong>전월실적:</strong> ${esc(card.performance || "정보 없음")}
          </div>
          <div class="card-actions">
            <a href="/compare" class="btn-outline">비교함 담기</a>
          </div>
        </article>
      `;
    }).join("");

    resultsSection.style.display = "block";

    // 결과로 부드럽게 스크롤
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  // 메시지 처리
  async function handleUserMessage(text) {
    addUserMessage(text);

    // 추천 진행 메시지
    setTimeout(() => {
      addBotMessage("입력하신 키워드를 분석하고 있습니다...<br/>chat.py의 AI 알고리즘을 사용하여 최적의 카드를 찾고 있어요! 🔍");
    }, 300);

    try {
      // 서버 API 호출
      const result = await getRecommendations(text);

      setTimeout(() => {
        if (!result.success || result.count === 0) {
          addBotMessage(`
            "${esc(text)}" 키워드로 추천할 수 있는 카드를 찾지 못했습니다.<br/>
            <br/>
            💡 <strong>추천 키워드</strong>:<br/>
            ☕ 커피/음료: 스타벅스, 투썸, 커피빈, 카페<br/>
            🍔 외식/배달: 맥도날드, 배달의민족, 치킨, 피자<br/>
            🎬 여가/문화: 영화, CGV, 넷플릭스, 유튜브<br/>
            🚆 교통: 대중교통, 버스, 지하철, 택시, 주유<br/>
            📱 통신: SKT, KT, 통신요금, 휴대폰<br/>
            🛍️ 쇼핑: 이마트, 쿠팡, 백화점, 편의점<br/>
            ✈️ 여행: 항공, 호텔, 해외, 면세점
          `);
          resultsSection.style.display = "none";
        } else {
          addBotMessage(`
            총 <strong>${result.count}개</strong>의 카드를 추천해드립니다!<br/>
            <span style="font-size:12px;color:#6b7280;">chat.py 알고리즘으로 분석한 결과입니다.</span><br/>
            아래에서 자세한 내용을 확인하세요. 👇
          `);
          renderRecommendations(result.recommendations);
        }
      }, 1000);

    } catch (error) {
      setTimeout(() => {
        addBotMessage(`
          ⚠️ 추천 중 오류가 발생했습니다.<br/>
          ${esc(error.message)}<br/>
          잠시 후 다시 시도해주세요.
        `);
        resultsSection.style.display = "none";
      }, 500);
    }
  }

  // 폼 제출 처리
  function handleSubmit(e) {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) {
      chatInput.focus();
      return;
    }
    handleUserMessage(text);
    chatInput.value = "";
  }

  // 추천 칩 클릭 처리
  function handleSuggestionClick(e) {
    const chip = e.target.closest(".suggestion-chip");
    if (!chip) return;

    const keyword = chip.getAttribute("data-keyword") || chip.textContent.replace(/[^\w\s가-힣]/g, "").trim();
    chatInput.value = keyword;
    handleSubmit(new Event("submit"));
  }

  // 초기화
  async function init() {
    chatLog = document.getElementById("chatLog");
    chatInput = document.getElementById("chatInput");
    chatForm = document.getElementById("chatInputForm");
    resultsSection = document.getElementById("recommendResults");
    resultsGrid = document.getElementById("resultsGrid");

    if (!chatLog || !chatInput || !chatForm) {
      console.error("필수 DOM 요소를 찾을 수 없습니다.");
      return;
    }

    // 이벤트 리스너 등록
    chatForm.addEventListener("submit", handleSubmit);

    const suggestions = document.getElementById("chatSuggestions");
    if (suggestions) {
      suggestions.addEventListener("click", handleSuggestionClick);
    }

    // URL 쿼리 파라미터에서 query 읽기
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('query');

    if (queryParam && queryParam.trim()) {
      // 쿼리가 있으면 자동으로 처리
      chatInput.value = queryParam.trim();
      setTimeout(() => {
        handleUserMessage(queryParam.trim());
      }, 500);
    } else {
      // 입력창 포커스
      setTimeout(() => chatInput.focus(), 100);
    }
  }

  // DOMContentLoaded 이벤트에서 초기화
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
