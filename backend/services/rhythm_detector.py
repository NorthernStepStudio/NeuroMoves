"""
Module C: Baby Signs - Rhythm Detector
Detects taps matching video timing for sign language practice
"""

from config import MAX_ATTEMPTS_BEFORE_HINT


class RhythmDetector:
    """Detects rhythm/timing for Baby Signs module"""
    
    def __init__(self, beat_times: list = None, tolerance_ms: int = 500):
        """
        Initialize rhythm detector
        
        Args:
            beat_times: List of timestamps (in ms) when taps are expected
            tolerance_ms: How close the tap must be to the beat (default 500ms)
        """
        self.beat_times = beat_times or []
        self.tolerance_ms = tolerance_ms
        self.current_beat_index = 0
        self.hits = 0
        self.misses = 0
        self.completed = False
    
    def reset(self):
        """Reset the rhythm state"""
        self.current_beat_index = 0
        self.hits = 0
        self.misses = 0
        self.completed = False
    
    def set_beats(self, beat_times: list, tolerance_ms: int = 500):
        """Set new beat pattern"""
        self.beat_times = beat_times
        self.tolerance_ms = tolerance_ms
        self.reset()
    
    def check_tap(self, tap_time_ms: float) -> dict:
        """
        Check if a tap matches the expected beat timing
        
        Args:
            tap_time_ms: Time of the tap in milliseconds from video start
        
        Returns:
            dict with 'on_beat', 'timing_feedback', 'completed', 'score'
        """
        result = {
            "on_beat": False,
            "timing_feedback": "miss",
            "completed": False,
            "score": 0,
            "current_beat": self.current_beat_index + 1,
            "total_beats": len(self.beat_times)
        }
        
        if self.current_beat_index >= len(self.beat_times):
            result["completed"] = True
            result["score"] = self.calculate_score()
            return result
        
        expected_time = self.beat_times[self.current_beat_index]
        diff = abs(tap_time_ms - expected_time)
        
        if diff <= self.tolerance_ms / 4:
            # Perfect timing!
            result["on_beat"] = True
            result["timing_feedback"] = "perfect"
            self.hits += 1
        elif diff <= self.tolerance_ms / 2:
            # Good timing
            result["on_beat"] = True
            result["timing_feedback"] = "good"
            self.hits += 1
        elif diff <= self.tolerance_ms:
            # Acceptable timing
            result["on_beat"] = True
            result["timing_feedback"] = "ok"
            self.hits += 1
        else:
            # Missed - but no penalty (Errorless Learning)
            result["timing_feedback"] = "try_again"
            self.misses += 1
        
        # Move to next beat regardless (keep flow going)
        self.current_beat_index += 1
        
        if self.current_beat_index >= len(self.beat_times):
            result["completed"] = True
            self.completed = True
        
        result["score"] = self.calculate_score()
        return result
    
    def calculate_score(self) -> int:
        """Calculate score out of 100"""
        total = self.hits + self.misses
        if total == 0:
            return 0
        return int((self.hits / total) * 100)
    
    def get_next_beat_time(self) -> float:
        """Get the time of the next expected beat"""
        if self.current_beat_index < len(self.beat_times):
            return self.beat_times[self.current_beat_index]
        return None


# Baby Signs video configurations
BABY_SIGNS_LEVELS = {
    1: {
        "sign": "more",
        "video": "more.mp4",
        "beats": [1000, 2000],  # Tap twice for "more"
        "description": "Sign for 'more'"
    },
    2: {
        "sign": "eat",
        "video": "eat.mp4",
        "beats": [1500, 2500, 3500],
        "description": "Sign for 'eat'"
    },
    3: {
        "sign": "drink",
        "video": "drink.mp4",
        "beats": [1000, 2000, 3000],
        "description": "Sign for 'drink'"
    },
    4: {
        "sign": "please",
        "video": "please.mp4",
        "beats": [1500, 2500],
        "description": "Sign for 'please'"
    },
    5: {
        "sign": "thank_you",
        "video": "thank_you.mp4",
        "beats": [1000, 2000, 3000, 4000],
        "description": "Sign for 'thank you'"
    }
}


def get_level_config(level: int) -> dict:
    """Get configuration for a specific level"""
    return BABY_SIGNS_LEVELS.get(level, BABY_SIGNS_LEVELS[1])
