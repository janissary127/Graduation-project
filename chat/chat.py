# file: card_recommender.py
import json
import re
import math
from typing import List, Dict, Tuple
from collections import Counter


def load_cards(path: str):
    """JSON 파일에서 카드 데이터 로드"""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# 전역 TF-IDF 캐시
_tfidf_cache = None


# 카테고리별 키워드 매핑 (동의어 포함)
KEYWORD_CATEGORIES = {
    "카페": {
        "keywords": ["스타벅스", "투썸", "커피빈", "할리스", "카페", "커피", "이디야", "폴바셋",
                     "탐앤탐스", "엔제리너스", "파스쿠찌", "빽다방", "메가커피", "컴포즈"],
        "weight": 1.0
    },
    "외식_배달": {
        "keywords": ["맥도날드", "버거킹", "롯데리아", "KFC", "피자", "치킨", "배달의민족", "요기요",
                     "쿠팡이츠", "식당", "외식", "배달", "배민", "음식점", "레스토랑", "먹거리"],
        "weight": 1.0
    },
    "영화_문화": {
        "keywords": ["영화", "CGV", "롯데시네마", "메가박스", "영화관", "시네마", "문화생활"],
        "weight": 1.0
    },
    "OTT_구독": {
        "keywords": ["넷플릭스", "유튜브", "왓챠", "디즈니+", "멜론", "티빙", "웨이브",
                     "OTT", "구독", "스트리밍", "유튜브프리미엄", "스포티파이"],
        "weight": 1.0
    },
    "교통": {
        "keywords": ["대중교통", "버스", "지하철", "택시", "고속버스", "기차", "KTX", "톨비",
                     "하이패스", "교통카드", "전철", "시내버스", "시외버스"],
        "weight": 1.0
    },
    "자동차": {
        "keywords": ["주유", "주차", "자동차", "주유소", "SK에너지", "GS칼텍스", "S-OIL", "현대오일뱅크",
                     "세차", "정비", "주유비"],
        "weight": 1.0
    },
    "통신": {
        "keywords": ["SKT", "KT", "LG U+", "LGU+", "알뜰폰", "통신", "휴대폰", "요금", "인터넷",
                     "통신비", "핸드폰", "전화", "데이터"],
        "weight": 1.0
    },
    "쇼핑_마트": {
        "keywords": ["이마트", "홈플러스", "롯데마트", "코스트코", "쿠팡", "11번가", "G마켓", "옥션",
                     "티몬", "위메프", "올리브영", "백화점", "편의점", "GS25", "CU", "세븐일레븐",
                     "쇼핑", "마트", "대형마트", "온라인쇼핑", "이커머스"],
        "weight": 1.0
    },
    "여행_항공": {
        "keywords": ["항공", "여행", "호텔", "해외", "면세점", "마일리지", "라운지", "공항",
                     "대한항공", "아시아나", "비행기", "해외여행", "국내여행"],
        "weight": 1.0
    },
    "금융_공과금": {
        "keywords": ["보험", "아파트", "관리비", "세금", "공과금", "대학등록금", "납부", "이체"],
        "weight": 1.0
    },
    "의료_건강": {
        "keywords": ["병원", "의료", "약국", "헬스", "피트니스", "운동", "건강", "요가", "필라테스"],
        "weight": 1.0
    },
    "교육_육아": {
        "keywords": ["교육", "도서", "학원", "책", "서점", "교보문고", "yes24", "키즈", "유아", "육아"],
        "weight": 1.0
    },
    "여가_레저": {
        "keywords": ["골프", "렌터카", "놀이공원", "테마파크", "롯데월드", "에버랜드", "레저"],
        "weight": 1.0
    }
}


def extract_intensity(user_input: str) -> float:
    """사용자 입력에서 빈도/강도 표현 추출하여 가중치 반환"""
    high_intensity = ["자주", "많이", "매일", "항상", "주로", "엄청", "완전", "계속", "평소에"]
    medium_intensity = ["가끔", "종종", "때때로", "이따금"]
    low_intensity = ["가끔씩", "별로", "거의 안", "잘 안"]

    if any(word in user_input for word in high_intensity):
        return 1.5
    elif any(word in user_input for word in medium_intensity):
        return 1.0
    elif any(word in user_input for word in low_intensity):
        return 0.5
    return 1.0


def extract_negations(user_input: str) -> List[str]:
    """부정 표현이 포함된 키워드 추출"""
    negation_patterns = [
        r"(\w+)\s*(안|않|없|싫|아니)",  # "카페 안가요", "영화 싫어요"
        r"(안|않|없|싫|아니)\s*(\w+)",  # "안써요 쇼핑", "싫어요 골프"
    ]

    negated = []
    for pattern in negation_patterns:
        matches = re.findall(pattern, user_input)
        for match in matches:
            negated.extend([word for word in match if word not in ["안", "않", "없", "싫", "아니"]])

    return negated


def extract_amount(user_input: str) -> Dict[str, int]:
    """금액/숫자 추출 (연회비, 전월실적 등)"""
    amounts = {}

    # 연회비 패턴
    if "연회비" in user_input:
        match = re.search(r'(\d+)\s*만?원?', user_input)
        if match:
            amounts["annual_fee"] = int(match.group(1))

    # 전월실적 패턴
    if "실적" in user_input or "전월" in user_input:
        match = re.search(r'(\d+)\s*만?원?', user_input)
        if match:
            amounts["performance"] = int(match.group(1))

    return amounts


def extract_keywords(user_input: str) -> Tuple[List[str], Dict]:
    """사용자 입력에서 관심 키워드 및 문맥 정보 추출 (자유로운 방식)"""
    context = {
        "intensity": extract_intensity(user_input),
        "negations": extract_negations(user_input),
        "amounts": extract_amount(user_input),
        "matched_categories": []  # 참고용으로만 사용
    }

    # 1. 사용자 입력을 토큰화 (모든 단어 추출)
    all_tokens = tokenize(user_input)

    # 2. 부정 표현이 포함된 단어 제외
    found_keywords = [token for token in all_tokens if token not in context["negations"]]

    # 3. 참고: 어떤 카테고리에 속하는지 확인 (보너스 점수용)
    for category, data in KEYWORD_CATEGORIES.items():
        for keyword in data["keywords"]:
            if keyword in user_input and keyword not in context["negations"]:
                if category not in context["matched_categories"]:
                    context["matched_categories"].append(category)
                # 카테고리 키워드도 found_keywords에 추가 (중복 제거는 나중에)
                if keyword not in found_keywords:
                    found_keywords.append(keyword)

    # 4. 중복 제거
    found_keywords = list(set(found_keywords))

    return found_keywords, context


def card_text(card: dict):
    """카드 객체의 모든 텍스트 합치기"""
    text = " ".join(card.get("benefits", []))
    for d in card.get("details", []):
        text += " " + " ".join(d.get("dt_texts", []))
        text += " " + d.get("dt_i", "")
        text += " " + " ".join(d.get("dd_paragraphs", []))
    return text


def tokenize(text: str) -> List[str]:
    """텍스트를 토큰으로 분리 (한글 2글자 이상, 영문 3글자 이상)"""
    # 한글/영문/숫자만 추출
    tokens = re.findall(r'[가-힣]{2,}|[a-zA-Z]{3,}', text)
    return tokens


def build_tfidf_index(cards: List[dict]) -> Dict:
    """전체 카드 데이터에서 TF-IDF 인덱스 구축"""
    global _tfidf_cache

    # 캐시가 있으면 재사용
    if _tfidf_cache is not None:
        return _tfidf_cache

    print("[TF-IDF] 인덱스 구축 중...")

    # 1. 각 카드(문서)의 토큰 추출
    card_tokens = []
    for card in cards:
        text = card_text(card)
        tokens = tokenize(text)
        card_tokens.append(tokens)

    # 2. 문서 빈도(DF) 계산: 각 단어가 몇 개의 문서에 등장하는지
    df = Counter()
    for tokens in card_tokens:
        unique_tokens = set(tokens)  # 문서당 1번만 카운트
        df.update(unique_tokens)

    # 3. IDF 계산: log(전체 문서 수 / 단어가 등장하는 문서 수)
    num_docs = len(cards)
    idf = {}
    for word, doc_freq in df.items():
        idf[word] = math.log((num_docs + 1) / (doc_freq + 1)) + 1  # smoothing

    # 4. 각 카드별 TF-IDF 벡터 계산
    tfidf_vectors = []
    for tokens in card_tokens:
        tf = Counter(tokens)  # 단어 빈도
        tfidf_vector = {}
        for word, freq in tf.items():
            tfidf_vector[word] = freq * idf.get(word, 0)
        tfidf_vectors.append(tfidf_vector)

    _tfidf_cache = {
        "idf": idf,
        "vectors": tfidf_vectors,
        "card_tokens": card_tokens
    }

    print(f"[TF-IDF] 인덱스 구축 완료 (총 {len(idf)}개 단어)")
    return _tfidf_cache


def calculate_tfidf_score(card_idx: int, keywords: List[str], tfidf_data: Dict) -> float:
    """특정 카드와 키워드 간의 TF-IDF 유사도 계산"""
    if card_idx >= len(tfidf_data["vectors"]):
        return 0.0

    card_vector = tfidf_data["vectors"][card_idx]
    idf = tfidf_data["idf"]

    # 키워드의 TF-IDF 가중치 합산
    score = 0.0
    for keyword in keywords:
        # 키워드를 토큰화
        kw_tokens = tokenize(keyword)
        for token in kw_tokens:
            if token in card_vector:
                score += card_vector[token]
            # 부분 매칭도 고려 (예: "스타벅스"가 "스타벅스할인"에 포함)
            for card_token in card_vector:
                if token in card_token or card_token in token:
                    score += card_vector[card_token] * 0.5  # 부분 매칭은 50%

    return score


def extract_card_performance(performance_text: str) -> int:
    """카드의 전월실적 금액 추출 (만원 단위)"""
    if not performance_text or "없음" in performance_text:
        return 0
    match = re.search(r'(\d+)만원', performance_text)
    if match:
        return int(match.group(1))
    return 0


def match_score(card: dict, card_idx: int, keywords: List[str], context: Dict, tfidf_data: Dict = None) -> float:
    """키워드 매칭 점수 계산 (문맥 + TF-IDF 반영)"""
    text = card_text(card)
    benefits = " ".join(card.get("benefits", []))

    # 1. 기본 키워드 매칭 점수
    base_score = 0
    for kw in keywords:
        # benefits에서 매칭 (가중치 3배)
        base_score += benefits.count(kw) * 3
        # 전체 텍스트에서 매칭
        base_score += text.count(kw)

    # 2. TF-IDF 점수 추가 (가중치 0.3)
    tfidf_score = 0
    if tfidf_data:
        tfidf_score = calculate_tfidf_score(card_idx, keywords, tfidf_data) * 0.3

    # 3. 기본 점수와 TF-IDF 점수 결합
    score = base_score + tfidf_score

    # 4. 빈도/강도 가중치 적용
    intensity_weight = context.get("intensity", 1.0)
    score = score * intensity_weight

    # 5. 카테고리 보너스 (같은 카테고리 키워드가 여러 개 매칭되면 추가 점수)
    category_bonus = len(context.get("matched_categories", [])) * 2
    score += category_bonus

    # 6. 연회비/전월실적 조건 필터링
    amounts = context.get("amounts", {})

    # 연회비 조건이 있으면 필터링 (예: "1만원" → 1만원 이하만)
    if "annual_fee" in amounts:
        # 카드 데이터에 연회비 정보가 있다면 필터링
        # (현재는 정보가 없어서 스킵)
        pass

    # 전월실적 조건이 있으면 필터링
    if "performance" in amounts:
        required_perf = amounts["performance"]
        card_perf = extract_card_performance(card.get("performance", ""))

        # 사용자가 원하는 실적보다 높으면 감점
        if card_perf > required_perf:
            score *= 0.5  # 50% 감점
        elif card_perf == 0:  # 실적 없음이면 보너스
            score *= 1.2

    return score


def recommend(cards, user_input, use_tfidf=True):
    """사용자 입력 기반 카드 추천 (개선된 문맥 파악 + TF-IDF)"""
    # 입력 최소 길이 체크
    if len(user_input.strip()) < 2:
        print("❗ 너무 짧은 입력입니다. 조금 더 구체적으로 입력해 주세요.")
        return []

    keywords, context = extract_keywords(user_input)

    if not keywords:
        print("❗ 의미 있는 키워드를 찾지 못했습니다. 예: '스타벅스 자주 가요', '영화 많이 봐요'")
        return []

    # TF-IDF 인덱스 구축 (캐시 사용)
    tfidf_data = None
    if use_tfidf:
        tfidf_data = build_tfidf_index(cards)

    # 디버그 정보 출력
    print(f"\n[분석] 감지된 키워드 ({len(keywords)}개): {keywords[:10] if len(keywords) > 10 else keywords}")
    if context['matched_categories']:
        print(f"[분석] 매칭된 카테고리: {context['matched_categories']}")
    print(f"[분석] 강도 가중치: {context['intensity']}")
    if context['negations']:
        print(f"[분석] 제외 키워드: {context['negations']}")
    if context['amounts']:
        print(f"[분석] 조건: {context['amounts']}")
    print(f"[분석] TF-IDF 사용: {use_tfidf}")

    scored = []
    for idx, card in enumerate(cards):
        s = match_score(card, idx, keywords, context, tfidf_data)
        scored.append((s, card))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_cards = [c for s, c in scored if s > 0][:9]
    return top_cards


def print_card(card):
    """카드 정보 요약 출력"""
    print(f"💳 {card['name']} ({card['corp']})")
    print(f" - 주요 혜택: {', '.join(card.get('benefits', [])[:3])}")
    print(f" - 전월 실적 조건: {card.get('performance', '정보 없음')}")
    if card.get('promo'):
        print(f" - 프로모션: {card['promo']}")
    print("-" * 60)


def main():
    cards = load_cards("card_list.json")
    print("=== 💡 카드 추천 챗봇 ===")
    print("원하시는 소비 패턴을 입력해보세요.")
    print("예: '스타벅스 자주 가고 영화도 많이 봐요. 대중교통 이용해요.'")

    while True:
        user_input = input("\n🗣️  사용자: ").strip()
        if user_input.lower() in ["exit", "quit", "종료"]:
            print("👋 챗봇을 종료합니다.")
            break

        recommendations = recommend(cards, user_input)
        if not recommendations:
            print("😅 추천할 카드를 찾지 못했어요.")
            continue

        print("\n✨ 추천 카드 TOP 9 ✨\n")
        for card in recommendations:
            print_card(card)


if __name__ == "__main__":
    main()
