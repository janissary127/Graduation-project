# file: survey_recommender.py
import json
import re
from typing import List, Dict, Tuple
from collections import Counter

class SurveyBasedRecommender:
    """설문조사 결과 기반 카드 추천 시스템"""

    def __init__(self, card_list_path: str = "static/card_data/card_list.json"):
        self.cards = self.load_cards(card_list_path)
        self.weight_explanation = {}  # 가중치 설명 저장

    def load_cards(self, path: str):
        """카드 데이터 로드"""
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def extract_performance_amount(self, performance_text: str) -> int:
        """전월실적 텍스트에서 금액 추출 (만원 단위)"""
        if not performance_text or "없음" in performance_text:
            return 0

        # 숫자 추출 (예: "전월실적 30만원 이상" -> 30)
        match = re.search(r'(\d+)만원', performance_text)
        if match:
            return int(match.group(1))
        return 0

    def get_card_text(self, card: Dict) -> str:
        """카드의 모든 텍스트 정보 추출"""
        text = " ".join(card.get("benefits", []))
        for detail in card.get("details", []):
            text += " " + " ".join(detail.get("dt_texts", []))
            text += " " + detail.get("dt_i", "")
            # dd_paragraphs는 너무 길어서 제외
        return text

    def get_dt_texts(self, card: Dict) -> List[str]:
        """카드의 dt_texts 목록 추출"""
        dt_texts = []
        for detail in card.get("details", []):
            dt_texts.extend(detail.get("dt_texts", []))
        return dt_texts

    def calculate_weights(self, survey: Dict) -> Dict[str, float]:
        """설문조사 결과 기반 가중치 계산"""
        weights = {
            'age_performance': 0,
            'occupation_performance': 0,
            'occupation_benefits': {},
            'income_benefits': {},
            'spending_benefits': {},
            'institution_preference': survey.get('financialInstitutions', []),
            'preferred_benefits': survey.get('preferredBenefits', []),
        }

        explanations = []

        # 1. 연령대 기반 전월실적 가중치
        age_group = survey.get('ageGroup', '')
        if age_group in ['20대 미만', '20대']:
            weights['age_performance'] = 10  # 낮은 실적 선호
            explanations.append(f"연령대({age_group}): 전월실적 부담이 적은 카드 선호")
        elif age_group in ['30대', '40대', '50대', '60대 이상']:
            weights['age_performance'] = 20  # 높은 실적 가능
            explanations.append(f"연령대({age_group}): 전월실적 20만원 이상 카드 적합")

        # 2. 직업 기반 가중치
        occupation = survey.get('occupation', '')
        if occupation in ['직장인', '자영업', '전문직']:
            weights['occupation_performance'] = 20
            weights['occupation_benefits'] = {
                '프리미엄 서비스': 3.0,
                '프리미엄': 3.0,
                '교통': 2.5,
                '자동차': 2.5,
                '항공': 3.0,
                '대한항공': 2.5,
                '아시아나항공': 2.5,
                '항공마일리지': 2.5,
                '공항라운지': 2.5,
                '공항라운지/PP': 2.5,
                '해외': 2.5,
                '해외이용': 2.5,
                '해외결제': 2.5,
                '주유': 2.0,
                '주유소': 2.0,
                '금융': 2.0,
                '비즈니스': 2.5,
                '골프': 2.5,
                '호텔': 2.5,
            }
            explanations.append(f"직업({occupation}): 프리미엄, 교통, 해외 혜택 중심")
        elif occupation in ['주부', '무직', '학생']:
            weights['occupation_performance'] = 10
            weights['occupation_benefits'] = {
                '할인': 3.0,
                '캐시백': 2.5,
                '영화': 2.5,
                'OTT/영화/문화': 2.5,
                '교육': 2.5,
                '교육/육아': 2.5,
                '학원': 2.0,
                '쇼핑': 2.5,
                '온라인쇼핑': 2.5,
                '생활': 2.5,
                '편의점': 2.5,
                '마트/편의점': 2.5,
                '대형마트': 2.5,
                '카페': 2.0,
                '카페/디저트': 2.0,
                '배달앱': 2.0,
                '디지털구독': 2.0,
            }
            explanations.append(f"직업({occupation}): 할인, 생활, 쇼핑 혜택 중심")

        # 3. 월평균 소득 기반 가중치
        income = survey.get('income', '')
        if '200' in income or '400' in income:
            if '600' not in income and '800' not in income:  # 200-400만원
                weights['income_benefits'] = {
                    '할인': 2.5,
                    '캐시백': 2.5,
                    '생활': 2.0,
                    '편의점': 2.0,
                    '마트/편의점': 2.0,
                    '대형마트': 2.0,
                    '쇼핑': 2.0,
                    '온라인쇼핑': 2.0,
                }
                explanations.append(f"월소득({income}): 할인/생활 혜택 중심")

        if '600' in income or '800' in income or '1000' in income:  # 600만원 이상
            weights['income_benefits'] = {
                '프리미엄': 2.5,
                '프리미엄 서비스': 2.5,
                '골프': 2.5,
                '항공': 2.0,
                '호텔': 2.0,
                '공항라운지': 2.0,
                '해외': 2.0,
            }
            explanations.append(f"월소득({income}): 프리미엄/레저 혜택 중심")

        # 4. 월평균 카드이용료 기반 가중치
        spending = survey.get('monthlyCardSpending', '')
        if '50' in spending or '100' in spending:
            if '30' not in spending:  # 50만원 이상
                weights['spending_benefits'] = {
                    '프리미엄': 2.0,
                    '프리미엄 서비스': 2.0,
                    '항공': 2.5,
                    '대한항공': 2.0,
                    '아시아나항공': 2.0,
                    '해외': 2.0,
                    '자동차': 2.0,
                    '주유': 1.5,
                    '골프': 1.5,
                }
                explanations.append(f"카드이용액({spending}): 프리미엄/항공/해외 혜택 중심")

        if '10' in spending or '30' in spending:  # 50만원 이하
            weights['spending_benefits'] = {
                '편의점': 2.0,
                '마트/편의점': 2.0,
                'OTT/영화/문화': 2.0,
                '디지털구독': 2.0,
                '통신': 2.0,
                'KT': 1.5,
                'SKT': 1.5,
                'LGU+': 1.5,
                '카페': 1.5,
                '생활': 1.5,
            }
            explanations.append(f"카드이용액({spending}): 생활/편의 혜택 중심")

        # 5. 선호 혜택 키워드
        preferred = survey.get('preferredBenefits', [])
        if preferred:
            explanations.append(f"선호 혜택: {', '.join(preferred)}")

        # 6. 주 사용 카드사
        institutions = survey.get('financialInstitutions', [])
        if institutions:
            explanations.append(f"주 사용 카드사: {', '.join(institutions)}")

        self.weight_explanation = {
            'weights': weights,
            'explanations': explanations
        }

        return weights

    def initial_filter_by_keywords(self, keywords: List[str], top_n: int = 50) -> List[Dict]:
        """키워드 기반 초기 필터링 (40-50개)"""
        scored_cards = []

        for card in self.cards:
            score = 0
            card_text = self.get_card_text(card)
            benefits = card.get('benefits', [])

            # 키워드 매칭 점수
            for keyword in keywords:
                # benefits에서 매칭
                for benefit in benefits:
                    if keyword in benefit:
                        score += 5

                # 전체 텍스트에서 매칭
                score += card_text.count(keyword) * 2

            if score > 0:
                scored_cards.append((score, card))

        # 점수 순으로 정렬하여 상위 N개 반환
        scored_cards.sort(key=lambda x: x[0], reverse=True)
        return [card for score, card in scored_cards[:top_n]]

    def calculate_final_score(self, card: Dict, weights: Dict) -> Tuple[float, Dict]:
        """최종 점수 계산 및 상세 점수 반환"""
        score = 0
        score_details = {}

        # 1. 전월실적 기반 점수
        performance = card.get('performance', '')
        perf_amount = self.extract_performance_amount(performance)

        age_perf_weight = weights.get('age_performance', 0)
        occ_perf_weight = weights.get('occupation_performance', 0)

        if age_perf_weight == 10:  # 낮은 실적 선호
            if perf_amount == 0:
                score += 15
                score_details['performance'] = 15
            elif perf_amount <= 10:
                score += 10
                score_details['performance'] = 10
            elif perf_amount <= 20:
                score += 5
                score_details['performance'] = 5
        elif age_perf_weight == 20:  # 높은 실적 가능
            if perf_amount >= 20:
                score += 15
                score_details['performance'] = 15
            elif perf_amount >= 10:
                score += 10
                score_details['performance'] = 10

        # 2. dt_texts 기반 혜택 점수
        dt_texts = self.get_dt_texts(card)

        benefit_score = 0
        matched_benefits = []

        # 직업 기반 혜택
        occ_benefits = weights.get('occupation_benefits', {})
        for dt_text in dt_texts:
            if dt_text in occ_benefits:
                benefit_score += occ_benefits[dt_text]
                matched_benefits.append(f"{dt_text}({occ_benefits[dt_text]})")

        # 소득 기반 혜택
        income_benefits = weights.get('income_benefits', {})
        for dt_text in dt_texts:
            if dt_text in income_benefits:
                benefit_score += income_benefits[dt_text]
                matched_benefits.append(f"{dt_text}({income_benefits[dt_text]})")

        # 지출 기반 혜택
        spending_benefits = weights.get('spending_benefits', {})
        for dt_text in dt_texts:
            if dt_text in spending_benefits:
                benefit_score += spending_benefits[dt_text]
                matched_benefits.append(f"{dt_text}({spending_benefits[dt_text]})")

        score += benefit_score
        score_details['benefits'] = benefit_score
        score_details['matched_benefits'] = matched_benefits

        # 3. 선호 혜택 키워드 점수
        preferred = weights.get('preferred_benefits', [])
        card_text = self.get_card_text(card)
        benefits = card.get('benefits', [])

        preferred_score = 0
        for keyword in preferred:
            # benefits에서 매칭
            for benefit in benefits:
                if keyword in benefit:
                    preferred_score += 5

            # dt_texts에서 매칭
            for dt_text in dt_texts:
                if keyword in dt_text:
                    preferred_score += 3

        score += preferred_score
        score_details['preferred'] = preferred_score

        # 4. 카드사 선호도 점수
        institutions = weights.get('institution_preference', [])
        card_corp = card.get('corp', '')

        institution_score = 0
        for inst in institutions:
            if inst in card_corp:
                institution_score += 10

        score += institution_score
        score_details['institution'] = institution_score

        return score, score_details

    def recommend(self, survey: Dict, top_n: int = 10) -> Dict:
        """설문조사 결과 기반 카드 추천"""
        # 1. 가중치 계산
        weights = self.calculate_weights(survey)

        # 2. preferredBenefits 키워드로 초기 필터링 (40-50개)
        keywords = survey.get('preferredBenefits', [])
        if not keywords:
            # 키워드가 없으면 전체 카드 대상
            filtered_cards = self.cards[:50]
        else:
            filtered_cards = self.initial_filter_by_keywords(keywords, top_n=50)

        # 3. 각 카드에 대해 최종 점수 계산
        scored_cards = []
        for card in filtered_cards:
            final_score, score_details = self.calculate_final_score(card, weights)
            scored_cards.append((final_score, card, score_details))

        # 4. 점수 순으로 정렬하여 상위 N개 선택
        scored_cards.sort(key=lambda x: x[0], reverse=True)
        top_cards = scored_cards[:top_n]

        # 5. 결과 정리
        result = {
            'recommendations': [],
            'weight_explanation': self.weight_explanation['explanations'],
            'survey_summary': {
                'ageGroup': survey.get('ageGroup', ''),
                'occupation': survey.get('occupation', ''),
                'income': survey.get('income', ''),
                'monthlyCardSpending': survey.get('monthlyCardSpending', ''),
                'preferredBenefits': survey.get('preferredBenefits', []),
            }
        }

        for rank, (score, card, score_details) in enumerate(top_cards, 1):
            result['recommendations'].append({
                'rank': rank,
                'score': round(score, 2),
                'card': {
                    'team_id': card.get('team_id'),  # team_id 추가
                    'name': card.get('name'),
                    'corp': card.get('corp'),
                    'benefits': card.get('benefits', [])[:5],
                    'performance': card.get('performance', ''),
                    'promo': card.get('promo', ''),
                    'img': card.get('img', ''),  # 이미지 경로 추가
                    'details': card.get('details', [])  # 상세 정보 추가
                },
                'score_details': score_details
            })

        return result


def main():
    """테스트용 메인 함수"""
    # 테스트시 chat 디렉토리의 card_list.json 사용
    import os
    current_dir = os.path.dirname(__file__)
    card_list_path = os.path.join(current_dir, "card_list.json")
    if not os.path.exists(card_list_path):
        # Flask에서 실행할 때는 프로젝트 루트 기준
        card_list_path = "static/card_data/card_list.json"

    recommender = SurveyBasedRecommender(card_list_path)

    # 샘플 설문조사 결과
    sample_survey = {
        "user_email": "test@test.com",
        "ageGroup": "20대",
        "occupation": "학생",
        "income": "400-600만원",
        "monthlyCardSpending": "30-50만원",
        "financialInstitutions": ["KB국민카드", "우리카드"],
        "primaryGoal": "여행, 취미 등 여유로운 생활",
        "importantFactors": ["안정성", "수수료/비용"],
        "preferredBenefits": ["영화관", "놀이공원/테마파크", "OTT/스트리밍"],
        "annualFee": ""
    }

    # 추천 실행
    result = recommender.recommend(sample_survey, top_n=10)

    # 결과 출력
    print("=" * 80)
    print("설문조사 기반 카드 추천 결과")
    print("=" * 80)
    print("\n[설문조사 요약]")
    for key, value in result['survey_summary'].items():
        print(f"  - {key}: {value}")

    print("\n[가중치 적용 기준]")
    for explanation in result['weight_explanation']:
        print(f"  • {explanation}")

    print("\n[추천 카드 TOP 10]")
    print("-" * 80)
    for rec in result['recommendations']:
        print(f"\n{rec['rank']}위. {rec['card']['name']} ({rec['card']['corp']}) - 점수: {rec['score']}")
        print(f"   주요 혜택: {', '.join(rec['card']['benefits'])}")
        print(f"   전월실적: {rec['card']['performance']}")
        if rec['card']['promo']:
            print(f"   프로모션: {rec['card']['promo']}")

        # 점수 상세
        print(f"   점수 상세:")
        print(f"     - 전월실적 점수: {rec['score_details'].get('performance', 0)}")
        print(f"     - 혜택 점수: {rec['score_details'].get('benefits', 0)}")
        print(f"     - 선호 혜택 점수: {rec['score_details'].get('preferred', 0)}")
        print(f"     - 카드사 선호 점수: {rec['score_details'].get('institution', 0)}")

        if rec['score_details'].get('matched_benefits'):
            print(f"   매칭된 혜택: {', '.join(rec['score_details']['matched_benefits'][:5])}")


if __name__ == "__main__":
    main()