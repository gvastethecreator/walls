# Project Architecture

## Overview

The project uses a hybrid desktop architecture:

- **Frontend (WebView/Tauri)**: `src/`
- **Native backend (Rust/Tauri Commands)**: `src-tauri/src/`
- **Windows integration**: COM API (`IDesktopWallpaper`) + GDI

## High-Level Diagram

```mermaid
flowchart LR
  UI[Frontend React/TS]
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

## Backend Modules

- `main.rs`
  - Registers Tauri commands
  - Orchestrates module calls
- `wallpaper.rs`
  - Monitor detection
  - Wallpaper/fit application
  - Marker resolution (`__NONE__`, `__SOLID__:#RRGGBB`)
- `profiles.rs`
  - JSON profile persistence
- `logger.rs`
  - Backend/frontend event logging to file

## Configuration Application Flow

```mermaid
sequenceDiagram
  participant U as UI
  participant T as Tauri Command
  participant W as wallpaper.rs
  participant A as Windows API

  U->>T: apply_configuration(configs)
  T->>W: apply_configuration(&configs)
  loop per monitor
    W->>W: resolve_image_path_marker(image_path)
    W->>A: SetWallpaper(monitor, path|empty)
  end
  W->>A: SetPosition(last.fit_mode)
  W-->>T: Ok / Err
  T-->>U: Result
```

## Persistence

- Profiles: `%APPDATA%/WallpaperManager/profiles/*.json`
- Logs: `%APPDATA%/WallpaperManager/logs/app.log`
- Solid color cache: `%APPDATA%/WallpaperManager/cache/solid_*.bmp`
