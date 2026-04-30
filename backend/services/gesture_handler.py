"""
Module D: Yes/No - Gesture Handler
Handles swipe gestures for Yes (vertical) and No (horizontal) responses
"""

from config import MAX_ATTEMPTS_BEFORE_HINT
import math


class GestureHandler:
    """Handles swipe gesture recognition for Yes/No module"""
    
    # Minimum swipe distance to register
    MIN_SWIPE_DISTANCE = 50
    
    # Angle thresholds (in degrees)
    HORIZONTAL_ANGLE_THRESHOLD = 30  # 0-30° or 150-180° = horizontal
    VERTICAL_ANGLE_THRESHOLD = 30    # 60-120° = vertical
    
    def __init__(self):
        self.expected_response = None  # "yes" or "no"
        self.attempts = 0
        self.errors = 0
    
    def set_expected(self, response: str):
        """Set the expected response for this question"""
        self.expected_response = response.lower()
        self.attempts = 0
        self.errors = 0
    
    def analyze_swipe(self, start_x: float, start_y: float, 
                      end_x: float, end_y: float) -> dict:
        """
        Analyze a swipe gesture
        
        Args:
            start_x, start_y: Starting touch position
            end_x, end_y: Ending touch position
        
        Returns:
            dict with 'gesture', 'correct', 'hint', 'blend_shape'
        """
        dx = end_x - start_x
        dy = end_y - start_y
        distance = math.sqrt(dx * dx + dy * dy)
        
        result = {
            "gesture": None,
            "correct": False,
            "hint": False,
            "blend_shape": None,  # For avatar expression
            "distance": distance
        }
        
        # Check if swipe is too short
        if distance < self.MIN_SWIPE_DISTANCE:
            result["gesture"] = "tap"  # Too short, not a swipe
            return result
        
        # Calculate angle (0° = right, 90° = up)
        angle = math.degrees(math.atan2(-dy, dx))  # Negative dy because screen Y is inverted
        if angle < 0:
            angle += 360
        
        # Determine gesture type
        if (angle <= self.HORIZONTAL_ANGLE_THRESHOLD or 
            angle >= 360 - self.HORIZONTAL_ANGLE_THRESHOLD or
            (angle >= 180 - self.HORIZONTAL_ANGLE_THRESHOLD and 
             angle <= 180 + self.HORIZONTAL_ANGLE_THRESHOLD)):
            result["gesture"] = "no"
            result["blend_shape"] = "head_shake"
        elif (angle >= 90 - self.VERTICAL_ANGLE_THRESHOLD and 
              angle <= 90 + self.VERTICAL_ANGLE_THRESHOLD):
            result["gesture"] = "yes"
            result["blend_shape"] = "head_nod"
        elif (angle >= 270 - self.VERTICAL_ANGLE_THRESHOLD and 
              angle <= 270 + self.VERTICAL_ANGLE_THRESHOLD):
            result["gesture"] = "yes"  # Down swipe also counts as yes
            result["blend_shape"] = "head_nod"
        else:
            result["gesture"] = "diagonal"  # Unclear gesture
            return result
        
        # Check correctness
        self.attempts += 1
        
        if result["gesture"] == self.expected_response:
            result["correct"] = True
            self.errors = 0
            # Set appropriate blend shape for positive feedback
            if result["gesture"] == "yes":
                result["blend_shape"] = "smile_nod"
            else:
                result["blend_shape"] = "head_shake"
        else:
            self.errors += 1
            # Errorless Learning: provide hint after MAX_ATTEMPTS_BEFORE_HINT
            if self.errors >= MAX_ATTEMPTS_BEFORE_HINT:
                result["hint"] = True
        
        return result
    
    def get_hint_direction(self) -> str:
        """Get hint about which direction to swipe"""
        if self.expected_response == "yes":
            return "up_down"
        elif self.expected_response == "no":
            return "left_right"
        return None


# Yes/No question configurations
YES_NO_LEVELS = {
    1: {
        "questions": [
            {"text": "Is this an apple?", "image": "apple.png", "answer": "yes"},
        ],
        "description": "Simple identification"
    },
    2: {
        "questions": [
            {"text": "Is this an apple?", "image": "apple.png", "answer": "yes"},
            {"text": "Is this a banana?", "image": "apple.png", "answer": "no"},
        ],
        "description": "Yes and No"
    },
    3: {
        "questions": [
            {"text": "Is the ball red?", "image": "red_ball.png", "answer": "yes"},
            {"text": "Is the ball blue?", "image": "red_ball.png", "answer": "no"},
            {"text": "Is this a cat?", "image": "dog.png", "answer": "no"},
        ],
        "description": "Colors and animals"
    }
}

# Avatar blend shape mappings
AVATAR_BLEND_SHAPES = {
    "neutral": {"smile": 0, "nod": 0, "shake": 0},
    "smile_nod": {"smile": 1.0, "nod": 1.0, "shake": 0},
    "head_nod": {"smile": 0.3, "nod": 1.0, "shake": 0},
    "head_shake": {"smile": 0, "nod": 0, "shake": 1.0},
    "encouraging": {"smile": 0.7, "nod": 0.3, "shake": 0}
}


def get_level_config(level: int) -> dict:
    """Get configuration for a specific level"""
    return YES_NO_LEVELS.get(level, YES_NO_LEVELS[1])


def get_blend_shape_values(shape_name: str) -> dict:
    """Get blend shape values for avatar animation"""
    return AVATAR_BLEND_SHAPES.get(shape_name, AVATAR_BLEND_SHAPES["neutral"])
