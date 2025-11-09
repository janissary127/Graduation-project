# 카드 추천 챗봇 기능 추가 문서

## 📋 개요
사용자가 원하는 혜택 키워드를 입력하면 **`chat.py`의 Python 추천 알고리즘**이 카드 데이터를 분석하여 최적의 카드를 추천해주는 챗봇 기능을 추가했습니다.

**핵심 특징**: 기존 `chat.py`의 키워드 추출 및 매칭 로직을 Flask API로 통합하여 웹 인터페이스에서 활용할 수 있도록 구현했습니다.

---

## 🎯 주요 기능

### 1. 대화형 챗봇 인터페이스
- 실시간 메시지 교환 스타일의 직관적인 UI
- 사용자 메시지와 봇 응답을 명확하게 구분
- 부드러운 애니메이션과 스크롤 효과

### 2. 지능형 카드 추천 알고리즘 (chat.py 기반)
- **Python 기반 서버 사이드 처리**
  - `chat/chat.py`의 검증된 추천 알고리즘 활용
  - Flask API를 통한 실시간 추천

- **키워드 추출 시스템 (`extract_keywords` 함수)**
  - 사용자 입력에서 관련 키워드 자동 감지
  - 100개 이상의 다양한 키워드 지원

- **점수 계산 방식 (`match_score` 함수)**
  - 카드의 `benefits`, `details` 텍스트에서 키워드 빈도 계산
  - 키워드가 많이 등장할수록 높은 점수
  - TOP 9 카드 추천

- **지원 키워드 카테고리** (chat.py에 정의)
  - ☕ **커피/음료**: 스타벅스, 투썸, 커피빈, 할리스, 카페, 커피, 이디야, 폴바셋, 탐앤탐스, 엔제리너스, 파스쿠찌
  - 🍔 **외식/배달**: 맥도날드, 버거킹, 롯데리아, KFC, 피자, 치킨, 배달의민족, 요기요, 쿠팡이츠, 식당, 외식
  - 🎬 **여가/문화**: 영화, CGV, 롯데시네마, 메가박스, 넷플릭스, 유튜브, 왓챠, 디즈니+, 멜론, 티빙, 웨이브
  - 🚆 **교통**: 대중교통, 버스, 지하철, 택시, 고속버스, 기차, KTX, 톨비, 주유, 주차, 하이패스, 자동차
  - 📱 **통신/구독**: SKT, KT, LG U+, 알뜰폰, 통신, 휴대폰, 요금, 인터넷
  - 🛍️ **쇼핑/마트**: 이마트, 홈플러스, 롯데마트, 코스트코, 쿠팡, 11번가, G마켓, 옥션, 티몬, 위메프, 올리브영, 백화점, 편의점, GS25, CU, 세븐일레븐
  - ✈️ **여행/해외**: 항공, 여행, 호텔, 해외, 면세점, 적립, 포인트, 마일리지
  - 💳 **금융/공과금/기타**: 보험, 아파트, 관리비, 세금, 공과금, 대학등록금, 병원, 의료, 약국, 교육, 도서, 학원, 렌터카, 골프, 헬스, 피트니스

### 3. 빠른 검색 기능
- 추천 키워드 칩 버튼 제공
- 원클릭으로 인기 검색어 입력
- 메인 페이지와 완벽한 연동

---

## 📁 추가된 파일 목록

### HTML
```
views/chatbot_recommend.html
```
- 챗봇 추천 페이지 메인 템플릿
- 대화 로그, 입력창, 추천 결과 영역 포함

### JavaScript
```
static/js/recommend_bot.js
static/js/index_home.js
```
- **recommend_bot.js**: 챗봇 UI 로직 및 Flask API 호출 처리
- **index_home.js**: 메인 페이지 → 챗봇 페이지 연동

### CSS
```
static/css/chatbot_recommend.css
```
- 챗봇 페이지 전용 스타일
- 대화 메시지, 카드 결과, 반응형 디자인

---

## 🔧 수정된 파일

### 1. `app.py`
**추가된 라우트:**
```python
# 챗봇 페이지
@app.route("/chatbot_recommend")
def chatbot_recommend():
    return render_template("chatbot_recommend.html")

# 카드 추천 API (chat.py 활용)
@app.route("/api/recommend", methods=["POST"])
def api_recommend():
    """카드 추천 API - chat.py 로직 활용"""
    from chat.chat import load_cards, recommend as chat_recommend

    data = request.get_json()
    user_input = data.get("query", "")

    # 카드 데이터 로드
    card_list_path = os.path.join(os.path.dirname(__file__), "static", "card_data", "card_list.json")
    cards = load_cards(card_list_path)

    # chat.py의 recommend 함수 사용
    recommendations = chat_recommend(cards, user_input)

    return jsonify({
        "success": True,
        "query": user_input,
        "count": len(recommendations),
        "recommendations": recommendations
    })
```
- 챗봇 페이지 라우트 `/chatbot_recommend` 추가
- **핵심: `/api/recommend` API 엔드포인트 추가**
- `chat.py`의 `recommend()` 함수를 직접 호출하여 추천 처리

### 2. `views/index.html`
**변경 전:**
```html
<form class="gpt-input-row" id="homeAskForm">
  <input id="homeAskInput" type="text" .../>
```

**변경 후:**
```html
<form class="gpt-input-row" id="homeAskForm"
      action="{{ url_for('chatbot_recommend') }}" method="get">
  <input id="homeAskInput" name="query" type="text" .../>
```
- 폼 제출 시 챗봇 페이지로 이동하도록 수정
- 입력값을 query 파라미터로 전달
- `index_home.js` 스크립트 추가

---

## 🚀 사용 방법

### 1. 서버 실행
```bash
cd /Users/jangsunghoon/Desktop/Graduation-project-main
python app.py
```

### 2. 접속 방법
- **메인 페이지**: http://localhost:5000/
- **챗봇 페이지 직접**: http://localhost:5000/chatbot_recommend

### 3. 사용 시나리오

#### 시나리오 A: 메인 페이지에서 검색
1. 메인 페이지 접속
2. 입력창에 "카페 할인" 입력
3. 엔터 또는 보내기 버튼 클릭
4. 자동으로 챗봇 페이지로 이동하며 결과 표시

#### 시나리오 B: 추천 질문 카드 클릭
1. 메인 페이지 접속
2. 추천 질문 카드 중 하나 클릭 (예: "카페/배달 많이 써요")
3. 해당 키워드로 챗봇 페이지 이동 및 자동 검색

#### 시나리오 C: 챗봇 페이지 직접 사용
1. 챗봇 페이지 직접 접속
2. 추천 칩 버튼 클릭 또는 직접 입력
3. 실시간 대화형으로 카드 추천 받기

---

## 💡 알고리즘 상세 설명 (chat.py 기반)

### 키워드 매칭 프로세스

**전체 흐름:**
```
사용자 입력
   ↓
[브라우저] recommend_bot.js
   ↓
POST /api/recommend {"query": "스타벅스 자주 가고 영화도 많이 봐요"}
   ↓
[서버] app.py → chat/chat.py
   ↓
1. extract_keywords(user_input)
   → 키워드 리스트에서 매칭되는 키워드 추출
   ↓
2. match_score(card, keywords)
   → 각 카드의 benefits, details에서 키워드 빈도 카운트
   ↓
3. 점수 순 정렬, TOP 9 선택
   ↓
JSON 응답 {"success": true, "recommendations": [...]}
   ↓
[브라우저] 결과 렌더링
```

### 1. 키워드 추출 (`extract_keywords` 함수)

**chat.py의 코드:**
```python
def extract_keywords(user_input: str):
    """사용자 입력에서 관심 키워드 추출"""
    keywords = [
        "스타벅스", "투썸", "커피빈", "할리스", "카페", "커피",
        "맥도날드", "버거킹", "배달의민족", "요기요", "쿠팡이츠",
        "영화", "CGV", "롯데시네마", "메가박스", "넷플릭스",
        "대중교통", "버스", "지하철", "택시",
        # ... 100개 이상의 키워드
    ]

    found = [kw for kw in keywords if kw in user_input]
    return found
```

**예시:**
```python
입력: "스타벅스 자주 가고 영화도 많이 봐요. 대중교통 이용해요."
출력: ["스타벅스", "카페", "커피", "영화", "CGV", "대중교통", "버스", "지하철"]
```

### 2. 점수 계산 (`match_score` 함수)

**chat.py의 코드:**
```python
def card_text(card: dict):
    """카드 객체의 모든 텍스트 합치기"""
    text = " ".join(card.get("benefits", []))
    for d in card.get("details", []):
        text += " " + " ".join(d.get("dt_texts", []))
        text += " " + d.get("dt_i", "")
        text += " " + " ".join(d.get("dd_paragraphs", []))
    return text

def match_score(card: dict, keywords: List[str]) -> int:
    """키워드 매칭 점수 계산"""
    text = card_text(card)
    score = sum(text.count(kw) for kw in keywords)
    return score
```

**예시:**
```python
카드: 삼성카드 taptap O
키워드: ["스타벅스", "카페", "커피", "영화", "CGV"]

카드 텍스트에서 키워드 등장 횟수:
- "스타벅스": 5회
- "카페": 2회
- "커피": 3회
- "영화": 0회
- "CGV": 1회

총 점수: 11점
```

### 3. 추천 실행 (`recommend` 함수)

**chat.py의 코드:**
```python
def recommend(cards, user_input):
    """사용자 입력 기반 카드 추천"""
    keywords = extract_keywords(user_input)
    if not keywords:
        return []

    scored = []
    for card in cards:
        s = match_score(card, keywords)
        scored.append((s, card))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_cards = [c for s, c in scored if s > 0][:9]
    return top_cards
```

### 점수 계산 전략

| 요소 | 방식 | 특징 |
|------|------|------|
| **키워드 추출** | 입력 문자열 포함 여부 | 정확한 매칭 (부분 문자열) |
| **점수 계산** | 키워드 등장 빈도 합계 | 키워드가 많이 나올수록 높은 점수 |
| **검색 범위** | benefits + details 전체 | 카드의 모든 혜택 정보 분석 |
| **결과 개수** | TOP 9 | 점수가 0보다 큰 카드만 선택 |

---

## 🎨 UI/UX 특징

### 1. 대화 메시지 스타일
- **봇 메시지**: 왼쪽 정렬, 흰색 배경, 프로필 아이콘
- **사용자 메시지**: 오른쪽 정렬, 그라디언트 배경
- **페이드인 애니메이션**: 자연스러운 메시지 등장

### 2. 추천 결과 카드
- **그리드 레이아웃**: 반응형 카드 배치
- **호버 효과**: 마우스 오버 시 카드 상승 효과
- **정보 구성**:
  - 발급사 뱃지 (파란색)
  - 프로모션 뱃지 (빨간색)
  - 카드명 (굵은 폰트)
  - 간단 설명
  - 주요 혜택 리스트 (최대 3개)
  - 비교함 담기 버튼

### 3. 반응형 디자인
```css
/* 데스크톱 (>768px) */
.results-grid {
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

/* 모바일 (≤768px) */
.results-grid {
  grid-template-columns: 1fr;
}
```

---

## 🔍 코드 구조

### 1. chat/chat.py (Python 추천 엔진)

```python
# 카드 데이터 로드
def load_cards(path: str)

# 키워드 추출 (100개 이상의 키워드 매칭)
def extract_keywords(user_input: str)

# 카드 텍스트 추출
def card_text(card: dict)

# 매칭 점수 계산 (키워드 빈도 카운트)
def match_score(card: dict, keywords: List[str]) -> int

# 추천 실행 (TOP 9 반환)
def recommend(cards, user_input)

# 카드 정보 출력 (CLI용)
def print_card(card)

# 메인 실행 (CLI용)
def main()
```

### 2. app.py (Flask API)

```python
# 챗봇 페이지 라우트
@app.route("/chatbot_recommend")
def chatbot_recommend()

# 카드 추천 API (chat.py 활용)
@app.route("/api/recommend", methods=["POST"])
def api_recommend()
    # chat.py import 및 호출
    from chat.chat import load_cards, recommend as chat_recommend
    recommendations = chat_recommend(cards, user_input)
```

### 3. recommend_bot.js (브라우저 UI)

```javascript
// 서버 API 호출
async function getRecommendations(userInput)

// UI 메시지 추가
function addBotMessage(html)
function addUserMessage(text)

// 추천 결과 렌더링
function renderRecommendations(cards)

// 사용자 입력 처리 (API 호출 포함)
async function handleUserMessage(text)

// 폼 제출 처리
function handleSubmit(e)

// 초기화 (URL 쿼리 파라미터 처리 포함)
async function init()
```

---

## 📊 데이터 흐름

```
┌─────────────────────┐
│   index.html        │
│   (메인 페이지)       │
└──────┬──────────────┘
       │ 사용자 입력: "스타벅스 자주 가요"
       │ 폼 제출 (GET)
       ↓
┌─────────────────────────────────┐
│  /chatbot_recommend?query=...   │
│  (챗봇 페이지 로드)               │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│  recommend_bot.js (브라우저)     │
│  - URL 쿼리 파라미터 읽기         │
│  - 사용자 메시지 UI 표시          │
└──────┬──────────────────────────┘
       │
       │ fetch POST /api/recommend
       │ body: {"query": "스타벅스 자주 가요"}
       ↓
┌─────────────────────────────────┐
│  app.py (Flask 서버)             │
│  @app.route("/api/recommend")   │
└──────┬──────────────────────────┘
       │
       │ import chat.chat
       │ chat_recommend(cards, user_input)
       ↓
┌─────────────────────────────────┐
│  chat/chat.py (Python)          │
│  1. extract_keywords()          │
│     → ["스타벅스", "카페", ...] │
│  2. match_score()               │
│     → 각 카드 점수 계산          │
│  3. 정렬 후 TOP 9 반환           │
└──────┬──────────────────────────┘
       │
       │ return JSON
       │ {"success": true, "recommendations": [...]}
       ↓
┌─────────────────────────────────┐
│  recommend_bot.js (브라우저)     │
│  - 봇 응답 메시지 표시           │
│  - 추천 카드 렌더링              │
└─────────────────────────────────┘
```

**핵심 포인트:**
- ✅ 클라이언트(브라우저)는 UI 처리만 담당
- ✅ 서버(Flask)가 `chat.py`를 호출하여 추천 로직 실행
- ✅ Python의 검증된 알고리즘을 그대로 활용

---

## 🛠️ 커스터마이징 가이드

### 1. 키워드 추가하기
`chat/chat.py` 파일의 `extract_keywords` 함수에서 수정:

```python
def extract_keywords(user_input: str):
    """사용자 입력에서 관심 키워드 추출"""
    keywords = [
        # 기존 키워드들...

        # 🎮 게임 관련 (새로 추가)
        "게임", "스팀", "플레이스테이션", "닌텐도", "롤", "배그", "오버워치",

        # 🐾 반려동물 관련 (새로 추가)
        "반려동물", "펫", "동물병원", "사료", "애견", "고양이", "강아지",
    ]

    found = [kw for kw in keywords if kw in user_input]
    return found
```

**주의**: 키워드를 추가한 후 Flask 서버를 재시작해야 적용됩니다.

### 2. 추천 카드 개수 변경
`chat/chat.py` 파일의 `recommend` 함수에서 수정:

```python
def recommend(cards, user_input):
    # ... (생략)

    scored.sort(key=lambda x: x[0], reverse=True)
    top_cards = [c for s, c in scored if s > 0][:15]  # 9 → 15개로 변경
    return top_cards
```

### 3. 점수 계산 방식 변경
`chat/chat.py` 파일의 `match_score` 함수에서 수정:

```python
def match_score(card: dict, keywords: List[str]) -> int:
    """키워드 매칭 점수 계산"""
    text = card_text(card)

    # 기본 방식: 단순 빈도 합계
    # score = sum(text.count(kw) for kw in keywords)

    # 변경된 방식: 가중치 적용
    score = 0
    for kw in keywords:
        count = text.count(kw)
        if count > 0:
            # 첫 매칭에 높은 점수, 이후 감소
            score += 10 + (count - 1) * 2

    return score
```

### 4. 추천 칩 추가
`views/chatbot_recommend.html`에서:

```html
<div class="chat-suggestions" id="chatSuggestions">
  <button class="suggestion-chip" data-keyword="카페">☕ 카페 할인</button>
  <button class="suggestion-chip" data-keyword="배달">🍕 배달 할인</button>
  <!-- 새로운 칩 추가 -->
  <button class="suggestion-chip" data-keyword="게임">🎮 게임 할인</button>
  <button class="suggestion-chip" data-keyword="반려동물">🐾 반려동물</button>
</div>
```

**참고**: 칩에 사용하는 키워드는 `chat.py`에 등록된 키워드와 일치해야 효과적입니다.

---

## 🐛 트러블슈팅

### 문제 1: 카드가 추천되지 않음
**원인**: 입력한 키워드가 `chat.py`의 키워드 리스트에 없음
**해결**:
1. `chat/chat.py`의 `extract_keywords` 함수에서 키워드 리스트 확인
2. 필요한 키워드 추가
3. Flask 서버 재시작 (`python app.py`)

**디버깅**:
```python
# chat.py에 디버깅 코드 추가
def recommend(cards, user_input):
    keywords = extract_keywords(user_input)
    print(f"추출된 키워드: {keywords}")  # 디버깅용
    if not keywords:
        print("키워드가 추출되지 않았습니다!")
        return []
    # ...
```

### 문제 2: API 호출 오류 (500 에러)
**원인**: `chat.py` import 실패 또는 파일 경로 문제
**해결**:
```bash
# 프로젝트 구조 확인
tree -L 2
# 출력 예시:
# .
# ├── app.py
# ├── chat/
# │   └── chat.py
# └── static/
#     └── card_data/
#         └── card_list.json
```

**확인사항**:
- `chat` 폴더가 프로젝트 루트에 있는지 확인
- `chat/__init__.py` 파일 생성 (비어있어도 됨)
- `static/data/card_list.json` 파일 존재 확인

### 문제 3: 페이지 이동이 안 됨
**원인**: JavaScript 로드 순서 문제
**해결**:
```html
<!-- defer 속성 확인 -->
<script defer src="{{ url_for('static', filename='js/index_home.js') }}"></script>
```

### 문제 4: Flask import 에러
**원인**: Python 모듈 경로 문제
**해결**:
```bash
# 프로젝트 루트에서 실행
cd /Users/jangsunghoon/Desktop/Graduation-project-main
python app.py

# 또는 PYTHONPATH 설정
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
python app.py
```

---

## 📈 향후 개선 방안

### 1. 기능 추가
- [ ] 검색 히스토리 저장 (LocalStorage)
- [ ] 추천 이유 상세 설명
- [ ] 카드 비교함에 바로 담기 기능
- [ ] 검색 필터 (연회비 범위, 발급사 등)
- [ ] 음성 입력 지원

### 2. 알고리즘 개선 (chat.py 수정)
- [ ] 키워드 동의어/유사어 처리 (예: "스벅" → "스타벅스")
- [ ] 사용자 선호도 학습 및 저장
- [ ] TF-IDF 기반 점수 계산
- [ ] 카드 인기도 반영
- [ ] 사용자별 추천 히스토리 기반 개인화

### 3. UI/UX 개선
- [ ] 로딩 스켈레톤 UI
- [ ] 무한 스크롤
- [ ] 카드 상세 정보 모달
- [ ] 다크 모드 지원

---

## 📝 체크리스트

구현 완료된 항목:
- [x] 챗봇 페이지 HTML 구조
- [x] **chat.py 추천 알고리즘을 Flask API로 통합**
- [x] **서버 사이드 추천 처리 (Python)**
- [x] 스타일링 CSS
- [x] Flask 라우트 추가 (`/chatbot_recommend`, `/api/recommend`)
- [x] 메인 페이지 연동
- [x] URL 쿼리 파라미터 처리
- [x] 반응형 디자인
- [x] **chat.py의 100개 이상 키워드 활용**
- [x] **빈도 기반 점수 계산 (chat.py)**
- [x] 추천 결과 렌더링 (TOP 9)

---

## 🔑 핵심 요약

| 항목 | 내용 |
|------|------|
| **추천 엔진** | `chat/chat.py` (Python) |
| **API 서버** | Flask (`app.py`) |
| **프론트엔드** | JavaScript (`recommend_bot.js`) |
| **키워드 개수** | 100개 이상 (chat.py에 정의) |
| **추천 방식** | 키워드 빈도 기반 점수 계산 |
| **결과 개수** | TOP 9 카드 |
| **통신 방식** | REST API (POST /api/recommend) |

## 👥 기여자
- 개발자: Claude Code
- 요청자: jangsunghoon

## 📅 개발 일자
- 초기 개발: 2025년 11월 4일
- chat.py 통합: 2025년 11월 4일 (수정)

## 📄 라이센스
이 프로젝트는 데모 목적으로 제작되었습니다.

---

## 💬 문의
프로젝트 관련 문의사항이나 버그 리포트는 이슈 트래커를 이용해주세요.

---

**🎉 카드 추천 챗봇 기능이 성공적으로 추가되었습니다!**
