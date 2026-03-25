# Estructura del Proyecto y Propósito de Archivos

## Árbol resumido

```text
wallpaper/
├─ docs/
│  ├─ 01-PRD.md
│  ├─ ...
│  ├─ 10-ACTUALIZACION-STACK-2026-03-24.md
│  └─ 11-DEUDA-TECNICA.md
├─ .vscode/
│  ├─ settings.json
│  └─ tasks.json
├─ src/
│  ├─ components/
│  │  ├─ EditorDialog.tsx
│  │  ├─ MonitorCard.tsx
│  │  └─ MonitorLayout.tsx
│  ├─ hooks/
│  │  └─ useElementSize.ts
│  ├─ lib/
│  │  ├─ tauri.ts
│  │  ├─ types.ts
│  │  └─ wallpaper.ts
│  ├─ test/
│  │  └─ setup.ts
│  ├─ App.tsx
│  ├─ identify.html
│  ├─ identify.ts
│  ├─ index.html
│  ├─ main.tsx
│  ├─ styles.css
│  └─ vite-env.d.ts
├─ src-tauri/
│  ├─ build.rs
│  ├─ Cargo.toml
│  ├─ tauri.conf.json
│  ├─ capabilities/default.json
│  ├─ icons/
│  └─ src/
│     ├─ error.rs
│     ├─ logger.rs
│     ├─ main.rs
│     ├─ profiles.rs
│     ├─ wallpaper.rs
│     └─ lib.rs
├─ tmp/
│  └─ 2026-03-24-puesta-a-punto.md
├─ dist/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts
├─ README.md
└─ PRD.md
```

## Propósito por carpeta

- `.vscode/`: ergonomía local de desarrollo (tareas y ajustes editor).
- `src/`: frontend React/Vite, componentes, hooks y utilidades tipadas.
- `src-tauri/`: runtime nativo, comandos IPC, validaciones y lógica de integración Windows.
- `docs/`: documentación técnica para mantenimiento/onboarding.
- `tmp/`: bitácoras temporales de intervención puntual.
- `dist/`: salida del build frontend de Vite.

## Naturaleza del proyecto

Proyecto desktop centrado en Windows con foco en:

- configurabilidad multi-monitor
- simplicidad operativa
- trazabilidad de fallos

No es un proyecto multiplataforma en su estado actual.

## Estado de madurez

- Funcional para casos de uso núcleo.
- Buena base de observabilidad.
- Frontend ya modularizado en React/TypeScript.
- Backend endurecido con errores tipados, logging unificado y verificación reproducible.
