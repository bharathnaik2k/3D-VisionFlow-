import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { clock, dom, state } from "./state.js";
import { updateHandTracking } from "./tracker.js";

export let scene, cam, renderer, composer;
let neonGroup, sunGroup;
let outerSphere, wireSphere, core, core2, glowShell, glowShell2, ringParticles, ring2, ring3, energyParticles, stars;
let sunSphere, sunCorona, sunRings, sunParticles;
let mainLight, purpleLight, pinkLight, extraLight1, extraLight2;

const ringCount = 200;
const ring2Count = 150;
const ring3Count = 100;
const energyCount = 400;
const starCount = 3000;
const sunRingCount = 12000;

let ringAngles = new Float32Array(ringCount);
let ringRadii = new Float32Array(ringCount);
let ringOffsets = new Float32Array(ringCount);

let ring2Angles = new Float32Array(ring2Count);
let ring2Radii = new Float32Array(ring2Count);

let ring3Angles = new Float32Array(ring3Count);
let ring3Radii = new Float32Array(ring3Count);

let energySpeeds = [];

export function setupScene() {
    dom.statusText.textContent = "Loading 3D engine...";

    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;

    cam = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    cam.position.set(0, 0, 8);

    /* ── Postprocessing bloom ── */
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, cam));
    const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        2.2, 0.25, 0.08
    );
    composer.addPass(bloom);

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0x6633aa, 1.2));

    mainLight = new THREE.PointLight(0x00ffcc, 80, 50);
    mainLight.position.set(4, 4, 6);
    scene.add(mainLight);

    purpleLight = new THREE.PointLight(0xff00ff, 60, 40);
    purpleLight.position.set(-5, -3, 4);
    scene.add(purpleLight);

    pinkLight = new THREE.PointLight(0xffff00, 45, 35);
    pinkLight.position.set(0, 5, -3);
    scene.add(pinkLight);

    extraLight1 = new THREE.PointLight(0x00ff66, 35, 30);
    extraLight1.position.set(3, -4, 5);
    scene.add(extraLight1);

    extraLight2 = new THREE.PointLight(0xff3366, 30, 28);
    extraLight2.position.set(-3, 4, -4);
    scene.add(extraLight2);

    /* ── Background stars ── */
    const starsGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * 120;
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * 120;
        starPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
        starSizes[i] = Math.random() * 3.0 + 0.8;
    }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starsGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
    const starsMat = new THREE.PointsMaterial({
        color: 0xeeccff,
        size: 0.22,
        transparent: true,
        opacity: 1.0,
        sizeAttenuation: true,
    });
    stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    /* ── Main sphere groups ── */
    neonGroup = new THREE.Group();
    sunGroup = new THREE.Group();
    scene.add(neonGroup);
    scene.add(sunGroup);
    sunGroup.visible = false;

    /* ══════════════════════ NEON MODE ══════════════════════ */

    /* ── Outer glass sphere ── */
    outerSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 64, 64),
        new THREE.MeshPhysicalMaterial({
            color: 0x2a1050,
            metalness: 0.1,
            roughness: 0.05,
            transmission: 0.92,
            thickness: 0.5,
            ior: 1.5,
            clearcoat: 1,
            clearcoatRoughness: 0.02,
            transparent: true,
            opacity: 0.4,
            envMapIntensity: 1.5,
        })
    );
    neonGroup.add(outerSphere);

    /* ── Wireframe sphere ── */
    const wireGeo = new THREE.IcosahedronGeometry(1.85, 3);
    const wireMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
    });
    wireSphere = new THREE.Mesh(wireGeo, wireMat);
    neonGroup.add(wireSphere);

    /* ── Inner core glow ── */
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0x00ffee,
        transparent: true,
        opacity: 1.0,
    });
    core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), coreMat);
    neonGroup.add(core);

    /* ── Outer glow shell ── */
    glowShell = new THREE.Mesh(
        new THREE.SphereGeometry(2.0, 48, 48),
        new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide
        })
    );
    neonGroup.add(glowShell);

    glowShell2 = new THREE.Mesh(
        new THREE.SphereGeometry(2.5, 48, 48),
        new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.04,
            side: THREE.BackSide
        })
    );
    neonGroup.add(glowShell2);

    /* ── Inner core 2 ── */
    core2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 32, 32),
        new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.45,
        })
    );
    neonGroup.add(core2);

    /* ── Orbiting ring particles ── */
    const ringGeo = new THREE.BufferGeometry();
    const ringPos = new Float32Array(ringCount * 3);
    for (let i = 0; i < ringCount; i++) {
        ringAngles[i] = (i / ringCount) * Math.PI * 2;
        ringRadii[i] = 2.2 + Math.random() * 0.4;
        ringOffsets[i] = (Math.random() - 0.5) * 0.3;
        ringPos[i * 3] = Math.cos(ringAngles[i]) * ringRadii[i];
        ringPos[i * 3 + 1] = ringOffsets[i];
        ringPos[i * 3 + 2] = Math.sin(ringAngles[i]) * ringRadii[i];
    }
    ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));

    const ringMat = new THREE.PointsMaterial({
        color: 0x00ffcc,
        size: 0.12,
        transparent: true,
        opacity: 1.0,
        sizeAttenuation: true,
    });
    ringParticles = new THREE.Points(ringGeo, ringMat);
    neonGroup.add(ringParticles);

    /* ── Second ring (tilted) ── */
    const ring2Geo = new THREE.BufferGeometry();
    const ring2Pos = new Float32Array(ring2Count * 3);
    for (let i = 0; i < ring2Count; i++) {
        ring2Angles[i] = (i / ring2Count) * Math.PI * 2;
        ring2Radii[i] = 2.6 + Math.random() * 0.3;
        ring2Pos[i * 3] = Math.cos(ring2Angles[i]) * ring2Radii[i];
        ring2Pos[i * 3 + 1] = Math.sin(ring2Angles[i]) * 0.15;
        ring2Pos[i * 3 + 2] = Math.sin(ring2Angles[i]) * ring2Radii[i];
    }
    ring2Geo.setAttribute("position", new THREE.BufferAttribute(ring2Pos, 3));
    ring2 = new THREE.Points(ring2Geo, new THREE.PointsMaterial({
        color: 0xff00ff,
        size: 0.10,
        transparent: true,
        opacity: 1.0,
        sizeAttenuation: true,
    }));
    ring2.rotation.x = Math.PI * 0.35;
    ring2.rotation.z = Math.PI * 0.15;
    neonGroup.add(ring2);

    /* ── Third ring (yellow, vertical) ── */
    const ring3Geo = new THREE.BufferGeometry();
    const ring3Pos = new Float32Array(ring3Count * 3);
    for (let i = 0; i < ring3Count; i++) {
        ring3Angles[i] = (i / ring3Count) * Math.PI * 2;
        ring3Radii[i] = 2.4 + Math.random() * 0.35;
        ring3Pos[i * 3] = Math.cos(ring3Angles[i]) * ring3Radii[i];
        ring3Pos[i * 3 + 1] = Math.sin(ring3Angles[i]) * ring3Radii[i] * 0.1;
        ring3Pos[i * 3 + 2] = Math.sin(ring3Angles[i]) * ring3Radii[i];
    }
    ring3Geo.setAttribute("position", new THREE.BufferAttribute(ring3Pos, 3));
    ring3 = new THREE.Points(ring3Geo, new THREE.PointsMaterial({
        color: 0xffff00,
        size: 0.09,
        transparent: true,
        opacity: 1.0,
        sizeAttenuation: true,
    }));
    ring3.rotation.x = Math.PI * 0.5;
    ring3.rotation.y = Math.PI * 0.25;
    neonGroup.add(ring3);

    /* ── Floating energy particles around sphere ── */
    const energyGeo = new THREE.BufferGeometry();
    const energyPositions = new Float32Array(energyCount * 3);
    for (let i = 0; i < energyCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1.9 + Math.random() * 1.5;
        energyPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        energyPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        energyPositions[i * 3 + 2] = r * Math.cos(phi);
        energySpeeds.push({
            theta: theta,
            phi: phi,
            r: r,
            speed: 0.002 + Math.random() * 0.008,
            offset: Math.random() * Math.PI * 2
        });
    }
    energyGeo.setAttribute("position", new THREE.BufferAttribute(energyPositions, 3));
    energyParticles = new THREE.Points(energyGeo, new THREE.PointsMaterial({
        color: 0xffff00,
        size: 0.07,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
    }));
    neonGroup.add(energyParticles);

    /* ══════════════════════ GOLDEN SUN MODE ══════════════════════ */

    // Main Sun Sphere
    sunSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 64, 64),
        new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xff6600,
            emissiveIntensity: 2,
            roughness: 0.4,
            metalness: 0.2
        })
    );
    sunGroup.add(sunSphere);

    // Sun Corona/Glow
    sunCorona = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 48, 48),
        new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide
        })
    );
    sunGroup.add(sunCorona);

    // Massive Flat Rings (Saturn style)
    const sunRingGeo = new THREE.BufferGeometry();
    const sunRingPos = new Float32Array(sunRingCount * 3);
    for (let i = 0; i < sunRingCount; i++) {
        const r = 2.4 + Math.random() * 2.8;
        const a = Math.random() * Math.PI * 2;
        sunRingPos[i * 3] = Math.cos(a) * r;
        sunRingPos[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
        sunRingPos[i * 3 + 2] = Math.sin(a) * r;
    }
    sunRingGeo.setAttribute("position", new THREE.BufferAttribute(sunRingPos, 3));
    sunRings = new THREE.Points(sunRingGeo, new THREE.PointsMaterial({
        color: 0xffddaa,
        size: 0.035,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true
    }));
    sunGroup.add(sunRings);

    // Sun Surface Dust
    const sunDustGeo = new THREE.IcosahedronGeometry(1.7, 4);
    sunParticles = new THREE.Points(sunDustGeo, new THREE.PointsMaterial({
        color: 0xffff00,
        size: 0.05,
        transparent: true,
        opacity: 0.8
    }));
    sunGroup.add(sunParticles);

    return { neonGroup, sunGroup };
}

export function animateScene(groups) {
    const { neonGroup, sunGroup } = groups;
    const t = clock.getElapsedTime();
    updateHandTracking();

    // Toggle Groups based on state
    if (state.currentMode === "neon") {
        neonGroup.visible = true;
        sunGroup.visible = false;
        mainLight.color.setHex(0x00ffcc);
        pinkLight.color.setHex(0xffff00);
        renderer.setClearColor(0x030012);
    } else {
        neonGroup.visible = false;
        sunGroup.visible = true;
        mainLight.color.setHex(0xffaa00);
        pinkLight.color.setHex(0xffaa00);
        renderer.setClearColor(0x0a0500);
    }

    const activeGroup = state.currentMode === "neon" ? neonGroup : sunGroup;

    // Smooth interpolation
    const lerpSpeed = 0.07;
    state.currentX = THREE.MathUtils.lerp(state.currentX, state.targetX, lerpSpeed);
    state.currentY = THREE.MathUtils.lerp(state.currentY, state.targetY, lerpSpeed);
    state.currentRotX = THREE.MathUtils.lerp(state.currentRotX, state.targetRotX, lerpSpeed);
    state.currentRotY = THREE.MathUtils.lerp(state.currentRotY, state.targetRotY, lerpSpeed);
    state.interactionScale = THREE.MathUtils.lerp(state.interactionScale, state.targetScale, 0.05);

    // Apply to active group
    activeGroup.position.x = state.currentX;
    activeGroup.position.y = state.currentY;
    activeGroup.rotation.x = state.currentRotX;

    // Globe rotation: hand left/right spins the globe continuously
    state.globeSpinSpeed *= 0.96; // friction
    activeGroup.rotation.y += state.globeSpinSpeed + 0.003;
    activeGroup.scale.setScalar(state.interactionScale);

    if (state.currentMode === "neon") {
        // Idle rotation
        outerSphere.rotation.y += 0.003;
        outerSphere.rotation.x += 0.001;
        wireSphere.rotation.y -= 0.005;
        wireSphere.rotation.z += 0.002;

        // Pulsing core - intense
        const pulse = 0.8 + Math.sin(t * 2.5) * 0.2;
        core.material.opacity = pulse;
        core.scale.setScalar(1 + Math.sin(t * 3) * 0.15);
        core2.rotation.y += 0.015;
        core2.rotation.x -= 0.01;
        core2.scale.setScalar(1 + Math.sin(t * 1.8) * 0.1);

        // Glow shell pulse
        glowShell.material.opacity = 0.06 + Math.sin(t * 1.5) * 0.04;
        glowShell.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
        glowShell2.material.opacity = 0.03 + Math.sin(t * 1.2 + 1) * 0.02;

        // Animate ring particles
        const positions = ringParticles.geometry.attributes.position.array;
        for (let i = 0; i < ringCount; i++) {
            ringAngles[i] += 0.008;
            const wobble = Math.sin(t * 2 + i * 0.3) * 0.08;
            positions[i * 3] = Math.cos(ringAngles[i]) * (ringRadii[i] + wobble);
            positions[i * 3 + 1] = ringOffsets[i] + Math.sin(t * 1.5 + i * 0.2) * 0.15;
            positions[i * 3 + 2] = Math.sin(ringAngles[i]) * (ringRadii[i] + wobble);
        }
        ringParticles.geometry.attributes.position.needsUpdate = true;

        // Animate ring2
        const positions2 = ring2.geometry.attributes.position.array;
        for (let i = 0; i < ring2Count; i++) {
            ring2Angles[i] -= 0.005;
            positions2[i * 3] = Math.cos(ring2Angles[i]) * ring2Radii[i];
            positions2[i * 3 + 1] = Math.sin(ring2Angles[i]) * 0.15 + Math.sin(t + i * 0.4) * 0.1;
            positions2[i * 3 + 2] = Math.sin(ring2Angles[i]) * ring2Radii[i];
        }
        ring2.geometry.attributes.position.needsUpdate = true;

        // Animate ring3
        const positions3 = ring3.geometry.attributes.position.array;
        for (let i = 0; i < ring3Count; i++) {
            ring3Angles[i] += 0.006;
            positions3[i * 3] = Math.cos(ring3Angles[i]) * ring3Radii[i];
            positions3[i * 3 + 1] = Math.sin(ring3Angles[i]) * ring3Radii[i] * 0.1 + Math.sin(t * 1.2 + i * 0.3) * 0.12;
            positions3[i * 3 + 2] = Math.sin(ring3Angles[i]) * ring3Radii[i];
        }
        ring3.geometry.attributes.position.needsUpdate = true;

        // Animate energy particles
        const ePos = energyParticles.geometry.attributes.position.array;
        for (let i = 0; i < energyCount; i++) {
            const s = energySpeeds[i];
            s.theta += s.speed;
            const rNow = s.r + Math.sin(t * 0.8 + s.offset) * 0.3;
            ePos[i * 3] = rNow * Math.sin(s.phi) * Math.cos(s.theta);
            ePos[i * 3 + 1] = rNow * Math.sin(s.phi) * Math.sin(s.theta);
            ePos[i * 3 + 2] = rNow * Math.cos(s.phi);
        }
        energyParticles.geometry.attributes.position.needsUpdate = true;

        // Wireframe opacity reacts to hand
        wireSphere.material.opacity = state.handDetected ? 0.5 : 0.35;
        ringParticles.material.opacity = state.handDetected ? 1.0 : 0.9;
    } else {
        // Sun animations
        sunSphere.rotation.y += 0.008;
        sunParticles.rotation.y -= 0.012;
        sunRings.rotation.y += 0.002;

        sunSphere.scale.setScalar(1 + Math.sin(t * 4) * 0.03);
        sunCorona.material.opacity = 0.12 + Math.sin(t * 2) * 0.05;
    }

    // Slowly rotate stars
    stars.rotation.y += 0.0002;
    stars.rotation.x += 0.0001;

    // Dynamic lights
    mainLight.position.x = 4 + Math.sin(t * 0.5) * 2;
    mainLight.position.y = 4 + Math.cos(t * 0.7) * 1.5;
    purpleLight.position.y = -3 + Math.sin(t * 0.4) * 2;
    extraLight1.position.x = 3 + Math.sin(t * 0.6) * 3;
    extraLight2.position.z = -4 + Math.cos(t * 0.45) * 3;

    composer.render();
}

export function handleResize() {
    cam.aspect = window.innerWidth / window.innerHeight;
    cam.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}
