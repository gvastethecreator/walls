# Deuda Técnica

## Pendiente priorizada

1. **Plugin React de Vite**
   - Se migró la configuración para salir de `@vitejs/plugin-react-swc`, pero conviene vigilar futuras versiones de Vite 8/9 para asegurar que no reaparezcan avisos de transición a OXC.

2. **Cobertura frontend**
   - Hoy existe cobertura útil sobre utilidades puras.
   - Falta ampliar cobertura de interacción en componentes React (`App`, `EditorDialog`, flujos de perfiles y logs) con mocks más finos del puente Tauri.

3. **Pruebas E2E reales en Tauri**
   - Sería ideal añadir smoke tests de integración sobre binario o WebView para validar IPC completo, especialmente `identify_monitors`, previews y guardado de PNG editado.

4. **Modelado de estado**
   - El estado React actual está razonablemente encapsulado, pero si la app crece convendrá moverlo a una capa dedicada (`zustand` o reducer más modular) para separar efectos, cachés y acciones de IPC.

5. **Observabilidad**
   - El logging ya está unificado, pero falta un nivel de granularidad configurable (por ejemplo `debug` solo en desarrollo y `info/warn/error` en release).

6. **Seguridad adicional de entrada**
   - Las validaciones IPC ya son mucho más estrictas, pero aún podría añadirse normalización/canonicalización adicional de rutas si el producto amplía soporte de fuentes o edición avanzada.

7. **UX de perfil incompleto**
   - Cuando un perfil no contiene todos los monitores activos, hoy se conserva el baseline detectado. En el futuro convendría permitir una política explícita: conservar, limpiar o heredar.

8. **Refinado visual menor**
   - La UI quedó armónica y conservadora. Aun así, podrían mejorarse microestados (skeletons de preview, feedback de apply por monitor, accesibilidad de teclado en el editor).
