# Services, APIs & Dependencies

## JS Dependencies (root)

- `react`, `react-dom` — Main UI
- `vite` — Bundler/dev server
- `typescript` — Static typing
- `tailwindcss`, `@tailwindcss/vite` — Styling and CSS build
- `gsap`, `@gsap/react` — Non-intrusive animations
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` — Frontend testing
- `oxlint` — Frontend linting with strict rules
- `@tauri-apps/cli` — Tauri execution and build
- `@tauri-apps/api` — Tauri API access from frontend
- `@tauri-apps/plugin-dialog` — Native file open dialog
- `@tauri-apps/plugin-log` — Log exposure to frontend

## Rust Dependencies (`src-tauri/Cargo.toml`)

- `tauri` — Main runtime
- `tauri-plugin-dialog` — File picker
- `tauri-plugin-log` — Integrated Tauri logging
- `serde`, `serde_json` — Serialization/profiles
- `dirs` — Application data paths
- `base64` — Data URL previews
- `thiserror` — Typed error modeling
- `log` — Logging macros and levels
- `windows` — Win32/COM bindings

## Windows APIs Used

- `IDesktopWallpaper`
  - Per-monitor enumeration
  - `SetWallpaper`, `GetWallpaper`, `SetPosition`, `GetPosition`
- GDI fallback
  - `EnumDisplayMonitors`
  - `GetMonitorInfoW`

## Internal Services

- Persistent logger and UI consumption (`logger.rs`, `tauri-plugin-log`)
- Profile management (`profiles.rs`)
- Wallpaper and monitor orchestration (`wallpaper.rs`)
- UI state and composition (`src/App.tsx` and `src/components/*`)
- Typed Tauri invocation wrappers (`src/lib/tauri.ts`)

## Tauri Capabilities

File: `src-tauri/capabilities/default.json`

Relevant permissions:

- `core:default`
- `dialog:default`
- `dialog:allow-open`
- `core:window:default`
- `core:window:allow-set-title`
- `log:default`

## Security Considerations

- `withGlobalTauri` is disabled to avoid exposing the Tauri API globally.
- CSP only allows own resources, `data:` for images/fonts, and local development endpoints required by Vite.
- IPC commands validate inputs and return stable serialized errors to the frontend.
