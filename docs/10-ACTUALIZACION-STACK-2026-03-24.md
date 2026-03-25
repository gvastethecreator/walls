# Actualización de Stack · 2026-03-24

## Resumen

En esta puesta a punto el proyecto dejó atrás el frontend HTML/JS modular sin bundler y pasó a una arquitectura moderna con **React 19 + TypeScript + Vite 8 + Tailwind CSS + Vitest + OXC**, manteniendo la estética general y el mismo modelo funcional de Tauri.

## Backend Tauri / Rust

- Se introdujo un sistema de errores estructurados con `thiserror` y serialización explícita hacia el frontend.
- Los `#[tauri::command]` críticos pasaron a ejecutarse de forma asíncrona con `spawn_blocking` para evitar bloquear el hilo principal del runtime.
- Se serializaron las operaciones globales de wallpapers mediante `tauri::State` + `Mutex`, reduciendo riesgo de carreras entre `apply_wallpaper`, `apply_configuration` e `identify_monitors`.
- Se añadieron validaciones extra para `monitor_id`, `fit_mode`, perfiles y previews/base64.
- Se integró `tauri-plugin-log` para exponer logs útiles al WebView, manteniendo además un log persistente legible desde la UI.
- La configuración de seguridad se endureció: `withGlobalTauri = false`, `script-src 'self'` y capabilities mínimas para `dialog`, `window` y `log`.

## Frontend Web

- Nuevo punto de entrada React/TS en `src/main.tsx`.
- Componentes principales:
  - `src/App.tsx`
  - `src/components/MonitorLayout.tsx`
  - `src/components/MonitorCard.tsx`
  - `src/components/EditorDialog.tsx`
- Wrappers tipados para IPC y plugins en `src/lib/tauri.ts`.
- Utilidades puras y testeables de dominio en `src/lib/wallpaper.ts`.
- GSAP se usa de forma mínima y controlada para entradas suaves y animación del overlay de identificación, respetando `prefers-reduced-motion`.
- Tailwind CSS se usa sin alterar drásticamente el diseño visual previo; los tokens siguen definidos mediante variables CSS en `src/styles.css`.

## Tooling

- Package manager: **Bun**.
- Bundler/dev server: **Vite 8**.
- Lint frontend: **OXC (`oxlint`)**.
- Tests frontend: **Vitest** con cobertura Istanbul.
- Tests backend: `cargo test --lib`.
- Lint backend: `cargo clippy -- -D warnings`.

## Scripts relevantes

- `bun run dev`
- `bun run web:dev`
- `bun run typecheck`
- `bun run lint:frontend`
- `bun run test:frontend`
- `bun run lint:backend`
- `bun run verify`
- `bunx tauri build`

## Resultado esperado

- Binario release: `src-tauri/target/release/wallpaper-manager.exe`
- Frontend empaquetado: `dist/`
- Logs persistentes: `%APPDATA%/WallpaperManager/logs/app.log`
- Perfiles: `%APPDATA%/WallpaperManager/profiles/`
