# Diseño de Interfaz (UI/UX)

## Principios aplicados

- **Single-window**: no fragmentar flujos en múltiples ventanas.
- **Acción rápida**: seleccionar fuente, ajustar fit, aplicar.
- **Feedback inmediato**: previews, toasts y logs.

## Componentes principales

1. Header
   - Título y acción `Apply Configuration`.
2. Grid de monitores
   - Card por monitor con preview y controles.
3. Footer
   - Gestión de perfiles.
   - Acceso a logs.
4. Modales
   - Save profile
   - Logs viewer

## Estados de preview

- Imagen cargada
- Cargando preview
- Sin preview disponible
- No background
- Solid color

## Mejoras UX recomendadas

- Mostrar badge `dirty` por monitor con cambios sin aplicar.
- Botón `Apply This Monitor` para aislar fallos por pantalla.
- Tooltip contextual para el caso fallback GDI (por qué no aplica).
