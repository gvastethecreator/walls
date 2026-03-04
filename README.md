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
