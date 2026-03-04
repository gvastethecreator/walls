# Product Requirements Document (PRD)

Aquí tienes el Product Requirements Document (PRD) estructurado para la aplicación. Todos los labels de la interfaz y los valores de configuración están definidos en inglés para mantener consistencia.

## Multi-Monitor Wallpaper Manager

**Platform:** Windows 10/11 (Exclusivo)
**Tech Stack:** Tauri (Frontend: HTML/CSS/JS o framework a elección), Rust (Backend), Windows COM API (`IDesktopWallpaper`)

### 1. Objective

Crear una aplicación de escritorio ligera, rápida y sencilla para Windows que permita a los usuarios asignar fondos de pantalla independientes a cada monitor conectado, ajustar el tipo de escalado y guardar estas combinaciones como perfiles reutilizables.

### 2. Core Features

* **Monitor Detection:** Identificación automática de todas las pantallas conectadas a través de la API de Windows, mostrando su disposición relativa (opcional, para claridad visual).
* **Individual Assignment:** Capacidad de seleccionar una imagen local diferente para cada pantalla detectada.
* **Wallpaper Fit Adjustment:** Controles individuales para decidir cómo se renderiza la imagen en cada pantalla.
* **Profile Management:** Guardar la configuración actual (rutas de imágenes + ajustes de escalado + asignación de monitores) en un archivo local (JSON) para cargarlo rápidamente en el futuro.

### 3. User Interface (UI) Requirements

La interfaz debe ser minimalista, a una sola ventana, y fácil de navegar.
**UI Labels:**

* **Main Navigation/Actions:** `Apply Configuration`, `Save Profile`, `Load Profile`, `Settings`.
* **Monitor Selection:** `Monitor 1`, `Monitor 2`, etc. (Idealmente acompañados de la resolución, ej. `Monitor 1 (1920x1080)`).
* **Image Controls:** `Browse Image`, `Clear Image`.
* **Fit Options (Labels):** `Wallpaper Fit`.

### 4. Data Models & Values

Para mantener la coherencia en el backend (Rust) y los archivos de guardado (JSON), los valores de ajuste y configuración se manejarán en inglés.

**Fit Values (Mapeados a los enumeradores de Windows `DESKTOP_WALLPAPER_POSITION`):**

* `Center`
* `Tile`
* `Stretch`
* `Fit`
* `Fill`
* `Span`

**Profile Data Structure (Ejemplo de valores guardados):**

* `profileName` (String)
* `monitors` (Array de objetos)
* `monitorId` (String del Device Path)
* `imagePath` (String de la ruta absoluta)
* `fitMode` (String, usando los Fit Values definidos arriba)

### 5. Technical Architecture

* **Frontend (Tauri):** Maneja la renderización de la UI, la selección de archivos mediante los diálogos nativos de Tauri, y envía los perfiles y comandos al backend a través de Tauri IPC (Inter-Process Communication).
* **Backend (Rust):** * Recibe los comandos del frontend.
* Interactúa con la API de Windows mediante el crate `windows` (específicamente la interfaz `IDesktopWallpaper`) para aplicar los fondos.
* Lee y escribe los archivos `.json` de los perfiles en el directorio de datos de la aplicación (`%APPDATA%`).

### 6. Out of Scope (Para mantener la simplicidad)

* Fondos de pantalla animados o en video.
* Descarga automática de imágenes desde internet (APIs de Wallhaven, Unsplash, etc.).
* Soporte para macOS o Linux.
* Edición de imágenes integrada (recorte manual, filtros de color).

---
