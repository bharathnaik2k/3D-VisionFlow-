import { setupCamera } from "./camera.js";
import { animateScene, handleResize, setupScene } from "./scene.js";
import { dom, showError, state } from "./state.js";
import { enableMouseFallback, setupHandTracker } from "./tracker.js";

async function init() {
    try {
        const sphereGroups = setupScene();

        // Start animation loop
        function animate() {
            requestAnimationFrame(animate);
            animateScene(sphereGroups);
        }
        animate();

        // Setup interactions
        window.addEventListener("resize", handleResize);

        // Mode Switching
        dom.btnNeon.addEventListener("click", () => {
            state.currentMode = "neon";
            dom.btnNeon.classList.add("active");
            dom.btnSun.classList.remove("active");
        });
        dom.btnSun.addEventListener("click", () => {
            state.currentMode = "sun";
            dom.btnSun.classList.add("active");
            dom.btnNeon.classList.remove("active");
        });

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
