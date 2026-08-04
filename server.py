"""School fees payment portal - minimal Flask backend.

Storage: flat JSON files under data/ (no database).
Payments are simulated - no real money moves.
"""
import datetime
import json
import os
import threading
import uuid

from flask import Flask, jsonify, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
STUDENTS_FILE = os.path.join(DATA_DIR, "students.json")
TRANSACTIONS_FILE = os.path.join(DATA_DIR, "transactions.json")

# Guards the JSON files against concurrent read-modify-write races.
lock = threading.Lock()

app = Flask(__name__, static_folder="public", static_url_path="")


def load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Data file is corrupted: {path}") from exc


def save_json(path, data):
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp_path, path)


def find_student(students, student_id):
    student_id = student_id.strip().upper()
    return next((s for s in students if s["student_id"].strip().upper() == student_id), None)


@app.errorhandler(404)
def not_found(_e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(405)
def method_not_allowed(_e):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(500)
def server_error(_e):
    return jsonify({"error": "Internal server error"}), 500


@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.route("/api/student/<student_id>", methods=["GET"])
def get_student(student_id):
    student_id = (student_id or "").strip()
    if not student_id:
        return jsonify({"error": "Student ID is required"}), 400

    with lock:
        students = load_json(STUDENTS_FILE, [])
    student = find_student(students, student_id)
    if not student:
        return jsonify({"error": "No student found with that ID"}), 404

    return jsonify(student), 200


@app.route("/api/pay", methods=["POST"])
def pay():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    student_id = str(body.get("student_id", "")).strip()
    name = str(body.get("name", "")).strip()
    amount_raw = body.get("amount")

    if not student_id:
        return jsonify({"error": "Student ID is required"}), 400
    if not name:
        return jsonify({"error": "Name is required"}), 400
    if amount_raw is None or isinstance(amount_raw, bool):
        return jsonify({"error": "Amount is required"}), 400

    try:
        amount = round(float(amount_raw), 2)
    except (TypeError, ValueError):
        return jsonify({"error": "Amount must be a valid number"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    with lock:
        students = load_json(STUDENTS_FILE, [])
        student = find_student(students, student_id)
        if not student:
            return jsonify({"error": "No student found with that ID"}), 404
        if student["name"].strip().lower() != name.lower():
            return jsonify({"error": "Name does not match our records for this student ID"}), 400
        if amount > student["balance"]:
            return jsonify({
                "error": f"Amount exceeds outstanding balance of {student['balance']:.2f}"
            }), 400

        student["balance"] = round(student["balance"] - amount, 2)

        transactions = load_json(TRANSACTIONS_FILE, [])
        transaction = {
            "transaction_id": str(uuid.uuid4()),
            "student_id": student["student_id"],
            "name": student["name"],
            "amount": amount,
            "balance_after": student["balance"],
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "status": "success",
        }
        transactions.append(transaction)

        try:
            save_json(STUDENTS_FILE, students)
            save_json(TRANSACTIONS_FILE, transactions)
        except OSError:
            return jsonify({"error": "Failed to save payment. Please try again."}), 500

    return jsonify(transaction), 201


@app.route("/api/transactions/<student_id>", methods=["GET"])
def get_transactions(student_id):
    student_id = (student_id or "").strip().upper()
    if not student_id:
        return jsonify({"error": "Student ID is required"}), 400

    with lock:
        transactions = load_json(TRANSACTIONS_FILE, [])
    student_tx = [t for t in transactions if t["student_id"].strip().upper() == student_id]
    student_tx.sort(key=lambda t: t["timestamp"], reverse=True)
    return jsonify(student_tx), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
