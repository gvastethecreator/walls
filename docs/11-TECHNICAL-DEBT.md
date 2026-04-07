# Technical Debt

## Prioritized Backlog

1. **Vite React Plugin**
   - Configuration was migrated away from `@vitejs/plugin-react-swc`, but future Vite 8/9 versions should be monitored to ensure OXC transition warnings don't resurface.

2. **Frontend Coverage**
   - Useful coverage currently exists for pure utilities.
   - Coverage should be expanded to React component interactions (`App`, `EditorDialog`, profile and log flows) with finer Tauri bridge mocks.

3. **Real Tauri E2E Tests**
   - Ideally, integration smoke tests over the binary or WebView should be added to validate full IPC, especially `identify_monitors`, previews, and edited PNG saving.

4. **State Modeling**
   - Current React state is reasonably encapsulated, but if the app grows it would benefit from a dedicated state layer (`zustand` or a more modular reducer) to separate effects, caches, and IPC actions.

5. **Observability**
   - Logging is already unified, but a configurable granularity level is missing (e.g., `debug` only in development and `info/warn/error` in release).

6. **Additional Input Security**
   - IPC validations are already much stricter, but additional path normalization/canonicalization could be added if the product expands source support or advanced editing.

7. **Incomplete Profile UX**
   - When a profile doesn't contain all active monitors, the detected baseline is currently preserved. In the future, an explicit policy should be offered: preserve, clear, or inherit.

8. **Minor Visual Refinements**
   - The UI is harmonious and conservative. Still, micro-states could be improved (preview skeletons, per-monitor apply feedback, keyboard accessibility in the editor).
