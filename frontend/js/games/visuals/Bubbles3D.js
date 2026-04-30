/**
 * RealLife Steps OT - Premium 3D Bubbles
 * Iridescent glass spheres with pop particle effects.
 */

export class Bubble3D {
    static particleGeo = null;
    static particleMat = null;

    constructor(scene, options = {}) {
        this.scene = scene;
        /** @type {any} */
        this.mesh = null;
        this.isPopped = false;

        const radius = options.radius || 0.5;
        const color = options.color || 0x00f2ff;

        // Glass-like material
        // Holographic Iridescent Material
        if (THREE.MeshPhysicalMaterial) {
            this.material = new THREE.MeshPhysicalMaterial({
                color: color,
                metalness: 0,
                roughness: 0.05,
                transmission: 0.9,
                thickness: 1.0,
                transparent: true,
                opacity: 0.6,
                iridescence: 1.0,
                iridescenceIOR: 1.5,
                iridescenceThicknessRange: [100, 800]
            });
        } else {
            // Fallback
            this.material = new THREE.MeshToonMaterial({
                color: color,
                transparent: true,
                opacity: 0.7
            });
        }

        this.createBubble(radius);

        if (options.position) {
            this.mesh.position.copy(options.position);
        }

        // Animation state
        this.floatOffset = Math.random() * Math.PI * 2;
        this.floatSpeed = 0.5 + Math.random() * 0.5;
        this.baseY = this.mesh ? this.mesh.position.y : 0;

        // Movement state
        this.speed = options.speed || 0;
        this.bounds = options.bounds || null;
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            0 // Restrict to XY plane (up, down, left, right)
        ).normalize().multiplyScalar(this.speed);

        // Static references for particles to avoid GC pressure
        if (!Bubble3D.particleGeo) Bubble3D.particleGeo = new THREE.SphereGeometry(0.05, 4, 4);
        if (!Bubble3D.particleMat) Bubble3D.particleMat = new THREE.MeshBasicMaterial({ transparent: true });
    }

    createBubble(radius) {
        const geometry = new THREE.SphereGeometry(radius, 32, 32);

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.castShadow = true;
        this.mesh.userData = { bubble3D: this };

        // Inner holographic core
        const glowGeo = new THREE.SphereGeometry(radius * 0.7, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: this.material.color,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        this.mesh.add(glow);

        this.scene.add(this.mesh);
    }

    setPosition(x, y, z) {
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
            this.baseY = y;
        }
    }

    pop() {
        if (this.isPopped) return;
        this.isPopped = true;

        // Create particle burst
        this.createPopParticles();

        // Immediate scale pop
        this.mesh.scale.setScalar(1.2);

        const startTime = Date.now();
        const duration = 150;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(1, elapsed / duration);

            this.mesh.scale.setScalar(1.2 * (1 - t));
            this.material.opacity = 0.6 * (1 - t);

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.dispose();
            }
        };
        animate();
    }

    createPopParticles() {
        const particleCount = 12;
        const color = this.material.color.clone();

        for (let i = 0; i < particleCount; i++) {
            const pMat = Bubble3D.particleMat.clone();
            pMat.color.copy(color);

            const particle = new THREE.Mesh(Bubble3D.particleGeo, pMat);
            particle.position.copy(this.mesh.position);
            this.scene.add(particle);

            // Random velocity in a sphere
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const speed = 3 + Math.random() * 3;

            const vx = Math.sin(theta) * Math.cos(phi) * speed;
            const vy = Math.cos(theta) * speed;
            const vz = Math.sin(theta) * Math.sin(phi) * speed;

            const startTime = Date.now();
            const duration = 600;

            const animateParticle = () => {
                const elapsed = Date.now() - startTime;
                const t = elapsed / duration;

                if (t < 1) {
                    particle.position.x += vx * 0.016;
                    particle.position.y += vy * 0.016;
                    particle.position.z += vz * 0.016;
                    particle.scale.setScalar(1 - t);
                    pMat.opacity = 1 - t;
                    requestAnimationFrame(animateParticle);
                } else {
                    this.scene.remove(particle);
                    pMat.dispose();
                }
            };
            animateParticle();
        }
    }

    update(time, deltaTime = 0.016) {
        if (this.mesh && !this.isPopped) {
            // Autonomous movement
            if (this.speed > 0) {
                this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime * 60));

                // Bounce off bounds
                if (this.bounds) {
                    if (this.mesh.position.x < this.bounds.xMin || this.mesh.position.x > this.bounds.xMax) {
                        this.velocity.x *= -1;
                        this.mesh.position.x = Math.max(this.bounds.xMin, Math.min(this.bounds.xMax, this.mesh.position.x));
                    }
                    if (this.mesh.position.y < this.bounds.yMin || this.mesh.position.y > this.bounds.yMax) {
                        this.velocity.y *= -1;
                        this.mesh.position.y = Math.max(this.bounds.yMin, Math.min(this.bounds.yMax, this.mesh.position.y));
                    }
                    if (this.mesh.position.z < this.bounds.zMin || this.mesh.position.z > this.bounds.zMax) {
                        this.velocity.z *= -1;
                        this.mesh.position.z = Math.max(this.bounds.zMin, Math.min(this.bounds.zMax, this.mesh.position.z));
                    }
                }
            } else {
                // Classic floating animation if no autonomous speed
                this.mesh.position.y = this.baseY + Math.sin(time * this.floatSpeed + this.floatOffset) * 0.3;
            }

            // Slight wobble (kept for visual interest)
            this.mesh.rotation.x = Math.sin(time * 0.5 + this.floatOffset) * 0.1;
            this.mesh.rotation.z = Math.cos(time * 0.5 + this.floatOffset) * 0.1;
        }
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.material.dispose();
        }
    }
}

/**
 * Factory for creating Bubble3D instances
 */
export const Bubbles3D = {
    // Neon color palette for bubbles
    colors: [0x00f2ff, 0xff00ff, 0xbd00ff, 0xffea00, 0xccff00],

    createBubble: function (scene, options = {}) {
        return new Bubble3D(scene, options);
    },

    getRandomColor: function () {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    },

    createCluster: function (scene, count, bounds = { xMin: -3, xMax: 3, yMin: 1, yMax: 4, zMin: -2, zMax: 2 }) {
        const bubbles = [];
        const fixedZ = (bounds.zMin + bounds.zMax) / 2; // Center them in the Z-range

        for (let i = 0; i < count; i++) {
            const x = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
            const y = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);

            const bubble = new Bubble3D(scene, {
                color: this.getRandomColor(),
                radius: 0.3 + Math.random() * 0.4,
                position: new THREE.Vector3(x, y, fixedZ)
            });
            bubbles.push(bubble);
        }
        return bubbles;
    }
};
