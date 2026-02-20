# 🧩 Gigsaw (Jigsaw Flow)

A high-performance, "zen-mode" jigsaw puzzle game built with React and HTML5 Canvas, designed for tactile satisfaction and 60 FPS performance on both desktop and mobile devices.

## 🏗️ Architecture: The Bridge Pattern

The project follows a **Bridge Pattern** to decouple UI orchestration from high-frequency rendering logic:

-   **React (The Orchestrator):** Manages global game state (current level, status, progress), asset preloading, and UI overlays (HUD, menus).
-   **HTML5 Canvas (The Engine):** A standalone `PuzzleEngine` class that handles the render loop, pointer events, collision detection (snapping), and animations.
-   **Communication:** React passes `levelConfig` and assets to the Canvas engine; the engine emits callbacks like `onProgress` and `onLevelComplete` to update the React state.

## 🚀 Key Technologies

-   **Framework:** React 18
-   **Build Tool:** Vite
-   **Rendering:** HTML5 Canvas API
-   **Testing:** Vitest
-   **Interactions:** Pointer Events API (Unified support for Mouse, Touch, and Stylus)
-   **Styling:** Vanilla CSS

## 🛠️ Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- `pnpm` (Project uses pnpm v10)

### Commands
| Action | Command |
| :--- | :--- |
| **Install Dependencies** | `pnpm install` |
| **Start Dev Server** | `pnpm dev` |
| **Build for Production** | `pnpm build` |
| **Preview Production Build** | `pnpm preview` |
| **Run Unit Tests** | `pnpm test` |

## 📂 Project Structure

-   `src/components/`: React UI components (Overlays, Effects, Canvas Wrapper).
-   `src/engine/`: Core game logic.
    -   `PuzzleEngine.js`: The main Canvas-based game loop and interaction handler.
    -   `levels.js`: Configuration for puzzle difficulty and scaling.
-   `src/utils/`: Helper functions for audio, image generation, and math.
-   `src/assets/`: Static assets including icons and puzzle images.

## 🎨 Development Conventions

### Performance
-   **Canvas vs. React:** Never manage individual piece positions in React state. Use the `PuzzleEngine` to handle all movement and rendering to maintain 60 FPS.
-   **RAF Loop:** The `requestAnimationFrame` loop in `PuzzleEngine` only runs when interaction or animation is occurring to save CPU/Battery.
-   **Asset Preloading:** The app preloads the next level's image while the current level is being played.

### Interactions
-   **Tactile Feel:** Pieces use scaling and shadow effects on "pickup" to provide depth.
-   **Magnetism:** The "snap" effect uses linear interpolation (LERP) for smooth transitions into the correct position.
-   **DPI Scaling:** The Canvas automatically handles `devicePixelRatio` for sharp rendering on Retina/High-DPI displays.

### Code Style
-   Use Functional Components and Hooks for React logic.
-   Maintain clear separation between the Canvas Engine (Class-based) and React UI.
-   Write unit tests for engine logic in `src/engine/puzzle-logic.test.js`.
