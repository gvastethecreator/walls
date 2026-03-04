# Arquitectura del Proyecto

## Vista general

El proyecto usa una arquitectura de escritorio híbrida:

- **Frontend (WebView/Tauri)**: `src/`
- **Backend nativo (Rust/Tauri Commands)**: `src-tauri/src/`
- **Integración Windows**: COM API (`IDesktopWallpaper`) + GDI

## Diagrama de alto nivel

```mermaid
flowchart LR
  UI[Frontend HTML/CSS/JS]
  IPC[Tauri IPC Commands]
  CORE[Rust Core Modules]
  WIN[Windows APIs\nIDesktopWallpaper + GDI]
  FS[(AppData Files\nprofiles/logs/cache)]

  UI --> IPC
  IPC --> CORE
  CORE --> WIN
  CORE --> FS
  UI --> IPC
```

## Módulos backend

- `main.rs`
  - Registra comandos Tauri
  - Orquesta llamadas a módulos
- `wallpaper.rs`
  - Detección de monitores
  - Aplicación de wallpaper/fit
  - Resolución de markers (`__NONE__`, `__SOLID__:#RRGGBB`)
- `profiles.rs`
  - Persistencia de perfiles JSON
- `logger.rs`
  - Registro de eventos backend/frontend en archivo

## Flujo de aplicación de configuración

```mermaid
sequenceDiagram
  participant U as UI
  participant T as Tauri Command
  participant W as wallpaper.rs
  participant A as Windows API

  U->>T: apply_configuration(configs)
  T->>W: apply_configuration(&configs)
  loop por monitor
    W->>W: resolve_image_path_marker(image_path)
    W->>A: SetWallpaper(monitor, path|empty)
  end
  W->>A: SetPosition(last.fit_mode)
  W-->>T: Ok / Err
  T-->>U: Resultado
```

## Persistencia

- Perfiles: `%APPDATA%/WallpaperManager/profiles/*.json`
- Logs: `%APPDATA%/WallpaperManager/logs/app.log`
- Cache color sólido: `%APPDATA%/WallpaperManager/cache/solid_*.bmp`
