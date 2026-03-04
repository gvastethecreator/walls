# Estructura del Proyecto y Propósito de Archivos

## Árbol resumido

```text
wallpaper/
├─ .vscode/
│  ├─ settings.json
│  └─ tasks.json
├─ src/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ src-tauri/
│  ├─ build.rs
│  ├─ Cargo.toml
│  ├─ tauri.conf.json
│  ├─ capabilities/default.json
│  ├─ icons/
│  └─ src/
│     ├─ main.rs
│     ├─ wallpaper.rs
│     ├─ profiles.rs
│     ├─ logger.rs
│     └─ lib.rs
├─ PRD.md
├─ README.md
└─ docs/
```

## Propósito por carpeta

- `.vscode/`: ergonomía local de desarrollo (tareas y ajustes editor).
- `src/`: aplicación de interfaz de usuario.
- `src-tauri/`: runtime nativo, comandos IPC y lógica de integración Windows.
- `docs/`: documentación técnica para mantenimiento/onboarding.

## Naturaleza del proyecto

Proyecto desktop centrado en Windows con foco en:

- configurabilidad multi-monitor
- simplicidad operativa
- trazabilidad de fallos

No es un proyecto multiplataforma en su estado actual.

## Estado de madurez

- Funcional para casos de uso núcleo.
- Buena base de observabilidad.
- Necesita modularización frontend para escalar mantenibilidad.
