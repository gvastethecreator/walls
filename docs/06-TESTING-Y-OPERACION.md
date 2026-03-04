# Testing y Operación

## Pruebas automáticas actuales

Backend Rust (`cargo test --lib`):

- `profiles::tests::sanitize_profile_name_replaces_invalid_characters`
- `wallpaper::tests::parses_hex_color`
- `wallpaper::tests::resolves_none_and_passthrough_markers`
- `wallpaper::tests::fit_mapping_is_stable`
- `wallpaper::tests::writes_valid_solid_bmp_file`

## Comandos recomendados

Desde `src-tauri`:

- `cargo check`
- `cargo test --lib`

Desde raíz:

- `bunx tauri dev`
- `bunx tauri build`

## Flujo de diagnóstico

1. Reproducir problema en UI.
2. Abrir **View Logs**.
3. Buscar eventos `client:*` y `backend/wallpaper`.
4. Correlacionar con operación fallida (`browse`, `preview`, `apply`).

## Verificaciones manuales sugeridas

- Cambio de fuente por monitor:
  - image -> apply
  - solid color -> apply
  - no background -> apply
- Guardar/cargar perfil manteniendo markers (`__SOLID__`, `__NONE__`).
- Reinicio de app y relectura de configuración actual.

## Tareas de VS Code

Definidas en `.vscode/tasks.json`:

- `wallpaper: tauri dev`
- `wallpaper: tauri build`
- `wallpaper: cargo check`
- `wallpaper: cargo test (lib)`
- `wallpaper: test + check`
- `wallpaper: kill running app`
- `wallpaper: full verify`
