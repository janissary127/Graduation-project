# file: card_recommender.py
import json

from typing import List


def load_cards(path: str):
    """JSON 파일에서 카드 데이터 로드"""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_keywords(user_input: str):
    """사용자 입력에서 관심 키워드 추출 (확장판)"""
    keywords = [
        # ☕ 커피 / 음료
        "스타벅스", "투썸", "커피빈", "할리스", "카페", "커피", "이디야", "폴바셋",
        "탐앤탐스", "엔제리너스", "파스쿠찌",

        # 🍔 외식 / 배달
        "맥도날드", "버거킹", "롯데리아", "KFC", "피자", "치킨", "배달의민족", "요기요", "쿠팡이츠", "식당", "외식",

        # 🎬 여가 / 문화
        "영화", "CGV", "롯데시네마", "메가박스", "넷플릭스", "유튜브", "왓챠", "디즈니+", "멜론", "티빙", "웨이브",

        # 🚆 교통
        "대중교통", "버스", "지하철", "택시", "고속버스", "기차", "KTX", "톨비", "주유", "주차", "하이패스", "자동차",

        # 📱 통신 / 구독
        "SKT", "KT", "LG U+", "알뜰폰", "통신", "휴대폰", "요금", "인터넷", "넷플릭스", "왓챠", "디즈니", "멜론", "유튜브", "스포티파이",

        # 🛍️ 쇼핑 / 마트
        "이마트", "홈플러스", "롯데마트", "코스트코", "쿠팡", "11번가", "G마켓", "옥션", "티몬", "위메프", "올리브영", "백화점", "편의점", "GS25", "CU",
        "세븐일레븐", "쇼핑",

        # ✈️ 여행 / 해외
        "항공", "여행", "호텔", "해외", "면세점", "적립", "포인트", "마일리지",

        # 💳 금융 / 공과금 / 기타
        "보험", "아파트", "관리비", "세금", "공과금", "대학등록금", "병원", "의료", "약국", "교육", "도서", "학원", "렌터카", "골프", "헬스", "피트니스"
    ]

    found = [kw for kw in keywords if kw in user_input]
    return found


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


def recommend(cards, user_input):
    """사용자 입력 기반 카드 추천"""
    keywords = extract_keywords(user_input)
    if not keywords:
        print("❗ 관련 키워드를 찾지 못했습니다. 조금 더 구체적으로 입력해 주세요.")
        return []

    scored = []
    for card in cards:
        s = match_score(card, keywords)
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