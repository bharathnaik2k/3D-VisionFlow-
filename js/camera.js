import { dom } from "./state.js";

export async function setupCamera() {
    dom.statusText.textContent = "Requesting camera access...";
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user",
            width: { ideal: 960 },
            height: { ideal: 720 }
        },
        audio: false
    });
    dom.video.srcObject = stream;
    dom.video.classList.remove("hidden");
    await dom.video.play();
}
