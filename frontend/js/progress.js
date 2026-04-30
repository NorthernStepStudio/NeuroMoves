/**
 * RealLife Steps - Progress Manager
 * Handles saving and loading user progress
 */

const ProgressManager = {
    apiBase: 'http://127.0.0.1:5000/api',
    userId: null,
    localProgress: {},

    /**
     * Initialize progress manager
     */
    init() {
        this.userId = localStorage.getItem('reallife_steps_user_id');
        this.loadLocalProgress();
    },

    /**
     * Load progress from local storage
     */
    loadLocalProgress() {
        const saved = localStorage.getItem('reallife_steps_progress');
        if (saved) {
            try {
                this.localProgress = JSON.parse(saved);
            } catch (e) {
                this.localProgress = {};
            }
        }
    },

    /**
     * Save progress to local storage and optionally to backend
     */
    saveProgress(moduleId, level, attempts = 0) {
        // Always save locally first
        this.localProgress[moduleId] = {
            level: level,
            attempts: attempts,
            lastPlayed: new Date().toISOString()
        };
        localStorage.setItem('reallife_steps_progress', JSON.stringify(this.localProgress));

        // Try to sync with backend
        this.syncWithBackend(moduleId, level);
    },

    /**
     * Get progress for a module
     */
    getProgress(moduleId) {
        return this.localProgress[moduleId] || { level: 1, attempts: 0 };
    },

    /**
     * Get all progress data
     */
    getAllProgress() {
        return this.localProgress;
    },

    /**
     * Calculate completion percentage for a module
     */
    getCompletionPercent(moduleId, maxLevel = 10) {
        const progress = this.getProgress(moduleId);
        return Math.min(100, (progress.level / maxLevel) * 100);
    },

    /**
     * Sync progress with backend
     */
    async syncWithBackend(moduleId, level) {
        if (!this.userId) return;

        try {
            await fetch(`${this.apiBase}/users/${this.userId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    module: moduleId,
                    level: level
                })
            });
        } catch (e) {
            // Backend not available - that's OK, we have local storage
        }
    },

    /**
     * Load progress from backend
     */
    async loadFromBackend() {
        if (!this.userId) return;

        try {
            const res = await fetch(`${this.apiBase}/users/${this.userId}/progress`);
            const data = await res.json();
            if (data.success && data.progress) {
                // Merge with local progress (prefer higher levels)
                data.progress.forEach(p => {
                    const moduleId = p.module.toLowerCase();
                    const local = this.localProgress[moduleId];
                    if (!local || p.level > local.level) {
                        this.localProgress[moduleId] = {
                            level: p.level,
                            attempts: 0,
                            lastPlayed: new Date().toISOString()
                        };
                    }
                });
                localStorage.setItem('reallife_steps_progress', JSON.stringify(this.localProgress));
            }
        } catch (e) {
            // Backend not available
        }
    },

    /**
     * Update progress bars on home screen
     */
    updateProgressBars() {
        const moduleMap = {
            'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
            'shapes': 'shapes', 'stacking': 'stacking', 'tracing': 'tracing',
            'colors': 'colors', 'bubbles': 'bubbles', 'emotions': 'emotions',
            'bodyparts': 'bodyparts', 'animals': 'animals'
        };

        Object.keys(moduleMap).forEach(id => {
            const bar = document.getElementById(`progress-${id}`);
            if (bar) {
                const percent = this.getCompletionPercent(moduleMap[id]);
                bar.style.width = `${percent}%`;
            }
        });
    },

    /**
     * Level up in a module
     */
    levelUp(moduleId) {
        const current = this.getProgress(moduleId);
        const newLevel = Math.min(10, current.level + 1);
        this.saveProgress(moduleId, newLevel);
        return newLevel;
    },

    /**
     * Reset progress for a module
     */
    resetModule(moduleId) {
        this.saveProgress(moduleId, 1, 0);
    },

    /**
     * Reset all progress
     */
    resetAll() {
        this.localProgress = {};
        localStorage.removeItem('reallife_steps_progress');
    }
};

// Export
window.ProgressManager = ProgressManager;
