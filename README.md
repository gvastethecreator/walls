# Wallpaper Manager (Windows)

Aplicación de escritorio para Windows 10/11 construida con **Tauri + Rust + HTML/CSS/JS** que permite gestionar fondos por monitor, perfiles y diagnósticos con logs.

## Qué hace

- Detecta monitores conectados usando `IDesktopWallpaper` (con fallback de visualización por GDI).
- Permite asignar por monitor:
  - Imagen local
  - Color sólido
  - Sin fondo (`No Background`)
- Ajusta `Wallpaper Fit` (`Center`, `Tile`, `Stretch`, `Fit`, `Fill`, `Span`).
- Guarda y carga perfiles JSON en `%APPDATA%`.
- Incluye visor de logs en la UI para diagnóstico rápido.

## Estructura principal

- `src/`: interfaz (HTML/CSS/JS)
- `src-tauri/`: backend Rust + configuración Tauri
- `.vscode/tasks.json`: tareas de desarrollo y verificación
- `docs/`: documentación técnica detallada

### Frontend modular (actual)

El frontend ahora se inicializa desde `src/js/main.js` (referenciado en `src/index.html` con `type="module"`).

- `src/js/core.js`: estado global compartido, referencias DOM, utilidades comunes, wrappers Tauri (`invoke`, `openDialog`), toast/log.
- `src/js/monitors.js`: detección/render de monitores, previews, apply global/por monitor, delegación de eventos de tarjetas.
- `src/js/editor.js`: editor canvas (drag, zoom, rotate, filtros, tinte) y flujo save/apply.
- `src/js/profiles.js`: guardar/cargar/eliminar perfiles y modal de guardado.
- `src/js/logs.js`: visor de logs y limpieza de logs.
- `src/js/main.js`: composición de módulos, binding de eventos globales e inicialización.

`src/app.js` se conserva solo como **shim de compatibilidad** (deprecado) para referencias antiguas; el flujo activo ya no depende de ese archivo.

## Requisitos

- Windows 10/11
- Node.js 18+
- Rust toolchain estable

## Ejecutar

Usa las tareas de VS Code o comandos equivalentes (Bun):

- Desarrollo: `bunx tauri dev`
- Verificación backend: `cargo check` (en `src-tauri`)
- Tests backend: `cargo test --lib` (en `src-tauri`)
- Build: `bunx tauri build`

## Estado actual

El proyecto está funcional y cuenta con:

- manejo de previews por `data URL` (estable en WebView)
- logging persistente backend/frontend
- tests unitarios en Rust para funciones críticas de markers/fit/BMP

Para detalles de arquitectura e implementación, ver `docs/`.
