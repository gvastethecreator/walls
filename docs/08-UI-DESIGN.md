# UI/UX Design

## Applied Principles

- **Single-window**: don't fragment flows across multiple windows.
- **Quick action**: select source, adjust fit, apply.
- **Immediate feedback**: previews, toasts, and logs.

## Main Components

1. Header
   - Title and `Apply Configuration` action.
2. Monitor grid
   - Card per monitor with preview and controls.
3. Footer
   - Profile management.
   - Log access.
4. Modals
   - Save profile
   - Log viewer

## Preview States

- Image loaded
- Loading preview
- No preview available
- No background
- Solid color

## Recommended UX Improvements

- Show `dirty` badge per monitor with unapplied changes.
- `Apply This Monitor` button to isolate failures per screen.
- Contextual tooltip for the GDI fallback case (why it doesn't apply).
