from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from db import get_db
import bcrypt
from datetime import datetime

auth_bp = Blueprint("auth", __name__)


# ── POST /api/auth/signup ──
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data     = request.get_json()
    name     = data.get("name", "").strip()
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")

    if not name or not username or not password:
        return jsonify({"error": "All fields are required."}), 400

    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    db = get_db()

    if db.users.find_one({"username": username}):
        return jsonify({"error": "Username already taken."}), 409

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    user = {
        "name":       name,
        "username":   username,
        "password":   hashed,
        "created_at": datetime.utcnow(),
        "streak":     {"count": 0, "last_day": None},
    }
    result = db.users.insert_one(user)

    token = create_access_token(identity=str(result.inserted_id))
    return jsonify({
        "token":    token,
        "username": username,
        "name":     name,
    }), 201


# ── POST /api/auth/login ──
@auth_bp.route("/login", methods=["POST"])
def login():
    data     = request.get_json()
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "All fields are required."}), 400

    db   = get_db()
    user = db.users.find_one({"username": username})

    if not user:
        return jsonify({"error": "No account found with that username."}), 404

    if not bcrypt.checkpw(password.encode(), user["password"]):
        return jsonify({"error": "Incorrect password."}), 401

    token = create_access_token(identity=str(user["_id"]))
    return jsonify({
        "token":    token,
        "username": user["username"],
        "name":     user["name"],
    }), 200


# ── GET /api/auth/me ──
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    from bson import ObjectId
    user_id = get_jwt_identity()
    db      = get_db()
    user    = db.users.find_one({"_id": ObjectId(user_id)}, {"password": 0})

    if not user:
        return jsonify({"error": "User not found."}), 404

    user["_id"] = str(user["_id"])
    return jsonify(user), 200