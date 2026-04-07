# Project Structure & File Purpose

## Summary Tree

```text
wallpaper/
├─ docs/
│  ├─ 01-PRD.md
│  ├─ ...
│  ├─ 10-STACK-UPDATE-2026-03-24.md
│  └─ 11-TECHNICAL-DEBT.md
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
│  ├─ i18n/
│  │  ├─ types.ts
│  │  ├─ en.ts
│  │  ├─ es.ts
│  │  └─ index.tsx
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
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts
└─ README.md
```

## Folder Purpose

- `.vscode/`: Local development ergonomics (tasks and editor settings).
- `src/`: React/Vite frontend, components, hooks, and typed utilities.
- `src/i18n/`: Internationalization system (EN/ES) with React context provider.
- `src-tauri/`: Native runtime, IPC commands, validations, and Windows integration logic.
- `docs/`: Technical documentation for maintenance/onboarding.
- `dist/`: Vite frontend build output.

## Project Nature

Windows-focused desktop project with emphasis on:

- Multi-monitor configurability
- Operational simplicity
- Failure traceability

Not a cross-platform project in its current state.

## Maturity Status

- Functional for core use cases.
- Good observability foundation.
- Frontend already modularized in React/TypeScript.
- Backend hardened with typed errors, unified logging, and reproducible verification.
