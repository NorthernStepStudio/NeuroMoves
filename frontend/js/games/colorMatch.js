/**
 * Color Match Game
 */

import { Localization, AudioManager, ProgressManager } from '../../services/index.js';
import { ErrorlessLearning } from '../../domain/index.js';

export const ColorMatch = {
    container: null,
    canvas: null,
    ctx: null,
    level: 1,
    maxLevels: 10,
    colors: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'],
    targetColor: null,
    options: [],

    init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.canvas.style.borderRadius = '20px';
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        const progress = ProgressManager.getProgress('colors');
        this.level = Math.min(progress.level, this.maxLevels);

        this.newRound();
        this.setupInteraction();
    },

    newRound() {
        this.targetColor = this.colors[Math.floor(Math.random() * this.colors.length)];
        this.options = [this.targetColor];
        while (this.options.length < Math.min(2 + this.level, 6)) {
            const c = this.colors[Math.floor(Math.random() * this.colors.length)];
            if (!this.options.includes(c)) this.options.push(c);
        }
        this.options.sort(() => Math.random() - 0.5);
        this.draw();
        this.updateInstruction();
    },

    setupInteraction() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

            const optionWidth = this.canvas.width / this.options.length;
            const clickedIndex = Math.floor(x / optionWidth);

            if (clickedIndex >= 0 && clickedIndex < this.options.length) {
                if (this.options[clickedIndex] === this.targetColor) {
                    ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(true));
                    AudioManager.playSuccess();
                    setTimeout(() => {
                        if (this.level < this.maxLevels) {
                            this.level++;
                            ProgressManager.saveProgress('colors', this.level);
                        }
                        this.newRound();
                    }, 1000);
                } else {
                    ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(false), 800);
                    AudioManager.playEncourage();
                }
            }
        });
    },

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = '#1a0b2e';
        ctx.fillRect(0, 0, w, h);

        // Draw target at top
        ctx.fillStyle = this.targetColor;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.25, 60, 0, Math.PI * 2);
        ctx.fill();

        // Draw options at bottom
        const optionWidth = w / this.options.length;
        this.options.forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(optionWidth * i + optionWidth / 2, h * 0.7, 40, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    updateInstruction() {
        const text = `Find the ${this.targetColor} color (Level ${this.level})`;
        document.getElementById('instruction-text').textContent = text;
        AudioManager.speak(text);
    },

    destroy() {
        this.canvas = null;
        this.ctx = null;
    }
};
