/**
 * RealLife Steps OT - Shape Sorting 3D
 * 3D version of the Shape Sorting game using Three.js
 */

import { Localization, AudioManager, ProgressManager } from '../services/index.js';
import { ErrorlessLearning } from '../domain/index.js';
import { Environment, Shapes3D } from './visuals/index.js';
import * as THREE from 'three';

export const ShapeSorting3D = {
    container: null,
    scene: null,
    camera: null,
    renderer: null,

    // Game state
    level: 1,
    maxLevels: 10,
    isDragging: false,
    dragPlane: null,

    // 3D Objects
    draggableShape: null,
    targetHole: null,
    distractorHole: null,
    environment: null,
    labels: [],

    // Raycasting
    raycaster: null,
    mouse: null,
    dragOffset: null,

    getLevelConfig() {
        const configs = {
            1: { shape: 'circle', distractor: 'square', color: 0x00f2ff },
            2: { shape: 'square', distractor: 'triangle', color: 0xff00ff },
            3: { shape: 'triangle', distractor: 'star', color: 0xccff00 },
            4: { shape: 'star', distractor: 'circle', color: 0xffea00 },
            5: { shape: 'circle', distractor: 'triangle', color: 0xbd00ff },
            6: { shape: 'square', distractor: 'star', color: 0x00f2ff },
            7: { shape: 'triangle', distractor: 'circle', color: 0xff00ff },
            8: { shape: 'star', distractor: 'square', color: 0xccff00 },
            9: { shape: 'circle', distractor: 'star', color: 0xffea00 },
            10: { shape: 'square', distractor: 'circle', color: 0xbd00ff }
        };
        return configs[this.level] || configs[1];
    },

    init(container) {
        this.container = container;

        // Load saved progress
        const progress = ProgressManager.getProgress('shapes');
        this.level = Math.min(progress.level, this.maxLevels);

        this.setupScene();
        this.createLevel();
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
        this.camera.position.set(0, 5, 8);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragOffset = new THREE.Vector3();

        // Drag plane (horizontal at y=0)
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        // Handle resize - store reference for cleanup
        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);
    },

    createLevel() {
        // Clear previous shapes
        if (this.draggableShape) {
            this.draggableShape.dispose();
            this.draggableShape = null;
        }
        if (this.targetHole) {
            this.scene.remove(this.targetHole);
            this.targetHole = null;
        }
        if (this.distractorHole) {
            this.scene.remove(this.distractorHole);
            this.distractorHole = null;
        }

        const config = this.getLevelConfig();

        // Create draggable shape using Shapes3D
        this.draggableShape = Shapes3D.createShape(this.scene, config.shape, {
            color: config.color,
            size: 0.8,
            depth: 0.4,
            position: new THREE.Vector3(0, 0.5, 3)
        });
        this.draggableShape.mesh.userData.isDraggable = true;

        // Create target hole (outline with same shape)
        this.targetHole = this.createHole(config.shape, 0x00ff00, new THREE.Vector3(-2.5, 0.1, -2));

        // Create distractor hole (different shape)
        this.distractorHole = this.createHole(config.distractor, 0xff0000, new THREE.Vector3(2.5, 0.1, -2));
    },

    createHole(type, color, position) {
        // Create a glowing 3D "well" for the hole
        const group = new THREE.Group();
        group.position.copy(position);

        const size = 1.0;
        let geometry;

        switch (type) {
            case 'circle': geometry = new THREE.CylinderGeometry(size, size, 0.1, 32); break;
            case 'square': geometry = new THREE.CylinderGeometry(size, size, 0.1, 4); break;
            case 'triangle': geometry = new THREE.CylinderGeometry(size, size, 0.1, 3); break;
            case 'star': geometry = new THREE.CylinderGeometry(size, size, 0.1, 10); break;
            default: geometry = new THREE.CylinderGeometry(size, size, 0.1, 32);
        }

        const material = new THREE.MeshToonMaterial({
            color: color,
            transparent: true,
            opacity: 0.2,
            emissive: color,
            emissiveIntensity: 0.1
        });

        const base = new THREE.Mesh(geometry, material);
        base.position.y = -0.05;
        group.add(base);

        // Glowing Ring Border
        let ringGeo;
        switch (type) {
            case 'circle': ringGeo = new THREE.RingGeometry(size * 0.95, size, 32); break;
            case 'square': ringGeo = new THREE.RingGeometry(size * 0.95, size, 4); break;
            case 'triangle': ringGeo = new THREE.RingGeometry(size * 0.95, size, 3); break;
            case 'star': ringGeo = new THREE.RingGeometry(size * 0.95, size, 10); break;
            default: ringGeo = new THREE.RingGeometry(size * 0.95, size, 32);
        }

        const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);

        group.userData = { isHole: true, holeType: type, material: ringMat };

        this.scene.add(group);
        return group;
    },

    setupInteraction() {
        const onPointerDown = (event) => {
            event.preventDefault();
            this.updateMouse(event);

            this.raycaster.setFromCamera(this.mouse, this.camera);

            if (this.draggableShape && this.draggableShape.mesh) {
                const intersects = this.raycaster.intersectObject(this.draggableShape.mesh, true);

                if (intersects.length > 0) {
                    this.isDragging = true;

                    // Calculate offset from shape center
                    const intersectionPoint = new THREE.Vector3();
                    this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);
                    this.dragOffset.copy(this.draggableShape.mesh.position).sub(intersectionPoint);

                    this.draggableShape.setGlow(0.5);
                    AudioManager.playPop();
                }
            }
        };

        const onPointerMove = (event) => {
            if (!this.isDragging) return;
            event.preventDefault();
            this.updateMouse(event);

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersectionPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);

            if (this.draggableShape && this.draggableShape.mesh) {
                this.draggableShape.mesh.position.x = intersectionPoint.x + this.dragOffset.x;
                this.draggableShape.mesh.position.z = intersectionPoint.z + this.dragOffset.z;
                this.draggableShape.mesh.position.y = 1; // Lift while dragging
            }
        };

        const onPointerUp = (event) => {
            if (!this.isDragging) return;
            this.isDragging = false;

            if (this.draggableShape) {
                this.draggableShape.setGlow(0.15);
                this.checkDrop();
            }
        };

        this.renderer.domElement.addEventListener('pointerdown', onPointerDown);
        this.renderer.domElement.addEventListener('pointermove', onPointerMove);
        this.renderer.domElement.addEventListener('pointerup', onPointerUp);
        this.renderer.domElement.addEventListener('pointerleave', onPointerUp);
    },

    updateMouse(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);

        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    },

    checkDrop() {
        if (!this.draggableShape || !this.targetHole) return;

        const shapePos = this.draggableShape.mesh.position;
        const targetPos = this.targetHole.position;
        const distance = shapePos.distanceTo(new THREE.Vector3(targetPos.x, shapePos.y, targetPos.z));

        if (distance < 1.5) {
            // Success! Snap to hole
            this.draggableShape.mesh.position.set(targetPos.x, 0.3, targetPos.z);

            AudioManager.playSuccess();
            AudioManager.vibrate('success');
            ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(true));

            // Level up
            setTimeout(() => {
                if (this.level < this.maxLevels) {
                    this.level++;
                    ProgressManager.saveProgress('shapes', this.level);
                    ErrorlessLearning.showFeedback({
                        type: 'success',
                        message: `Level ${this.level}!`,
                        emoji: '🚀'
                    }, 2000);
                    AudioManager.playCelebrate();
                }
                this.createLevel();
                this.updateInstruction();
            }, 1500);

            // Create floating label at success point
            this.createLabel('🎯', shapePos.clone());

        } else {
            // Miss - animate back
            ErrorlessLearning.showFeedback(ErrorlessLearning.recordAttempt(false), 800);
            AudioManager.playEncourage();
            AudioManager.vibrate('failure');
            this.animateBack();
        }
    },

    animateBack() {
        if (!this.draggableShape) return;

        const startPos = this.draggableShape.mesh.position.clone();
        const endPos = new THREE.Vector3(0, 0.5, 3);
        const startTime = Date.now();
        const duration = 500;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(1, elapsed / duration);

            // Elastic ease out
            const ease = (x) => {
                const c4 = (2 * Math.PI) / 3;
                return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
            };

            const p = ease(t);
            this.draggableShape.mesh.position.lerpVectors(startPos, endPos, p);

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    },

    updateInstruction() {
        const text = `${Localization.get('drag_shape')} (Level ${this.level})`;
        document.getElementById('instruction-text').textContent = text;
        AudioManager.speak(text);
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

        // Update environment
        if (this.environment) this.environment.update(time);

        // Update labels
        this.updateLabels(0.016);

        // Update shape animation
        if (this.draggableShape && !this.isDragging) {
            this.draggableShape.update(time);
        }

        // Pulse target hole
        if (this.targetHole) {
            const pulse = Math.sin(time * 3) * 0.2 + 0.6;
            this.targetHole.material.opacity = pulse;
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

        if (this.draggableShape) {
            this.draggableShape.dispose();
            this.draggableShape = null;
        }
        if (this.targetHole) {
            this.scene.remove(this.targetHole);
            this.targetHole = null;
        }
        if (this.distractorHole) {
            this.scene.remove(this.distractorHole);
            this.distractorHole = null;
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
