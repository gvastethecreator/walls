import type { Translations } from './types';

export const es: Translations = {
  // Header
  'app.title': 'Gestor de Fondos',
  'app.refresh': 'Actualizar',

  // Status
  'status.loading': 'Cargando monitores…',
  'status.displays': '{count} pantallas',
  'status.pendingChange': '{count} cambio pendiente',
  'status.pendingChanges': '{count} cambios pendientes',
  'status.allApplied': 'todo aplicado',

  // Profiles
  'profile.select': '— Seleccionar perfil —',
  'profile.load': 'Cargar perfil',
  'profile.save': 'Guardar perfil',
  'profile.delete': 'Eliminar perfil',
  'profile.logs': 'Ver logs',
  'profile.clearLogs': 'Limpiar logs',
  'profile.namePlaceholder': 'Nombre del perfil...',
  'profile.selectFirst': 'Selecciona un perfil primero',
  'profile.enterName': 'Ingresa un nombre de perfil',
  'profile.loaded': 'Perfil "{name}" cargado',
  'profile.saved': 'Perfil "{name}" guardado',
  'profile.deleted': 'Perfil "{name}" eliminado',
  'profile.loadFailed': 'Error al cargar: {error}',
  'profile.saveFailed': 'Error al guardar: {error}',
  'profile.deleteFailed': 'Error al eliminar: {error}',
  'profile.deleteConfirm': '¿Eliminar perfil "{name}"? Esta acción no se puede deshacer.',
  'profile.selectToDelete': 'Selecciona un perfil para eliminar',

  // Layout
  'layout.title': 'Disposición',
  'layout.fitGlobal':
    'El ajuste de fondo es global en Windows y se aplica a todos los monitores.',
  'layout.identify': 'Identificar monitores',
  'layout.diagnosticMode':
    'Modo diagnóstico: Windows no devolvió los IDs de monitor. Puedes inspeccionar la disposición, pero la aplicación por monitor está limitada en esta sesión.',
  'layout.detecting': 'Detectando monitores…',
  'layout.noMonitors': 'No se detectaron monitores',

  // Monitor card
  'monitor.pending': 'Pendiente',
  'monitor.solidColor': 'Color sólido {color}',
  'monitor.noBackground': 'Sin fondo',
  'monitor.loadingPreview': 'Cargando vista previa...',
  'monitor.noPreview': 'Vista previa no disponible',
  'monitor.noWallpaper': 'Sin fondo detectado',
  'monitor.browseImage': 'Buscar imagen',
  'monitor.bgLabel': 'FD',
  'monitor.fitLabel': 'Ajuste',
  'monitor.clear': 'Limpiar',
  'monitor.edit': 'Editar',
  'monitor.apply': 'Aplicar monitor',
  'monitor.applied': 'Monitor aplicado correctamente',
  'monitor.applyFailed': 'Error al aplicar monitor: {error}',
  'monitor.noWallpaperConfigured': 'No hay fondo configurado para este monitor',

  // Source types
  'source.image': 'Imagen',
  'source.solid': 'Color sólido',
  'source.none': 'Sin fondo',

  // Apply
  'apply.button': 'Aplicar configuración',
  'apply.success': 'Configuración aplicada correctamente',
  'apply.failed': 'Error al aplicar: {error}',
  'apply.noWallpapers': 'No hay fondos configurados',
  'apply.fallbackDisabled':
    'Windows no proporcionó IDs de monitor para esta sesión. La aplicación por monitor está deshabilitada.',

  // Editor
  'editor.title': 'Editor de fondo',
  'editor.titleMonitor': 'Editor de fondo · {name}',
  'editor.dragToMove': 'Arrastra para mover · Rueda del ratón para zoom',
  'editor.fitMode': 'Modo ajuste: {mode}',
  'editor.chooseImage': 'Elegir imagen',
  'editor.reset': 'Restablecer',
  'editor.zoom': 'Zoom',
  'editor.rotation': 'Rotación',
  'editor.brightness': 'Brillo',
  'editor.contrast': 'Contraste',
  'editor.saturation': 'Saturación',
  'editor.hue': 'Tono',
  'editor.blur': 'Desenfoque',
  'editor.tint': 'Tinte',
  'editor.tintStrength': 'Intensidad de tinte',
  'editor.loading': 'Cargando vista previa…',
  'editor.source': 'Fuente: {path}',
  'editor.cancel': 'Cancelar',
  'editor.saving': 'Guardando…',
  'editor.saveApply': 'Guardar y aplicar',
  'editor.saved': 'Fondo editado guardado y aplicado',
  'editor.noImagePrompt': 'Elige una imagen para empezar a editar',

  // Save modal
  'saveModal.title': 'Guardar perfil',
  'saveModal.cancel': 'Cancelar',
  'saveModal.save': 'Guardar',

  // Logs modal
  'logsModal.title': 'Logs de la aplicación',
  'logsModal.refresh': 'Actualizar logs',
  'logsModal.close': 'Cerrar',
  'logsModal.noLogs': 'Sin logs aún.',
  'logsModal.loadFailed': 'Error al cargar logs: {error}',
  'logsModal.cleared': 'Logs limpiados',
  'logsModal.clearFailed': 'Error al limpiar logs: {error}',

  // Identify
  'identify.showing': 'Mostrando overlays de monitores',
  'identify.fallback': 'Overlay no disponible, usando resaltado en la app',

  // Errors
  'error.detectMonitors': 'Error al detectar monitores: {error}',
  'error.fileDialog': 'Error al abrir selector de archivos: {error}',
  'error.monitorNotFound': 'Monitor no encontrado',
  'error.editorDiagnostic': 'Editor no disponible en modo diagnóstico para este monitor',
};
