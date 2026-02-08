# Role
You are a Lead UI/UX Designer expert in modern web aesthetics (specifically Glassmorphism) and animation.

# Project Overview
We are building an interactive Guitar Fretboard Web App for intermediate learners. The goal is to visualize complex chord shapes and inversions. The app must look premium, polished, and futuristic—similar to a web-based version of GarageBand's instrument interfaces.

# Visual Style Requirements: "Glassmorphism"
Please generate the design specifications (CSS) based on the following rules:

## 1. Global Atmosphere
- **Background:** A deep, dark, rich gradient background (e.g., deep purple to midnight blue) to ensure the "glass" elements pop.
- **Font:** Use a clean, sans-serif font (e.g., Inter, Roboto, or System UI) with high readability.

## 2. The Glass Panels (Controls & Containers)
- **Effect:** Use `background: rgba(255, 255, 255, 0.1);` with `backdrop-filter: blur(10px);`.
- **Borders:** Subtle white borders with low opacity (`1px solid rgba(255, 255, 255, 0.2)`) to simulate the edge of glass.
- **Shadows:** Soft, multi-layered shadows to create depth and separation from the background.

## 3. The Fretboard Visuals
- **The Board:** Should look like a stylized guitar neck (dark wood texture or sleek dark grey).
- **Strings:** - 6 Strings ranging in visual thickness (Low E thickest, High E thinnest).
    - Metallic silver/gold color.
- **Frets:** Metallic vertical bars.
- **Fret Markers:** Standard dots (3, 5, 7, 9, 12, etc.) inlaid on the board.

## 4. Interactive Elements & Animations
- **Active Notes:** When a note is part of a chord, it should "glow" (neon effect) with a distinct color (e.g., Cyan or Amber).
- **String Vibration:** Define a CSS `@keyframes` animation named `vibrate`. When a string is clicked or played, it should oscillate rapidly for a split second.
- **Transitions:** All hover states and color changes should have smooth `ease-in-out` transitions.

# Deliverable for Design Phase
Please write:
1.  **HTML Structure (`index.html`):** A semantic container layout including the Search Bar area, the Fretboard area (using a container for dynamic rendering), and Control buttons.
2.  **CSS (`style.css`):** The complete styling implementing the Glassmorphism rules above.