from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

load_dotenv()

from db import mongo
from routes.auth    import auth_bp
from routes.entries import entries_bp
from routes.ai      import ai_bp

def create_app():
    app = Flask(__name__)

    # ── Config ──
    app.config["MONGO_URI"]         = os.getenv("MONGO_URI")
    app.config["JWT_SECRET_KEY"]    = os.getenv("JWT_SECRET_KEY", "change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False   # tokens don't expire (change for prod)

    # ── Extensions ──
    CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_URL", "*")}},
         supports_credentials=True)
    JWTManager(app)
    mongo.init_app(app)

    # ── Blueprints ──
    app.register_blueprint(auth_bp,    url_prefix="/api/auth")
    app.register_blueprint(entries_bp, url_prefix="/api/entries")
    app.register_blueprint(ai_bp,      url_prefix="/api/ai")

    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "mindAIry backend running 🌸"}

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)