# Testing & Operations

## Current Automated Tests

Backend Rust (`cargo test --lib`):

- `profiles::tests::sanitize_profile_name_replaces_invalid_characters`
- `wallpaper::tests::parses_hex_color`
- `wallpaper::tests::resolves_none_and_passthrough_markers`
- `wallpaper::tests::fit_mapping_is_stable`
- `wallpaper::tests::writes_valid_solid_bmp_file`

Frontend Vitest:

- Pure utility tests for `src/lib/wallpaper.ts`
- Wallpaper source normalization
- Snapshots/base state and layout helpers
- Coverage generated with Istanbul

## Recommended Commands

From root:

- `bun run dev`
- `bun run typecheck`
- `bun run lint:frontend`
- `bun run test:frontend`
- `bun run test:rust`
- `bun run lint:backend`
- `bun run check:rust`
- `bun run verify`
- `bunx tauri build`

Per-layer equivalents:

- `cargo test --lib` in `src-tauri`
- `cargo clippy -- -D warnings` in `src-tauri`
- `cargo check` in `src-tauri`
- `vite build` to verify frontend only

## Diagnostic Flow

1. Reproduce the issue in the UI.
2. Open **View Logs**.
3. Look for `client:*`, `command:*`, and `backend/wallpaper` events.
4. Correlate with the failed operation (`browse`, `preview`, `apply`).

## Suggested Manual Verifications

- Change source per monitor:
  - Image → apply
  - Solid color → apply
  - No background → apply
- Save/load profile preserving markers (`__SOLID__`, `__NONE__`).
- App restart and current configuration re-read.
- Open/close editor maintaining per-monitor state.
- Identification overlay with multiple monitors.
- Save/load of partial and complete profiles.

## VS Code Tasks

Defined in `.vscode/tasks.json`:

- `wallpaper: tauri dev`
- `wallpaper: tauri build`
- `wallpaper: cargo check`
- `wallpaper: cargo test (lib)`
- `wallpaper: test + check`
- `wallpaper: kill running app`
- `wallpaper: full verify`

## Expected CI/Manual Result

- `bun run verify` must finish without warnings promoted to errors.
- `bunx tauri build` must generate `src-tauri/target/release/wallpaper-manager.exe`.
- The packaged frontend must land in `dist/`.
