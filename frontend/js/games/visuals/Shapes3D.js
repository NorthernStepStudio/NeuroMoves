/**
 * RealLife Steps OT - Premium 3D Shapes
 * Procedural shapes (Circle, Square, Triangle, Star) with extruded geometry.
 */

export class Shape3D {
    constructor(scene, type, options = {}) {
        this.scene = scene;
        this.type = type;
        /** @type {any} */
        this.mesh = null;

        const color = options.color || 0xff00ff;
        const size = options.size || 1;
        const depth = options.depth || 0.3;

        // Premium Holographic Material
        if (THREE.MeshPhysicalMaterial) {
            this.material = new THREE.MeshPhysicalMaterial({
                color: color,
                metalness: 0,
                roughness: 0.1,
                transmission: 0.5,
                thickness: 0.5,
                transparent: true,
                opacity: 0.9,
                emissive: color,
                emissiveIntensity: 0.2,
                iridescence: 0.8,
                iridescenceIOR: 1.3
            });
        } else {
            this.material = new THREE.MeshToonMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.15
            });
        }

        this.createShape(type, size, depth);

        if (options.position && this.mesh) {
            this.mesh.position.copy(options.position);
        }
    }

    createShape(type, size, depth) {
        let shape;

        switch (type) {
            case 'circle':
                shape = new THREE.Shape();
                const circleRadius = size;
                shape.absarc(0, 0, circleRadius, 0, Math.PI * 2, false);
                break;

            case 'rect':
            case 'square':
                shape = new THREE.Shape();
                const halfSize = size;
                shape.moveTo(-halfSize, -halfSize);
                shape.lineTo(halfSize, -halfSize);
                shape.lineTo(halfSize, halfSize);
                shape.lineTo(-halfSize, halfSize);
                shape.closePath();
                break;

            case 'triangle':
                shape = new THREE.Shape();
                const h = size * Math.sqrt(3) / 2;
                shape.moveTo(0, h * 0.6);
                shape.lineTo(-size, -h * 0.4);
                shape.lineTo(size, -h * 0.4);
                shape.closePath();
                break;

            case 'star':
                shape = this.createStarShape(size, 5, 0.5);
                break;

            default:
                // Default to circle
                shape = new THREE.Shape();
                shape.absarc(0, 0, size, 0, Math.PI * 2, false);
        }

        const extrudeSettings = {
            depth: depth,
            bevelEnabled: true,
            bevelThickness: 0.08,
            bevelSize: 0.08,
            bevelSegments: 3
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // User data for raycasting
        this.mesh.userData = { shapeType: type, shape3D: this };

        this.scene.add(this.mesh);
    }

    createStarShape(outerRadius, points, innerRatio) {
        const shape = new THREE.Shape();
        const innerRadius = outerRadius * innerRatio;
        const angle = Math.PI / points;

        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const theta = i * angle - Math.PI / 2;
            const x = Math.cos(theta) * radius;
            const y = Math.sin(theta) * radius;

            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }
        shape.closePath();
        return shape;
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

    // Glow effect when hovering or selected
    setGlow(intensity) {
        this.material.emissiveIntensity = intensity;
    }

    update(time) {
        // Subtle floating animation
        if (this.mesh) {
            this.mesh.position.y += Math.sin(time * 2 + this.mesh.position.x) * 0.002;
            this.mesh.rotation.z = Math.sin(time * 0.5) * 0.05;
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
 * Factory for creating Shape3D instances
 */
export const Shapes3D = {
    createShape: function (scene, type, options) {
        return new Shape3D(scene, type, options);
    },

    createCircle: function (scene, options = {}) {
        return new Shape3D(scene, 'circle', options);
    },

    createSquare: function (scene, options = {}) {
        return new Shape3D(scene, 'square', options);
    },

    createTriangle: function (scene, options = {}) {
        return new Shape3D(scene, 'triangle', options);
    },

    createStar: function (scene, options = {}) {
        return new Shape3D(scene, 'star', options);
    }
};
