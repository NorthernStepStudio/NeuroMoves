"""
Module A: Magic Fingers - Sequence Manager
Tracks finger counting sequences (1 -> 2 -> 3)
"""

from config import MODULES, MAX_ATTEMPTS_BEFORE_HINT


class SequenceManager:
    """Manages finger counting sequences for Magic Fingers module"""
    
    def __init__(self, target_sequence: list = None):
        self.target_sequence = target_sequence or [1, 2, 3, 4, 5]
        self.current_index = 0
        self.attempts = 0
        self.errors = 0
        self.completed = False
    
    def reset(self):
        """Reset the sequence state"""
        self.current_index = 0
        self.attempts = 0
        self.errors = 0
        self.completed = False
    
    def check_input(self, finger_number: int) -> dict:
        """
        Check if the finger tap matches the expected sequence
        
        Returns:
            dict with 'correct', 'completed', 'hint', 'next_expected'
        """
        self.attempts += 1
        expected = self.target_sequence[self.current_index]
        
        result = {
            "correct": False,
            "completed": False,
            "hint": False,
            "next_expected": expected,
            "attempts": self.attempts
        }
        
        if finger_number == expected:
            # Correct!
            result["correct"] = True
            self.current_index += 1
            self.errors = 0  # Reset error count on success
            
            # Check if sequence is complete
            if self.current_index >= len(self.target_sequence):
                result["completed"] = True
                self.completed = True
            else:
                result["next_expected"] = self.target_sequence[self.current_index]
        else:
            # Incorrect - Errorless Learning: redirect, don't penalize
            self.errors += 1
            
            # Provide hint after MAX_ATTEMPTS_BEFORE_HINT failures
            if self.errors >= MAX_ATTEMPTS_BEFORE_HINT:
                result["hint"] = True
        
        return result
    
    def get_progress_percentage(self) -> float:
        """Get completion percentage of current sequence"""
        return (self.current_index / len(self.target_sequence)) * 100
    
    def set_sequence(self, sequence: list):
        """Set a new target sequence"""
        self.target_sequence = sequence
        self.reset()


# Level configurations for Magic Fingers
MAGIC_FINGERS_LEVELS = {
    1: {"sequence": [1], "description": "Tap finger 1"},
    2: {"sequence": [1, 2], "description": "Count 1, 2"},
    3: {"sequence": [1, 2, 3], "description": "Count 1, 2, 3"},
    4: {"sequence": [1, 2, 3, 4], "description": "Count 1, 2, 3, 4"},
    5: {"sequence": [1, 2, 3, 4, 5], "description": "Count all fingers"},
    6: {"sequence": [5, 4, 3, 2, 1], "description": "Count backwards"},
    7: {"sequence": [1, 3, 5], "description": "Odd fingers only"},
    8: {"sequence": [2, 4], "description": "Even fingers only"},
    9: {"sequence": [1, 1, 2, 2, 3, 3], "description": "Double tap pattern"},
    10: {"sequence": [1, 5, 2, 4, 3], "description": "Mixed pattern"}
}


def get_level_config(level: int) -> dict:
    """Get configuration for a specific level"""
    return MAGIC_FINGERS_LEVELS.get(level, MAGIC_FINGERS_LEVELS[1])
