from flask import Flask, jsonify, render_template, url_for
import json
import os

# views 폴더를 템플릿 폴더로 사용
app = Flask(__name__, template_folder='views', static_folder='static')

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

if __name__ == '__main__':
    app.run(debug=True)
