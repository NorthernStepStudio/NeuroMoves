"""
Voice Service Module
Handles interaction with ElevenLabs API for high-quality TTS.
"""

import os
import hashlib
import requests
from config import AUDIO_CACHE_DIR, LOCAL_TTS_URL

# Cache directory for audio files
CACHE_DIR = AUDIO_CACHE_DIR
os.makedirs(CACHE_DIR, exist_ok=True)

def generate_speech(text, voice_id="hybrid", language="en"):
    """
    Generate speech using the local Neural Studio TTS-app.
    """
    if not text:
        return None

    # check cache first
    text_hash = hashlib.md5(f"{text}_{voice_id}_{language}".encode()).hexdigest()
    filename = f"{text_hash}.mp3"
    filepath = os.path.join(CACHE_DIR, filename)
    
    # Relative path for frontend to access (neuromoves convention)
    relative_path = f"assets/audio/cache/{filename}"

    if os.path.exists(filepath):
        return relative_path

    # Call Local TTS API
    # Endpoint: POST /v1/synthesis
    # Body: { text: "...", voice_id: "...", ... }
    url = f"{LOCAL_TTS_URL}/v1/synthesis"
    data = {
        "text": text,
        "voice_id": voice_id,
        "engine": "xtts",
        "language": language
    }
    try:
        # 1. Trigger synthesis
        print(f"[Voice] Requesting synthesis from {url} for text: {text[:30]}...")
        response = requests.post(url, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        print(f"[Voice] Synthesis triggered. Result: {result}")
        
        # 2. Get the generated WAV URL
        source_audio_url = result.get("url")
        if not source_audio_url:
            print("Error: TTS-app returned success but no URL")
            return None

        # 3. Download the actual audio data from the local TTS server
        # The TTS server hosts its output folder at /output
        audio_download_url = f"{LOCAL_TTS_URL}{source_audio_url}"
        audio_response = requests.get(audio_download_url, timeout=10)
        audio_response.raise_for_status()

        # 4. Save to neuromoves cache
        with open(filepath, "wb") as f:
            f.write(audio_response.content)
            
        return relative_path

    except Exception as e:
        print(f"Error generating speech via local TTS ({LOCAL_TTS_URL}): {e}")
        return None
