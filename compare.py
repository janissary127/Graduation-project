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

if __name__ == '__main__':
    app.run(debug=True)
