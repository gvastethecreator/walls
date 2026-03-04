# PRD Técnico — Multi-Monitor Wallpaper Manager

## Objetivo del producto

Ofrecer una herramienta ligera para Windows que permita configurar fondos de pantalla por monitor con una experiencia simple, rápida y observable (logs + pruebas).

## Público objetivo

- Usuarios con 2+ monitores en Windows 10/11.
- Usuarios que alternan configuraciones de trabajo/gaming/productividad.

## Alcance funcional

### Funcionalidades implementadas

1. **Detección de monitores**
   - Primaria: `IDesktopWallpaper`
   - Fallback visual: GDI (`EnumDisplayMonitors`)
2. **Configuración por monitor**
   - Imagen local
   - Color sólido
   - Sin fondo
3. **Wallpaper fit**
   - `Center`, `Tile`, `Stretch`, `Fit`, `Fill`, `Span`
4. **Perfiles**
   - Guardar, cargar, listar, borrar
5. **Observabilidad**
   - Logging persistente en `%APPDATA%/WallpaperManager/logs/app.log`
   - Visor de logs en la interfaz

### Fuera de alcance actual

- Fondos animados/video
- Integración con APIs de descarga (Unsplash/Wallhaven)
- Soporte macOS/Linux

## Requisitos no funcionales

- **Estabilidad**: evitar errores silenciosos; reportar estados en UI + logs.
- **Rendimiento**: previews en cache y carga asíncrona.
- **Mantenibilidad**: estructura modular en Rust y tareas de build/test en VS Code.

## Criterios de aceptación (estado)

- [x] Configurar fondo por monitor
- [x] Aplicar color sólido por monitor
- [x] Limpiar fondo por monitor
- [x] Gestionar perfiles
- [x] Visualizar logs de ejecución
- [x] Ejecutar tests unitarios de backend
