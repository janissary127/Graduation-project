from flask import Flask, jsonify, render_template, url_for, request, redirect, session
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os

# views 폴더를 템플릿 폴더로 사용
app = Flask(__name__, template_folder='views', static_folder='static')
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

# --- 간단 사용자 저장(JSON) ---
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
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

if __name__ == '__main__':
    app.run(debug=True)
