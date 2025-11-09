import json
from collections import Counter

# JSON 파일 읽기
with open('static/card_data/card_list.json', 'r', encoding='utf-8') as f:
    cards = json.load(f)

# 모든 dt_texts 수집
all_dt_texts = []
card_dt_texts_map = {}  # 각 카테고리가 어떤 카드에 속하는지 추적

for card in cards:
    card_name = card.get('name', 'Unknown')
    if 'details' in card:
        for detail in card['details']:
            if 'dt_texts' in detail:
                for dt_text in detail['dt_texts']:
                    all_dt_texts.append(dt_text)

                    # 카테고리별로 카드 추적
                    if dt_text not in card_dt_texts_map:
                        card_dt_texts_map[dt_text] = []
                    card_dt_texts_map[dt_text].append(card_name)

# 고유한 dt_texts와 빈도 계산
dt_texts_counter = Counter(all_dt_texts)

print("=" * 80)
print(f"전체 dt_texts 카테고리 분석")
print("=" * 80)
print(f"\n고유한 카테고리 개수: {len(dt_texts_counter)}")
print(f"전체 카테고리 사용 횟수: {len(all_dt_texts)}\n")

# 빈도순으로 정렬
print("카테고리별 출현 빈도:")
print("-" * 80)
for dt_text, count in dt_texts_counter.most_common():
    print(f"{dt_text:20s} : {count:4d}회")

print("\n" + "=" * 80)
print("카테고리별 상세 정보 (샘플 카드 3개까지)")
print("=" * 80)

for dt_text, count in sorted(dt_texts_counter.items()):
    print(f"\n[{dt_text}] - 총 {count}개 카드에서 사용")
    sample_cards = list(set(card_dt_texts_map[dt_text]))[:3]
    for card in sample_cards:
        print(f"  - {card}")
    if len(set(card_dt_texts_map[dt_text])) > 3:
        print(f"  ... 외 {len(set(card_dt_texts_map[dt_text])) - 3}개 카드")
