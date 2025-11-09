// survey-result.js - 설문조사 결과 페이지 로직

let userFavorites = []; // 사용자의 즐겨찾기 카드 team_id 배열

document.addEventListener('DOMContentLoaded', async () => {
  const loadingSpinner = document.getElementById('loading-spinner');
  const recommendationsSection = document.getElementById('recommendations-section');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');

  try {
    // 1. 사용자 즐겨찾기 정보 가져오기
    await loadUserFavorites();

    // 2. 추천 API 호출
    const recommendResponse = await fetch('/api/survey/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!recommendResponse.ok) {
      throw new Error('카드 추천을 불러올 수 없습니다.');
    }

    const recommendData = await recommendResponse.json();

    if (!recommendData.success) {
      throw new Error(recommendData.error || '추천 시스템 오류가 발생했습니다.');
    }

    // 3. 추천 카드 렌더링
    renderRecommendations(recommendData.result.recommendations);

    // 4. 로딩 스피너 숨기고 결과 표시
    loadingSpinner.style.display = 'none';
    recommendationsSection.style.display = 'block';

  } catch (error) {
    console.error('Error:', error);
    loadingSpinner.style.display = 'none';
    errorMessage.style.display = 'block';
    errorText.textContent = error.message || '오류가 발생했습니다. 다시 시도해주세요.';
  }
});

/**
 * 사용자의 즐겨찾기 정보 로드 (카드 이름 배열)
 */
async function loadUserFavorites() {
  try {
    const response = await fetch('/api/favorites');
    if (response.ok) {
      const data = await response.json();
      // 카드 이름 배열
      userFavorites = data.favorites || [];
      console.log('[즐겨찾기 로드] userFavorites:', userFavorites);
    }
  } catch (error) {
    console.error('즐겨찾기 정보 로드 실패:', error);
  }
}

/**
 * 추천 카드 목록 렌더링
 */
function renderRecommendations(recommendations) {
  const cardList = document.getElementById('cardList');
  cardList.innerHTML = '';

  if (!recommendations || recommendations.length === 0) {
    cardList.innerHTML = '<p style="text-align: center; padding: 2rem; color: #6b7280;">추천 카드를 찾지 못했습니다.</p>';
    return;
  }

  recommendations.forEach(rec => {
    const cardElement = createCardElement(rec);
    cardList.appendChild(cardElement);
  });
}

/**
 * 개별 카드 요소 생성
 */
function createCardElement(rec) {
  const card = rec.card;
  const container = document.createElement('div');
  container.className = `card-container rank-${rec.rank}`;
  container.style.position = 'relative';

  // 순위 배지
  const rankBadge = document.createElement('div');
  rankBadge.className = 'card-rank-badge';
  rankBadge.textContent = rec.rank;

  // 즐겨찾기 버튼
  const favoriteBtn = document.createElement('button');
  favoriteBtn.className = 'favorite-btn';
  favoriteBtn.title = '즐겨찾기';

  // 카드 이름으로 즐겨찾기 상태 확인
  const cardName = card.name;
  const isFavorite = cardName && userFavorites.includes(cardName);
  if (isFavorite) {
    favoriteBtn.classList.add('active');
  }

  favoriteBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  `;

  favoriteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!cardName) {
      alert('카드 정보를 찾을 수 없습니다. (카드명 없음)');
      console.error('Card data:', card);
      return;
    }
    console.log('[즐겨찾기 버튼] 카드명:', cardName);
    toggleFavorite(cardName, favoriteBtn);
  });

  // content-row: 이미지 + 정보
  const contentRow = document.createElement('div');
  contentRow.className = 'content-row';

  // 카드 이미지
  const imgDiv = document.createElement('div');
  imgDiv.className = 'card_img';

  const img = document.createElement('img');
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

  imgDiv.appendChild(img);

  // 카드 데이터
  const dataDiv = document.createElement('div');
  dataDiv.className = 'card_data';

  // 카드 이름 & 카드사
  const nameDiv = document.createElement('div');
  nameDiv.className = 'card_name';
  nameDiv.textContent = card.name;

  const corpDiv = document.createElement('div');
  corpDiv.className = 'card_corp';
  corpDiv.textContent = card.corp;

  // 혜택 리스트
  const benefitsDiv = document.createElement('div');
  benefitsDiv.className = 'benefits';

  const benefits = card.benefits || [];
  benefits.slice(0, 3).forEach(benefit => {
    const parts = String(benefit).trim().split(/\s+/);
    const label = parts.shift() || '혜택';
    const value = parts.join(' ') || '';

    const benefitItem = document.createElement('div');
    benefitItem.className = 'benefit-item';
    benefitItem.innerHTML = `
      <div class="benefit-label">${label}</div>
      <div class="benefit-value">${value}</div>
    `;
    benefitsDiv.appendChild(benefitItem);
  });

  // 자세히 보기 버튼
  const detailBtn = document.createElement('button');
  detailBtn.className = 'btn-detail';
  detailBtn.textContent = '자세히 보기';

  dataDiv.appendChild(nameDiv);
  dataDiv.appendChild(corpDiv);
  dataDiv.appendChild(benefitsDiv);
  dataDiv.appendChild(detailBtn);

  contentRow.appendChild(imgDiv);
  contentRow.appendChild(dataDiv);

  // 상세 정보 (초기 숨김)
  const detailsHolder = createDetailsGroup(card);
  detailsHolder.style.display = 'none';

  // 자세히 보기 토글
  let isDetailsOpen = false;
  detailBtn.addEventListener('click', () => {
    isDetailsOpen = !isDetailsOpen;
    if (isDetailsOpen) {
      detailsHolder.style.display = 'block';
      detailBtn.textContent = '접기';
    } else {
      detailsHolder.style.display = 'none';
      detailBtn.textContent = '자세히 보기';
    }
  });

  container.appendChild(rankBadge);
  container.appendChild(favoriteBtn);
  container.appendChild(contentRow);
  container.appendChild(detailsHolder);

  return container;
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

/**
 * 상세 정보 그룹 생성 (browse.html의 render-cards.js 스타일)
 */
function createDetailsGroup(card) {
  const holder = document.createElement('div');
  holder.className = 'card-details-holder';

  const details = card.details || [];

  if (details.length === 0) {
    // details가 없는 경우 기본 정보만 표시
    if (card.performance) {
      const dl = createDetailDl('전월실적 조건', [card.performance]);
      holder.appendChild(dl);
    }
    if (card.promo) {
      const dl = createDetailDl('프로모션', [card.promo]);
      holder.appendChild(dl);
    }
    return holder;
  }

  // details 배열 순회
  details.forEach(detail => {
    const dl = document.createElement('dl');
    const dt = document.createElement('dt');

    // dt_texts 첫 항목
    const pTxt = document.createElement('p');
    pTxt.className = 'txt1';
    const firstTxt = Array.isArray(detail.dt_texts) && detail.dt_texts.length ? detail.dt_texts[0] : '상세 정보';
    pTxt.textContent = firstTxt;
    dt.appendChild(pTxt);

    // dt_i (요약 텍스트)
    if (detail.dt_i) {
      const iEl = document.createElement('i');
      iEl.textContent = detail.dt_i;
      dt.appendChild(iEl);
    }

    dt.tabIndex = 0;
    dt.setAttribute('role', 'button');
    dt.style.cursor = 'pointer';

    dl.appendChild(dt);

    // dd 생성
    const dd = document.createElement('dd');
    const inBox = document.createElement('div');
    inBox.className = 'in_box';

    if (Array.isArray(detail.dd_paragraphs)) {
      detail.dd_paragraphs.forEach(par => {
        const p = document.createElement('p');
        p.textContent = par;
        inBox.appendChild(p);
      });
    }

    if (Array.isArray(detail.dd_tables) && detail.dd_tables.length) {
      detail.dd_tables.forEach(tableArr => {
        const table = document.createElement('table');
        table.className = 'detail-table';
        tableArr.forEach((rowArr, rowIndex) => {
          const tr = document.createElement('tr');
          rowArr.forEach(cellText => {
            const cell = document.createElement(rowIndex === 0 ? 'th' : 'td');
            cell.textContent = cellText;
            tr.appendChild(cell);
          });
          table.appendChild(tr);
        });
        inBox.appendChild(table);
      });
    }

    dd.appendChild(inBox);
    dl.appendChild(dd);

    // 기본 상태: 닫힘
    dl.classList.add('detail-collapsed');
    dl.setAttribute('aria-expanded', 'false');

    // 토글 핸들러
    dt.addEventListener('click', (e) => {
      e.stopPropagation();
      dl.classList.toggle('on');
      dl.classList.toggle('detail-collapsed');
      const isOpen = dl.classList.contains('on');
      dl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    holder.appendChild(dl);
  });

  return holder;
}

/**
 * 간단한 dl 생성 헬퍼
 */
function createDetailDl(title, paragraphs) {
  const dl = document.createElement('dl');
  const dt = document.createElement('dt');
  dt.innerHTML = `<p class="txt1">${title}</p>`;
  dt.style.cursor = 'pointer';

  const dd = document.createElement('dd');
  const inBox = document.createElement('div');
  inBox.className = 'in_box';

  paragraphs.forEach(text => {
    const p = document.createElement('p');
    p.textContent = text;
    inBox.appendChild(p);
  });

  dd.appendChild(inBox);
  dl.appendChild(dt);
  dl.appendChild(dd);
  dl.classList.add('detail-collapsed');

  dt.addEventListener('click', () => {
    dl.classList.toggle('on');
    dl.classList.toggle('detail-collapsed');
  });

  return dl;
}

/**
 * 즐겨찾기 토글 (카드 이름 기반)
 */
async function toggleFavorite(cardName, btnElement) {
  if (!cardName) {
    alert('카드 정보를 찾을 수 없습니다.');
    return;
  }

  const isFavorite = userFavorites.includes(cardName);

  console.log('[즐겨찾기 토글] 카드명:', cardName, '현재 상태:', isFavorite ? '즐겨찾기됨' : '즐겨찾기 안됨');

  try {
    const response = await fetch('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        card_name: cardName,
        action: isFavorite ? 'remove' : 'add'
      })
    });

    if (!response.ok) {
      throw new Error('즐겨찾기 처리 실패');
    }

    const data = await response.json();

    if (data.success) {
      console.log('[즐겨찾기 응답]', data);

      // UI 업데이트
      if (isFavorite) {
        userFavorites = userFavorites.filter(name => name !== cardName);
        btnElement.classList.remove('active');
      } else {
        userFavorites.push(cardName);
        btnElement.classList.add('active');
      }

      console.log('[즐겨찾기 업데이트 후] userFavorites:', userFavorites);
    } else {
      alert(data.error || '즐겨찾기 처리에 실패했습니다.');
    }
  } catch (error) {
    console.error('즐겨찾기 오류:', error);
    alert('로그인이 필요합니다.');
  }
}
