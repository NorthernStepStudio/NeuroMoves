"""Retired runtime voice service.

NeuroMoves now ships pre-generated EVA audio files in the app bundle. Runtime
speech synthesis is intentionally disabled so gameplay works offline and never
depends on a local or remote TTS server.
"""


def generate_speech(text, language="en"):
    """Runtime synthesis is disabled; return None without blocking callers."""
    return None
