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
    return render_template("recommend.html")

@app.route("/chatbot_recommend")
def chatbot_recommend():
    return render_template("chatbot_recommend.html")

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

    # 설문 완료 후 추천 페이지로 리디렉션
    return redirect(url_for("recommend"))

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

if __name__ == '__main__':
    app.run(debug=True)
