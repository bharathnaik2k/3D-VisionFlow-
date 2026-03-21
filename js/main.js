import { setupCamera } from "./camera.js";
import { animateScene, handleResize, setupScene } from "./scene.js";
import { showError } from "./state.js";
import { enableMouseFallback, setupHandTracker } from "./tracker.js";

async function init() {
    try {
        const sphereGroup = setupScene();

        // Start animation loop
        function animate() {
            requestAnimationFrame(animate);
            animateScene(sphereGroup);
        }
        animate();

        // Setup interactions
        window.addEventListener("resize", handleResize);

        // Setup camera and tracking
        try {
            await setupCamera();
            await setupHandTracker();
        } catch (err) {
            console.warn("Hand tracking failed, using mouse fallback:", err);
            showError("Camera or hand tracking unavailable. Using mouse/touch.");
            enableMouseFallback();
        }
    } catch (err) {
        console.error("Initialization error:", err);
        showError("A critical error occurred while loading the 3D scene.");
    }
}

// Start the application
init();
