/**
 * RealLife Steps - Premium 3D Hand
 * A procedural "Toddler Style" hand using primitives and Toon Shading.
 */

// Uses global THREE object loaded from CDN

export class Hand {
    constructor(scene) {
        this.scene = scene;
        this.container = new THREE.Group();
        this.scene.add(this.container);

        // Skin Tone Material with subtle neon glow
        this.skinMaterial = new THREE.MeshToonMaterial({
            color: 0xffccaa, // Fair/Warm skin tone
            emissive: 0xff00ff, // Magenta neon glow
            emissiveIntensity: 0.08,
            gradientMap: null
        });

        // Alternate skin tone for diversity (comment out to swap)
        // this.skinMaterial.color.setHex(0x8d5524); // Darker tone

        this.fingers = [];
        this.buildHand();
    }

    buildHand() {
        // 1. Palm (A rounded box or flattened sphere)
        // Better Palm: A central sphere + side spheres merged? 
        // Let's use a scaled sphere for the main palm
        const palmGeometry = new THREE.SphereGeometry(1, 32, 32);
        this.palm = new THREE.Mesh(palmGeometry, this.skinMaterial);
        this.palm.scale.set(1.0, 1.1, 0.4);
        this.container.add(this.palm);

        // 2. Wrist (Cylinder connecting to bottom)
        const wristGeo = new THREE.CylinderGeometry(0.7, 0.8, 1.5, 32);
        const wrist = new THREE.Mesh(wristGeo, this.skinMaterial);
        wrist.position.y = -1.2;
        this.container.add(wrist);

        // 3. Fingers
        // Structure: Finger Group -> Proximal -> Medial -> Distal
        // Positions relative to palm center

        const fingerConfig = [
            { name: 'Thumb', x: 0.8, y: -0.2, z: 0, length: 0.8, distinct: true },
            { name: 'Index', x: 0.55, y: 0.9, z: 0, length: 1.0 },
            { name: 'Middle', x: 0.0, y: 1.0, z: 0, length: 1.1 },
            { name: 'Ring', x: -0.55, y: 0.9, z: 0, length: 1.0 },
            { name: 'Pinky', x: -0.9, y: 0.7, z: 0, length: 0.8 }
        ];

        fingerConfig.forEach(conf => {
            this.createFinger(conf);
        });
    }

    createFinger(config) {
        const fingerGroup = new THREE.Group();

        // Position at knuckle on palm
        fingerGroup.position.set(config.x, config.y, config.z);

        // Thumb needs special rotation
        if (config.name === 'Thumb') {
            fingerGroup.rotation.z = -Math.PI / 4;
            fingerGroup.rotation.y = -Math.PI / 6;
        }

        this.palm.add(fingerGroup);

        // We will store the "pivot" point for curling
        // Basic finger: 2 segments for toddler simplicity (cute fingers don't visualize 3 joints well)

        // Segment 1 (Base)
        const seg1Len = config.length * 0.6;
        const seg1Geo = new THREE.CylinderGeometry(0.22, 0.22, seg1Len, 8);
        const seg1 = new THREE.Mesh(seg1Geo, this.skinMaterial);
        seg1.position.y = seg1Len / 2; // Pivot is at 0,0,0
        fingerGroup.add(seg1);

        // Joint (visual sphere)
        const jointGeo = new THREE.SphereGeometry(0.21);
        const joint = new THREE.Mesh(jointGeo, this.skinMaterial);
        joint.position.y = seg1Len; // Top of seg1
        fingerGroup.add(joint);

        // Segment 2 (Tip)
        const tipGroup = new THREE.Group();
        tipGroup.position.y = seg1Len; // At the joint
        fingerGroup.add(tipGroup);

        const seg2Len = config.length * 0.5;
        const seg2Geo = new THREE.CylinderGeometry(0.20, 0.18, seg2Len, 8);
        const seg2 = new THREE.Mesh(seg2Geo, this.skinMaterial);
        seg2.position.y = seg2Len / 2;
        tipGroup.add(seg2);

        // Store reference for animation
        this.fingers.push({
            name: config.name,
            group: fingerGroup, // Rotates the whole finger (knuckle)
            tip: tipGroup,      // Rotates the tip (curl)
            targetCurl: 0,      // 0 = straight, 1 = curled
            currentCurl: 0
        });
    }

    /**
     * Set pose based on a number (0-5)
     */
    setPose(count) {
        // Logic for which fingers are up
        // 0: Fist, 1: Index, 2: Index + Middle, etc.

        const curls = {
            Thumb: 1, Index: 1, Middle: 1, Ring: 1, Pinky: 1
        };

        if (count >= 1) curls.Index = 0;
        if (count >= 2) curls.Middle = 0;
        if (count >= 3) curls.Ring = 0;
        if (count >= 4) curls.Pinky = 0;
        if (count >= 5) curls.Thumb = 0;

        // Apply to targets
        this.fingers.forEach(f => {
            f.targetCurl = curls[f.name];
        });
    }

    /**
     * Curl a specific finger by index (0-4: Thumb, Index, Middle, Ring, Pinky)
     */
    curlFinger(fingerIndex) {
        if (this.fingers[fingerIndex]) {
            this.fingers[fingerIndex].targetCurl = 1; // Curl it
        }
    }

    /**
     * Uncurl a specific finger
     */
    uncurlFinger(fingerIndex) {
        if (this.fingers[fingerIndex]) {
            this.fingers[fingerIndex].targetCurl = 0; // Straighten it
        }
    }

    update(deltaTime) {
        // Animate curls smoothly
        const speed = 5.0 * deltaTime;

        this.fingers.forEach((f, index) => {
            // Lerp current curl
            if (f.currentCurl < f.targetCurl) {
                f.currentCurl = Math.min(f.targetCurl, f.currentCurl + speed);
            } else {
                f.currentCurl = Math.max(f.targetCurl, f.currentCurl - speed);
            }

            // Apply rotation
            // Thumb rotates on Y axis for more natural curl
            if (f.name === 'Thumb') {
                f.group.rotation.y = f.currentCurl * (Math.PI / 3) - Math.PI / 6;
                f.tip.rotation.y = f.currentCurl * (Math.PI / 4);
            } else {
                // Other fingers rotate on X axis
                f.group.rotation.x = f.currentCurl * (Math.PI / 2.2);
                f.tip.rotation.x = f.currentCurl * (Math.PI / 2.5);
            }
        });

        // Floating animation for the whole hand
        this.container.position.y = Math.sin(Date.now() * 0.001) * 0.1;
    }

    /**
     * Reset all fingers to open position
     */
    reset() {
        this.fingers.forEach(f => {
            f.targetCurl = 0;
        });
    }
}
