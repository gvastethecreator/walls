# Auditoría Técnica y Mejoras Aplicadas

## Hallazgos clave

1. **Tasks de VS Code con matcher inválido**
   - `"$rustc"` no era reconocido en el entorno VS Code actual.
   - Impacto: advertencias de configuración.
2. **Estado inconsistente al cancelar selector de imagen**
   - Al cambiar a modo imagen y cancelar diálogo se podía perder estado previo.
   - Impacto: UX confusa.
3. **Lógica de botón clear**
   - Se deshabilitaba por criterio ligado solo a imagen, no al modo activo.
   - Impacto: comportamiento no intuitivo en solid/none.
4. **Cobertura de pruebas limitada**
   - Faltaban tests en `profiles.rs` para sanitización.

## Mejoras implementadas

- Corregidas tareas de VS Code (`problemMatcher: []` en tareas Rust).
- Ajustado flujo de cancelación del file dialog para restaurar estado previo.
- Endurecido marker de color sólido con validación `#RRGGBB`.
- Ajustado criterio de habilitación de `Clear Image`.
- Agregado test unitario de sanitización de perfiles.

## Riesgos restantes (no bloqueantes)

- `app.js` es monolítico y podría modularizarse (estado, render, IPC, logging).
- El fallback GDI permite visualizar monitores, pero no aplicar por monitor si COM no entrega IDs válidos.
- El archivo de logs puede crecer indefinidamente (se recomienda rotación por tamaño).

## Recomendaciones siguientes

1. Modularizar `app.js` en:
   - `state.js`
   - `ipc.js`
   - `render.js`
   - `actions.js`
2. Implementar rotación de logs (por ejemplo 5 MB con `app.log.1`).
3. Añadir prueba E2E mínima para flujo crítico:
   - detectar monitores
   - seleccionar fuente
   - aplicar
   - verificar retorno de comando
