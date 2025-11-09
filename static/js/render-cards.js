// render-cards.js (수정본)
(async function () {
    const JSON_PATH = '/static/card_data/card_list.json'; // 실제 경로에 맞게 수정
    const issuerGrid = document.getElementById('issuerGrid');
    const cardGrid = document.getElementById('cardGrid');
    const backBtn = document.getElementById('backToIssuers');
    let issuerMap = {}; // 기존에 전역으로 사용되던 issuerMap을 명시적으로 선언
    let allCards = [];  // JSON으로 로드한 전체 카드 목록 (필터 소스)


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

    function normalizeCorp(corp) {
        if (!corp) return '';

        let s = String(corp)
            .replace(/주식회사|\(주\)|\(주\)|주식회사\s*/gi, '')
            .trim();

        s = s.replace(/카드$/i, '').trim();
        s = s.replace(/\s+/g, ' ');

        if (/NH|농협/i.test(s)) return 'NH';
        if (/신한/i.test(s)) return '신한';
        if (/삼성/i.test(s)) return '삼성';
        if (/KB|국민/i.test(s)) return 'KB국민';
        if (/롯데/i.test(s)) return '롯데';
        if (/우리/i.test(s)) return '우리';
        if (/현대/i.test(s)) return '현대';
        if (/하나|KEB/i.test(s)) return '하나';
        if (/IBK|기업은행/i.test(s)) return 'IBK';

        return s;
    }
    function colorForCorp(corp) {
        const key = normalizeCorp(corp);
        if (BRAND_COLOR[key]) return BRAND_COLOR[key];
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i);
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue} 70% 60%)`;
    }

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

    // ---------- 새로 추가된 함수: details -> dl/dd 생성 ----------
    // replace the old createDetailsGroup with this one
    function createDetailsGroup(detailsArray) {
        const holder = document.createElement('div');
        holder.className = 'card-details-holder';

        (Array.isArray(detailsArray) ? detailsArray : []).forEach(detail => {
            const dl = document.createElement('dl');

            // dt 생성
            const dt = document.createElement('dt');

            // optional icon background
            if (detail.iconUrl) {
                dt.style.backgroundImage = `url("${detail.iconUrl}")`;
                dt.style.backgroundRepeat = 'no-repeat';
            }

            // dt_texts 첫 항목
            const pTxt = document.createElement('p');
            pTxt.className = 'txt1';
            const firstTxt = Array.isArray(detail.dt_texts) && detail.dt_texts.length ? detail.dt_texts[0] : '';
            pTxt.textContent = firstTxt;
            dt.appendChild(pTxt);

            // dt_i (요약 텍스트)
            if (detail.dt_i) {
                const iEl = document.createElement('i');
                iEl.textContent = detail.dt_i;
                dt.appendChild(iEl);
            }

            // accessibility: make dt focusable and indicate collapsed by default
            dt.tabIndex = 0;
            dt.setAttribute('role', 'button');

            dl.appendChild(dt);

            // dd 생성 (초기 숨김)
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

            if (detail.footerHtml) {
                const pf = document.createElement('p');
                pf.innerHTML = detail.footerHtml; // 신뢰된 HTML만 넣을 것
                inBox.appendChild(pf);
            }

            dd.appendChild(inBox);
            dl.appendChild(dd);

            // 기본 상태: 닫힘
            dl.classList.add('detail-collapsed');
            dl.setAttribute('aria-expanded', 'false');

            // ----- 개별 dt 토글 핸들러 -----
            function openDl() {
                dl.classList.add('on');
                dl.classList.remove('detail-collapsed');
                dl.setAttribute('aria-expanded', 'true');
            }
            function closeDl() {
                dl.classList.remove('on');
                dl.classList.add('detail-collapsed');
                dl.setAttribute('aria-expanded', 'false');
            }
            function toggleDl() {
                if (dl.classList.contains('on')) closeDl();
                else openDl();
            }

            // 클릭으로 토글
            dt.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDl();
            });

            // 키보드 접근성: Enter / Space로 토글
            dt.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    dt.click();
                }
            });

            // holder에 추가
            holder.appendChild(dl);
        });

        return holder;
    }


    // 토글 함수: dl group 내부의 dl들에 .on 클래스를 토글
    // removeOnClose 옵션을 true로 넘기면 "닫힐 때 holder를 DOM에서 제거"합니다.
    function toggleDetails(holder, { removeOnClose = false } = {}) {
        if (!holder) return false;
        const dls = holder.querySelectorAll('dl');
        const anyOn = Array.from(dls).some(dl => dl.classList.contains('on'));

        if (anyOn) {
            // 현재 열려있음 -> 닫기
            dls.forEach(dl => {
                dl.classList.remove('on');
                dl.classList.add('detail-collapsed');
            });

            if (removeOnClose) {
                // 부모에서 제거 (메모리/참조 정리)
                if (holder.parentNode) holder.parentNode.removeChild(holder);
            }
            return false; // 닫혔음을 반환
        } else {
            // 현재 닫혀있음 -> 열기
            dls.forEach(dl => {
                dl.classList.add('on');
                dl.classList.remove('detail-collapsed');
            });
            return true; // 열렸음을 반환
        }
    }

    function createCardNode(card) {
        const container = document.createElement('div');
        container.className = 'card-container';

        // --- content-row: 기존의 가로 레이아웃(이미지 + 데이터)을 이 안에 둠 ---
        const contentRow = document.createElement('div');
        contentRow.className = 'content-row';

        const benefitItems = (card.benefits && card.benefits.length ? card.benefits.slice(0, 3) : []);
        const benefitsHtml = benefitItems.map(b => {
            const parts = String(b).trim().split(/\s+/);
            const label = parts.shift() || '혜택';
            const value = parts.join(' ') || '';
            return `<div class="benefit-item">
                <div class="benefit-label">${label}</div>
                <div class="benefit-value">${value}</div>
            </div>`;
        }).join('') || `<div class="benefit-item"><div class="benefit-label">혜택</div><div class="benefit-value">정보 없음</div></div>`;

        const promoText = card.promo || '';
        const performance = card.performance || '';
        const desc1 = card.desc1 || '';
        const desc2 = card.desc2 || '';
        const teamId = card.team_id || 0;

        const imgWrap = document.createElement('div');
        imgWrap.className = 'card_img';
        const imgEl = document.createElement('img');
        imgEl.alt = (card.name || '카드');
        imgEl.setAttribute('loading', 'lazy');

        const resolved = resolveImageSrc(card);
        let triedJpg = false;
        imgEl.src = resolved.initial;

        imgEl.addEventListener('error', function onImgError() {
            if (resolved.fallbackToJpg && !triedJpg && resolved.jpgSrc) {
                triedJpg = true;
                imgEl.src = resolved.jpgSrc;
                return;
            }
            if (imgEl.src !== resolved.placeholder) {
                imgEl.src = resolved.placeholder;
            } else {
                imgEl.removeEventListener('error', onImgError);
            }
        });

        imgWrap.appendChild(imgEl);

        const dataWrap = document.createElement('div');
        dataWrap.className = 'card_data';

        dataWrap.innerHTML = `
        <div class="title-row">
            <div class="card_tit">
                <span class="card_name">${card.name || ''}</span>
                <span class="card_corp">${card.corp || ''}</span>
            </div>
            <a class="b_view" href="javascript:void(0);">자세히 보기</a>
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

        // contentRow에 이미지 + 데이터 배치 (가로)
        contentRow.appendChild(imgWrap);
        contentRow.appendChild(dataWrap);

        // container은 세로로 쌓이게 하고, contentRow는 가로 배치 역할
        container.appendChild(contentRow);

        // --- 상세보기 핸들러 추가 ---
        const viewLink = dataWrap.querySelector('.b_view');
        let detailsHolder = null; // 생성된 상세 DOM 저장

        viewLink.addEventListener('click', (ev) => {
            ev.preventDefault();

            // 1) detailsHolder가 없으면 생성만 하고 (기본 닫힌 상태 유지), DOM에 추가
            if (!detailsHolder) {
                detailsHolder = createDetailsGroup(card.details || []);
                // 투톤 강조(왼쪽 바) — 카드사 컬러 적용
                try {
                    const corpColor = colorForCorp(card.corp || card.company || '');
                    detailsHolder.style.borderLeft = `6px solid ${corpColor}`;
                } catch (e) { /* ignore */ }

                detailsHolder.classList.add('two-tone-details');
                detailsHolder.tabIndex = 0;

                container.appendChild(detailsHolder);

                // <-- 여기서 toggleDetails 호출하지 않습니다.
                // 생성 후 기본 상태는 '닫힘' (detail-collapsed) 이므로
                // 사용자가 각 dt를 클릭해서 해당 dd를 열 수 있습니다.
                return;
            }

            // 2) detailsHolder가 이미 있으면 (두번째 클릭) : 그냥 제거
            if (detailsHolder && detailsHolder.parentNode) {
                detailsHolder.parentNode.removeChild(detailsHolder);
            }
            detailsHolder = null;
        });


        return container;
    }

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

        article.addEventListener('click', () => {
            showCardsForIssuer(issuerKey);
            try {
                history.pushState({ issuer: issuerKey }, `${displayName}`, `?issuer=${encodeURIComponent(issuerKey)}`);
            } catch (e) { /* ignore */ }
        });

        return article;
    }

    function renderIssuers(issuerMap) {
        issuerGrid.innerHTML = '';
        Object.entries(issuerMap).forEach(([key, info]) => {
            const node = createIssuerNode(key, info.displayName, info.cards.length, info.corpSample);
            issuerGrid.appendChild(node);
        });

        issuerGrid.style.display = '';
        cardGrid.style.display = 'none';
        backBtn.style.display = 'none';
        document.querySelectorAll('.issuer-item.selected').forEach(el => el.classList.remove('selected'));
    }

    function setSelectedIssuerKey(key) {
        document.querySelectorAll('.issuer-item').forEach(el => {
            if (el.dataset.issuer === key) el.classList.add('selected');
            else el.classList.remove('selected');
        });
    }

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

        issuerGrid.style.display = '';
        cardGrid.style.display = '';
        backBtn.style.display = '';
        setSelectedIssuerKey(issuerKey);
    }
    // ---------------------- 카테고리 필터링 기능 (추가) ----------------------
    function normalizeCategoryKey(s) {
        return String(s || '').replace(/\s|\/|·|_/g, '').toLowerCase();
    }

    // 선택된 발급사(issuer) 키 반환 (없으면 null)
    function getSelectedIssuerKey() {
        const sel = document.querySelector('.issuer-item.selected');
        return sel ? sel.dataset.issuer : null;
    }

    // 카테고리(칩)으로 카드들을 필터링해서 화면에 표시
    // 카테고리(칩)으로 카드들을 필터링해서 화면에 표시
    function showFilteredCards(categoryText) {
        const cat = String(categoryText || '').trim();
        const catNorm = normalizeCategoryKey(cat);

        // source: 현재 선택된 발급사 내에서 필터할지, 전체에서 필터할지
        const selectedIssuer = getSelectedIssuerKey();
        const sourceCards = selectedIssuer && issuerMap[selectedIssuer]
            ? issuerMap[selectedIssuer].cards
            : (Array.isArray(allCards) ? allCards : []);

        let filtered;
        if (!cat || cat === '모든가맹점' || catNorm === '') {
            filtered = sourceCards.slice(); // 전체
        } else {
            filtered = sourceCards.filter(card => {
                if (!Array.isArray(card.details)) return false;
                return card.details.some(detail => {
                    if (!Array.isArray(detail.dt_texts)) return false;
                    return detail.dt_texts.some(dt => {
                        const dtNorm = normalizeCategoryKey(dt);
                        // 부분 일치 허용 (예: "마트/편의점" 같이 복합표현 처리)
                        return dtNorm && catNorm && (dtNorm.includes(catNorm) || catNorm.includes(dtNorm));
                    });
                });
            });
        }

        cardGrid.innerHTML = '';
        if (!filtered.length) {
            cardGrid.innerHTML = `<div style="padding:18px;color:#666">해당 조건에 맞는 카드가 없습니다.</div>`;
        } else {
            filtered.forEach(card => cardGrid.appendChild(createCardNode(card)));
        }

        // UI 상태: (발급사 목록을 항상 보이게 하고 싶다면 아래 라인은 제거 또는 주석 처리)
        // issuerGrid.style.display = 'none';  <-- 이 줄을 제거했습니다.
        cardGrid.style.display = '';
        backBtn.style.display = '';
    }


    // 칩 버튼 상태(선택 강조) 관리
    function setActiveChip(chipEl) {
        document.querySelectorAll('.chip-row .chip').forEach(c => c.classList.remove('chip-active'));
        if (chipEl) chipEl.classList.add('chip-active');
    }

    // 칩들에 클릭 이벤트 연결 (문서에 칩이 있는 시점에 호출)
    function setupChipHandlers() {
        const chips = document.querySelectorAll('.chip-row .chip');
        if (!chips || !chips.length) return;

        chips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const cat = chip.textContent.trim();
                setActiveChip(chip);
                showFilteredCards(cat);
            });
        });
    }
    // ---------------------- /카테고리 필터링 기능 ----------------------

    backBtn.addEventListener('click', () => {
        try {
            history.back();
        } catch (e) {
            cardGrid.innerHTML = '';
            cardGrid.style.display = 'none';
            backBtn.style.display = 'none';
            document.querySelectorAll('.issuer-item.selected').forEach(el => el.classList.remove('selected'));
        }
    });

    window.addEventListener('popstate', (ev) => {
        const state = ev.state;
        if (state && state.issuer) {
            showCardsForIssuer(state.issuer);
        } else {
            cardGrid.innerHTML = '';
            cardGrid.style.display = 'none';
            backBtn.style.display = 'none';
            renderIssuers(issuerMap);
        }
    });

    // 로드 및 초기 렌더링
    try {
        const res = await fetch(JSON_PATH, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.cards || []);
        allCards = items;           // loaded items 전역 저장
        setupChipHandlers();        // 칩 클릭 리스너 연결

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

        const params = new URLSearchParams(location.search);
        const qIssuer = params.get('issuer');
        if (qIssuer && issuerMap[qIssuer]) {
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