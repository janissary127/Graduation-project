// mypage.js - 마이페이지 즐겨찾기 카드 렌더링

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

    const cards = data.cards || [];

    // 카드 개수 업데이트
    if (favCount) {
      favCount.textContent = cards.length;
    }

    // 카드 렌더링
    if (cards.length === 0) {
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
    } else {
      favGrid.innerHTML = '';
      cards.forEach(card => {
        const cardElement = createFavoriteCardElement(card);
        favGrid.appendChild(cardElement);
      });
    }

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
      await removeFavorite(card.team_id);
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
 * 즐겨찾기 제거
 */
async function removeFavorite(teamId) {
  if (!teamId) {
    alert('카드 정보를 찾을 수 없습니다.');
    console.error('team_id가 없습니다:', teamId);
    return;
  }

  try {
    console.log('[즐겨찾기 제거] team_id:', teamId, '타입:', typeof teamId);

    const response = await fetch('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        team_id: parseInt(teamId, 10),  // 정수로 변환
        action: 'remove'
      })
    });

    if (!response.ok) {
      throw new Error('즐겨찾기 제거 실패');
    }

    const data = await response.json();

    console.log('[즐겨찾기 제거 응답]', data);

    if (data.success) {
      // 즐겨찾기 목록 새로고침
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
