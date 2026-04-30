/**
 * RealLife Steps - Audio Manager
 * Handles sound effects and voice playback for the OT app
 */

const AudioManager = {
    sounds: {},
    volume: 0.7,
    muted: false,

    // Sound URLs (will be replaced with actual files)
    soundPaths: {
        tap: null,
        success: null,
        celebrate: null,
        pop: null,
        stack: null,
        encourage: null
    },

    /**
     * Initialize audio manager
     */
    init() {
        // Create audio context for better mobile support
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Generate procedural sounds since we don't have audio files yet
        this.generateProceduralSounds();

        // Load saved volume preference
        const savedVolume = localStorage.getItem('reallife_steps_volume');
        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
        }

        const savedMuted = localStorage.getItem('reallife_steps_muted');
        if (savedMuted !== null) {
            this.muted = savedMuted === 'true';
        }
    },

    /**
     * Generate simple procedural sounds using Web Audio API
     */
    generateProceduralSounds() {
        // These are placeholder procedural sounds
        // Will be replaced with ElevenLabs/actual audio files
    },

    /**
     * Play a tap/click sound
     */
    playTap() {
        if (this.muted) return;
        this.playTone(800, 0.05, 'sine');
    },

    /**
     * Play success sound
     */
    playSuccess() {
        if (this.muted) return;
        // Play a happy ascending arpeggio
        this.playTone(523, 0.1, 'sine'); // C
        setTimeout(() => this.playTone(659, 0.1, 'sine'), 100); // E
        setTimeout(() => this.playTone(784, 0.15, 'sine'), 200); // G
    },

    /**
     * Play celebration sound (for completing levels)
     */
    playCelebrate() {
        if (this.muted) return;
        // Fanfare-like sound
        this.playTone(523, 0.1, 'sine');
        setTimeout(() => this.playTone(659, 0.1, 'sine'), 80);
        setTimeout(() => this.playTone(784, 0.1, 'sine'), 160);
        setTimeout(() => this.playTone(1047, 0.2, 'sine'), 240);
    },

    /**
     * Play pop sound (for bubbles)
     */
    playPop() {
        if (this.muted) return;
        this.playTone(600, 0.04, 'sine', 0.3);
    },

    /**
     * Play stack sound (for stacking blocks)
     */
    playStack() {
        if (this.muted) return;
        this.playTone(200, 0.08, 'triangle');
    },

    /**
     * Play encouragement sound (soft, for "try again")
     */
    playEncourage() {
        if (this.muted) return;
        this.playTone(400, 0.15, 'sine', 0.2);
    },

    /**
     * Generate and play a tone
     */
    playTone(frequency, duration, type = 'sine', volumeMultiplier = 1) {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

            gainNode.gain.setValueAtTime(this.volume * volumeMultiplier, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            // Audio not supported
        }
    },

    /**
     * Set volume level (0 to 1)
     */
    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
        localStorage.setItem('reallife_steps_volume', this.volume.toString());
    },

    /**
     * Toggle mute
     */
    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('reallife_steps_muted', this.muted.toString());
        return this.muted;
    },

    /**
     * Resume audio context (required for mobile after user interaction)
     */
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    },

    /**
     * Speak text using Web Speech API
     * @param {string} text - Text to speak
     * @param {number} pitch - Pitch (0-2)
     * @param {number} rate - Rate (0.1-10)
     */
    /**
     * Speak text using Backend (ElevenLabs) or Web Speech API fallback
     * @param {string} text - Text to speak
     */
    async speak(text, pitch = 1, rate = 0.9) {
        if (this.muted) return;

        // Try Backend First (High Quality)
        try {
            if (window.App && window.App.apiBase) {
                const res = await fetch(`${window.App.apiBase}/speak`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text })
                });
                const data = await res.json();

                if (data.success && data.audio_url) {
                    // Play audio file
                    const audio = new Audio(data.audio_url);
                    audio.volume = this.volume;
                    audio.play();
                    return; // Success!
                }
            }
        } catch (e) {
            console.log('Voice API failed, falling back to local TTS');
        }

        // Fallback: Local Web Speech API
        if (!window.speechSynthesis) return;

        // Cancel previous speech
        window.speechSynthesis.cancel();
        console.log(`Speaking (Local): "${text}"`);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.volume = this.volume;

        // Select a female voice (child-friendly)
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v =>
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('google us english') ||
            v.name.toLowerCase().includes('hazel') ||
            v.name.toLowerCase().includes('susan')
        ) || voices.find(v => v.lang.startsWith('en'));

        if (femaleVoice) {
            utterance.voice = femaleVoice;
        }

        window.speechSynthesis.speak(utterance);
    },

    /**
     * Trigger Haptic Feedback
     * @param {string} type - 'tap', 'success', 'failure', 'levelUp'
     */
    vibrate(type) {
        if (!navigator.vibrate) return;

        switch (type) {
            case 'tap': navigator.vibrate(10); break;
            case 'success': navigator.vibrate([30, 30, 30]); break;
            case 'failure': navigator.vibrate(100); break;
            case 'levelUp': navigator.vibrate([50, 30, 50, 30, 100]); break;
            default: navigator.vibrate(10);
        }
    }
};

// Export
window.AudioManager = AudioManager;
