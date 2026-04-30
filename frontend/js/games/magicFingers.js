/**
 * Module A: Magic Fingers
 * 3D Hand animation and finger isolation logic
 */

import { Localization, AudioManager, ProgressManager } from '../services/index.js';
import { ErrorlessLearning } from '../domain/index.js';
import { Environment, Hand } from './visuals/index.js';
import * as THREE from 'three';

export const MagicFingers = {
    scene: null,
    camera: null,
    renderer: null,
    handModel: null,
    fingerColliders: [],

    // Game state
    currentSequence: [1, 2, 3],
    currentIndex: 0,
    attempts: 0,
    errors: 0,
    level: 1,

    // Level configurations
    levels: {
        1: { sequence: [1], description: "1" },
        2: { sequence: [1, 2], description: "1, 2" },
        3: { sequence: [1, 2, 3], description: "1, 2, 3" },
        4: { sequence: [1, 2, 3, 4], description: "1, 2, 3, 4" },
        5: { sequence: [1, 2, 3, 4, 5], description: "1, 2, 3, 4, 5" },
        6: { sequence: [1, 2, 3, 4, 5], description: "1, 2, 3, 4, 5" },
        7: { sequence: [1, 2, 3, 4, 5], description: "1, 2, 3, 4, 5" },
        8: { sequence: [1, 2, 3, 4, 5], description: "1, 2, 3, 4, 5" },
        9: { sequence: [1, 2, 3, 4, 5], description: "1, 2, 3, 4, 5" },
        10: { sequence: [1, 2, 3, 4, 5], description: "1, 2, 3, 4, 5" }
    },

    /**
     * Initialize the Magic Fingers module
     * @param {HTMLElement} container - Container element for the 3D canvas
     */
    init(container) {
        this.container = container;

        // Load saved progress
        const progress = ProgressManager.getProgress('fingers');
        this.level = Math.min(progress.level || 1, 10);

        this.setupScene();
        this.createPlaceholderHand();
        this.setupInteraction();
        this.animate();
        this.updateInstruction();
    },

    /**
     * Set up Three.js scene with Premium Environment
     */
    setupScene() {
        // Scene
        this.scene = new THREE.Scene();

        // Use our new Premium Environment
        this.environment = new Environment(this.scene);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 3, 6);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // For floating labels
        this.labels = [];

        // Handle resize - store reference for cleanup
        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);
    },

    /**
     * Handle window resize
     */
    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    },

    /**
     * Create the Premium 3D Hand
     */
    createPlaceholderHand() {
        // Instantiate our new procedural Hand
        this.hand = new Hand(this.scene);

        // Expose colliders for interaction
        this.fingerColliders = [];
        this.hand.fingers.forEach((f, index) => {
            f.group.userData = { fingerNumber: index + 1 };

            // Traverse and mark children
            f.group.traverse(child => {
                if (child.isMesh) {
                    child.userData = { fingerNumber: index + 1 };
                    this.fingerColliders.push(child);
                }
            });
        });

        // Set initial pose (Fist)
        this.hand.setPose(0);

        // Position and rotate hand: palm facing camera, fingers pointing UP
        this.hand.container.position.set(0, 0, 0);
        this.hand.container.rotation.x = Math.PI;
        this.hand.container.rotation.y = 0;
        this.hand.container.rotation.z = 0;
    },

    /**
     * Animation loop
     */
    animate() {
        // Store animation frame ID for cleanup
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001;

        // Update Environment (particles)
        if (this.environment) this.environment.update(time);

        // Update Hand (animations)
        if (this.hand) this.hand.update(0.016);

        // Update Labels (floating numbers)
        this.updateLabels(0.016);

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },

    /**
     * Create a floating 3D number label
     */
    createLabel(text, position) {
        // Simple 3D label using a canvas sprite for "Number Tracking" feedback
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;

        context.font = 'Bold 80px Nunito, Arial';
        context.fillStyle = '#00f2ff';
        context.textAlign = 'center';
        context.shadowBlur = 10;
        context.shadowColor = '#00f2ff';
        context.fillText(text, 64, 94);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);

        sprite.position.copy(position);
        sprite.position.y += 0.5;
        sprite.scale.set(1.5, 1.5, 1);

        this.scene.add(sprite);
        this.labels.push({
            sprite: sprite,
            velocity: new THREE.Vector3(0, 2, 0),
            life: 1.0 // 1 second life
        });
    },

    updateLabels(dt) {
        for (let i = this.labels.length - 1; i >= 0; i--) {
            const l = this.labels[i];
            l.sprite.position.addScaledVector(l.velocity, dt);
            l.life -= dt;
            l.sprite.material.opacity = l.life;

            if (l.life <= 0) {
                this.scene.remove(l.sprite);
                l.sprite.material.map.dispose();
                l.sprite.material.dispose();
                this.labels.splice(i, 1);
            }
        }
    },

    /**
     * Clean up when exiting module
     */
    setupInteraction() {
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        const onTap = (event) => {
            event.preventDefault();

            // Calculate pointer position in normalized device coordinates (-1 to +1)
            const rect = this.renderer.domElement.getBoundingClientRect();
            const clientX = event.clientX || (event.touches && event.touches[0].clientX);
            const clientY = event.clientY || (event.touches && event.touches[0].clientY);

            pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = - ((clientY - rect.top) / rect.height) * 2 + 1;

            // Raycast against finger colliders
            raycaster.setFromCamera(pointer, this.camera);
            const intersects = raycaster.intersectObjects(this.fingerColliders, false);

            if (intersects.length > 0) {
                const object = intersects[0].object;
                const fingerNum = object.userData.fingerNumber;

                // Game Logic Check
                const correct = this.checkInput(fingerNum);

                // Visual Feedback
                if (correct && this.hand) {
                    this.hand.curlFinger(fingerNum - 1);
                    // Create floating label at intersection point
                    this.createLabel(fingerNum.toString(), intersects[0].point);
                }
            }
        };

        this.renderer.domElement.addEventListener('pointerdown', onTap);
    },

    checkInput(fingerNum) {
        const levelConfig = this.levels[this.level];
        const expected = levelConfig.sequence[this.currentIndex];

        if (fingerNum === expected) {
            // Correct
            AudioManager.playPop();
            this.currentIndex++;

            if (this.currentIndex >= levelConfig.sequence.length) {
                // Level Complete
                ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(true));
                AudioManager.playCelebrate();
                setTimeout(() => {
                    if (this.level < 10) {
                        this.level++;
                        ProgressManager.saveProgress('fingers', this.level);
                        this.updateInstruction();
                    }
                    this.currentIndex = 0;
                    if (this.hand) this.hand.setPose(0); // Reset hand for next round
                }, 1500);
            }
            return true;
        } else {
            // Incorrect
            ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(false), 500);
            AudioManager.playEncourage();
            return false;
        }
    },

    updateInstruction() {
        const config = this.levels[this.level];
        const sequenceStr = config.sequence.join(', ');
        const text = `${Localization.get('tap_fingers')} [${sequenceStr}] (Level ${this.level})`;
        document.getElementById('instruction-text').textContent = text;
        AudioManager.speak(Localization.get('tap_fingers'));
    },

    destroy() {
        // Cancel animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove event listeners
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        // Dispose Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement.parentNode === this.container) {
                this.container.removeChild(this.renderer.domElement);
            }
        }

        // Clean up labels
        if (this.labels) {
            this.labels.forEach(l => {
                this.scene.remove(l.sprite);
                l.sprite.material.map.dispose();
                l.sprite.material.dispose();
            });
            this.labels = [];
        }

        // Clean up references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.hand = null;
        this.environment = null;
        this.fingerColliders = [];

        // Reset game state for next init
        this.currentIndex = 0;
        // Do NOT reset level here, it's loaded in init()
    }
};
