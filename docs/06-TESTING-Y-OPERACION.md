# Testing y Operación

## Pruebas automáticas actuales

Backend Rust (`cargo test --lib`):

- `profiles::tests::sanitize_profile_name_replaces_invalid_characters`
- `wallpaper::tests::parses_hex_color`
- `wallpaper::tests::resolves_none_and_passthrough_markers`
- `wallpaper::tests::fit_mapping_is_stable`
- `wallpaper::tests::writes_valid_solid_bmp_file`

Frontend Vitest:

- tests de utilidades puras de `src/lib/wallpaper.ts`
- normalización de fuentes de wallpaper
- snapshots/base state y helpers de layout
- cobertura generada con Istanbul

## Comandos recomendados

Desde raíz:

- `bun run dev`
- `bun run typecheck`
- `bun run lint:frontend`
- `bun run test:frontend`
- `bun run test:rust`
- `bun run lint:backend`
- `bun run check:rust`
- `bun run verify`
- `bunx tauri build`

Equivalentes relevantes por capa:

- `cargo test --lib` en `src-tauri`
- `cargo clippy -- -D warnings` en `src-tauri`
- `cargo check` en `src-tauri`
- `vite build` para verificar sólo el frontend

## Flujo de diagnóstico

1. Reproducir problema en UI.
2. Abrir **View Logs**.
3. Buscar eventos `client:*`, `command:*` y `backend/wallpaper`.
4. Correlacionar con operación fallida (`browse`, `preview`, `apply`).

## Verificaciones manuales sugeridas

- Cambio de fuente por monitor:
  - image -> apply
  - solid color -> apply
  - no background -> apply
- Guardar/cargar perfil manteniendo markers (`__SOLID__`, `__NONE__`).
- Reinicio de app y relectura de configuración actual.
- Apertura/cierre del editor manteniendo estado por monitor.
- Overlay de identificación con múltiples monitores.
- Guardado/carga de perfiles parciales y perfiles completos.

## Tareas de VS Code

Definidas en `.vscode/tasks.json`:

- `wallpaper: tauri dev`
- `wallpaper: tauri build`
- `wallpaper: cargo check`
- `wallpaper: cargo test (lib)`
- `wallpaper: test + check`
- `wallpaper: kill running app`
- `wallpaper: full verify`

## Resultado esperado en CI/manual

- `bun run verify` debe terminar sin warnings promovidos a error.
- `bunx tauri build` debe generar `src-tauri/target/release/wallpaper-manager.exe`.
- El frontend empaquetado debe quedar en `dist/`.
