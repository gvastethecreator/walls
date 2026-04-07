export type Locale = 'en' | 'es';

export interface Translations {
  // Header
  'app.title': string;
  'app.refresh': string;

  // Status
  'status.loading': string;
  'status.displays': string;
  'status.pendingChange': string;
  'status.pendingChanges': string;
  'status.allApplied': string;

  // Profiles
  'profile.select': string;
  'profile.load': string;
  'profile.save': string;
  'profile.delete': string;
  'profile.logs': string;
  'profile.clearLogs': string;
  'profile.namePlaceholder': string;
  'profile.selectFirst': string;
  'profile.enterName': string;
  'profile.loaded': string;
  'profile.saved': string;
  'profile.deleted': string;
  'profile.loadFailed': string;
  'profile.saveFailed': string;
  'profile.deleteFailed': string;
  'profile.deleteConfirm': string;
  'profile.selectToDelete': string;

  // Layout
  'layout.title': string;
  'layout.fitGlobal': string;
  'layout.identify': string;
  'layout.diagnosticMode': string;
  'layout.detecting': string;
  'layout.noMonitors': string;

  // Monitor card
  'monitor.pending': string;
  'monitor.solidColor': string;
  'monitor.noBackground': string;
  'monitor.loadingPreview': string;
  'monitor.noPreview': string;
  'monitor.noWallpaper': string;
  'monitor.browseImage': string;
  'monitor.bgLabel': string;
  'monitor.fitLabel': string;
  'monitor.clear': string;
  'monitor.edit': string;
  'monitor.apply': string;
  'monitor.applied': string;
  'monitor.applyFailed': string;
  'monitor.noWallpaperConfigured': string;

  // Source types
  'source.image': string;
  'source.solid': string;
  'source.none': string;

  // Apply
  'apply.button': string;
  'apply.success': string;
  'apply.failed': string;
  'apply.noWallpapers': string;
  'apply.fallbackDisabled': string;

  // Editor
  'editor.title': string;
  'editor.titleMonitor': string;
  'editor.dragToMove': string;
  'editor.fitMode': string;
  'editor.chooseImage': string;
  'editor.reset': string;
  'editor.zoom': string;
  'editor.rotation': string;
  'editor.brightness': string;
  'editor.contrast': string;
  'editor.saturation': string;
  'editor.hue': string;
  'editor.blur': string;
  'editor.tint': string;
  'editor.tintStrength': string;
  'editor.loading': string;
  'editor.source': string;
  'editor.cancel': string;
  'editor.saving': string;
  'editor.saveApply': string;
  'editor.saved': string;
  'editor.noImagePrompt': string;

  // Save modal
  'saveModal.title': string;
  'saveModal.cancel': string;
  'saveModal.save': string;

  // Logs modal
  'logsModal.title': string;
  'logsModal.refresh': string;
  'logsModal.close': string;
  'logsModal.noLogs': string;
  'logsModal.loadFailed': string;
  'logsModal.cleared': string;
  'logsModal.clearFailed': string;

  // Identify
  'identify.showing': string;
  'identify.fallback': string;

  // Errors
  'error.detectMonitors': string;
  'error.fileDialog': string;
  'error.monitorNotFound': string;
  'error.editorDiagnostic': string;
}

export type TranslationKey = keyof Translations;
