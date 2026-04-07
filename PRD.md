# Product Requirements Document (PRD)

## Multi-Monitor Wallpaper Manager

**Platform:** Windows 10/11 (Exclusive)
**Tech Stack:** Tauri 2 (Frontend: React 19 + TypeScript + Vite 8), Rust (Backend), Windows COM API (`IDesktopWallpaper`)

### 1. Objective

Build a lightweight, fast, and simple desktop application for Windows that allows users to assign independent wallpapers to each connected monitor, adjust the scaling type, and save these combinations as reusable profiles.

### 2. Core Features

* **Monitor Detection:** Automatic identification of all connected screens through the Windows API, showing their relative layout.
* **Individual Assignment:** Ability to select a different local image for each detected screen.
* **Wallpaper Fit Adjustment:** Individual controls to decide how the image is rendered on each screen.
* **Profile Management:** Save the current configuration (image paths + scaling settings + monitor assignment) to a local JSON file for quick future loading.

### 3. User Interface (UI) Requirements

The interface must be minimalist, single-window, and easy to navigate.

* **Main Actions:** `Apply Configuration`, `Save Profile`, `Load Profile`.
* **Monitor Selection:** `Monitor 1`, `Monitor 2`, etc. (with resolution, e.g. `Monitor 1 (1920x1080)`).
* **Image Controls:** `Browse Image`, `Clear Image`.
* **Fit Options:** `Wallpaper Fit`.

### 4. Data Models and Values

**Fit Values (Mapped to Windows `DESKTOP_WALLPAPER_POSITION` enumerators):**

* `Center`, `Tile`, `Stretch`, `Fit`, `Fill`, `Span`

**Profile Data Structure:**

* `profileName` (String)
* `monitors` (Array of objects)
* `monitorId` (String - Device Path)
* `imagePath` (String - absolute path)
* `fitMode` (String - one of the Fit Values above)

### 5. Technical Architecture

* **Frontend (Tauri):** Handles UI rendering, file selection via native Tauri dialogs, and sends profiles and commands to the backend through Tauri IPC.
* **Backend (Rust):** Receives frontend commands, interacts with the Windows API via the `windows` crate (`IDesktopWallpaper` interface), and reads/writes `.json` profile files in the application data directory (`%APPDATA%`).

### 6. Out of Scope

* Animated or video wallpapers.
* Automatic image download from the internet (Wallhaven, Unsplash, etc.).
* macOS or Linux support.
* Built-in image editing (manual cropping, color filters).
