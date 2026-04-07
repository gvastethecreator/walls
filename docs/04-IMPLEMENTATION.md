# Implementation Details

## Frontend (`src/`)

### `index.html`

- Single-window layout:
  - Header (main actions)
  - Monitor grid
  - Footer (profiles + logs)
- Modals:
  - Save profile
  - Log viewer

### `styles.css`

- Dark theme
- Reusable components (`btn`, `select`, `modal`, `toast`)
- Monitor cards and preview states
- Basic responsive layout

### `App.tsx`

Main responsibilities:

1. **State**
   - `monitors`
   - `currentConfigs`
   - Preview cache (`previewCache`, `previewPending`, `previewFailed`)
2. **IPC with backend**
   - `get_monitors`, `apply_configuration`, `save/load/list/delete_profile`
   - `get_image_data_url`, `get_logs`, `clear_logs`, `log_client_event`
3. **Per-monitor source logic**
   - `Image`
   - `Solid Color` (`__SOLID__:#RRGGBB`)
   - `No Background` (`__NONE__`)
4. **Observability**
   - Global error capture (`error`, `unhandledrejection`)
   - Interaction logging (browse/apply/preview)

## Backend (`src-tauri/src/`)

### `main.rs`

- Tauri command layer
- Operation entry/exit logging
- Base64 preview utility by path

### `wallpaper.rs`

Key points:

- Robust COM initialization (STA/MTA)
- Monitor detection fallback for visualization
- Background marker parsing
- Per-monitor solid BMP generation

### `profiles.rs`

- JSON persistence per profile
- Filename sanitization

### `logger.rs`

- Linear append with epoch timestamp
- Log reading and clearing

## Configuration and Automation

- `.vscode/tasks.json`
  - Dev/build/test/check/full verify tasks
- `tauri.conf.json`
  - App/window/security/build configuration
