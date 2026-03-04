# Servicios, APIs y Dependencias

## Dependencias JS (root)

- `@tauri-apps/cli` — ejecución/build Tauri
- `@tauri-apps/api` — acceso API Tauri desde frontend

## Dependencias Rust (`src-tauri/Cargo.toml`)

- `tauri` — runtime principal
- `tauri-plugin-dialog` — selector de archivos
- `tauri-plugin-fs` — capacidades de filesystem
- `serde`, `serde_json` — serialización/perfiles
- `dirs` — rutas de datos de aplicación
- `base64` — previews tipo data URL
- `windows` — bindings Win32/COM

## APIs de Windows usadas

- `IDesktopWallpaper`
  - Enumeración por monitor
  - `SetWallpaper`, `GetWallpaper`, `SetPosition`, `GetPosition`
- GDI fallback
  - `EnumDisplayMonitors`
  - `GetMonitorInfoW`

## Servicios internos

- Logger persistente (`logger.rs`)
- Gestión de perfiles (`profiles.rs`)
- Render y estado UI (`app.js`)

## Capacidades Tauri

Archivo: `src-tauri/capabilities/default.json`

Permisos relevantes:

- diálogo de apertura de archivos
- lectura de filesystem
- permisos core de ventana
