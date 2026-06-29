"""
Voice Service Module

Generates speech via the Piper TTS Voice server (en-US-AvaNeural voice).
Audio is cached locally so repeated phrases are served instantly.
"""

import os
import hashlib
import requests
from config import AUDIO_CACHE_DIR, PIPER_TTS_URL, PIPER_TTS_VOICE_ID

# Cache directory for audio files
CACHE_DIR = AUDIO_CACHE_DIR
os.makedirs(CACHE_DIR, exist_ok=True)


def generate_speech(text, language="en"):
    """
    Generate speech using the Piper TTS EVA voice.

    Calls the Piper TTS Voice server at PIPER_TTS_URL.
    Returns a relative URL path to the cached audio file, or None on failure.
    """
    if not text:
        return None

    # Check cache first
    text_hash = hashlib.md5(f"{text}_{PIPER_TTS_VOICE_ID}_{language}".encode()).hexdigest()
    filename = f"{text_hash}.mp3"
    filepath = os.path.join(CACHE_DIR, filename)

    # Public asset path served by the backend cache route.
    relative_path = f"assets/audio/cache/{filename}"

    if os.path.exists(filepath):
        return relative_path

    # Call the Piper TTS Voice server
    # Endpoint: POST /api/v1/synthesize
    # Body: { text: "...", voice: "en-US-AvaNeural" }
    url = f"{PIPER_TTS_URL}/api/v1/synthesize"
    data = {
        "text": text,
        "voice": PIPER_TTS_VOICE_ID,
    }
    try:
        print(f"[Voice] Requesting EVA synthesis ({PIPER_TTS_VOICE_ID}) from {url} for text: {text[:50]}...")
        response = requests.post(url, json=data, timeout=30)
        response.raise_for_status()

        audio_bytes = response.content
        if not audio_bytes:
            print("[Voice] Error: Piper TTS returned empty audio")
            return None

        # Save to cache
        with open(filepath, "wb") as f:
            f.write(audio_bytes)

        print(f"[Voice] EVA synthesis complete, cached as {filename}")
        return relative_path

    except Exception as e:
        print(f"[Voice] Error generating speech via Piper TTS ({PIPER_TTS_URL}): {e}")
        return None
