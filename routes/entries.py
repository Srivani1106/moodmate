from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_db
from bson import ObjectId
from datetime import datetime, date

entries_bp = Blueprint("entries", __name__)


def serialize(entry):
    """Convert MongoDB doc to JSON-safe dict."""
    entry["_id"]  = str(entry["_id"])
    entry["user"] = str(entry["user"])
    if isinstance(entry.get("timestamp"), datetime):
        entry["timestamp"] = entry["timestamp"].isoformat()
    return entry


# ── GET /api/entries ── get all entries for logged-in user
@entries_bp.route("/", methods=["GET"])
@jwt_required()
def get_entries():
    user_id = get_jwt_identity()
    db      = get_db()

    # optional filters
    entry_type = request.args.get("type")   # Notebook / Q&A / Planner / Wreck This
    limit      = int(request.args.get("limit", 50))

    query = {"user": ObjectId(user_id)}
    if entry_type:
        query["type"] = entry_type

    entries = list(
        db.entries.find(query)
        .sort("timestamp", -1)
        .limit(limit)
    )
    return jsonify([serialize(e) for e in entries]), 200


# ── POST /api/entries ── save a new entry
@entries_bp.route("/", methods=["POST"])
@jwt_required()
def create_entry():
    user_id = get_jwt_identity()
    data    = request.get_json()

    title   = data.get("title", "Untitled")
    content = data.get("content", "")
    mood    = data.get("mood", "–")
    etype   = data.get("type", "Notebook")

    if not content.strip():
        return jsonify({"error": "Content cannot be empty."}), 400

    db    = get_db()
    entry = {
        "user":      ObjectId(user_id),
        "title":     title,
        "content":   content,
        "mood":      mood,
        "type":      etype,
        "timestamp": datetime.utcnow(),
    }
    result = db.entries.insert_one(entry)

    # update streak
    _update_streak(user_id, db)

    entry["_id"] = str(result.inserted_id)
    return jsonify(serialize(entry)), 201


# ── PUT /api/entries/<id> ── update an entry
@entries_bp.route("/<entry_id>", methods=["PUT"])
@jwt_required()
def update_entry(entry_id):
    user_id = get_jwt_identity()
    data    = request.get_json()
    db      = get_db()

    result = db.entries.find_one_and_update(
        {"_id": ObjectId(entry_id), "user": ObjectId(user_id)},
        {"$set": {
            "title":   data.get("title"),
            "content": data.get("content"),
            "mood":    data.get("mood"),
        }},
        return_document=True,
    )

    if not result:
        return jsonify({"error": "Entry not found."}), 404

    return jsonify(serialize(result)), 200


# ── DELETE /api/entries/<id> ── delete an entry
@entries_bp.route("/<entry_id>", methods=["DELETE"])
@jwt_required()
def delete_entry(entry_id):
    user_id = get_jwt_identity()
    db      = get_db()

    result = db.entries.delete_one(
        {"_id": ObjectId(entry_id), "user": ObjectId(user_id)}
    )

    if result.deleted_count == 0:
        return jsonify({"error": "Entry not found."}), 404

    return jsonify({"message": "Entry deleted."}), 200


# ── GET /api/entries/stats ── stats for insights page
@entries_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    user_id = get_jwt_identity()
    db      = get_db()

    entries = list(db.entries.find({"user": ObjectId(user_id)}))

    total_entries = len(entries)
    total_words   = sum(len(e.get("content", "").split()) for e in entries)

    mood_counts = {}
    type_counts = {}
    for e in entries:
        m = e.get("mood", "–")
        t = e.get("type", "Notebook")
        mood_counts[m] = mood_counts.get(m, 0) + 1
        type_counts[t] = type_counts.get(t, 0) + 1

    # streak
    user   = db.users.find_one({"_id": ObjectId(user_id)})
    streak = user.get("streak", {}) if user else {}

    return jsonify({
        "total_entries": total_entries,
        "total_words":   total_words,
        "mood_counts":   mood_counts,
        "type_counts":   type_counts,
        "streak":        streak,
    }), 200


# ── helpers ──
def _update_streak(user_id, db):
    """Increment streak if user hasn't written today yet."""
    today     = date.today().isoformat()
    user      = db.users.find_one({"_id": ObjectId(user_id)})
    streak    = user.get("streak", {"count": 0, "last_day": None})
    last_day  = streak.get("last_day")

    if last_day == today:
        return  # already wrote today

    yesterday = (date.today().replace(day=date.today().day - 1)).isoformat()
    new_count = streak["count"] + 1 if last_day == yesterday else 1

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"streak": {"count": new_count, "last_day": today}}}
    )