// render-cards.js
(async function () {
    const JSON_PATH = '/static/data/card_list.json'; // 실제 경로에 맞게 수정
    const issuerGrid = document.getElementById('issuerGrid');
    const cardGrid = document.getElementById('cardGrid');
    const backBtn = document.getElementById('backToIssuers');

    // 브랜드별 기본 색상 (원하면 JSON에 넣어도 됨)
    const BRAND_COLOR = {
        '삼성': '#034EA2',
        '신한': '#0046FF',
        'KB국민': '#FFCC00',
        '롯데': '#6A5DE3',
        '우리': '#0071C2',
        '현대': '#000000',
        '하나': '#5DC3B7',
        'NH': '#0F62AE',
        'IBK기업은행': '#196F3D'
    };

    // corp 문자열 정규화: "삼성카드" -> "삼성", "NH농협카드" -> "NH" 등
    function normalizeCorp(corp) {
        if (!corp) return '';

        // 기본 전처리: 괄호/주식회사 등 제거, 앞뒤 공백 제거
        let s = String(corp)
            .replace(/주식회사|\(주\)|\(주\)|주식회사\s*/gi, '')
            .trim();

        // 끝에 붙은 '카드' 단어만 제거 (IBK기업은행카드 -> IBK기업은행)
        s = s.replace(/카드$/i, '').trim();

        // 불필요 공백 제거, 대소문자 정리
        s = s.replace(/\s+/g, ' ');

        // 카드사별 규칙적 매칭(순서 중요)
        if (/NH|농협/i.test(s)) return 'NH';
        if (/신한/i.test(s)) return '신한';
        if (/삼성/i.test(s)) return '삼성';
        if (/KB|국민/i.test(s)) return 'KB국민';
        if (/롯데/i.test(s)) return '롯데';
        if (/우리/i.test(s)) return '우리';
        if (/현대/i.test(s)) return '현대';
        if (/하나|KEB/i.test(s)) return '하나';
        if (/IBK|기업은행/i.test(s)) return 'IBK';

        // 위 규칙에 매칭되지 않으면 원본 문자열(앞뒤 공백 제거된) 반환
        return s;
    }
    function colorForCorp(corp) {
        const key = normalizeCorp(corp);
        if (BRAND_COLOR[key]) return BRAND_COLOR[key];
        // fallback: predictable color from string hash
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i);
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue} 70% 60%)`;
    }

    /**
     * 이미지 src 결정기
     * 우선순위:
     * 1) card.img 이 존재하면 그대로 사용 (절대경로 또는 상대경로 모두 허용)
     * 2) card.name 기반으로 /static/img/{encodeURIComponent(name)}.png (우선)
     *    -> 실패하면 .jpg 시도
     *    -> 실패하면 placeholder
     */
    function resolveImageSrc(card) {
        // placeholder(마지막 대체 수단)
        const PLACEHOLDER = 'https://via.placeholder.com/120x80?text=Card';

        // helper: 파일명(확장자 포함)을 안전하게 /static/img/ 경로로 만듬
        function imgPathFromFilename(filename) {
            // encodeURIComponent는 특수문자, 공백 등을 안전하게 인코딩
            return `/static/img/${encodeURIComponent(filename)}`;
        }

        // 1) card.img가 있으면 우선 처리
        if (card.img) {
            const raw = String(card.img).trim();
            // 만약 이미 절대 URL 또는 루트 상대경로이면 그대로 사용
            if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) {
                return { initial: raw, fallbackToJpg: false, placeholder: PLACEHOLDER };
            }
            // 그렇지 않으면 static/img 하위 파일명으로 간주
            return { initial: imgPathFromFilename(raw), fallbackToJpg: false, placeholder: PLACEHOLDER };
        }

        // 2) card.name 기반으로 시도 (사용자 제공 파일명 예: "[NH농협] 그린카드v2.png")
        const baseName = (card.name || '').trim();
        if (!baseName) {
            return { initial: PLACEHOLDER, fallbackToJpg: false, placeholder: PLACEHOLDER };
        }

        // 일반적으로 JSON에 확장자가 없는 경우가 많으므로 .png 먼저, .jpg 대체
        const pngFile = `${baseName}.png`;
        const jpgFile = `${baseName}.jpg`;

        return {
            initial: imgPathFromFilename(pngFile),
            fallbackToJpg: true,
            jpgSrc: imgPathFromFilename(jpgFile),
            placeholder: PLACEHOLDER
        };
    }

    function createCardNode(card) {
        const container = document.createElement('div');
        container.className = 'card-container';

        // benefits를 label/value로 분해 (최대 3개)
        const benefitItems = (card.benefits && card.benefits.length ? card.benefits.slice(0, 3) : []);
        const benefitsHtml = benefitItems.map(b => {
            // 첫 단어를 label로 사용, 나머지를 value로
            const parts = String(b).trim().split(/\s+/);
            const label = parts.shift() || '혜택';
            const value = parts.join(' ') || '';
            return `<div class="benefit-item">
                    <div class="benefit-label">${label}</div>
                    <div class="benefit-value">${value}</div>
                </div>`;
        }).join('') || `<div class="benefit-item"><div class="benefit-label">혜택</div><div class="benefit-value">정보 없음</div></div>`;

        // 안전한 대체값
        const promoText = card.promo || '';
        const performance = card.performance || '';
        const desc1 = card.desc1 || '';
        const desc2 = card.desc2 || '';
        const teamId = card.team_id || 0;

        // 이미지 요소 생성 (onerror로 확장자 폴백 처리)
        const imgWrap = document.createElement('div');
        imgWrap.className = 'card_img';
        const imgEl = document.createElement('img');
        imgEl.alt = (card.name || '카드');
        imgEl.setAttribute('loading', 'lazy');

        const resolved = resolveImageSrc(card);
        // 추적 상태
        let triedJpg = false;
        imgEl.src = resolved.initial;

        imgEl.addEventListener('error', function onImgError() {
            // 만약 jpg로 폴백 가능하고 아직 jpg를 시도하지 않았다면 jpg로 바꿔치기
            if (resolved.fallbackToJpg && !triedJpg && resolved.jpgSrc) {
                triedJpg = true;
                imgEl.src = resolved.jpgSrc;
                return;
            }
            // 그 외에는 placeholder로
            if (imgEl.src !== resolved.placeholder) {
                imgEl.src = resolved.placeholder;
            } else {
                // 이미 placeholder도 실패한다면 이벤트 제거
                imgEl.removeEventListener('error', onImgError);
            }
        });

        imgWrap.appendChild(imgEl);

        // 카드 데이터 HTML
        const dataWrap = document.createElement('div');
        dataWrap.className = 'card_data';

        dataWrap.innerHTML = `
            <div class="title-row">
                <div class="card_tit">
                    <span class="card_name">${card.name || ''}</span>
                    <span class="card_corp">${card.corp || ''}</span>
                </div>
                <a href="/card/detail/${teamId}" class="b_view">자세히 보기</a>
            </div>

            ${promoText ? `<div><span class="promo-badge">${promoText}</span></div>` : ''}

            <div class="benefit-grid">
                ${benefitsHtml}
            </div>

            <div class="meta-row">
                <div class="performance">${performance}</div>
                <div class="txt">${desc1}</div>
                <div class="txt2">${desc2}</div>
            </div>
        `;

        container.appendChild(imgWrap);
        container.appendChild(dataWrap);

        return container;
    }

    // 카드사(issuer) 노드 생성 — benefit__issuer 요소 제거
    function createIssuerNode(issuerKey, displayName, count, sampleCorp) {
        const article = document.createElement('article');
        article.className = 'benefit__item issuer-item';
        article.dataset.issuer = issuerKey;

        const brand = document.createElement('div');
        brand.className = 'brand-circle';
        brand.style.background = colorForCorp(sampleCorp);
        brand.textContent = displayName;

        const label = document.createElement('div');
        label.className = 'benefit__label';
        label.textContent = `${count}개의 카드`;

        article.appendChild(brand);
        article.appendChild(label);

        // 클릭 핸들러은 그대로 유지 (클릭하면 해당 카드사 카드들을 보여줌)
        article.addEventListener('click', () => {
            showCardsForIssuer(issuerKey);
            // 히스토리 관리(브라우저 뒤로 가기 사용 가능)
            try {
                history.pushState({ issuer: issuerKey }, `${displayName}`, `?issuer=${encodeURIComponent(issuerKey)}`);
            } catch (e) { /* ignore */ }
        });

        return article;
    }

    // Issuer 목록 렌더
    function renderIssuers(issuerMap) {
        issuerGrid.innerHTML = '';
        // issuerMap: key -> { displayName, corpSample, cards: [...] }
        Object.entries(issuerMap).forEach(([key, info]) => {
            const node = createIssuerNode(key, info.displayName, info.cards.length, info.corpSample);
            issuerGrid.appendChild(node);
        });

        // 항상 issuerGrid는 보이게 하고 cardGrid는 초기엔 숨김
        issuerGrid.style.display = '';
        cardGrid.style.display = 'none';
        backBtn.style.display = 'none';

        // 초기에는 선택 표시 제거
        document.querySelectorAll('.issuer-item.selected').forEach(el => el.classList.remove('selected'));
    }

    // 선택된 issuer 강조 제거/추가 도우미
    function setSelectedIssuerKey(key) {
        document.querySelectorAll('.issuer-item').forEach(el => {
            if (el.dataset.issuer === key) el.classList.add('selected');
            else el.classList.remove('selected');
        });
    }

    // 특정 issuer 카드들 렌더 — issuerGrid를 숨기지 않도록 수정
    function showCardsForIssuer(issuerKey) {
        const info = issuerMap[issuerKey];
        if (!info) {
            cardGrid.innerHTML = '<div>해당 카드사가 없습니다.</div>';
            cardGrid.style.display = '';
            backBtn.style.display = '';
            setSelectedIssuerKey(null);
            return;
        }
        cardGrid.innerHTML = '';
        info.cards.forEach(card => cardGrid.appendChild(createCardNode(card)));

        // issuerGrid는 숨기지 않는다 — 항상 보이게
        issuerGrid.style.display = '';
        cardGrid.style.display = '';

        // 뒤로가기 버튼은 카드 목록을 닫는 용도로 노출 (원하면 제거 가능)
        backBtn.style.display = '';

        // 클릭한 issuer 강조
        setSelectedIssuerKey(issuerKey);
    }

    // back 버튼: 카드 목록만 닫고 issuer 목록은 유지
    backBtn.addEventListener('click', () => {
        // 히스토리 방식 유지하되, 단순히 카드 영역만 초기화
        try {
            // 히스토리 스택이 있으면 뒤로가기로 처리
            history.back();
        } catch (e) {
            // 실패하면 카드 목록 숨기기
            cardGrid.innerHTML = '';
            cardGrid.style.display = 'none';
            backBtn.style.display = 'none';
            document.querySelectorAll('.issuer-item.selected').forEach(el => el.classList.remove('selected'));
        }
    });

    // popstate는 기존대로 동작하되 issuer 목록은 항상 보이게 유지
    window.addEventListener('popstate', (ev) => {
        const state = ev.state;
        if (state && state.issuer) {
            showCardsForIssuer(state.issuer);
        } else {
            // 카드 목록만 닫고 issuer 목록은 보이게
            cardGrid.innerHTML = '';
            cardGrid.style.display = 'none';
            backBtn.style.display = 'none';
            renderIssuers(issuerMap);
        }
    });

    // back 버튼
    backBtn.addEventListener('click', () => {
        // 브라우저 히스토리를 이용해서 자연스럽게 돌아가게 함
        try { history.back(); } catch (e) { renderIssuers(issuerMap); }
    });

    // 로드 및 초기 렌더링
    try {
        const res = await fetch(JSON_PATH, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.cards || []);

        // issuerMap 빌드: normalizeCorp 값을 key로 사용
        issuerMap = items.reduce((acc, card) => {
            const key = normalizeCorp(card.corp || card.company || '기타');
            if (!acc[key]) {
                acc[key] = {
                    displayName: key,
                    corpSample: card.corp || '',
                    cards: []
                };
            }
            acc[key].cards.push(card);
            return acc;
        }, {});

        // 만약 ?issuer=... 쿼리로 들어오면 바로 해당 issuer 표시
        const params = new URLSearchParams(location.search);
        const qIssuer = params.get('issuer');
        if (qIssuer && issuerMap[qIssuer]) {
            // pushState 없이 바로 표시 (사용자 경험 선택)
            try { history.replaceState({ issuer: qIssuer }, '', `?issuer=${encodeURIComponent(qIssuer)}`); } catch (e) { }
            showCardsForIssuer(qIssuer);
        } else {
            renderIssuers(issuerMap);
        }

    } catch (err) {
        console.error('cards load failed', err);
        issuerGrid.innerHTML = '<div style="color:#c00">카드 데이터를 불러오지 못했습니다.</div>';
    }
})();
