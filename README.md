# Wallpaper Manager (Windows)

Aplicación de escritorio para **Windows 10/11** construida con **Tauri 2 + Rust + React 19 + TypeScript + Vite 8 + Bun** para gestionar fondos por monitor, perfiles reutilizables, edición ligera de imagen y diagnóstico con logs unificados.

## Qué hace

- Detecta monitores conectados usando `IDesktopWallpaper` (con apoyo de GDI para geometrías y visualización).
- Permite asignar por monitor:
  - imagen local
  - color sólido
  - sin fondo
- Soporta modos de ajuste `Center`, `Tile`, `Stretch`, `Fit`, `Fill` y `Span`.
- Guarda, carga, lista y elimina perfiles JSON en `%APPDATA%/WallpaperManager/profiles`.
- Incluye editor ligero para recorte/ajustes visuales antes de aplicar.
- Muestra logs persistentes desde la UI para diagnóstico rápido.

## Stack actual

### Frontend

- **React 19** + **TypeScript**
- **Vite 8**
- **Tailwind CSS 4** con tokens en `src/styles.css`
- **GSAP** para animaciones ligeras y overlay de identificación
- **Vitest** + Testing Library para pruebas frontend
- **OXC / oxlint** para linting

### Backend

- **Tauri 2**
- **Rust 2021**
- **thiserror** para errores internos tipados
- **tauri-plugin-log** para logging unificado
- Win32 vía crate **windows** para integración con wallpaper/monitores

## Arquitectura resumida

- `src/` contiene el frontend React/Vite.
- `src-tauri/` contiene el backend Rust, comandos IPC y configuración Tauri.
- Los comandos Tauri devuelven errores serializados y validan entrada antes de operar.
- Las operaciones potencialmente bloqueantes se derivan a `spawn_blocking`.
- Se usa `tauri::State` para serializar operaciones globales de wallpaper y evitar condiciones de carrera.
- `withGlobalTauri` está desactivado y las capabilities están reducidas al mínimo necesario.

## Estructura principal

- `src/App.tsx`: flujo principal de la aplicación
- `src/components/`: tarjetas de monitor, layout y editor
- `src/lib/tauri.ts`: wrappers tipados sobre IPC/plugins Tauri
- `src/lib/wallpaper.ts`: utilidades puras de dominio y normalización
- `src-tauri/src/lib.rs`: wiring principal de Tauri y comandos
- `src-tauri/src/wallpaper.rs`: integración Windows para wallpaper/monitores
- `src-tauri/src/profiles.rs`: persistencia y validación de perfiles
- `src-tauri/src/logger.rs`: acceso a logs persistentes
- `docs/`: documentación técnica y auditoría

## Requisitos

- Windows 10/11
- [Bun](https://bun.sh/)
- Rust toolchain estable
- Microsoft Visual C++ Build Tools si el entorno aún no está preparado para compilar crates nativos

## Desarrollo

### Flujo habitual

- `bun install`
- `bun run dev`

Esto levanta Vite en `http://127.0.0.1:1420` y Tauri usa esa URL en desarrollo.

### Scripts útiles

- `bun run web:dev` — solo frontend Vite
- `bun run web:build` — build frontend
- `bun run typecheck` — TypeScript estricto
- `bun run lint:frontend` — oxlint con warnings denegados
- `bun run test:frontend` — pruebas frontend con cobertura
- `bun run test:rust` — `cargo test --lib`
- `bun run lint:backend` — `cargo clippy -- -D warnings`
- `bun run check:rust` — `cargo check`
- `bun run verify` — verificación integral del proyecto
- `bun run build` — build release Tauri

## Verificación recomendada

Antes de cerrar una intervención importante:

- `bun run verify`
- `bunx tauri build`

El ejecutable release queda en `src-tauri/target/release/wallpaper-manager.exe`.

## Seguridad y observabilidad

- CSP endurecida en `src-tauri/tauri.conf.json`
- `withGlobalTauri = false`
- Capabilities mínimas en `src-tauri/capabilities/default.json`
- Logging unificado con `tauri-plugin-log`
- Logs persistentes en `%APPDATA%/WallpaperManager/logs/app.log`

## Estado del proyecto

La base actual ya está modernizada y validada con build real. Quedan mejoras futuras documentadas en:

- `docs/10-ACTUALIZACION-STACK-2026-03-24.md`
- `docs/11-DEUDA-TECNICA.md`
- `tmp/2026-03-24-puesta-a-punto.md`

## Documentación adicional

Consulta `docs/INDEX.md` para el mapa completo de arquitectura, implementación, testing, estructura y roadmap.
