import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./styles/modal.css";
import { App } from "./App";
import { generateHeroBg, generateContactBg } from "./hero-bg";

// Generate SVG backgrounds (vanilla JS, same as original)
generateHeroBg();
generateContactBg();

// Set copyright year
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

// Mount React into modal root
const modalRoot = document.getElementById("modal-root");
if (modalRoot) {
  createRoot(modalRoot).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
