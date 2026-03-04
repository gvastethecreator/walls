# Implementación Detallada

## Frontend (`src/`)

### `index.html`

- Layout de una ventana:
  - header (acciones principales)
  - grid de monitores
  - footer (perfiles + logs)
- Modales:
  - guardar perfil
  - visor de logs

### `styles.css`

- Tema dark
- Componentes reutilizables (`btn`, `select`, `modal`, `toast`)
- Cards de monitor y estados de preview
- Responsive básico

### `app.js`

Responsabilidades principales:

1. **Estado**
   - `monitors`
   - `currentConfigs`
   - cache de previews (`previewCache`, `previewPending`, `previewFailed`)
2. **IPC con backend**
   - `get_monitors`, `apply_configuration`, `save/load/list/delete_profile`
   - `get_image_data_url`, `get_logs`, `clear_logs`, `log_client_event`
3. **Lógica de fuente por monitor**
   - `Image`
   - `Solid Color` (`__SOLID__:#RRGGBB`)
   - `No Background` (`__NONE__`)
4. **Observabilidad**
   - captura de errores globales (`error`, `unhandledrejection`)
   - logs de interacción (browse/apply/preview)

## Backend (`src-tauri/src/`)

### `main.rs`

- Capa de comandos Tauri
- Log de entrada/salida de operaciones
- Utilidad de preview base64 por ruta

### `wallpaper.rs`

Puntos clave:

- COM initialization robusta (STA/MTA)
- fallback de detección de monitores para visualización
- parseo de markers de fondo
- generación de BMP sólido para color por monitor

### `profiles.rs`

- persistencia JSON por perfil
- sanitización de nombres de archivo

### `logger.rs`

- append lineal con timestamp epoch
- lectura y limpieza del log

## Configuración y automatización

- `.vscode/tasks.json`
  - tareas de dev/build/test/check/full verify
- `tauri.conf.json`
  - app/window/security/build
