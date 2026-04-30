/**
 * Module D: Yes/No - Gesture recognition with avatar expressions
 */

import { Localization, AudioManager } from '../../services/index.js';
import { ErrorlessLearning } from '../../domain/index.js';

export const YesNo = {
    container: null, canvas: null, ctx: null, hammer: null,
    questions: [], currentQuestionIndex: 0, expectedAnswer: null, errors: 0, level: 1,
    avatarExpression: 'neutral',

    levels: {
        1: { questions: [{ text: "Is this an apple?", answer: "yes", color: "#ff6b6b" }] },
        2: {
            questions: [
                { text: "Is this an apple?", answer: "yes", color: "#ff6b6b" },
                { text: "Is this a banana?", answer: "no", color: "#ff6b6b" }
            ]
        },
        3: {
            questions: [
                { text: "Is the ball red?", answer: "yes", color: "#ff6b6b" },
                { text: "Is the ball blue?", answer: "no", color: "#ff6b6b" },
                { text: "Is this a cat?", answer: "no", color: "#c9a066" }
            ]
        }
    },

    init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.canvas.style.borderRadius = '20px';
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.hammer = new Hammer(this.canvas);
        this.hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL, threshold: 50 });
        this.hammer.on('swipe', (e) => this.handleSwipe(e));

        // Store resize handler for cleanup
        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);

        this.loadLevel(this.level);
    },

    handleSwipe(event) {
        const dir = event.direction;
        let gesture = (dir === Hammer.DIRECTION_LEFT || dir === Hammer.DIRECTION_RIGHT) ? 'no' :
            (dir === Hammer.DIRECTION_UP || dir === Hammer.DIRECTION_DOWN) ? 'yes' : null;
        if (!gesture) return;

        if (gesture === this.expectedAnswer) {
            this.errors = 0;
            ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(true));
            setTimeout(() => {
                this.currentQuestionIndex++;
                if (this.currentQuestionIndex >= this.questions.length) {
                    setTimeout(() => this.nextLevel(), 500);
                } else { this.showQuestion(); }
            }, 1500);
        } else {
            this.errors++;
            const fb = ErrorlessLearning.recordAttempt(false);
            if (fb.showHint) this.showHint();
            ErrorlessLearning.showFeedback(fb, 1000);
        }
    },

    loadLevel(level) {
        const config = this.levels[level] || this.levels[1];
        this.questions = [...config.questions];
        this.currentQuestionIndex = 0;
        this.errors = 0;
        document.getElementById('current-level').textContent = level;
        this.showQuestion();
        ErrorlessLearning.reset();
    },

    showQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) return;
        const q = this.questions[this.currentQuestionIndex];
        this.expectedAnswer = q.answer;
        this.drawScene(q);
        this.updateInstruction();
    },

    drawScene(q) {
        if (!this.ctx) return;
        const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
        ctx.clearRect(0, 0, w, h); // Transparent for starfield

        // Holographic Card (Neon Glow)
        ctx.save();
        ctx.shadowColor = q.color;
        ctx.shadowBlur = 25;
        ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.arc(w / 2, h * 0.35, 60, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Question (Neon Text)
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Nunito'; ctx.textAlign = 'center';
        ctx.fillText(q.text, w / 2, h * 0.65);

        // Neon Swipe Hints
        ctx.font = '18px Nunito';
        ctx.fillStyle = '#00f2ff'; // Cyan
        ctx.fillText('⬆️ YES ⬇️', w * 0.25, h - 30);
        ctx.fillStyle = '#ff00ff'; // Magenta
        ctx.fillText('⬅️ NO ➡️', w * 0.75, h - 30);
    },

    showHint() {
        const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
        ctx.fillStyle = 'rgba(254,225,64,0.9)'; ctx.font = 'bold 20px Nunito';
        ctx.fillText(this.expectedAnswer === 'yes' ? '↕️ Swipe UP/DOWN!' : '↔️ Swipe LEFT/RIGHT!', w / 2, h * 0.8);
    },

    nextLevel() { if (this.level < 3) this.level++; this.loadLevel(this.level); },
    updateInstruction() {
        const el = document.getElementById('instruction-text');
        if (el) {
            const text = `${Localization.get('swipe_answer')} (${this.currentQuestionIndex + 1}/${this.questions.length})`;
            el.textContent = text;
            AudioManager.speak(text);
        }
    },
    onResize() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        if (this.questions[this.currentQuestionIndex]) this.drawScene(this.questions[this.currentQuestionIndex]);
    },
    destroy() {
        // Remove resize listener
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        if (this.hammer) this.hammer.destroy();
        if (this.canvas && this.container.contains(this.canvas)) {
            this.container.removeChild(this.canvas);
        }
        this.ctx = null;
        this.canvas = null;
    }
};
