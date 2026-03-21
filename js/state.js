import * as THREE from "three";

export const state = {
  currentX: 0,
  currentY: 0,
  currentRotX: 0,
  currentRotY: 0,
  targetX: 0,
  targetY: 0,
  targetRotX: 0,
  targetRotY: 0,
  handDetected: false,
  interactionScale: 1,
  targetScale: 1,
  globeSpinSpeed: 0,
  prevHandX: 0.5,
};

export const clock = new THREE.Clock();

export const dom = {
  canvas: document.getElementById("scene"),
  video: document.getElementById("miniVideo"),
  statusText: document.getElementById("statusText"),
  errorEl: document.getElementById("error"),
  handIndicator: document.getElementById("handIndicator"),
  coordsDisplay: document.getElementById("coordsDisplay"),
};

export function showError(msg) {
  dom.errorEl.textContent = msg;
  dom.errorEl.style.display = "block";
}
