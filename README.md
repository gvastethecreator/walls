# Walls - Multi-Monitor Wallpaper Manager (Windows)

A desktop application for **Windows 10/11** built with **Tauri 2 + Rust + React 19 + TypeScript + Vite 8 + Bun** for managing wallpapers per monitor, reusable profiles, lightweight image editing, and unified log diagnostics.

## Features

- Detects connected monitors using `IDesktopWallpaper` (with GDI support for geometry and visualization).
- Per-monitor assignment:
  - Local image
  - Solid color
  - No background
- Fit modes: `Center`, `Tile`, `Stretch`, `Fit`, `Fill`, `Span`.
- Save, load, list, and delete JSON profiles at `%APPDATA%/WallpaperManager/profiles`.
- Lightweight editor for crop/visual adjustments before applying.
- Persistent logs visible from the UI for quick diagnostics.
- Internationalization (English / Spanish).

## Tech Stack

### Frontend

- **React 19** + **TypeScript**
- **Vite 8**
- **Tailwind CSS 4** with tokens in `src/styles.css`
- **GSAP** for lightweight animations and identification overlay
- **Vitest** + Testing Library for frontend tests
- **OXC / oxlint** for linting

### Backend

- **Tauri 2**
- **Rust 2021**
- **thiserror** for typed internal errors
- **tauri-plugin-log** for unified logging
- Win32 via the **windows** crate for wallpaper/monitor integration

## Architecture

- `src/` contains the React/Vite frontend.
- `src-tauri/` contains the Rust backend, IPC commands, and Tauri configuration.
- Tauri commands return serialized errors and validate input before operating.
- Potentially blocking operations are dispatched to `spawn_blocking`.
- `tauri::State` is used to serialize global wallpaper operations and avoid race conditions.
- `withGlobalTauri` is disabled and capabilities are reduced to the minimum required.

## Project Structure

- `src/App.tsx`: Main application flow
- `src/components/`: Monitor cards, layout, and editor
- `src/i18n/`: Internationalization system (EN/ES)
- `src/lib/tauri.ts`: Typed wrappers over Tauri IPC/plugins
- `src/lib/wallpaper.ts`: Pure domain utilities and normalization
- `src-tauri/src/lib.rs`: Main Tauri wiring and commands
- `src-tauri/src/wallpaper.rs`: Windows integration for wallpaper/monitors
- `src-tauri/src/profiles.rs`: Profile persistence and validation
- `src-tauri/src/logger.rs`: Persistent log access
- `docs/`: Technical documentation

## Requirements

- Windows 10/11
- [Bun](https://bun.sh/)
- Stable Rust toolchain
- Microsoft Visual C++ Build Tools (if the environment is not already configured to compile native crates)

## Getting Started

```sh
bun install
bun run dev
```

This starts Vite at `http://localhost:3000` and Tauri uses that URL in development.

## Scripts

| Script | Description |
|---|---|
| `bun run dev` | Full Tauri + Vite dev |
| `bun run web:dev` | Vite frontend only |
| `bun run web:build` | Frontend build |
| `bun run typecheck` | Strict TypeScript check |
| `bun run lint:frontend` | oxlint with denied warnings |
| `bun run test:frontend` | Frontend tests with coverage |
| `bun run test:rust` | `cargo test --lib` |
| `bun run lint:backend` | `cargo clippy -- -D warnings` |
| `bun run check:rust` | `cargo check` |
| `bun run verify` | Full project verification |
| `bun run build` | Tauri release build |

## Verification

Before closing an important change:

```sh
bun run verify
bunx tauri build
```

The release executable is at `src-tauri/target/release/wallpaper-manager.exe`.

## Security and Observability

- Hardened CSP in `src-tauri/tauri.conf.json`
- `withGlobalTauri = false`
- Minimal capabilities in `src-tauri/capabilities/default.json`
- Unified logging with `tauri-plugin-log`
- Persistent logs at `%APPDATA%/WallpaperManager/logs/app.log`

## Documentation

See `docs/INDEX.md` for the full map of architecture, implementation, testing, structure, and roadmap.

## License

MIT
