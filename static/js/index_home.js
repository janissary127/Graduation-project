/* index_home.js
 * 인덱스 페이지의 추천 질문 카드를 챗봇 추천 페이지로 연결
 */

(function() {
  function init() {
    // 추천 질문 카드 클릭 처리
    const suggestGrid = document.querySelector('.gpt-suggest-grid');
    if (suggestGrid) {
      suggestGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.gpt-suggest-card');
        if (!card) return;

        const query = card.getAttribute('data-q') || card.querySelector('.gpt-card-title')?.textContent || '';
        if (query) {
          // 챗봇 추천 페이지로 이동하면서 쿼리 파라미터 전달
          window.location.href = `/chatbot_recommend?query=${encodeURIComponent(query)}`;
        }
      });
    }
  }

  // DOMContentLoaded 이벤트에서 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();