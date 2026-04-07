# Technical Audit & Improvements Applied

## Key Findings

1. **Invalid VS Code task matchers**
   - `"$rustc"` was not recognized in the current VS Code environment.
   - Impact: configuration warnings.
2. **Inconsistent state when canceling image picker**
   - Switching to image mode and canceling the dialog could lose previous state.
   - Impact: confusing UX.
3. **Clear button logic**
   - Was disabled based on image-only criteria, not the active mode.
   - Impact: non-intuitive behavior in solid/none modes.
4. **Limited test coverage**
   - Missing tests in `profiles.rs` for sanitization.

## Improvements Implemented

- Fixed VS Code tasks (`problemMatcher: []` for Rust tasks).
- Adjusted file dialog cancellation flow to restore previous state.
- Hardened solid color marker with `#RRGGBB` validation.
- Adjusted `Clear Image` enable criteria.
- Added unit test for profile sanitization.

## Remaining Risks (Non-Blocking)

- `app.js` was monolithic and could be modularized (state, render, IPC, logging). *(Addressed in the React migration.)*
- The GDI fallback allows displaying monitors but cannot apply per-monitor if COM doesn't provide valid IDs.
- The log file can grow indefinitely (size-based rotation is recommended).

## Recommended Next Steps

1. Modularize `app.js` into: *(Completed — now React components.)*
   - `state.js`
   - `ipc.js`
   - `render.js`
   - `actions.js`
2. Implement log rotation (e.g., 5 MB with `app.log.1`).
3. Add minimal E2E test for the critical flow:
   - Detect monitors
   - Select source
   - Apply
   - Verify command return
