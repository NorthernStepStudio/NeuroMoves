/**
 * RealLife Steps OT - Pop Bubbles 3D
 * 3D version of the Bubble Popping game using Three.js
 */

import { Localization, AudioManager, ProgressManager } from '../../services/index.js';
import { ErrorlessLearning } from '../../domain/index.js';
import { Environment, Bubbles3D } from './visuals/index.js';

export const PopBubbles3D = {
    container: null,
    scene: null,
    camera: null,
    renderer: null,

    // Game state
    level: 1,
    maxLevels: 10,
    poppedCount: 0,
    environment: null,
    currentCount: 5,
    currentSpeed: 0.1,

    // Raycasting
    raycaster: null,
    mouse: null,

    getLevelConfig() {
        // Base speed starts at 0.1 and increases by 0.15 per level
        // Level 1: 0.1, Level 2: 0.25, Level 3: 0.4, ..., Level 10: 1.45
        const speed = 0.1 + (this.level - 1) * 0.15;

        // Bubble count logic:
        // Level 1-4: Start at 5, increase by 2 per level (5, 7, 9, 11)
        // Level 5+: Start at 15 + level-dependent randomness
        let count = 5 + (this.level - 1) * 2;
        if (this.level >= 5) {
            count = 15 + (this.level - 5) * 3 + Math.floor(Math.random() * 6);
        }

        return {
            count: count,
            speed: speed
        };
    },

    init(container) {
        this.container = container;

        // Load saved progress
        const progress = ProgressManager.getProgress('bubbles');
        this.level = Math.min(progress.level, this.maxLevels);

        this.bubbles = [];
        this.poppedCount = 0;
        this.setupScene();
        this.spawnBubbles();
        this.setupInteraction();
        this.animate();
        this.updateInstruction();
    },

    setupScene() {
        // Scene
        this.scene = new THREE.Scene();

        // Use Environment
        this.environment = new Environment(this.scene);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 3, 8);
        this.camera.lookAt(0, 2, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Handle resize - store reference for cleanup
        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);
    },

    spawnBubbles() {
        const config = this.getLevelConfig();
        this.currentCount = config.count;
        this.currentSpeed = config.speed;

        // Clear old bubbles
        this.bubbles.forEach(b => b.dispose());
        this.bubbles = [];
        this.poppedCount = 0;

        const bounds = {
            xMin: -5, xMax: 5,
            yMin: 0, yMax: 6,
            zMin: -1, zMax: 1
        };

        // Create bubbles with initial config
        for (let i = 0; i < this.currentCount; i++) {
            const x = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
            const y = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);
            const fixedZ = 0; // Solidly positioned at Z=0 for clear 2D visibility

            const bubble = Bubbles3D.createBubble(this.scene, {
                color: Bubbles3D.getRandomColor(),
                radius: 0.3 + Math.random() * 0.4,
                position: new THREE.Vector3(x, y, fixedZ),
                speed: this.currentSpeed,
                bounds: bounds
            });
            this.bubbles.push(bubble);
        }
    },

    setupInteraction() {
        const onTap = (event) => {
            event.preventDefault();

            const rect = this.renderer.domElement.getBoundingClientRect();
            const clientX = event.clientX || (event.touches && event.touches[0].clientX);
            const clientY = event.clientY || (event.touches && event.touches[0].clientY);

            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Get all bubble meshes
            const meshes = this.bubbles.filter(b => !b.isPopped).map(b => b.mesh);
            const intersects = this.raycaster.intersectObjects(meshes, true);

            if (intersects.length > 0) {
                // Find the bubble that was hit
                let hitMesh = intersects[0].object;
                // Traverse up to find the parent with userData.bubble3D
                while (hitMesh && !hitMesh.userData.bubble3D) {
                    hitMesh = hitMesh.parent;
                }

                if (hitMesh && hitMesh.userData.bubble3D) {
                    const bubble = hitMesh.userData.bubble3D;
                    bubble.pop();
                    this.poppedCount++;

                    AudioManager.playPop();

                    // Check win condition
                    if (this.poppedCount >= this.currentCount) {
                        this.onLevelComplete();
                    } else {
                        this.updateInstruction();
                    }
                }
            }
        };

        this.renderer.domElement.addEventListener('click', onTap);
        this.renderer.domElement.addEventListener('touchstart', onTap);
    },

    onLevelComplete() {
        ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(true));
        AudioManager.playCelebrate();

        setTimeout(() => {
            if (this.level < this.maxLevels) {
                this.level++;
                ProgressManager.saveProgress('bubbles', this.level);
                ErrorlessLearning.showFeedback({
                    type: 'success',
                    message: `Level ${this.level}!`,
                    emoji: '🚀'
                }, 2000);
            }
            this.spawnBubbles();
            this.updateInstruction();
        }, 1500);
    },

    updateInstruction() {
        const remaining = this.currentCount - this.poppedCount;
        const text = `${Localization.get('pop_all')} (${remaining} left) - Level ${this.level}`;
        document.getElementById('instruction-text').textContent = text;
        if (this.poppedCount === 0) {
            AudioManager.speak(Localization.get('pop_all'));
        }
    },

    animate() {
        // Stop animation if renderer is destroyed
        if (!this.renderer) return;

        // Store animation frame ID for cleanup
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        const now = Date.now() * 0.001;
        if (!this.lastTime) this.lastTime = now;
        const deltaTime = Math.min(now - this.lastTime, 0.1); // Cap delta time to avoid jumps
        this.lastTime = now;

        // Update environment
        if (this.environment) this.environment.update(now);

        // Update bubbles
        this.bubbles.forEach(bubble => bubble.update(now, deltaTime));

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },

    onResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    },

    destroy() {
        // Cancel animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove resize listener
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        this.bubbles.forEach(b => b.dispose());
        this.bubbles = [];
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement.parentNode === this.container) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.environment = null;
        this.poppedCount = 0;
        this.lastTime = null;
    }
};
