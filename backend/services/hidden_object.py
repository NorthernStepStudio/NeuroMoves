"""
Module B: Point It Out - Hidden Object Logic
Manages hidden object discovery in photorealistic scenes
"""

from config import MAX_ATTEMPTS_BEFORE_HINT
import random


class HiddenObjectManager:
    """Manages hidden object gameplay for Point It Out module"""
    
    def __init__(self, objects: list = None):
        """
        Initialize with list of objects to find
        Each object: {"id": str, "name": str, "found": bool, "position": {"x": float, "y": float}}
        """
        self.objects = objects or []
        self.current_target = None
        self.attempts = 0
        self.errors_on_current = 0
        self.found_count = 0
    
    def set_objects(self, objects: list):
        """Set the objects for this level"""
        self.objects = [
            {**obj, "found": False} for obj in objects
        ]
        self.found_count = 0
        self.select_next_target()
    
    def select_next_target(self):
        """Select the next object to find"""
        unfound = [obj for obj in self.objects if not obj["found"]]
        if unfound:
            self.current_target = random.choice(unfound)
            self.errors_on_current = 0
        else:
            self.current_target = None
    
    def check_tap(self, x: float, y: float, tolerance: float = 50) -> dict:
        """
        Check if a tap location matches the current target
        
        Args:
            x, y: Tap coordinates
            tolerance: Pixel distance considered a "hit"
        
        Returns:
            dict with 'correct', 'completed', 'hint', 'glow', 'target_name'
        """
        self.attempts += 1
        
        result = {
            "correct": False,
            "completed": False,
            "hint": False,
            "glow": False,
            "target_name": self.current_target["name"] if self.current_target else None,
            "found_count": self.found_count,
            "total_count": len(self.objects)
        }
        
        if not self.current_target:
            result["completed"] = True
            return result
        
        # Calculate distance to target
        target_x = self.current_target["position"]["x"]
        target_y = self.current_target["position"]["y"]
        distance = ((x - target_x) ** 2 + (y - target_y) ** 2) ** 0.5
        
        if distance <= tolerance:
            # Found it!
            result["correct"] = True
            self.current_target["found"] = True
            self.found_count += 1
            
            # Check if all objects found
            if self.found_count >= len(self.objects):
                result["completed"] = True
            else:
                self.select_next_target()
                result["target_name"] = self.current_target["name"] if self.current_target else None
        else:
            # Missed - Errorless Learning approach
            self.errors_on_current += 1
            
            if self.errors_on_current >= MAX_ATTEMPTS_BEFORE_HINT:
                result["hint"] = True
                # Make the object glow after repeated failures
                result["glow"] = True
        
        return result
    
    def get_current_prompt(self, language: str = "en") -> str:
        """Get the prompt for finding the current object"""
        if not self.current_target:
            return ""
        
        prompts = {
            "en": f"Where is the {self.current_target['name']}?",
            "es": f"¿Dónde está el/la {self.current_target['name']}?",
            "it": f"Dov'è il/la {self.current_target['name']}?"
        }
        return prompts.get(language, prompts["en"])


# Level configurations for Point It Out
POINT_IT_OUT_LEVELS = {
    1: {
        "scene": "living_room",
        "objects": [
            {"id": "apple", "name": "apple", "position": {"x": 200, "y": 300}}
        ]
    },
    2: {
        "scene": "living_room",
        "objects": [
            {"id": "apple", "name": "apple", "position": {"x": 200, "y": 300}},
            {"id": "bear", "name": "teddy bear", "position": {"x": 450, "y": 400}}
        ]
    },
    3: {
        "scene": "playroom",
        "objects": [
            {"id": "ball", "name": "ball", "position": {"x": 150, "y": 250}},
            {"id": "car", "name": "toy car", "position": {"x": 400, "y": 350}},
            {"id": "duck", "name": "rubber duck", "position": {"x": 300, "y": 450}}
        ]
    }
}


def get_level_config(level: int) -> dict:
    """Get configuration for a specific level"""
    return POINT_IT_OUT_LEVELS.get(level, POINT_IT_OUT_LEVELS[1])
