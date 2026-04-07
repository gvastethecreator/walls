# Technical PRD - Multi-Monitor Wallpaper Manager

## Product Goal

Provide a lightweight Windows tool for configuring wallpapers per monitor with a simple, fast, and observable experience (logs + tests).

## Target Audience

- Users with 2+ monitors on Windows 10/11.
- Users who alternate between work/gaming/productivity configurations.

## Functional Scope

### Implemented Features

1. **Monitor Detection**
   - Primary: `IDesktopWallpaper`
   - Visual fallback: GDI (`EnumDisplayMonitors`)
2. **Per-Monitor Configuration**
   - Local image
   - Solid color
   - No background
3. **Wallpaper Fit**
   - `Center`, `Tile`, `Stretch`, `Fit`, `Fill`, `Span`
4. **Profiles**
   - Save, load, list, delete
5. **Observability**
   - Persistent logging at `%APPDATA%/WallpaperManager/logs/app.log`
   - In-app log viewer

### Out of Current Scope

- Animated/video wallpapers
- Integration with download APIs (Unsplash/Wallhaven)
- macOS/Linux support

## Non-Functional Requirements

- **Stability**: avoid silent errors; report states in UI + logs.
- **Performance**: cached previews and async loading.
- **Maintainability**: modular Rust structure and VS Code build/test tasks.

## Acceptance Criteria (Status)

- [x] Configure wallpaper per monitor
- [x] Apply solid color per monitor
- [x] Clear wallpaper per monitor
- [x] Manage profiles
- [x] View execution logs
- [x] Run backend unit tests
