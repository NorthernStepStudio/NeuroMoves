/**
 * Module B: Point It Out
 * Hidden object discovery in photorealistic scenes
 */

import { Localization, AudioManager } from '../../services/index.js';
import { ErrorlessLearning } from '../../domain/index.js';

export const PointItOut = {
    container: null,
    canvas: null,
    ctx: null,

    // Game state
    objects: [],
    currentTarget: null,
    foundCount: 0,
    errors: 0,
    level: 1,

    // Level configurations  
    levels: {
        1: {
            scene: "living_room",
            objects: [{ id: "apple", name: "apple", x: 200, y: 300, radius: 40 }]
        },
        2: {
            scene: "living_room",
            objects: [{ id: "apple", name: "apple", x: 200, y: 300, radius: 40 }, { id: "bear", name: "teddy bear", x: 450, y: 400, radius: 50 }]
        },
        3: {
            scene: "playroom",
            objects: [{ id: "ball", name: "ball", x: 150, y: 250, radius: 35 }, { id: "car", name: "toy car", x: 400, y: 350, radius: 45 }, { id: "duck", name: "rubber duck", x: 300, y: 450, radius: 30 }]
        },
        4: {
            scene: "kitchen",
            objects: [{ id: "apple", name: "apple", x: 200, y: 200, radius: 30 }, { id: "duck", name: "rubber duck", x: 500, y: 300, radius: 30 }, { id: "ball", name: "ball", x: 350, y: 450, radius: 40 }, { id: "bear", name: "teddy bear", x: 600, y: 150, radius: 45 }]
        },
        5: {
            scene: "garden",
            objects: [{ id: "car", name: "toy car", x: 100, y: 400, radius: 40 }, { id: "apple", name: "apple", x: 300, y: 150, radius: 30 }, { id: "ball", name: "ball", x: 500, y: 300, radius: 35 }, { id: "duck", name: "rubber duck", x: 700, y: 450, radius: 30 }, { id: "bear", name: "teddy bear", x: 200, y: 250, radius: 50 }]
        },
        6: {
            scene: "bedroom",
            objects: [{ id: "apple", name: "apple", x: 150, y: 150, radius: 30 }, { id: "bear", name: "teddy bear", x: 650, y: 350, radius: 45 }, { id: "car", name: "toy car", x: 350, y: 450, radius: 40 }, { id: "duck", name: "rubber duck", x: 550, y: 150, radius: 30 }, { id: "ball", name: "ball", x: 250, y: 300, radius: 35 }, { id: "apple", name: "green apple", x: 750, y: 250, radius: 30 }]
        },
        7: {
            scene: "park",
            objects: [{ id: "ball", name: "ball", x: 100, y: 400, radius: 30 }, { id: "car", name: "toy car", x: 300, y: 200, radius: 40 }, { id: "bear", name: "teddy bear", x: 500, y: 350, radius: 45 }, { id: "duck", name: "rubber duck", x: 700, y: 150, radius: 30 }, { id: "apple", name: "apple", x: 200, y: 150, radius: 30 }, { id: "car", name: "red car", x: 400, y: 450, radius: 35 }, { id: "ball", name: "blue ball", x: 600, y: 250, radius: 35 }]
        },
        8: {
            scene: "beach",
            objects: [{ id: "duck", name: "rubber duck", x: 150, y: 300, radius: 30 }, { id: "ball", name: "beach ball", x: 350, y: 150, radius: 45 }, { id: "car", name: "dune buggy", x: 550, y: 400, radius: 40 }, { id: "apple", name: "apple", x: 750, y: 200, radius: 30 }, { id: "bear", name: "teddy bear", x: 250, y: 450, radius: 40 }, { id: "ball", name: "small ball", x: 450, y: 250, radius: 25 }, { id: "duck", name: "yellow duck", x: 650, y: 350, radius: 30 }, { id: "car", name: "toy truck", x: 50, y: 200, radius: 35 }]
        },
        9: {
            scene: "forest",
            objects: [{ id: "bear", name: "teddy bear", x: 400, y: 300, radius: 50 }, { id: "apple", name: "apple", x: 200, y: 200, radius: 30 }, { id: "car", name: "jeep", x: 600, y: 400, radius: 40 }, { id: "duck", name: "duck", x: 300, y: 450, radius: 30 }, { id: "ball", name: "ball", x: 500, y: 150, radius: 35 }, { id: "apple", name: "red apple", x: 700, y: 250, radius: 30 }, { id: "bear", name: "brown bear", x: 100, y: 350, radius: 45 }, { id: "car", name: "blue car", x: 50, y: 150, radius: 35 }, { id: "ball", name: "tennis ball", x: 750, y: 450, radius: 25 }]
        },
        10: {
            scene: "space",
            objects: [{ id: "car", name: "rover", x: 400, y: 300, radius: 45 }, { id: "ball", name: "planet", x: 150, y: 150, radius: 50 }, { id: "bear", name: "astronaut bear", x: 650, y: 200, radius: 50 }, { id: "apple", name: "space apple", x: 250, y: 450, radius: 30 }, { id: "duck", name: "space duck", x: 550, y: 400, radius: 30 }, { id: "ball", name: "moon", x: 750, y: 100, radius: 35 }, { id: "car", name: "rocket", x: 100, y: 350, radius: 40 }, { id: "bear", name: "alien bear", x: 350, y: 100, radius: 45 }, { id: "apple", name: "star apple", x: 600, y: 500, radius: 30 }, { id: "duck", name: "robo duck", x: 50, y: 500, radius: 30 }]
        }
    },

    /**
     * Initialize the Point It Out module
     * @param {HTMLElement} container - Container element
     */
    init(container) {
        this.container = container;
        this.setupCanvas();
        this.loadLevel(this.level);
        this.setupInteraction();
    },

    /**
     * Set up 2D canvas
     */
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.canvas.style.borderRadius = '20px';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Store resize handler for cleanup
        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);

        // Start Animation Loop for floating effects
        const loop = () => {
            if (this.ctx && this.container.contains(this.canvas)) {
                this.drawScene(); // Redraw every frame for float animation
                requestAnimationFrame(loop);
            }
        };
        loop();
    },

    /**
     * Load a specific level
     * @param {number} level - Level number
     */
    loadLevel(level) {
        const config = this.levels[level] || this.levels[1];

        // Reset state
        this.objects = config.objects.map(obj => ({ ...obj, found: false }));
        this.foundCount = 0;
        this.errors = 0;

        // Select first target
        this.selectNextTarget();

        // Draw scene
        this.drawScene(config.scene);

        // Update UI
        document.getElementById('current-level').textContent = level;
        this.updateInstruction();

        ErrorlessLearning.reset();
    },

    /**
     * Draw the scene background and objects
     * @param {string} sceneName - Scene identifier
     */
    drawScene(sceneName) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Transparent background to show starfield
        ctx.clearRect(0, 0, width, height);

        // Draw placeholder objects with neon glow
        this.objects.forEach(obj => {
            if (!obj.found) {
                this.drawObject(obj);
            }
        });

        // Highlight current target if hint is active
        if (this.currentTarget && this.errors >= 3) {
            this.drawGlow(this.currentTarget);
        }
    },

    /**
     * Draw a single object with Neon visual style
     * @param {object} obj - Object data
     */
    drawObject(obj) {
        const ctx = this.ctx;

        // Neon colors for objects
        const colors = {
            apple: '#ff6b6b',
            bear: '#ffaa00',
            ball: '#00f2ff',
            car: '#ff00ff',
            duck: '#ccff00'
        };

        ctx.save();

        // Neon Glow Effect
        ctx.shadowColor = colors[obj.id] || '#ffffff';
        ctx.shadowBlur = 25;

        // Draw object circle
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
        ctx.fillStyle = colors[obj.id] || '#ffffff';
        ctx.fill();

        // Neon stroke
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Draw glow effect around object (Hint)
     * @param {object} obj - Object to highlight
     */
    drawGlow(obj) {
        const ctx = this.ctx;
        const pulse = Math.sin(Date.now() / 200) * 10;

        ctx.save();
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.radius + 20 + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();
    },

    /**
     * Select the next object to find
     */
    selectNextTarget() {
        const unfound = this.objects.filter(obj => !obj.found);
        if (unfound.length > 0) {
            this.currentTarget = unfound[Math.floor(Math.random() * unfound.length)];
        } else {
            this.currentTarget = null;
        }
    },

    /**
     * Set up touch/click interaction
     */
    setupInteraction() {
        const onTap = (event) => {
            event.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX || (event.touches && event.touches[0].clientX);
            const y = event.clientY || (event.touches && event.touches[0].clientY);

            const canvasX = (x - rect.left) * (this.canvas.width / rect.width);
            const canvasY = (y - rect.top) * (this.canvas.height / rect.height);

            this.checkTap(canvasX, canvasY);
        };

        this.canvas.addEventListener('click', onTap);
        this.canvas.addEventListener('touchstart', onTap);
    },

    /**
     * Check if tap hit the target
     * @param {number} x - Tap X coordinate
     * @param {number} y - Tap Y coordinate
     */
    checkTap(x, y) {
        if (!this.currentTarget) return;

        const target = this.currentTarget;
        const distance = Math.sqrt(
            Math.pow(x - target.x, 2) + Math.pow(y - target.y, 2)
        );

        if (distance <= target.radius + 20) {
            // Found it!
            target.found = true;
            this.foundCount++;

            const feedback = ErrorlessLearning.recordAttempt(true);
            ErrorlessLearning.showFeedback(feedback);

            // Check if level complete
            if (this.foundCount >= this.objects.length) {
                setTimeout(() => this.nextLevel(), 2000);
            } else {
                this.selectNextTarget();
                this.updateInstruction();
            }

            // Redraw
            this.drawScene(this.levels[this.level].scene);

        } else {
            // Missed
            this.errors++;
            const feedback = ErrorlessLearning.recordAttempt(false);
            ErrorlessLearning.showFeedback(feedback, 1000);

            // Show glow hint after 3 errors
            if (this.errors >= 3) {
                this.drawScene(this.levels[this.level].scene);
            }
        }
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
     * Update instruction text
     */
    updateInstruction() {
        const instruction = document.getElementById('instruction-text');
        if (instruction && this.currentTarget) {
            const lang = Localization.currentLanguage;
            const objectNames = {
                en: { apple: 'apple', bear: 'teddy bear', ball: 'ball', car: 'toy car', duck: 'rubber duck' },
                es: { apple: 'manzana', bear: 'osito', ball: 'pelota', car: 'carrito', duck: 'patito' },
                it: { apple: 'mela', bear: 'orsetto', ball: 'palla', car: 'macchinina', duck: 'paperella' }
            };

            const name = objectNames[lang]?.[this.currentTarget.id] || this.currentTarget.name;
            const text = `${Localization.get('find_the')} ${name}! (${this.foundCount + 1}/${this.objects.length}) - Level ${this.level}`;
            instruction.textContent = text;
            AudioManager.speak(text);
        }
    },

    /**
     * Handle window resize
     */
    onResize() {
        if (!this.container) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.drawScene(this.levels[this.level].scene);
    },

    /**
     * Clean up
     */
    destroy() {
        // Remove resize listener
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        if (this.canvas && this.container.contains(this.canvas)) {
            this.container.removeChild(this.canvas);
        }
        this.ctx = null;
        this.canvas = null;
    }
};
