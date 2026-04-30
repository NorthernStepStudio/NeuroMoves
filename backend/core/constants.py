"""
RealLife Steps - Constants
Shared constants across the backend
"""

# Supported Languages
LANGUAGES = ["en", "es", "it"]
DEFAULT_LANGUAGE = "en"

# Module Configuration
MODULES = {
    "A": {
        "name": "Magic Fingers",
        "description": "3D Hand animation and finger isolation",
        "max_levels": 10
    },
    "B": {
        "name": "Point It Out", 
        "description": "Hidden object in photorealistic scenes",
        "max_levels": 15
    },
    "C": {
        "name": "Baby Signs",
        "description": "Video player with rhythm/tap detection",
        "max_levels": 20
    },
    "D": {
        "name": "Yes/No",
        "description": "Gesture recognition with avatar expressions",
        "max_levels": 10
    }
}

# Errorless Learning Configuration
MAX_ATTEMPTS_BEFORE_HINT = 3
ENCOURAGEMENT_MESSAGES = {
    "en": ["Good job!", "Keep trying!", "You're doing great!", "Almost there!"],
    "es": ["¡Buen trabajo!", "¡Sigue intentando!", "¡Lo estás haciendo genial!", "¡Ya casi!"],
    "it": ["Bravo!", "Continua a provare!", "Stai andando alla grande!", "Ci sei quasi!"]
}
