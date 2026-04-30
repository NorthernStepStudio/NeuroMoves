/**
 * RealLife Steps - Errorless Learning Module
 * Core Philosophy: Never say "Game Over" - redirect and encourage
 */

const ErrorlessLearning = {
    // Configuration
    maxAttemptsBeforeHint: 3,
    currentAttempts: 0,

    // Audio elements (will be loaded from AI-generated files)
    audioEnabled: true,

    /**
     * Initialize errorless learning system
     */
    init() {
        this.currentAttempts = 0;
    },

    /**
     * Record an attempt and determine appropriate feedback
     * @param {boolean} success - Whether the attempt was successful
     * @returns {object} Feedback object with type, message, and actions
     */
    recordAttempt(success) {
        const feedback = {
            type: success ? 'success' : 'redirect',
            message: '',
            showHint: false,
            playAudio: null,
            emoji: '🌟'
        };

        if (success) {
            // Success! Reset attempts and celebrate
            this.currentAttempts = 0;
            feedback.message = Localization.getEncouragement();
            feedback.emoji = this.getSuccessEmoji();
            feedback.playAudio = 'success';
        } else {
            // Not quite right - redirect, don't penalize
            this.currentAttempts++;
            feedback.message = Localization.getRedirect();
            feedback.emoji = this.getRedirectEmoji();
            feedback.playAudio = 'redirect';

            // Provide hint after max attempts
            if (this.currentAttempts >= this.maxAttemptsBeforeHint) {
                feedback.showHint = true;
                feedback.message = Localization.get('hint_glow');
            }
        }

        return feedback;
    },

    /**
     * Show visual feedback popup
     * @param {object} feedback - Feedback object from recordAttempt
     * @param {number} duration - How long to show in ms (default 1500)
     */
    showFeedback(feedback, duration = 1500) {
        const popup = document.getElementById('feedback-popup');
        const emoji = document.getElementById('feedback-emoji');
        const text = document.getElementById('feedback-text');

        if (!popup || !emoji || !text) return;

        emoji.textContent = feedback.emoji;
        text.textContent = feedback.message;

        // Update colors based on feedback type
        if (feedback.type === 'success') {
            text.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
            this.spawnConfetti(); // Celebration!
        } else {
            text.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
        }
        text.style.webkitBackgroundClip = 'text';
        text.style.webkitTextFillColor = 'transparent';

        popup.classList.remove('hidden');

        if (this.audioEnabled && feedback.playAudio) {
            this.playAudio(feedback.playAudio);
        }

        // Haptic Feedback
        if (window.AudioManager) {
            AudioManager.vibrate(feedback.type === 'success' ? 'success' : 'failure');
        }

        // Auto-hide after duration
        setTimeout(() => {
            popup.classList.add('hidden');
        }, duration);
    },

    /**
     * Spawn celebration confetti particles
     */
    spawnConfetti() {
        const colors = ['#00f2ff', '#ff00ff', '#ccff00', '#ff6b6b', '#ffaa00', '#a855f7'];
        const shapes = ['🎉', '✨', '⭐', '🌟', '💎', '🔮'];

        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.textContent = shapes[Math.floor(Math.random() * shapes.length)];
            p.className = 'celebration-particle';
            p.style.position = 'fixed';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.top = '-50px';
            p.style.fontSize = (1.5 + Math.random() * 2) + 'rem';
            p.style.animationDuration = (1.5 + Math.random() * 2) + 's';
            p.style.animationDelay = Math.random() * 0.5 + 's';
            p.style.transform = `rotate(${Math.random() * 360}deg)`;

            document.body.appendChild(p);

            // Clean up
            setTimeout(() => { document.body.removeChild(p); }, 4000);
        }
    },

    /**
     * Apply glow hint effect to an element
     * @param {HTMLElement} element - Element to apply glow to
     */
    applyGlowHint(element) {
        if (element) {
            element.classList.add('glow-hint');
        }
    },

    /**
     * Remove glow hint effect
     * @param {HTMLElement} element - Element to remove glow from
     */
    removeGlowHint(element) {
        if (element) {
            element.classList.remove('glow-hint');
        }
    },

    /**
     * Play audio feedback using AudioManager
     * @param {string} type - Audio type ('success' or 'redirect')
     */
    playAudio(type) {
        if (!window.AudioManager) return;

        // Resume audio context on user interaction (required for mobile)
        AudioManager.resume();

        if (type === 'success') {
            AudioManager.playSuccess();
        } else {
            AudioManager.playEncourage();
        }
    },

    /**
     * Get random success emoji
     * @returns {string} Emoji
     */
    getSuccessEmoji() {
        const emojis = ['🌟', '⭐', '🎉', '🎊', '👏', '💫', '✨', '🏆'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    },

    /**
     * Get random redirect emoji (encouraging, never negative)
     * @returns {string} Emoji
     */
    getRedirectEmoji() {
        const emojis = ['💪', '🌈', '🦋', '🌻', '💖', '🍀'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    },

    /**
     * Reset attempt counter (call when starting new activity)
     */
    reset() {
        this.currentAttempts = 0;
    },

    /**
     * Adjust difficulty dynamically
     * @param {number} successRate - Success rate (0-1)
     * @returns {object} Difficulty adjustments
     */
    adjustDifficulty(successRate) {
        const adjustments = {
            shouldReduceDifficulty: false,
            shouldIncreaseDifficulty: false,
            message: ''
        };

        if (successRate < 0.4) {
            // Struggling - make things easier
            adjustments.shouldReduceDifficulty = true;
            adjustments.message = 'Making it a bit easier for you!';
        } else if (successRate > 0.9) {
            // Doing great - can increase challenge
            adjustments.shouldIncreaseDifficulty = true;
            adjustments.message = 'Ready for a new challenge!';
        }

        return adjustments;
    }
};

// Export for use in other modules
window.ErrorlessLearning = ErrorlessLearning;
