# Harborline Build Notes

## CSS Pipeline

Harborline uses handwritten CSS in `styles.css`, not Tailwind.

The repository includes a local `postcss.config.mjs` with no plugins so Vite
does not inherit unrelated PostCSS/Tailwind configuration from parent folders on
the developer machine. This keeps the build self-contained and removes the
previous Tailwind `content` warning.

## Renderer Chunking

The Pixi map renderer is lazy-loaded from `App.tsx` through `React.lazy`.

This keeps the desktop game shell, state logic, market UI, and port panels in
the main bundle while loading Pixi only for the animated map surface. The current
production build emits a separate `MapScene` chunk below Vite's default 500 kB
warning threshold.

Future renderer work should keep this boundary: heavy water shaders, mesh
systems, and optional Three.js experiments should live behind the map/renderer
entry point instead of being imported into the main game shell.
