/**
 * RealLife Steps - Main Application
 */

import { Config } from './core/index.js';
import { Localization, AudioManager, ProgressManager } from './services/index.js';
import { ErrorlessLearning } from './domain/index.js';
import * as Games from './games/index.js';

const App = {
    currentModule: null,
    userId: null,
    apiBase: Config.apiBase,

    async init() {
        Localization.init();
        ErrorlessLearning.init();

        // Initialize audio and progress managers
        AudioManager.init();
        ProgressManager.init();

        this.userId = localStorage.getItem('reallife_steps_user_id');
        if (!this.userId) await this.createUser();

        this.setupEventListeners();

        // Global Haptic Feedback on Tap
        document.addEventListener('click', () => {
            AudioManager.vibrate('tap');
        });

        this.loadProgress();
        this.setupVideoAttributes();
        this.hideLoading();

        // Update progress bars on home screen
        ProgressManager.updateProgressBars();
    },

    async createUser() {
        try {
            const res = await fetch(`${this.apiBase}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Child', language: Localization.currentLanguage })
            });
            const data = await res.json();
            this.userId = data.user_id;
            localStorage.setItem('reallife_steps_user_id', this.userId);
        } catch (e) { console.log('Backend not available - using local mode'); this.userId = 1; }
    },

    setupEventListeners() {
        // Module cards
        document.querySelectorAll('.module-card').forEach(card => {
            card.addEventListener('click', () => this.startModule(/** @type {HTMLElement} */(card).dataset.module));
        });

        // Back button
        document.getElementById('btn-back')?.addEventListener('click', () => this.goHome());

        // Language button
        document.getElementById('btn-language')?.addEventListener('click', () => this.showLanguageModal());

        // Language options
        document.querySelectorAll('.language-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Localization.setLanguage(/** @type {HTMLElement} */(btn).dataset.lang);
                this.hideLanguageModal();
            });
        });

        // Close modal on backdrop click
        document.getElementById('language-modal')?.addEventListener('click', (e) => {
            if (/** @type {HTMLElement} */ (e.target).id === 'language-modal') this.hideLanguageModal();
        });

        // Info Button
        document.getElementById('btn-info')?.addEventListener('click', () => this.showInfoModal());
        document.getElementById('btn-close-info')?.addEventListener('click', () => this.hideInfoModal());

        // Close info modal on backdrop
        document.getElementById('info-modal')?.addEventListener('click', (e) => {
            if (/** @type {HTMLElement} */ (e.target).id === 'info-modal') this.hideInfoModal();
        });

        // Microphone Button (AI Companion)
        document.getElementById('btn-mic')?.addEventListener('click', () => this.startListening());

        // Settings Button
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettingsModal());
        document.getElementById('btn-close-settings')?.addEventListener('click', () => this.hideSettingsModal());

        // Close settings modal on backdrop
        document.getElementById('settings-modal')?.addEventListener('click', (e) => {
            if (/** @type {HTMLElement} */ (e.target).id === 'settings-modal') this.hideSettingsModal();
        });

        // Initialize settings toggles
        this.initSettingsToggles();
    },

    /**
     * Initialize settings toggles from localStorage and add event listeners
     */
    initSettingsToggles() {
        // Sound toggle
        const soundToggle = /** @type {HTMLInputElement} */ (document.getElementById('toggle-sound'));
        if (soundToggle) {
            // Initialize from AudioManager state (already loads from localStorage)
            soundToggle.checked = !AudioManager.muted;
            soundToggle.addEventListener('change', () => {
                AudioManager.muted = !soundToggle.checked;
                localStorage.setItem('reallife_steps_muted', AudioManager.muted.toString());
            });
        }

        // Vibration toggle
        const vibrationToggle = /** @type {HTMLInputElement} */ (document.getElementById('toggle-vibration'));
        if (vibrationToggle) {
            const savedVibration = localStorage.getItem('reallife_steps_vibration');
            vibrationToggle.checked = savedVibration !== 'false';
            vibrationToggle.addEventListener('change', () => {
                localStorage.setItem('reallife_steps_vibration', vibrationToggle.checked.toString());
                this.vibrationEnabled = vibrationToggle.checked;
            });
            this.vibrationEnabled = vibrationToggle.checked;
        }

        // Voice toggle
        const voiceToggle = /** @type {HTMLInputElement} */ (document.getElementById('toggle-voice'));
        if (voiceToggle) {
            const savedVoice = localStorage.getItem('reallife_steps_voice');
            voiceToggle.checked = savedVoice !== 'false';
            voiceToggle.addEventListener('change', () => {
                localStorage.setItem('reallife_steps_voice', voiceToggle.checked.toString());
                this.voiceEnabled = voiceToggle.checked;
            });
            this.voiceEnabled = voiceToggle.checked;
        }
    },

    /**
     * Start Speech Recognition and Talk to AI
     */
    startListening() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            AudioManager.speak("Sorry, your browser doesn't support voice.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = Localization.currentLanguage || 'en';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            AudioManager.speak("I'm listening!");
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Heard:', transcript);

            // Send to backend AI
            try {
                const res = await fetch(`${this.apiBase}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: transcript })
                });
                const data = await res.json();
                if (data.success && data.response) {
                    AudioManager.speak(data.response);
                }
            } catch (e) {
                console.log('AI chat error:', e);
                AudioManager.speak("You're doing great!");
            }
        };

        recognition.onerror = (event) => {
            console.log('Speech error:', event.error);
        };

        recognition.start();
    },

    startModule(moduleId) {
        console.log(`Starting module: ${moduleId}`);

        // Map module string IDs to imported Games objects
        const modules = {
            A: Games.MagicFingers,
            B: Games.PointItOut,
            C: Games.BabySigns,
            D: Games.YesNo,
            shapes: Games.ShapeSorting3D,
            stacking: Games.Stacking3D,
            tracing: Games.Tracing,
            colors: Games.ColorMatch,
            bubbles: Games.PopBubbles3D,
            emotions: Games.Emotions,
            bodyparts: Games.BodyParts,
            animals: Games.AnimalSounds,
            sizes: Games.SizeOrdering
        };
        // Map module IDs to localization keys
        const titleKeys = {
            A: 'magic_fingers', B: 'point_it_out', C: 'baby_signs', D: 'yes_no',
            shapes: 'shape_sorting', stacking: 'stacking', tracing: 'tracing',
            colors: 'color_match', bubbles: 'pop_bubbles', emotions: 'feelings',
            bodyparts: 'body_parts', animals: 'animal_sounds', sizes: 'size_matters'
        };

        this.currentModule = modules[moduleId];
        if (!this.currentModule) {
            console.error(`Module ${moduleId} not found!`);
            return;
        }

        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        document.getElementById('game-title').textContent = Localization.get(titleKeys[moduleId]);

        const container = document.getElementById('canvas-container');
        container.innerHTML = '';
        container.classList.remove('hidden');
        document.getElementById('video-container')?.classList.add('hidden');

        try {
            this.currentModule.init(container);
        } catch (error) {
            console.error(`Failed to initialize module ${moduleId}:`, error);
            // Fallback to home screen if module fails
            this.goHome();
        }
    },

    goHome() {
        if (this.currentModule?.destroy) this.currentModule.destroy();
        this.currentModule = null;

        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
        this.loadProgress();
    },

    async loadProgress() {
        try {
            const res = await fetch(`${this.apiBase}/users/${this.userId}/progress`);
            const data = await res.json();
            if (data.success) {
                data.progress.forEach(p => {
                    const bar = document.getElementById(`progress-${p.module.toLowerCase()}`);
                    if (bar) bar.style.width = `${(p.level / 10) * 100}%`;
                });
            }
        } catch (e) { /* Backend offline */ }
    },

    /**
     * Set video attributes via JS to satisfy linters and ensure iOS compatibility
     */
    setupVideoAttributes() {
        const video = document.getElementById('game-video');
        if (video) {
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
        }
    },

    hideLoading() {
        const loading = document.getElementById('loading-screen');
        loading.classList.add('fade-out');
        setTimeout(() => loading.classList.add('hidden'), 500);
        document.getElementById('app').classList.remove('hidden');
    },

    showLanguageModal() { document.getElementById('language-modal')?.classList.remove('hidden'); },
    hideLanguageModal() { document.getElementById('language-modal')?.classList.add('hidden'); },

    showInfoModal() { document.getElementById('info-modal')?.classList.remove('hidden'); },
    hideInfoModal() { document.getElementById('info-modal')?.classList.add('hidden'); },

    showSettingsModal() { document.getElementById('settings-modal')?.classList.remove('hidden'); },
    hideSettingsModal() { document.getElementById('settings-modal')?.classList.add('hidden'); },

    showLevelCompleteModal(onNextLevel) {
        const modal = document.getElementById('level-complete-modal');
        const btn = document.getElementById('btn-next-level');
        if (!modal || !btn) return;

        modal.classList.remove('hidden');
        AudioManager.playCelebrate(); // Sound on modal open!

        // Handle Next Click (Clone to clear old listeners)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            if (onNextLevel) onNextLevel();
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
