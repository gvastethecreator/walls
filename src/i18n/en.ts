import type { Translations } from './types';

export const en: Translations = {
  // Header
  'app.title': 'Wallpaper Manager',
  'app.refresh': 'Refresh',

  // Status
  'status.loading': 'Loading monitors…',
  'status.displays': '{count} displays',
  'status.pendingChange': '{count} pending change',
  'status.pendingChanges': '{count} pending changes',
  'status.allApplied': 'all applied',

  // Profiles
  'profile.select': '— Select Profile —',
  'profile.load': 'Load Profile',
  'profile.save': 'Save Profile',
  'profile.delete': 'Delete Profile',
  'profile.logs': 'View Logs',
  'profile.clearLogs': 'Clear Logs',
  'profile.namePlaceholder': 'Profile name...',
  'profile.selectFirst': 'Select a profile first',
  'profile.enterName': 'Enter a profile name',
  'profile.loaded': 'Profile "{name}" loaded',
  'profile.saved': 'Profile "{name}" saved',
  'profile.deleted': 'Profile "{name}" deleted',
  'profile.loadFailed': 'Load failed: {error}',
  'profile.saveFailed': 'Save failed: {error}',
  'profile.deleteFailed': 'Delete failed: {error}',
  'profile.deleteConfirm': 'Delete profile "{name}"? This action cannot be undone.',
  'profile.selectToDelete': 'Select a profile to delete',

  // Layout
  'layout.title': 'Layout',
  'layout.fitGlobal': 'Wallpaper fit is global on Windows and applies to all monitors.',
  'layout.identify': 'Identify Monitors',
  'layout.diagnosticMode':
    'Diagnostic mode: Windows did not return monitor IDs. You can inspect layout, but per-monitor apply is limited in this session.',
  'layout.detecting': 'Detecting monitors…',
  'layout.noMonitors': 'No monitors detected',

  // Monitor card
  'monitor.pending': 'Pending',
  'monitor.solidColor': 'Solid Color {color}',
  'monitor.noBackground': 'No Background',
  'monitor.loadingPreview': 'Loading preview...',
  'monitor.noPreview': 'No preview available',
  'monitor.noWallpaper': 'No wallpaper detected',
  'monitor.browseImage': 'Browse Image',
  'monitor.bgLabel': 'BG',
  'monitor.fitLabel': 'Fit',
  'monitor.clear': 'Clear',
  'monitor.edit': 'Edit',
  'monitor.apply': 'Apply Monitor',
  'monitor.applied': 'Monitor applied successfully',
  'monitor.applyFailed': 'Apply monitor failed: {error}',
  'monitor.noWallpaperConfigured': 'No wallpaper configured for this monitor',

  // Source types
  'source.image': 'Image',
  'source.solid': 'Solid Color',
  'source.none': 'No Background',

  // Apply
  'apply.button': 'Apply Configuration',
  'apply.success': 'Configuration applied successfully',
  'apply.failed': 'Apply failed: {error}',
  'apply.noWallpapers': 'No wallpapers configured',
  'apply.fallbackDisabled':
    'Windows did not provide monitor IDs for this session. Per-monitor apply is disabled.',

  // Editor
  'editor.title': 'Wallpaper Editor',
  'editor.titleMonitor': 'Wallpaper Editor · {name}',
  'editor.dragToMove': 'Drag image to move · Mouse wheel to zoom',
  'editor.fitMode': 'Fit mode: {mode}',
  'editor.chooseImage': 'Choose Image',
  'editor.reset': 'Reset',
  'editor.zoom': 'Zoom',
  'editor.rotation': 'Rotation',
  'editor.brightness': 'Brightness',
  'editor.contrast': 'Contrast',
  'editor.saturation': 'Saturation',
  'editor.hue': 'Hue',
  'editor.blur': 'Blur',
  'editor.tint': 'Tint',
  'editor.tintStrength': 'Tint Strength',
  'editor.loading': 'Loading image preview…',
  'editor.source': 'Source: {path}',
  'editor.cancel': 'Cancel',
  'editor.saving': 'Saving…',
  'editor.saveApply': 'Save & Apply',
  'editor.saved': 'Edited wallpaper saved and applied',
  'editor.noImagePrompt': 'Choose an image to start editing',

  // Save modal
  'saveModal.title': 'Save Profile',
  'saveModal.cancel': 'Cancel',
  'saveModal.save': 'Save',

  // Logs modal
  'logsModal.title': 'Application Logs',
  'logsModal.refresh': 'Refresh Logs',
  'logsModal.close': 'Close',
  'logsModal.noLogs': 'No logs yet.',
  'logsModal.loadFailed': 'Failed to load logs: {error}',
  'logsModal.cleared': 'Logs cleared',
  'logsModal.clearFailed': 'Failed to clear logs: {error}',

  // Identify
  'identify.showing': 'Showing monitor overlays',
  'identify.fallback': 'Overlay unavailable, using in-app highlight',

  // Errors
  'error.detectMonitors': 'Failed to detect monitors: {error}',
  'error.fileDialog': 'Failed to open file dialog: {error}',
  'error.monitorNotFound': 'Monitor not found',
  'error.editorDiagnostic': 'Editor unavailable in diagnostic mode for this monitor',
};
