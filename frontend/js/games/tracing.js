/**
 * Tracing - Working 2D Implementation
 */

import { Localization, AudioManager, ProgressManager } from '../../services/index.js';
import { ErrorlessLearning } from '../../domain/index.js';

export const Tracing = {
    container: null,
    canvas: null,
    ctx: null,
    level: 1,
    maxLevels: 10,
    drawing: false,
    points: [],

    getLevelConfig() {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        return { letter: letters[this.level - 1] || 'A' };
    },

    init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.canvas.style.borderRadius = '20px';
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        const progress = ProgressManager.getProgress('tracing');
        this.level = Math.min(progress.level, this.maxLevels);

        this.setupInteraction();
        this.draw();
        this.updateInstruction();
    },

    setupInteraction() {
        let lastX, lastY;
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
        };

        const startDraw = (e) => {
            this.drawing = true;
            const pos = getPos(e);
            lastX = pos.x;
            lastY = pos.y;
            // Don't reset points - allow multiple strokes
            this.points.push(pos);
            // Cancel any pending check timer
            if (this.checkTimer) clearTimeout(this.checkTimer);
        };

        const drawLine = (e) => {
            if (!this.drawing) return;
            e.preventDefault();
            const pos = getPos(e);
            this.points.push(pos);

            this.ctx.strokeStyle = '#ff00ff';
            this.ctx.lineWidth = 5;
            this.ctx.lineCap = 'round';
            this.ctx.shadowColor = '#ff00ff';
            this.ctx.shadowBlur = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(lastX, lastY);
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();

            lastX = pos.x;
            lastY = pos.y;
        };

        const endDraw = () => {
            if (!this.drawing) return;
            this.drawing = false;
            // Wait 2 seconds of inactivity before checking (kids can lift and continue)
            if (this.checkTimer) clearTimeout(this.checkTimer);
            this.checkTimer = setTimeout(() => this.checkTrace(), 2000);
        };

        this.canvas.addEventListener('mousedown', startDraw);
        this.canvas.addEventListener('mousemove', drawLine);
        this.canvas.addEventListener('mouseup', endDraw);
        this.canvas.addEventListener('touchstart', startDraw);
        this.canvas.addEventListener('touchmove', drawLine);
        this.canvas.addEventListener('touchend', endDraw);
    },

    checkTrace() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Define valid tracing zone (center area where letter is)
        const centerX = w / 2;
        const centerY = h / 2;
        const letterRadius = Math.min(w, h) * 0.25; // Letter occupies ~50% of smaller dimension

        // Count how many points are within the letter zone
        let pointsInZone = 0;
        this.points.forEach(p => {
            const dist = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
            if (dist < letterRadius) {
                pointsInZone++;
            }
        });

        // Require at least 20 points AND 60% of them in the letter zone
        const accuracy = this.points.length > 0 ? pointsInZone / this.points.length : 0;
        const isAccurate = this.points.length > 20 && accuracy >= 0.5;

        if (isAccurate) {
            ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(true));
            AudioManager.playCelebrate();

            setTimeout(() => {
                if (this.level < this.maxLevels) {
                    this.level++;
                    ProgressManager.saveProgress('tracing', this.level);
                }
                this.points = [];
                this.draw();
                this.updateInstruction();
            }, 1500);
        } else {
            ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(false), 800);
            // Redraw to clear bad trace
            setTimeout(() => {
                this.points = [];
                this.draw();
            }, 1000);
        }
    },

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear and draw background
        ctx.fillStyle = '#1a0b2e';
        ctx.fillRect(0, 0, w, h);

        // Draw guide letter
        const config = this.getLevelConfig();
        ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.font = `bold ${Math.min(h * 0.4, 200)}px Nunito`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.letter, w / 2, h / 2);
    },

    updateInstruction() {
        const config = this.getLevelConfig();
        const text = `Trace the letter ${config.letter} (Level ${this.level})`;
        document.getElementById('instruction-text').textContent = text;
        // Update level badge
        const levelBadge = document.getElementById('level-badge');
        if (levelBadge) levelBadge.textContent = 'Level ' + this.level;
        AudioManager.speak(text);
    },

    destroy() {
        this.canvas = null;
        this.ctx = null;
    }
};
