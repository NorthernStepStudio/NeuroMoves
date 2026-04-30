"""
RealLife Steps - Helpers
Common utility functions
"""

import random

def get_random_encouragement(language, messages_dict):
    """
    Get a random encouragement message in the specified language.
    """
    if language not in messages_dict:
        language = "en"
    
    messages = messages_dict.get(language, ["Good job!"])
    return random.choice(messages)
