from flask import Flask, jsonify, render_template, url_for, request, redirect, session
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os

# views 폴더를 템플릿 폴더로 사용
app = Flask(__name__, template_folder='views', static_folder='static')
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

# --- 간단 사용자 저장(JSON) ---
DATA_DIR = os.path.join(os.path.dirname(__file__), "card_data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")

def _ensure_users_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump({"users": {}}, f, ensure_ascii=False, indent=2)

def load_users():
    _ensure_users_file()
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("users", {})

def save_users(users: dict):
    _ensure_users_file()
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump({"users": users}, f, ensure_ascii=False, indent=2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/compare')
def compare():
    return render_template('compare.html')

@app.route("/browse")
def browse():
    return render_template("browse.html")

@app.route("/charts")
def charts():
    return render_template("charts.html")

@app.route("/deals")
def deals():
    return render_template("deals.html")

@app.route("/recommend")
def recommend():
    """카드픽 추천 페이지 - 설문조사 페이지로 변경"""
    return render_template("survey.html")

@app.route("/chatbot_recommend")
def chatbot_recommend():
    return render_template("chatbot_recommend.html")

@app.route("/survey/result")
def survey_result():
    """설문조사 결과 페이지"""
    # 로그인 체크
    user = session.get("user")
    if not user:
        return redirect(url_for("login"))

    # 세션에서 설문 데이터 가져오기
    survey_data = session.get("survey_data")
    if not survey_data:
        return redirect(url_for("survey"))

    return render_template("survey_result.html")

@app.route("/survey")
def survey():
    """설문조사 페이지"""
    return render_template("survey.html")

@app.route("/survey/submit", methods=["POST"])
def survey_submit():
    """설문조사 제출 처리"""
    # 로그인 체크
    user = session.get("user")
    if not user:
        return redirect(url_for("login"))

    # 설문 데이터 수집
    survey_data = {
        "user_email": user.get("email"),
        "ageGroup": request.form.get("ageGroup", ""),
        "occupation": request.form.get("occupation", ""),
        "income": request.form.get("income", ""),
        "monthlyCardSpending": request.form.get("monthlyCardSpending", ""),
        "financialInstitutions": request.form.getlist("financialInstitutions"),
        "primaryGoal": request.form.get("primaryGoal", ""),
        "importantFactors": request.form.getlist("importantFactors"),
        "preferredBenefits": request.form.getlist("preferredBenefits"),
        "annualFee": request.form.get("annualFee", "")
    }

    # 설문 결과를 세션에 저장 (추후 추천에 활용)
    session["survey_data"] = survey_data

    # 설문 결과를 파일로 저장 (선택사항)
    surveys_file = os.path.join(DATA_DIR, "surveys.json")
    os.makedirs(DATA_DIR, exist_ok=True)

    try:
        if os.path.exists(surveys_file):
            with open(surveys_file, "r", encoding="utf-8") as f:
                surveys = json.load(f)
        else:
            surveys = []

        surveys.append(survey_data)

        with open(surveys_file, "w", encoding="utf-8") as f:
            json.dump(surveys, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"설문 저장 오류: {e}")

    # 설문 완료 후 추천 결과 페이지로 리디렉션
    return redirect(url_for("survey_result"))

# ---------- Auth ----------
@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        if not email or not password:
            return render_template("signup.html", error="이메일과 비밀번호를 입력해 주세요.", name=name, email=email)
        users = load_users()
        if email in users:
            return render_template("signup.html", error="이미 가입된 이메일입니다.", name=name, email=email)
        users[email] = {
            "name": name or email.split("@")[0],
            "email": email,
            "password_hash": generate_password_hash(password)
        }
        save_users(users)
        session["user"] = {"name": users[email]["name"], "email": email}
        return redirect(url_for("index"))
    return render_template("signup.html", error=None)

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        users = load_users()
        user = users.get(email)
        if user and check_password_hash(user.get("password_hash", ""), password):
            session["user"] = {"name": user.get("name"), "email": email}
            return redirect(url_for("index"))
        return render_template("login.html", error="이메일 또는 비밀번호가 올바르지 않습니다.", email=email)
    return render_template("login.html", error=None)

@app.route("/logout", methods=["POST", "GET"])
def logout():
    session.pop("user", None)
    if request.method == "POST":
        return ("", 204)
    return redirect(url_for("index"))

@app.route("/api/auth/status")
def auth_status():
    u = session.get("user")
    if not u:
        return jsonify({"logged_in": False})
    return jsonify({"logged_in": True, "name": u.get("name"), "email": u.get("email")})

@app.get("/mypage")
def mypage():
    # 로그인 필요
    if not session.get("user"):
        # 로그인 후 돌아오도록 next 파라미터 전달
        return redirect(url_for("login", next=request.path))
    return render_template("mypage.html")


# ---------- Card Recommendation API ----------
@app.route("/api/recommend", methods=["POST"])
def api_recommend():
    """카드 추천 API - chat.py 로직 활용"""
    try:
        from chat.chat import load_cards, recommend as chat_recommend

        data = request.get_json()
        user_input = data.get("query", "")

        if not user_input:
            return jsonify({"error": "query 파라미터가 필요합니다."}), 400

        # 카드 데이터 로드
        card_list_path = os.path.join(os.path.dirname(__file__), "static", "card_data", "card_list.json")
        cards = load_cards(card_list_path)

        # chat.py의 recommend 함수 사용
        recommendations = chat_recommend(cards, user_input)

        # 결과 반환
        return jsonify({
            "success": True,
            "query": user_input,
            "count": len(recommendations),
            "recommendations": recommendations
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/survey/recommend", methods=["POST"])
def api_survey_recommend():
    """설문조사 기반 카드 추천 API"""
    try:
        from chat.survey_recommender import SurveyBasedRecommender

        # JSON 데이터를 파싱 (에러 무시)
        data = request.get_json(silent=True)

        # 세션에서 설문 데이터 가져오기 또는 POST 데이터 사용
        if data is None or not data:
            user = session.get("user")
            if not user:
                return jsonify({"error": "로그인이 필요합니다."}), 401

            survey_data = session.get("survey_data")
            if not survey_data:
                return jsonify({"error": "설문조사 데이터가 없습니다."}), 400
        else:
            survey_data = data

        # 추천 시스템 실행
        card_list_path = os.path.join(os.path.dirname(__file__), "static", "card_data", "card_list.json")
        recommender = SurveyBasedRecommender(card_list_path)
        result = recommender.recommend(survey_data, top_n=10)

        return jsonify({
            "success": True,
            "result": result
        })

    except Exception as e:
        import traceback
        print(f"Error in api_survey_recommend: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route("/api/survey/data", methods=["GET"])
def api_survey_data():
    """현재 세션의 설문조사 데이터 반환"""
    user = session.get("user")
    if not user:
        return jsonify({"error": "로그인이 필요합니다."}), 401

    survey_data = session.get("survey_data")
    if not survey_data:
        return jsonify({"error": "설문조사 데이터가 없습니다."}), 404

    return jsonify({
        "success": True,
        "survey_data": survey_data
    })


# ---------- Favorites API ----------
@app.route("/api/favorites", methods=["GET"])
def get_favorites():
    """사용자의 즐겨찾기 카드 목록 조회"""
    user = session.get("user")
    if not user:
        return jsonify({"error": "로그인이 필요합니다."}), 401

    email = user.get("email")
    users = load_users()
    user_data = users.get(email, {})

    favorites = user_data.get("favoriteCards", [])

    return jsonify({
        "success": True,
        "favorites": favorites
    })


@app.route("/api/favorites", methods=["POST"])
def update_favorites():
    """즐겨찾기 추가/제거 (카드 이름 기반)"""
    user = session.get("user")
    if not user:
        return jsonify({"error": "로그인이 필요합니다."}), 401

    email = user.get("email")
    data = request.get_json()

    if not data:
        return jsonify({"error": "잘못된 요청입니다."}), 400

    card_name = data.get("card_name")
    action = data.get("action")  # 'add' or 'remove'

    # 디버깅 로그
    print(f"[즐겨찾기] 사용자: {email}, 카드명: {card_name}, action: {action}")

    if not card_name or not action:
        return jsonify({"error": "card_name과 action이 필요합니다."}), 400

    users = load_users()
    if email not in users:
        return jsonify({"error": "사용자를 찾을 수 없습니다."}), 404

    # favoriteCards 초기화
    if "favoriteCards" not in users[email]:
        users[email]["favoriteCards"] = []

    # 현재 즐겨찾기 목록 복사 (새 리스트 생성)
    favorites = list(users[email]["favoriteCards"])

    print(f"[즐겨찾기] 현재 목록: {favorites}")

    if action == "add":
        if card_name not in favorites:
            favorites.append(card_name)
            users[email]["favoriteCards"] = favorites
            save_users(users)
            print(f"[즐겨찾기] 추가 후 목록: {favorites}")
            return jsonify({"success": True, "message": "즐겨찾기에 추가되었습니다.", "favorites": favorites})
        else:
            return jsonify({"success": True, "message": "이미 즐겨찾기에 있습니다.", "favorites": favorites})

    elif action == "remove":
        if card_name in favorites:
            favorites.remove(card_name)
            users[email]["favoriteCards"] = favorites
            save_users(users)
            print(f"[즐겨찾기] 제거 후 목록: {favorites}")
            return jsonify({"success": True, "message": "즐겨찾기에서 제거되었습니다.", "favorites": favorites})
        else:
            return jsonify({"success": True, "message": "즐겨찾기에 없습니다.", "favorites": favorites})

    else:
        return jsonify({"error": "올바르지 않은 action입니다."}), 400


@app.route("/api/favorites/cards", methods=["GET"])
def get_favorite_cards():
    """즐겨찾기한 카드의 상세 정보 반환 (카드 이름 기반)"""
    user = session.get("user")
    if not user:
        return jsonify({"error": "로그인이 필요합니다."}), 401

    email = user.get("email")
    users = load_users()
    user_data = users.get(email, {})

    favorite_card_names = user_data.get("favoriteCards", [])

    # 디버깅 로그
    print(f"[즐겨찾기 조회] 사용자: {email}, 저장된 카드명: {favorite_card_names}")

    if not favorite_card_names:
        return jsonify({
            "success": True,
            "cards": []
        })

    # 카드 데이터 로드
    card_list_path = os.path.join(os.path.dirname(__file__), "static", "card_data", "card_list.json")
    try:
        with open(card_list_path, "r", encoding="utf-8") as f:
            all_cards = json.load(f)

        # 즐겨찾기한 카드만 필터링 (카드 이름으로)
        favorite_cards = []
        for card in all_cards:
            card_name = card.get("name")
            if card_name in favorite_card_names:
                favorite_cards.append(card)
                print(f"[즐겨찾기 조회] 매칭됨: {card_name}")

        print(f"[즐겨찾기 조회] 총 {len(favorite_cards)}개 카드 찾음")

        return jsonify({
            "success": True,
            "cards": favorite_cards
        })

    except Exception as e:
        print(f"[즐겨찾기 조회 오류] {str(e)}")
        return jsonify({"error": f"카드 정보를 불러올 수 없습니다: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True)
