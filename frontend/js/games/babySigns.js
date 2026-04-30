/**
 * Module C: Baby Signs
 * Video player with rhythm/tap detection overlay
 */

import { Localization, AudioManager } from '../../services/index.js';
import { ErrorlessLearning } from '../../domain/index.js';

export const BabySigns = {
    container: null,
    videoContainer: null,
    video: null,
    tapOverlay: null,

    // Game state
    beatTimes: [],
    currentBeatIndex: 0,
    hits: 0,
    misses: 0,
    tolerance: 500, // ms tolerance for tap timing
    level: 1,
    isPlaying: false,

    // Level configurations
    levels: {
        1: {
            sign: "more",
            video: "assets/videos/more.mp4",
            beats: [1000, 2000],
            description: "Sign for 'more'"
        },
        2: {
            sign: "eat",
            video: "assets/videos/eat.mp4",
            beats: [1500, 2500, 3500],
            description: "Sign for 'eat'"
        },
        3: {
            sign: "drink",
            video: "assets/videos/drink.mp4",
            beats: [1000, 2000, 3000],
            description: "Sign for 'drink'"
        },
        4: {
            sign: "please",
            video: "assets/videos/please.mp4",
            beats: [1500, 2500],
            description: "Sign for 'please'"
        },
        5: {
            sign: "thank_you",
            video: "assets/videos/thank_you.mp4",
            beats: [1000, 2000, 3000, 4000],
            description: "Sign for 'thank you'"
        }
    },

    /**
     * Initialize the Baby Signs module
     * @param {HTMLElement} container - Container element
     */
    init(container) {
        this.container = container;

        // Get video elements
        this.videoContainer = document.getElementById('video-container');
        this.video = document.getElementById('game-video');
        this.tapOverlay = document.getElementById('tap-overlay');

        // Show video container, hide canvas
        document.getElementById('canvas-container').classList.add('hidden');
        this.videoContainer.classList.remove('hidden');

        this.setupInteraction();
        this.loadLevel(this.level);
    },

    /**
     * Load a specific level
     * @param {number} level - Level number
     */
    loadLevel(level) {
        const config = this.levels[level] || this.levels[1];

        // Reset state
        this.beatTimes = [...config.beats];
        this.currentBeatIndex = 0;
        this.hits = 0;
        this.misses = 0;
        this.isPlaying = false;

        // Set video source (placeholder - will use AI-generated video)
        this.video.src = config.video;

        // Handle loading/error
        this.video.onerror = () => {
            console.log('Video not found - using demo mode');
            this.createPlaceholderVideo();
        };

        try {
            this.video.load();
        } catch (e) {
            console.log("Video load error", e);
            this.createPlaceholderVideo();
        }

        // Update UI
        document.getElementById('current-level').textContent = level;
        this.updateInstruction();

        // Add play button overlay
        this.showPlayButton();

        ErrorlessLearning.reset();
    },

    /**
     * Create a placeholder for when video isn't available
     */
    createPlaceholderVideo() {
        // Clear video container and add placeholder
        this.videoContainer.innerHTML = `
            <div class="placeholder-video" style="
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #1a0b2e 0%, #0d0d1a 100%);
                border-radius: 20px;
                border: 2px solid #00f2ff;
                box-shadow: 0 0 30px rgba(0, 242, 255, 0.3);
            ">
                <div class="hand-emoji" style="font-size: 6rem; animation: wave 1s infinite; filter: drop-shadow(0 0 15px #ff00ff);">👋</div>
                <p style="color: #00f2ff; font-size: 1.2rem; margin-top: 20px; text-shadow: 0 0 10px #00f2ff;">Tap along to the beat!</p>
                <div id="beat-indicators" style="display: flex; gap: 20px; margin-top: 30px;"></div>
            </div>
            <div id="tap-overlay" class="tap-overlay" style="pointer-events: auto;"></div>
        `;

        // Create beat indicators
        const indicators = this.videoContainer.querySelector('#beat-indicators');
        if (indicators) {
            this.beatTimes.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.className = 'beat-dot';
                dot.id = `beat-${i}`;
                dot.style.cssText = `
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(0, 242, 255, 0.3);
                    border: 2px solid #00f2ff;
                    transition: all 0.2s ease;
                    box-shadow: 0 0 10px rgba(0, 242, 255, 0.5);
                `;
                indicators.appendChild(dot);
            });
        }

        this.tapOverlay = this.videoContainer.querySelector('#tap-overlay');
        this.setupInteraction();

        // Start demo mode
        this.startDemoMode();
    },

    /**
     * Start demo mode with visual beat cues
     */
    startDemoMode() {
        this.isPlaying = true;
        const startTime = Date.now();

        // Highlight beats as they come
        this.beatTimes.forEach((beatTime, index) => {
            setTimeout(() => {
                const dot = document.getElementById(`beat-${index}`);
                if (dot) {
                    dot.style.background = '#fee140';
                    dot.style.transform = 'scale(1.3)';
                    dot.style.boxShadow = '0 0 20px #fee140';

                    // Reset after a moment
                    setTimeout(() => {
                        if (!dot.classList.contains('hit')) {
                            dot.style.background = 'rgba(255, 255, 255, 0.3)';
                            dot.style.transform = 'scale(1)';
                            dot.style.boxShadow = 'none';
                        }
                    }, 400);
                }
            }, beatTime);
        });

        // End after last beat + buffer
        const lastBeat = Math.max(...this.beatTimes);
        setTimeout(() => {
            this.onVideoEnd();
        }, lastBeat + 1000);

        this.demoStartTime = startTime;
    },

    /**
     * Show play button overlay
     */
    showPlayButton() {
        const existingBtn = document.getElementById('play-btn');
        if (existingBtn) existingBtn.remove();

        const playBtn = document.createElement('button');
        playBtn.id = 'play-btn';
        playBtn.innerHTML = '▶️';
        playBtn.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 4rem;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 50%;
            width: 100px;
            height: 100px;
            cursor: pointer;
            z-index: 10;
        `;

        playBtn.onclick = () => {
            playBtn.remove();
            this.startPlaying();
        };

        this.videoContainer.appendChild(playBtn);
    },

    /**
     * Start playing the video/demo
     */
    startPlaying() {
        if (this.video.src && !this.video.error && this.video.readyState >= 2) {
            // Real video
            this.video.play();
            this.isPlaying = true;
            this.playStartTime = Date.now();

            this.video.onended = () => this.onVideoEnd();
        } else {
            // Just ensure demo mode logic runs if video failed
            if (!this.isPlaying) this.startDemoMode();
        }
    },

    /**
     * Set up tap interaction
     */
    setupInteraction() {
        const onTap = (event) => {
            event.preventDefault();
            if (!this.isPlaying) return;

            // Calculate current time
            const currentTime = Date.now() - (this.demoStartTime || this.playStartTime || Date.now());

            this.checkTap(currentTime);
            this.showTapEffect(event);
        };

        if (this.tapOverlay) {
            this.tapOverlay.style.pointerEvents = 'auto';
            this.tapOverlay.addEventListener('click', onTap);
            this.tapOverlay.addEventListener('touchstart', onTap);
        }
    },

    /**
     * Check if tap matches beat timing
     * @param {number} tapTime - Time of tap in ms
     */
    checkTap(tapTime) {
        if (this.currentBeatIndex >= this.beatTimes.length) return;

        const expectedBeat = this.beatTimes[this.currentBeatIndex];
        const diff = Math.abs(tapTime - expectedBeat);

        let feedback;

        if (diff <= this.tolerance / 4) {
            // Perfect!
            this.hits++;
            feedback = { type: 'perfect', emoji: '🌟', message: 'Perfect!' };
            this.markBeatHit(this.currentBeatIndex, 'perfect');
        } else if (diff <= this.tolerance / 2) {
            // Good
            this.hits++;
            feedback = { type: 'good', emoji: '⭐', message: 'Good!' };
            this.markBeatHit(this.currentBeatIndex, 'good');
        } else if (diff <= this.tolerance) {
            // OK
            this.hits++;
            feedback = { type: 'ok', emoji: '👍', message: 'OK!' };
            this.markBeatHit(this.currentBeatIndex, 'ok');
        } else {
            // Miss - but no harsh penalty
            this.misses++;
        }

        this.currentBeatIndex++;

        if (feedback) {
            this.showQuickFeedback(feedback);
        }
    },

    /**
     * Mark a beat indicator as hit
     */
    markBeatHit(index, quality) {
        const dot = document.getElementById(`beat-${index}`);
        if (dot) {
            dot.classList.add('hit');
            dot.style.background = quality === 'perfect' ? '#4facfe' :
                quality === 'good' ? '#00f2fe' : '#fee140';
            dot.style.transform = 'scale(1.2)';
        }
    },

    /**
     * Show quick feedback for taps
     */
    showQuickFeedback(feedback) {
        const feedbackEl = document.createElement('div');
        feedbackEl.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3rem;
            animation: popIn 0.3s ease;
            pointer-events: none;
        `;
        feedbackEl.textContent = feedback.emoji;

        this.videoContainer.appendChild(feedbackEl);

        setTimeout(() => feedbackEl.remove(), 500);
    },

    /**
     * Show tap visual effect
     */
    showTapEffect(event) {
        const rect = this.videoContainer.getBoundingClientRect();
        const x = (event.clientX || event.touches?.[0]?.clientX) - rect.left;
        const y = (event.clientY || event.touches?.[0]?.clientY) - rect.top;

        const ripple = document.createElement('div');
        ripple.className = 'tap-indicator';
        ripple.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -50%);
        `;

        this.tapOverlay.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    },

    /**
     * Handle video/demo end
     */
    onVideoEnd() {
        this.isPlaying = false;

        const score = this.calculateScore();
        const passed = score >= 60;

        const feedback = ErrorlessLearning.recordAttempt(passed);
        feedback.message = `Score: ${score}%`;
        ErrorlessLearning.showFeedback(feedback, 2000);

        if (passed) {
            setTimeout(() => this.nextLevel(), 2500);
        } else {
            // Replay same level
            setTimeout(() => this.loadLevel(this.level), 2500);
        }
    },

    /**
     * Calculate score
     */
    calculateScore() {
        const total = this.hits + this.misses;
        if (total === 0) return 0;
        return Math.round((this.hits / this.beatTimes.length) * 100);
    },

    /**
     * Move to next level
     */
    nextLevel() {
        if (this.level < Object.keys(this.levels).length) {
            this.level++;
        }
        this.loadLevel(this.level);
    },

    /**
     * Update instruction
     */
    updateInstruction() {
        const instruction = document.getElementById('instruction-text');
        if (instruction) {
            const text = `${Localization.get('watch_and_tap')} (${this.beatTimes.length} taps)`;
            instruction.textContent = text;
            AudioManager.speak(text);
        }
    },

    /**
     * Clean up
     */
    destroy() {
        if (this.video) {
            this.video.pause();
            this.video.src = '';
            this.video.onerror = null;
            this.video.onended = null;
        }

        // Show canvas, hide video
        document.getElementById('canvas-container')?.classList.remove('hidden');
        this.videoContainer?.classList.add('hidden');
    }
};
