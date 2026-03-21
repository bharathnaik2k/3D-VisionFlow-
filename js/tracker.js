import * as THREE from "three";
import { dom, state } from "./state.js";

let handLandmarker = null;
let lastVideoTime = -1;
export let useMouse = false;

export async function setupHandTracker() {
    dom.statusText.textContent = "Loading hand tracking model...";

    const visionModule = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm"
    );
    const { HandLandmarker, FilesetResolver } = visionModule;

    const resolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(resolver, {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
        },
        runningMode: "VIDEO",
        numHands: 1
    });
}

export function updateHandTracking() {
    if (useMouse || !handLandmarker || dom.video.readyState < 2) return;
    if (dom.video.currentTime === lastVideoTime) return;
    lastVideoTime = dom.video.currentTime;

    const result = handLandmarker.detectForVideo(dom.video, performance.now());
    const landmarks = result.landmarks?.[0];

    if (!landmarks) {
        state.handDetected = false;
        state.targetScale = 1;
        dom.statusText.textContent = "Show your hand to the camera...";
        dom.handIndicator.classList.remove("visible");
        return;
    }

    state.handDetected = true;

    // Use wrist (0) as main position anchor
    const wrist = landmarks[0];
    // Use middle finger tip (12) for tilt calculation
    const middleTip = landmarks[12];
    // Use index finger tip (8) for pinch control
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    // Position: map hand center to scene space
    const handX = (wrist.x - 0.5) * 2; // -1 to 1 (mirrored)
    const handY = (0.5 - wrist.y) * 2;  // -1 to 1

    state.targetX = THREE.MathUtils.clamp(-handX * 3.5, -4, 4);
    state.targetY = THREE.MathUtils.clamp(handY * 2.5, -2.5, 2.5);

    // Globe rotation: movement speed on X axis spins the globe
    const handMoveX = wrist.x - state.prevHandX;
    state.globeSpinSpeed = THREE.MathUtils.clamp(-handMoveX * 15, -0.15, 0.15);
    state.prevHandX = wrist.x;

    // Rotation: based on finger direction relative to wrist
    const dy = middleTip.y - wrist.y;
    state.targetRotX = THREE.MathUtils.clamp(dy * 3, -1, 1);

    // Pinch detection: thumb to index distance affects scale
    const pinchDist = Math.sqrt(
        (thumbTip.x - indexTip.x) ** 2 +
        (thumbTip.y - indexTip.y) ** 2 +
        (thumbTip.z - indexTip.z) ** 2
    );
    state.targetScale = THREE.MathUtils.clamp(0.5 + pinchDist * 6, 0.6, 1.8);

    // UI updates
    dom.coordsDisplay.textContent = `X:${state.targetX.toFixed(1)}  Y:${state.targetY.toFixed(1)}`;
    dom.handIndicator.classList.add("visible");
    dom.statusText.textContent = "✋ Hand tracking active!";
}

export function enableMouseFallback() {
    useMouse = true;
    function onMove(e) {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = -(e.clientY / window.innerHeight - 0.5) * 2;
        state.targetX = THREE.MathUtils.clamp(x * 3.5, -4, 4);
        state.targetY = THREE.MathUtils.clamp(y * 2.5, -2.5, 2.5);
        state.targetRotY = THREE.MathUtils.clamp(x * 0.8, -1.2, 1.2);
        state.targetRotX = THREE.MathUtils.clamp(y * 0.5, -1, 1);
        dom.coordsDisplay.textContent = `X:${state.targetX.toFixed(1)}  Y:${state.targetY.toFixed(1)}`;
        dom.handIndicator.classList.add("visible");
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", (e) => {
        const t = e.touches[0];
        onMove({ clientX: t.clientX, clientY: t.clientY });
    });
}
