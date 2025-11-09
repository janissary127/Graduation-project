// mypage.js - 마이페이지 즐겨찾기 카드 렌더링

let allFavoriteCards = []; // 전체 즐겨찾기 카드
let currentPage = 1; // 현재 페이지
const CARDS_PER_PAGE = 4; // 페이지당 카드 수

document.addEventListener('DOMContentLoaded', async () => {
  // 즐겨찾기 카드 로드
  await loadFavoriteCards();

  // 회원정보 수정 폼 처리
  const mpForm = document.getElementById('mpForm');
  if (mpForm) {
    mpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('회원정보 수정 기능은 추후 서버 연동 후 활성화됩니다.');
    });
  }
});

/**
 * 즐겨찾기 카드 목록 로드
 */
async function loadFavoriteCards() {
  const favGrid = document.getElementById('favGrid');
  const favCount = document.getElementById('favCount');

  try {
    const response = await fetch('/api/favorites/cards');

    if (!response.ok) {
      throw new Error('즐겨찾기 카드를 불러올 수 없습니다.');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '오류가 발생했습니다.');
    }

    allFavoriteCards = data.cards || [];

    // 카드 개수 업데이트
    if (favCount) {
      favCount.textContent = allFavoriteCards.length;
    }

    // 페이지 렌더링
    currentPage = 1;
    renderPage();

  } catch (error) {
    console.error('즐겨찾기 로드 오류:', error);
    favGrid.innerHTML = `
      <div class="empty-favorites">
        <p style="color: #ef4444;">${error.message}</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem;">로그인이 필요합니다.</p>
      </div>
    `;
  }
}

/**
 * 즐겨찾기 카드 요소 생성
 */
function createFavoriteCardElement(card) {
  const cardDiv = document.createElement('div');
  cardDiv.className = 'fav-card-item';

  // 제거 버튼
  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-favorite-btn';
  removeBtn.title = '즐겨찾기 제거';
  removeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;

  removeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm(`${card.name}을(를) 즐겨찾기에서 제거하시겠습니까?`)) {
      await removeFavorite(card.name);
    }
  });

  // 카드 이미지
  const img = document.createElement('img');
  img.className = 'fav-card-img';
  const imageSrc = resolveImageSrc(card);
  img.src = imageSrc.initial;
  img.alt = card.name;

  // 이미지 로드 실패 시 폴백
  img.onerror = () => {
    if (imageSrc.fallbackToJpg && imageSrc.jpgSrc) {
      img.src = imageSrc.jpgSrc;
      img.onerror = () => {
        img.src = imageSrc.placeholder;
      };
    } else {
      img.src = imageSrc.placeholder;
    }
  };

  // 카드 이름
  const nameDiv = document.createElement('div');
  nameDiv.className = 'fav-card-name';
  nameDiv.textContent = card.name;

  // 카드사
  const corpDiv = document.createElement('div');
  corpDiv.className = 'fav-card-corp';
  corpDiv.textContent = card.corp;

  // 주요 혜택
  const benefitsDiv = document.createElement('div');
  benefitsDiv.className = 'fav-card-benefits';
  const benefits = card.benefits || [];
  if (benefits.length > 0) {
    benefitsDiv.textContent = benefits.slice(0, 2).join(', ');
  } else {
    benefitsDiv.textContent = '혜택 정보 없음';
  }

  cardDiv.appendChild(removeBtn);
  cardDiv.appendChild(img);
  cardDiv.appendChild(nameDiv);
  cardDiv.appendChild(corpDiv);
  cardDiv.appendChild(benefitsDiv);

  return cardDiv;
}

/**
 * 즐겨찾기 제거 (카드 이름 기반)
 */
async function removeFavorite(cardName) {
  if (!cardName) {
    alert('카드 정보를 찾을 수 없습니다.');
    console.error('카드명이 없습니다:', cardName);
    return;
  }

  try {
    console.log('[즐겨찾기 제거] 카드명:', cardName);

    const response = await fetch('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        card_name: cardName,
        action: 'remove'
      })
    });

    if (!response.ok) {
      throw new Error('즐겨찾기 제거 실패');
    }

    const data = await response.json();

    console.log('[즐겨찾기 제거 응답]', data);

    if (data.success) {
      // 전체 목록 새로고침 (서버에서 최신 데이터 가져오기)
      await loadFavoriteCards();
    } else {
      alert(data.error || '즐겨찾기 제거에 실패했습니다.');
    }
  } catch (error) {
    console.error('즐겨찾기 제거 오류:', error);
    alert('오류가 발생했습니다. 다시 시도해주세요.');
  }
}

/**
 * 현재 페이지 렌더링 (9개씩)
 */
function renderPage() {
  const favGrid = document.getElementById('favGrid');

  if (allFavoriteCards.length === 0) {
    favGrid.innerHTML = `
      <div class="empty-favorites">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <p>아직 즐겨찾기한 카드가 없습니다.</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem;">카드찾기 또는 추천 페이지에서 별표를 눌러 즐겨찾기에 추가해보세요!</p>
      </div>
    `;
    return;
  }

  // 현재 페이지의 카드들만 추출
  const startIdx = (currentPage - 1) * CARDS_PER_PAGE;
  const endIdx = startIdx + CARDS_PER_PAGE;
  const pageCards = allFavoriteCards.slice(startIdx, endIdx);

  // 카드 렌더링
  favGrid.innerHTML = '';
  pageCards.forEach(card => {
    const cardElement = createFavoriteCardElement(card);
    favGrid.appendChild(cardElement);
  });

  // 페이지네이션 렌더링
  renderPagination();
}

/**
 * 페이지네이션 버튼 렌더링
 */
function renderPagination() {
  let paginationContainer = document.getElementById('pagination-container');

  // 컨테이너가 없으면 생성
  if (!paginationContainer) {
    paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-container';
    paginationContainer.className = 'pagination-container';
    const favGrid = document.getElementById('favGrid');
    favGrid.parentNode.appendChild(paginationContainer);
  }

  const totalPages = Math.ceil(allFavoriteCards.length / CARDS_PER_PAGE);

  // 페이지가 1개 이하면 페이지네이션 숨김
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }

  paginationContainer.style.display = 'flex';
  paginationContainer.innerHTML = '';

  // 이전 버튼
  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = '‹ 이전';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationContainer.appendChild(prevBtn);

  // 페이지 번호
  const pageInfo = document.createElement('span');
  pageInfo.className = 'pagination-info';
  pageInfo.textContent = `${currentPage} / ${totalPages}`;
  paginationContainer.appendChild(pageInfo);

  // 다음 버튼
  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = '다음 ›';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationContainer.appendChild(nextBtn);
}

/**
 * 카드 이미지 경로 해석
 */
function resolveImageSrc(card) {
  const PLACEHOLDER = 'https://via.placeholder.com/120x80?text=Card';

  function imgPathFromFilename(filename) {
    return `/static/img/${encodeURIComponent(filename)}`;
  }

  if (card.img) {
    const raw = String(card.img).trim();
    if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) {
      return { initial: raw, fallbackToJpg: false, placeholder: PLACEHOLDER };
    }
    return { initial: imgPathFromFilename(raw), fallbackToJpg: false, placeholder: PLACEHOLDER };
  }

  const baseName = (card.name || '').trim();
  if (!baseName) {
    return { initial: PLACEHOLDER, fallbackToJpg: false, placeholder: PLACEHOLDER };
  }

  const pngFile = `${baseName}.png`;
  const jpgFile = `${baseName}.jpg`;

  return {
    initial: imgPathFromFilename(pngFile),
    fallbackToJpg: true,
    jpgSrc: imgPathFromFilename(jpgFile),
    placeholder: PLACEHOLDER
  };
}
