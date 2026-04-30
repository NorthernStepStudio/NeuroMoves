"""
RealLife Steps - Configuration
Database user: db_admin_Loky
"""

import os

# Database Configuration
DATABASE_URL = os.environ.get("DATABASE_URL", "") # Supabase/Postgres
DATABASE_NAME = "reallife_steps.db"
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "database", DATABASE_NAME)
DB_USER = "db_admin_Loky"

# Server Configuration
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", 5000))
DEBUG = os.environ.get("DEBUG", "True").lower() == "true"

# Authentication Configuration
AUTH_SESSION_TTL_DAYS = int(os.environ.get("AUTH_SESSION_TTL_DAYS", "30"))
PASSWORD_RESET_TTL_MINUTES = int(os.environ.get("PASSWORD_RESET_TTL_MINUTES", "15"))

# Email Configuration
SMTP_SERVER = os.environ.get("SMTP_SERVER", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "noreply@reallifesteps.com")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_IDS = [
    value.strip()
    for value in os.environ.get("GOOGLE_CLIENT_IDS", "").split(",")
    if value.strip()
]
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID not in GOOGLE_CLIENT_IDS:
    GOOGLE_CLIENT_IDS.append(GOOGLE_CLIENT_ID)

# AI Voice Configuration
LOCAL_TTS_URL = os.environ.get("LOCAL_TTS_URL", "http://127.0.0.1:8888").strip("/")
AUDIO_CACHE_DIR = os.environ.get(
    "AUDIO_CACHE_DIR",
    os.path.join(os.path.dirname(__file__), "..", "frontend", "assets", "audio", "cache"),
)
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "") # Fallback/Legacy
ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

# AI Chat Configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# Security Configuration
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:8085,http://localhost:19006").split(",")
    if o.strip()
]
RATE_LIMIT_DEFAULT = os.environ.get("RATE_LIMIT_DEFAULT", "60/minute")
RATE_LIMIT_AUTH = os.environ.get("RATE_LIMIT_AUTH", "10/minute")
