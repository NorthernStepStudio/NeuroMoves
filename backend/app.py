"""
RealLife Steps - Flask API Server
Main entry point for the backend.
"""

from __future__ import annotations

import os
from functools import wraps
from dotenv import load_dotenv

load_dotenv() # Load variables from .env if present

from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import database
from config import (
    ALLOWED_ORIGINS,
    AUDIO_CACHE_DIR,
    DEBUG,
    GOOGLE_CLIENT_IDS,
    GROQ_API_KEY,
    HOST,
    PORT,
    RATE_LIMIT_AUTH,
    RATE_LIMIT_DEFAULT,
)
from core.constants import ENCOURAGEMENT_MESSAGES, LANGUAGES, MODULES
from core.helpers import get_random_encouragement

app = Flask(__name__)
CORS(app, origins=ALLOWED_ORIGINS)
limiter = Limiter(get_remote_address, app=app, default_limits=[RATE_LIMIT_DEFAULT])
database.init_database()


@app.after_request
def _set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


def _json_error(message: str, status: int = 400):
    return jsonify({"success": False, "error": message}), status


def _get_bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "").strip()
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    return token or None


def require_auth(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = _get_bearer_token()
        if not token:
            return _json_error("Missing bearer token", 401)

        parent = database.get_parent_from_session(token)
        if not parent:
            return _json_error("Invalid or expired session", 401)

        g.parent = parent
        g.session_token = token
        return func(*args, **kwargs)

    return wrapper


def _require_child_access(child_id: int):
    parent = getattr(g, "parent", None)
    if not parent:
        return None, _json_error("Unauthorized", 401)
    if not database.child_belongs_to_parent(child_id, parent["id"]):
        return None, _json_error("Child profile not found for this account", 403)
    child = database.get_child_profile(child_id, parent["id"])
    return child, None


def _valid_email(value: str) -> bool:
    v = value.strip()
    return "@" in v and "." in v and len(v) >= 5


def _normalize_avatar_payload(payload: dict) -> dict:
    if not payload:
        return {}
    return {
        "body_color": payload.get("body_color", payload.get("bodyColor")),
        "face": payload.get("face"),
        "hat": payload.get("hat"),
        "accessory": payload.get("accessory"),
        "background": payload.get("background"),
    }


def _avatar_to_mobile(payload: dict | None) -> dict:
    if not payload:
        return {
            "bodyColor": "#fb923c",
            "face": "🙂",
            "hat": "",
            "accessory": "",
            "background": "#fff7ed",
        }
    return {
        "bodyColor": payload.get("body_color", "#fb923c"),
        "face": payload.get("face", "🙂"),
        "hat": payload.get("hat", ""),
        "accessory": payload.get("accessory", ""),
        "background": payload.get("background", "#fff7ed"),
    }


# ========== Health Check ==========

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify(
        {
            "status": "healthy",
            "app": "RealLife Steps",
            "version": "1.1.0",
            "auth": "session-token",
        }
    )


# ========== Authentication ==========

@app.route("/api/auth/signup", methods=["POST"])
@limiter.limit(RATE_LIMIT_AUTH)
def auth_signup():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    display_name = (data.get("name") or "").strip()

    if not _valid_email(email):
        return _json_error("Valid email is required", 400)
    if len(password) < 8:
        return _json_error("Password must be at least 8 characters", 400)
    if database.get_parent_by_email(email):
        return _json_error("An account with this email already exists", 409)

    parent = database.create_parent_account(email, password, display_name)
    token = database.create_session(parent["id"])
    children = database.list_child_profiles(parent["id"])
    return (
        jsonify(
            {
                "success": True,
                "token": token,
                "parent": parent,
                "children": children,
            }
        ),
        201,
    )


@app.route("/api/auth/login", methods=["POST"])
@limiter.limit(RATE_LIMIT_AUTH)
def auth_login():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return _json_error("Email and password are required", 400)

    parent = database.verify_parent_credentials(email, password)
    if not parent:
        return _json_error("Invalid email or password", 401)

    token = database.create_session(parent["id"])
    children = database.list_child_profiles(parent["id"])
    return jsonify(
        {
            "success": True,
            "token": token,
            "parent": parent,
            "children": children,
        }
    )


@app.route("/api/auth/google", methods=["POST"])
@limiter.limit(RATE_LIMIT_AUTH)
def auth_google():
    data = request.json or {}
    id_token = (data.get("id_token") or "").strip()
    if not id_token:
        return _json_error("id_token is required", 400)

    if not GOOGLE_CLIENT_IDS:
        return _json_error("Google auth is not configured on the backend", 503)

    try:
        from google.auth.transport.requests import Request as GoogleRequest
        from google.oauth2 import id_token as google_id_token
    except Exception:
        return _json_error(
            "Google auth dependency missing. Install 'google-auth' on backend.",
            503,
        )

    try:
        token_info = google_id_token.verify_oauth2_token(
            id_token,
            GoogleRequest(),
            None,
        )
    except Exception as exc:
        return _json_error(f"Google token validation failed: {exc}", 401)

    audience = token_info.get("aud")
    if audience not in GOOGLE_CLIENT_IDS:
        return _json_error("Google token audience does not match configured client IDs", 401)

    email = (token_info.get("email") or "").strip().lower()
    google_sub = token_info.get("sub")
    name = token_info.get("name") or token_info.get("given_name") or ""

    if not email or not google_sub:
        return _json_error("Google token missing required identity claims", 400)

    parent = database.create_or_update_google_parent(email, google_sub, name)
    token = database.create_session(parent["id"])
    children = database.list_child_profiles(parent["id"])
    return jsonify(
        {
            "success": True,
            "token": token,
            "parent": parent,
            "children": children,
        }
    )


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def auth_me():
    parent = g.parent
    children = database.list_child_profiles(parent["id"])
    return jsonify({"success": True, "parent": parent, "children": children})


@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def auth_logout():
    database.revoke_session(g.session_token)
    return jsonify({"success": True})


@app.route("/api/auth/password-reset/request", methods=["POST"])
@limiter.limit(RATE_LIMIT_AUTH)
def auth_password_reset_request():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    if not _valid_email(email):
        return _json_error("Valid email is required", 400)

    code = database.create_password_reset_code_for_email(email)
    email_sent = False
    if code:
        from core.email import send_password_reset_email
        email_sent = send_password_reset_email(email, code)
        print(f"[PasswordReset] Code for {email}: {code} (Email Sent: {email_sent})")

    payload = {
        "success": True,
        "message": "If an account exists, a reset code has been issued.",
        "email_sent": email_sent
    }
    if DEBUG and code:
        payload["debug_code"] = code
    return jsonify(payload)


@app.route("/api/auth/password-reset/confirm", methods=["POST"])
@limiter.limit(RATE_LIMIT_AUTH)
def auth_password_reset_confirm():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    code = (data.get("code") or "").strip()
    new_password = data.get("new_password") or ""

    if not _valid_email(email):
        return _json_error("Valid email is required", 400)
    if not code:
        return _json_error("Reset code is required", 400)
    if len(new_password) < 8:
        return _json_error("Password must be at least 8 characters", 400)

    ok = database.reset_password_with_code(email, code, new_password)
    if not ok:
        return _json_error("Invalid or expired reset code", 400)

    parent = database.get_parent_by_email(email)
    if not parent:
        return _json_error("Account not found", 404)

    database.revoke_all_sessions_for_parent(parent["id"])
    token = database.create_session(parent["id"])
    children = database.list_child_profiles(parent["id"])
    parent.pop("password_hash", None)
    return jsonify(
        {
            "success": True,
            "token": token,
            "parent": parent,
            "children": children,
        }
    )


# ========== Child Profiles ==========

@app.route("/api/children", methods=["GET"])
@require_auth
def list_children():
    children = database.list_child_profiles(g.parent["id"])
    return jsonify({"success": True, "children": children})


@app.route("/api/children", methods=["POST"])
@require_auth
def create_child():
    data = request.json or {}
    name = (data.get("name") or "").strip()
    language = (data.get("language") or "en").strip().lower()
    age_months = int(data.get("age_months", 24))

    if not name:
        return _json_error("Child name is required", 400)
    if language not in LANGUAGES:
        language = "en"

    child = database.create_child_profile(g.parent["id"], name, language, age_months)
    return jsonify({"success": True, "child": child}), 201


@app.route("/api/children/<int:child_id>", methods=["PUT"])
@require_auth
def update_child(child_id: int):
    data = request.json or {}
    name = data.get("name")
    language = data.get("language")
    age_months = data.get("age_months")

    if language is not None:
        language = str(language).strip().lower()
        if language not in LANGUAGES:
            return _json_error("Invalid language", 400)

    parsed_age = int(age_months) if age_months is not None else None
    child = database.update_child_profile(
        child_id,
        g.parent["id"],
        name=name,
        language=language,
        age_months=parsed_age,
    )
    if not child:
        return _json_error("Child profile not found", 404)
    return jsonify({"success": True, "child": child})


@app.route("/api/children/<int:child_id>", methods=["DELETE"])
@require_auth
def delete_child(child_id: int):
    removed = database.archive_child_profile(child_id, g.parent["id"])
    if not removed:
        return _json_error("Child profile not found", 404)
    return jsonify({"success": True})


# ========== User Endpoints (Child Alias) ==========

@app.route("/api/users", methods=["POST"])
@require_auth
def create_user():
    data = request.json or {}
    name = (data.get("name") or "").strip()
    language = (data.get("language") or "en").strip().lower()
    age_months = int(data.get("age_months", 24))

    if not name:
        return _json_error("Child name is required", 400)
    if language not in LANGUAGES:
        language = "en"

    child = database.create_child_profile(g.parent["id"], name, language, age_months)
    return (
        jsonify(
            {
                "success": True,
                "user_id": child["id"],
                "user": child,
                "message": "User created successfully",
            }
        ),
        201,
    )


@app.route("/api/users/<int:user_id>", methods=["GET"])
@require_auth
def get_user(user_id):
    _, error = _require_child_access(user_id)
    if error:
        return error
    user = database.get_user(user_id)
    if user:
        return jsonify({"success": True, "user": user})
    return _json_error("User not found", 404)


@app.route("/api/users/<int:user_id>/language", methods=["PUT"])
@require_auth
def update_language(user_id):
    _, error = _require_child_access(user_id)
    if error:
        return error

    data = request.json or {}
    language = (data.get("language") or "en").strip().lower()
    if language not in LANGUAGES:
        return _json_error("Invalid language", 400)

    database.update_user_language(user_id, language)
    return jsonify({"success": True, "language": language})


# ========== Progress Endpoints ==========

@app.route("/api/users/<int:user_id>/progress", methods=["GET"])
@require_auth
def get_all_progress(user_id):
    _, error = _require_child_access(user_id)
    if error:
        return error
    progress = database.get_all_progress(user_id)
    return jsonify({"success": True, "progress": progress})


@app.route("/api/users/<int:user_id>/progress/<module>", methods=["GET"])
@require_auth
def get_module_progress(user_id, module):
    _, error = _require_child_access(user_id)
    if error:
        return error
    if module not in MODULES:
        return _json_error("Invalid module", 400)

    progress = database.get_progress(user_id, module)
    return jsonify({"success": True, "progress": progress})


@app.route("/api/users/<int:user_id>/progress/<module>", methods=["POST"])
@require_auth
def save_module_progress(user_id, module):
    _, error = _require_child_access(user_id)
    if error:
        return error
    if module not in MODULES:
        return _json_error("Invalid module", 400)

    data = request.json or {}
    level = data.get("level", 1)
    attempts = data.get("attempts", 0)
    successes = data.get("successes", 0)
    last_played = data.get("last_played")

    database.save_progress(user_id, module, level, attempts, successes, last_played)
    return jsonify({"success": True, "message": "Progress saved"})


@app.route("/api/users/<int:user_id>/sync", methods=["POST"])
@require_auth
def sync_data(user_id):
    _, error = _require_child_access(user_id)
    if error:
        return error

    data = request.json or {}
    progress_data = data.get("progress", [])
    attempts_data = data.get("attempts", [])

    progress_count = database.batch_sync_progress(user_id, progress_data) if progress_data else 0
    attempts_count = database.batch_sync_attempts(user_id, attempts_data) if attempts_data else 0

    return jsonify(
        {
            "success": True,
            "counts": {
                "progress": progress_count,
                "attempts": attempts_count,
            },
        }
    )


# ========== Companion Sync Endpoints (Journal / Avatar / Achievements) ==========

@app.route("/api/users/<int:user_id>/companion", methods=["GET"])
@require_auth
def get_companion_data(user_id: int):
    _, error = _require_child_access(user_id)
    if error:
        return error

    journal = database.get_journal_entries(user_id)
    avatar = database.get_avatar_profile(user_id)
    unlocks = database.get_achievement_unlocks(user_id)

    return jsonify(
        {
            "success": True,
            "journal_entries": journal,
            "avatar_profile": _avatar_to_mobile(avatar),
            "achievement_unlocks": unlocks,
        }
    )


@app.route("/api/users/<int:user_id>/companion/sync", methods=["POST"])
@require_auth
def sync_companion_data(user_id: int):
    _, error = _require_child_access(user_id)
    if error:
        return error

    data = request.json or {}
    journal_entries = data.get("journal_entries", [])
    avatar_profile = _normalize_avatar_payload(data.get("avatar_profile", {}))
    achievement_unlocks = data.get("achievement_unlocks", {})

    journal_count = 0
    if isinstance(journal_entries, list):
        journal_count = database.sync_journal_entries(user_id, journal_entries)

    avatar_saved = None
    if isinstance(avatar_profile, dict) and avatar_profile:
        avatar_saved = database.save_avatar_profile(user_id, avatar_profile)

    achievement_count = 0
    if isinstance(achievement_unlocks, dict):
        achievement_count = database.sync_achievement_unlocks(user_id, achievement_unlocks)

    remote_journal = database.get_journal_entries(user_id)
    remote_avatar = avatar_saved or database.get_avatar_profile(user_id)
    remote_unlocks = database.get_achievement_unlocks(user_id)

    return jsonify(
        {
            "success": True,
            "counts": {
                "journal_entries_synced": journal_count,
                "achievement_unlocks_synced": achievement_count,
            },
            "journal_entries": remote_journal,
            "avatar_profile": _avatar_to_mobile(remote_avatar),
            "achievement_unlocks": remote_unlocks,
        }
    )


@app.route("/api/users/<int:user_id>/journal", methods=["POST"])
@require_auth
def upsert_journal_entry(user_id: int):
    _, error = _require_child_access(user_id)
    if error:
        return error

    data = request.json or {}
    entry_id = str(data.get("id") or "").strip()
    text = str(data.get("text") or "").strip()
    if not entry_id or not text:
        return _json_error("Journal entry requires id and text", 400)

    photo_uri = data.get("photo_uri")
    if photo_uri is not None:
        photo_uri = str(photo_uri)

    created_at = data.get("created_at")
    if created_at is not None:
        created_at = str(created_at)

    saved = database.upsert_journal_entry(user_id, entry_id, text, photo_uri, created_at)
    return jsonify({"success": True, "entry": saved})


@app.route("/api/users/<int:user_id>/journal/<entry_id>", methods=["DELETE"])
@require_auth
def delete_journal_entry(user_id: int, entry_id: str):
    _, error = _require_child_access(user_id)
    if error:
        return error

    deleted = database.delete_journal_entry(user_id, entry_id)
    if not deleted:
        return _json_error("Journal entry not found", 404)

    return jsonify({"success": True})


# ========== Module Info Endpoints ==========

@app.route("/api/modules", methods=["GET"])
def get_modules():
    return jsonify({"success": True, "modules": MODULES})


# ========== Encouragement Endpoint ==========

@app.route("/api/encouragement/<language>", methods=["GET"])
def get_encouragement(language):
    message = get_random_encouragement(language, ENCOURAGEMENT_MESSAGES)
    return jsonify({"success": True, "message": message, "language": language})


# ========== AI Chat Endpoint (Ollama / Groq) ==========

@app.route("/api/chat", methods=["POST"])
def ai_chat():
    data = request.json or {}
    user_message = data.get("message", "")
    if not user_message:
        return _json_error("No message provided", 400)

    system_prompt = """You are a friendly, encouraging AI companion for kids learning through play.
    Keep responses SHORT (1-2 sentences), positive, and age-appropriate.
    Use simple words and be enthusiastic! Never be negative."""

    # Try Groq first if key is available
    if GROQ_API_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_API_KEY)
            completion = client.chat.completions.create(
                model="llama-3.2-3b-preview", # Low cost/fast model
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=60,
                temperature=0.7,
            )
            response_text = completion.choices[0].message.content
            return jsonify({"success": True, "response": response_text})
        except Exception as groq_exc:
            print(f"Groq error: {groq_exc}")

    # Fallback to local Ollama
    try:
        import requests
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": f"{system_prompt}\n\nChild says: {user_message}\n\nYour encouraging response:",
                "stream": False,
            },
            timeout=10,
        )
        if response.status_code == 200:
            result = response.json()
            return jsonify({"success": True, "response": result.get("response", "Great job! Keep going!")})
    except Exception as ollama_exc:
        print(f"Ollama error: {ollama_exc}")

    return jsonify({"success": True, "response": "You're doing amazing! Keep it up!"})


# ========== Voice Endpoint ==========

@app.route("/api/speak", methods=["POST"])
def speak():
    data = request.json or {}
    text = data.get("text", "")
    language = data.get("language", "en")
    if not text:
        return _json_error("No text provided", 400)

    try:
        from services import voice_service

        audio_url = voice_service.generate_speech(text, language=language)
        if audio_url:
            return jsonify({"success": True, "audio_url": audio_url})
        return _json_error("Could not generate audio (check API key)", 500)
    except Exception as exc:
        return _json_error(str(exc), 500)


@app.route("/assets/audio/cache/<path:filename>")
def serve_audio_cache(filename):
    return send_from_directory(AUDIO_CACHE_DIR, filename)


# ========== Data Export / Account Deletion (COPPA/GDPR) ==========

@app.route("/api/auth/export-data", methods=["GET"])
@require_auth
def export_data():
    data = database.export_parent_data(g.parent["id"])
    return jsonify({"success": True, "data": data})


@app.route("/api/auth/account", methods=["DELETE"])
@require_auth
def delete_account():
    parent_id = g.parent["id"]
    deleted = database.delete_parent_account(parent_id)
    if not deleted:
        return _json_error("Account not found", 404)
    return jsonify({"success": True, "message": "Account and all associated data permanently deleted"})


if __name__ == "__main__":
    print(f"RealLife Steps API running at http://{HOST}:{PORT}")
    print("Modules: " + " | ".join([m["name"] for m in MODULES.values()]))
    print("Languages: " + " | ".join(LANGUAGES))
    app.run(host=HOST, port=PORT, debug=DEBUG)
