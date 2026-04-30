/**
 * RealLife Steps OT - Stacking 3D
 * 3D version of the Stacking game using Three.js
 */

import { Localization, AudioManager, ProgressManager } from '../services/index.js';
import { ErrorlessLearning } from '../domain/index.js';
import { Environment, Blocks3D } from './visuals/index.js';
import * as THREE from 'three';

export const Stacking3D = {
    container: null,
    scene: null,
    camera: null,
    renderer: null,

    // Game state
    level: 1,
    maxLevels: 10,
    blocks: [],
    environment: null,
    labels: [],

    // Platform
    platform: null,

    getLevelConfig() {
        switch (this.level) {
            case 1: return { target: 3, blockHeight: 0.6 };
            case 2: return { target: 4, blockHeight: 0.55 };
            case 3: return { target: 5, blockHeight: 0.5 };
            case 4: return { target: 6, blockHeight: 0.45 };
            case 5: return { target: 7, blockHeight: 0.4 };
            case 6: return { target: 8, blockHeight: 0.38 };
            case 7: return { target: 9, blockHeight: 0.36 };
            case 8: return { target: 10, blockHeight: 0.34 };
            case 9: return { target: 11, blockHeight: 0.32 };
            case 10: return { target: 12, blockHeight: 0.3 };
            default: return { target: 5, blockHeight: 0.5 };
        }
    },

    init(container) {
        this.container = container;

        // Load saved progress
        const progress = ProgressManager.getProgress('stacking');
        this.level = Math.min(progress.level, this.maxLevels);

        this.blocks = [];
        this.setupScene();
        this.createPlatform();
        this.setupInteraction();
        this.animate();
        this.updateInstruction();
    },

    setupScene() {
        // Scene
        this.scene = new THREE.Scene();

        // Use Environment
        this.environment = new Environment(this.scene);

        // Camera - positioned to see vertical stacking
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.set(0, 4, 10);
        this.camera.lookAt(0, 3, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Handle resize - store reference for cleanup
        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);
    },

    createPlatform() {
        // Base platform
        const platformGeo = new THREE.CylinderGeometry(2.5, 2.8, 0.3, 32);
        const platformMat = new THREE.MeshPhysicalMaterial({
            color: 0xccff00,
            metalness: 0,
            roughness: 0.1,
            transmission: 0.5,
            transparent: true,
            opacity: 0.8,
            emissive: 0xccff00,
            emissiveIntensity: 0.2
        });
        this.platform = new THREE.Mesh(platformGeo, platformMat);
        this.platform.position.y = -0.15;
        this.platform.receiveShadow = true;
        this.scene.add(this.platform);

        // Platform Glow Ring
        const ringGeo = new THREE.TorusGeometry(2.7, 0.05, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xccff00, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.05;
        this.platform.add(ring);
    },

    addBlock() {
        const config = this.getLevelConfig();

        if (this.blocks.length >= config.target) return; // Max reached

        const y = this.blocks.length * config.blockHeight + config.blockHeight / 2 + 5; // Start high
        const targetY = this.blocks.length * config.blockHeight + config.blockHeight / 2;

        const block = Blocks3D.createBlock(this.scene, {
            color: Blocks3D.getRandomColor(),
            width: 1.2 - this.blocks.length * 0.05, // Blocks get slightly smaller
            height: config.blockHeight,
            depth: 0.8 - this.blocks.length * 0.03,
            position: new THREE.Vector3(0, y, 0),
            targetY: targetY
        });

        block.drop(targetY);
        this.blocks.push(block);

        // Create floating label for block count
        this.createLabel(this.blocks.length.toString(), new THREE.Vector3(0, y, 0));

        AudioManager.playStack();

        // Check win condition
        if (this.blocks.length === config.target) {
            this.onLevelComplete();
        }
    },

    onLevelComplete() {
        ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(true));
        AudioManager.playCelebrate();

        setTimeout(() => {
            if (this.level < this.maxLevels) {
                this.level++;
                ProgressManager.saveProgress('stacking', this.level);
                ErrorlessLearning.showFeedback({
                    type: 'success',
                    message: `Level ${this.level}!`,
                    emoji: '🚀'
                }, 2000);
            }
            this.resetBlocks();
            this.updateInstruction();
        }, 1500);
    },

    resetBlocks() {
        // Clear all blocks
        this.blocks.forEach(block => block.dispose());
        this.blocks = [];
    },

    setupInteraction() {
        const onTap = (event) => {
            event.preventDefault();
            this.addBlock();
        };

        this.renderer.domElement.addEventListener('click', onTap);
        this.renderer.domElement.addEventListener('touchstart', onTap);
    },

    updateInstruction() {
        const config = this.getLevelConfig();
        const text = `${Localization.get('tap_to_stack')} ${this.blocks.length}/${config.target} (Level ${this.level})`;
        document.getElementById('instruction-text').textContent = text;
        AudioManager.speak(`${Localization.get('tap_to_stack')}`);
    },

    /**
     * Create a floating 3D label
     */
    createLabel(text, position) {
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
            life: 1.0
        });
    },

    updateLabels(dt) {
        if (!this.labels) return;
        for (let i = this.labels.length - 1; i >= 0; i--) {
            const l = this.labels[i];
            l.sprite.position.addScaledVector(l.velocity, dt);
            l.life -= dt;
            l.sprite.material.opacity = l.life;

            if (l.life <= 0) {
                if (this.scene) this.scene.remove(l.sprite);
                l.sprite.material.map.dispose();
                l.sprite.material.dispose();
                this.labels.splice(i, 1);
            }
        }
    },

    animate() {
        // Stop animation if renderer is destroyed
        if (!this.renderer) return;

        // Store animation frame ID for cleanup
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001;
        const deltaTime = 0.016; // ~60fps

        // Update environment
        if (this.environment) this.environment.update(time);

        // Update labels
        this.updateLabels(0.016);

        // Update blocks
        this.blocks.forEach(block => block.update(deltaTime));

        // Subtle camera sway
        if (this.camera) {
            this.camera.position.x = Math.sin(time * 0.3) * 0.5;
        }

        // Update instruction with current count
        const config = this.getLevelConfig();
        const instructionEl = document.getElementById('instruction-text');
        if (instructionEl) {
            instructionEl.textContent = `${Localization.get('tap_to_stack')} ${this.blocks.length}/${config.target} (Level ${this.level})`;
        }

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

        this.resetBlocks();
        if (this.platform) {
            this.scene.remove(this.platform);
            this.platform = null;
        }
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

        // Clean up labels
        this.labels.forEach(l => {
            if (this.scene) this.scene.remove(l.sprite);
            l.sprite.material.map.dispose();
            l.sprite.material.dispose();
        });
        this.labels = [];
    }
};
