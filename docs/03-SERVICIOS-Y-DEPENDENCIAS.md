# Servicios, APIs y Dependencias

## Dependencias JS (root)

- `react`, `react-dom` — UI principal
- `vite` — bundler/dev server
- `typescript` — tipado estático
- `tailwindcss`, `@tailwindcss/vite` — styling y build CSS
- `gsap`, `@gsap/react` — animaciones no intrusivas
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` — testing frontend
- `oxlint` — lint frontend con reglas estrictas
- `@tauri-apps/cli` — ejecución y build Tauri
- `@tauri-apps/api` — acceso API Tauri desde frontend
- `@tauri-apps/plugin-dialog` — diálogo nativo de apertura
- `@tauri-apps/plugin-log` — exposición de logs al frontend

## Dependencias Rust (`src-tauri/Cargo.toml`)

- `tauri` — runtime principal
- `tauri-plugin-dialog` — selector de archivos
- `tauri-plugin-log` — logging integrado con Tauri
- `serde`, `serde_json` — serialización/perfiles
- `dirs` — rutas de datos de aplicación
- `base64` — previews tipo data URL
- `thiserror` — modelado de errores tipados
- `log` — macros y niveles de logging
- `windows` — bindings Win32/COM

## APIs de Windows usadas

- `IDesktopWallpaper`
  - Enumeración por monitor
  - `SetWallpaper`, `GetWallpaper`, `SetPosition`, `GetPosition`
- GDI fallback
  - `EnumDisplayMonitors`
  - `GetMonitorInfoW`

## Servicios internos

- Logger persistente y consumo desde UI (`logger.rs`, `tauri-plugin-log`)
- Gestión de perfiles (`profiles.rs`)
- Orquestación de wallpaper y monitores (`wallpaper.rs`)
- Estado y composición de UI (`src/App.tsx` y `src/components/*`)
- Wrappers de invocación Tauri (`src/lib/tauri.ts`)

## Capacidades Tauri

Archivo: `src-tauri/capabilities/default.json`

Permisos relevantes:

- `core:default`
- `dialog:default`
- `dialog:allow-open`
- `core:window:default`
- `core:window:allow-set-title`
- `log:default`

## Consideraciones de seguridad

- `withGlobalTauri` está desactivado para evitar exponer la API Tauri globalmente.
- La CSP sólo permite recursos propios, `data:` para imágenes/fuentes y los endpoints locales de desarrollo necesarios en Vite.
- Los comandos IPC validan entradas y devuelven errores serializados estables al frontend.
