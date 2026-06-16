from flask import Blueprint, request, jsonify
from db import get_db
from bson import ObjectId
import os

ai_bp = Blueprint("ai", __name__)

# ── Lazy-load HuggingFace models (loads once on first request) ──
_emotion_pipeline = None
_summary_pipeline = None


def get_emotion_pipeline():
    global _emotion_pipeline
    if _emotion_pipeline is None:
        from transformers import pipeline
        model = os.getenv("HF_MODEL_EMOTION", "j-hartmann/emotion-english-distilroberta-base")
        print(f"[AI] Loading emotion model: {model}")
        _emotion_pipeline = pipeline("text-classification", model=model, top_k=None)
    return _emotion_pipeline


def get_summary_pipeline():
    global _summary_pipeline
    if _summary_pipeline is None:
        from transformers import pipeline
        model = os.getenv("HF_MODEL_SUMMARY", "facebook/bart-large-cnn")
        print(f"[AI] Loading summarization model: {model}")
        _summary_pipeline = pipeline("summarization", model=model)
    return _summary_pipeline


# ── POST /api/ai/emotion ──
# Body: { "text": "I feel really anxious today..." }
# Returns: { "emotions": [{"label": "fear", "score": 0.87}, ...] }
@ai_bp.route("/emotion", methods=["POST"])
def detect_emotion():
    data = request.get_json()
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "No text provided."}), 400

    if len(text) > 512:
        text = text[:512]   # model max tokens

    try:
        pipe    = get_emotion_pipeline()
        results = pipe(text)[0]   # list of {label, score}
        # sort by score descending
        results = sorted(results, key=lambda x: x["score"], reverse=True)
        return jsonify({"emotions": results}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST /api/ai/summarize ──
# Body: { "text": "Long journal entry text..." }
# Returns: { "summary": "Short summary..." }
@ai_bp.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json()
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "No text provided."}), 400

    if len(text) < 50:
        return jsonify({"summary": text}), 200  # too short to summarize

    try:
        pipe    = get_summary_pipeline()
        result  = pipe(text[:1024], max_length=80, min_length=20, do_sample=False)
        summary = result[0]["summary_text"]
        return jsonify({"summary": summary}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST /api/ai/analyse-entries ──
# Runs emotion detection on all entries for the logged-in user
# and returns aggregated emotion scores + per-entry emotions
@ai_bp.route("/analyse-entries", methods=["POST"])
def analyse_entries():
    # Receives entries from frontend localStorage directly
    data    = request.get_json()
    entries = data.get("entries", [])

    if not entries:
        return jsonify({"error": "No entries provided."}), 400

    pipe           = get_emotion_pipeline()
    aggregated     = {}
    entry_emotions = []

    for entry in entries[:20]:
        text = (entry.get("content") or "")[:512]
        if not text.strip():
            continue

        results = pipe(text)[0]
        top     = sorted(results, key=lambda x: x["score"], reverse=True)[:3]

        entry_emotions.append({
            "id":       str(entry.get("id", "")),
            "title":    entry.get("title", ""),
            "emotions": top,
        })

        for r in results:
            label = r["label"]
            aggregated[label] = aggregated.get(label, 0) + r["score"]

    total = sum(aggregated.values()) or 1
    aggregated_pct = {k: round((v / total) * 100, 1) for k, v in aggregated.items()}
    aggregated_pct = dict(sorted(aggregated_pct.items(), key=lambda x: x[1], reverse=True))

    return jsonify({
        "aggregated":     aggregated_pct,
        "entry_emotions": entry_emotions,
    }), 200


# ── Chat pipeline (lazy loaded) ──
_chat_pipeline = None

def get_chat_tokenizer_model():
    global _chat_pipeline
    if _chat_pipeline is None:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch
        model_name = os.getenv("HF_MODEL_CHAT", "microsoft/DialoGPT-medium")
        print(f"[AI] Loading chat model: {model_name}")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model     = AutoModelForCausalLM.from_pretrained(model_name)
        _chat_pipeline = {"tokenizer": tokenizer, "model": model}
    return _chat_pipeline


# ── POST /api/ai/chat ──
@ai_bp.route("/chat", methods=["POST"])
def chat():
    import torch
    data    = request.get_json()
    message = data.get("message", "").strip()
    history = data.get("history", [])

    if not message:
        return jsonify({"error": "No message provided."}), 400

    try:
        tm        = get_chat_tokenizer_model()
        tokenizer = tm["tokenizer"]
        model     = tm["model"]

        # Encode conversation history + new message
        # DialoGPT expects: input1 <eos> input2 <eos> ... new_input <eos>
        chat_history_ids = None

        # Add last 4 history turns
        for turn in history[-4:]:
            if turn.startswith("User: "):
                text = turn[6:]
            elif turn.startswith("Maia: "):
                text = turn[6:]
            else:
                text = turn
            ids = tokenizer.encode(text + tokenizer.eos_token, return_tensors="pt")
            chat_history_ids = ids if chat_history_ids is None else torch.cat([chat_history_ids, ids], dim=-1)

        # Add current message
        new_ids = tokenizer.encode(message + tokenizer.eos_token, return_tensors="pt")
        bot_input_ids = new_ids if chat_history_ids is None else torch.cat([chat_history_ids, new_ids], dim=-1)

        # Keep input under 512 tokens
        if bot_input_ids.shape[-1] > 512:
            bot_input_ids = bot_input_ids[:, -512:]

        # Generate reply
        with torch.no_grad():
            output = model.generate(
                bot_input_ids,
                max_new_tokens=100,
                do_sample=True,
                temperature=0.75,
                top_p=0.9,
                pad_token_id=tokenizer.eos_token_id,
            )

        # Decode only the new tokens
        reply = tokenizer.decode(
            output[:, bot_input_ids.shape[-1]:][0],
            skip_special_tokens=True
        ).strip()

        if not reply:
            reply = "I'm here with you. Tell me more about what's on your mind 💜"

        return jsonify({"reply": reply}), 200

    except Exception as e:
        print(f"[Chat error] {e}")
        return jsonify({"error": str(e)}), 500