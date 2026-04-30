/**
 * RealLife Steps - Premium Environment
 * Creates a beautiful, child-friendly 3D scene ("The Playroom")
 */

// Uses global THREE object loaded from CDN

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.setupLights();
        this.setupRoom();
        this.setupParticles();
    }

    setupLights() {
        // Soft ambient light (cool purple tint)
        const ambientLight = new THREE.AmbientLight(0x6633ff, 0.4);
        this.scene.add(ambientLight);

        // Main Directional Light (cool white)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        this.scene.add(dirLight);

        // Neon Cyan Rim Light
        const cyanLight = new THREE.PointLight(0x00f2ff, 0.8, 25);
        cyanLight.position.set(-5, 3, 5);
        this.scene.add(cyanLight);

        // Neon Magenta Accent Light
        const magentaLight = new THREE.PointLight(0xff00ff, 0.5, 20);
        magentaLight.position.set(5, 2, -3);
        this.scene.add(magentaLight);
    }

    setupRoom() {
        // Starry/Nebula background
        this.scene.background = new THREE.Color(0x0a0a12);

        // Main Grid
        const gridSize = 40;
        const gridDivisions = 40;
        this.grid = new THREE.GridHelper(gridSize, gridDivisions, 0x00f2ff, 0x004455);
        this.grid.position.y = -0.01;
        this.grid.material.transparent = true;
        this.grid.material.opacity = 0.5;
        this.scene.add(this.grid);

        // Secondary "Data" Pulse Grid
        this.pulseGrid = new THREE.GridHelper(gridSize, 20, 0xff00ff, 0x440055);
        this.pulseGrid.position.y = -0.02;
        this.pulseGrid.material.transparent = true;
        this.pulseGrid.material.opacity = 0.2;
        this.scene.add(this.pulseGrid);

        // Central Holographic Platform
        const platformGeo = new THREE.CircleGeometry(4, 64);
        const platformMat = new THREE.MeshToonMaterial({
            color: 0x00f2ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        this.platform = new THREE.Mesh(platformGeo, platformMat);
        this.platform.rotation.x = -Math.PI / 2;
        this.platform.position.y = -0.05;
        this.scene.add(this.platform);

        // Central Ring
        const ringGeo = new THREE.RingGeometry(3.8, 4, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        this.ring = new THREE.Mesh(ringGeo, ringMat);
        this.ring.rotation.x = -Math.PI / 2;
        this.scene.add(this.ring);

        // Fog for depth
        this.scene.fog = new THREE.Fog(0x0d0d1a, 5, 30);
    }

    setupParticles() {
        // Floating bubbles/stars for magic feel
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 100;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            // Random positions around the center
            posArray[i] = (Math.random() - 0.5) * 20;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const material = new THREE.PointsMaterial({
            size: 0.2,
            color: 0x00f2ff, // Neon Cyan
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(particlesGeometry, material);
        this.scene.add(this.particles);
    }

    update(time) {
        // Gentle rotation of particles
        if (this.particles) {
            this.particles.rotation.y = time * 0.05;
            this.particles.position.y = Math.sin(time * 0.2) * 0.5;
        }
    }
}
