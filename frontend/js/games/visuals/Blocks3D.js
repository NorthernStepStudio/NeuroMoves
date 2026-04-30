/**
 * RealLife Steps OT - Premium 3D Blocks
 * Procedural 3D blocks with rounded edges for stacking game.
 */

export class Block3D {
    constructor(scene, options = {}) {
        this.scene = scene;
        /** @type {any} */
        this.mesh = null;

        const width = options.width || 1.2;
        const height = options.height || 0.6;
        const depth = options.depth || 0.8;
        const color = options.color || 0x00f2ff;
        const bevelRadius = options.bevel || 0.08;

        // Premium Holographic Material
        if (THREE.MeshPhysicalMaterial) {
            this.material = new THREE.MeshPhysicalMaterial({
                color: color,
                metalness: 0,
                roughness: 0.1,
                transmission: 0.3,
                thickness: 0.5,
                transparent: true,
                opacity: 0.95,
                emissive: color,
                emissiveIntensity: 0.1,
                iridescence: 0.5,
                iridescenceIOR: 1.3
            });
        } else {
            this.material = new THREE.MeshToonMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.1
            });
        }

        this.createBlock(width, height, depth, bevelRadius);

        if (options.position && this.mesh) {
            this.mesh.position.copy(options.position);
        }

        // Physics-like state
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.targetY = options.targetY || 0;
        this.isDropping = false;
    }

    createBlock(width, height, depth, bevelRadius) {
        const geometry = new THREE.BoxGeometry(width, height, depth, 4, 4, 4);

        // Slightly scale vertices for rounded look
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            // Apply subtle spherical softening to corners
            const dist = Math.sqrt(x * x + y * y + z * z);
            const maxDist = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2 + (depth / 2) ** 2);
            const factor = 1 - (Math.pow(dist / maxDist, 4) * 0.15);

            positions.setXYZ(i, x * factor, y * factor, z * factor);
        }
        geometry.computeVertexNormals();

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.userData = { block3D: this };

        this.scene.add(this.mesh);
    }

    setPosition(x, y, z) {
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
        }
    }

    setColor(hex) {
        this.material.color.setHex(hex);
        this.material.emissive.setHex(hex);
    }

    setGlow(intensity) {
        this.material.emissiveIntensity = intensity;
    }

    // Start drop animation
    drop(targetY) {
        this.targetY = targetY;
        this.isDropping = true;
        this.velocity.y = 0;
    }

    update(deltaTime) {
        if (this.isDropping && this.mesh) {
            // Simple gravity simulation
            const gravity = 20;
            this.velocity.y -= gravity * deltaTime;
            this.mesh.position.y += this.velocity.y * deltaTime;

            // Check if landed
            if (this.mesh.position.y <= this.targetY) {
                this.mesh.position.y = this.targetY;
                this.velocity.y = 0;
                this.isDropping = false;

                // Slight bounce
                this.mesh.scale.y = 0.8;
                this.mesh.scale.x = 1.1;
                this.mesh.scale.z = 1.1;
            }
        }

        // Animate scale back to normal (bounce recovery)
        if (this.mesh && !this.isDropping) {
            this.mesh.scale.x += (1 - this.mesh.scale.x) * 0.1;
            this.mesh.scale.y += (1 - this.mesh.scale.y) * 0.1;
            this.mesh.scale.z += (1 - this.mesh.scale.z) * 0.1;

            // Subtle wobble
            this.mesh.rotation.z = Math.sin(Date.now() * 0.002 + this.mesh.position.x) * 0.02;
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
 * Factory for creating Block3D instances
 */
export const Blocks3D = {
    // Neon color palette
    colors: [0x00f2ff, 0xff00ff, 0xbd00ff, 0xffea00, 0xccff00, 0x00f2ff],

    createBlock: function (scene, options = {}) {
        return new Block3D(scene, options);
    },

    getRandomColor: function () {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    },

    createStack: function (scene, count, baseY = 0, blockHeight = 0.6) {
        const blocks = [];
        for (let i = 0; i < count; i++) {
            const block = new Block3D(scene, {
                color: this.colors[i % this.colors.length],
                position: new THREE.Vector3(0, baseY + i * blockHeight + blockHeight / 2, 0),
                targetY: baseY + i * blockHeight + blockHeight / 2
            });
            blocks.push(block);
        }
        return blocks;
    }
};
