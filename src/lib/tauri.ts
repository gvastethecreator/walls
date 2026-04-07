import { invoke } from '@tauri-apps/api/core';
import { confirm, open } from '@tauri-apps/plugin-dialog';
import {
  attachConsole,
  debug as logDebug,
  error as logError,
  info as logInfo,
  warn as logWarn,
} from '@tauri-apps/plugin-log';
import type {
  FitMode,
  LogLevel,
  MonitorInfo,
  Profile,
  ProfileMonitor,
  WallpaperDraft,
} from './types';
import { normalizeErrorPayload } from './wallpaper';

let loggingReady = false;

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw normalizeErrorPayload(error);
  }
}

/** Inicializa la consola enlazada al flujo de logs del runtime. */
export async function initializeLogging(): Promise<void> {
  if (loggingReady) {
    return;
  }

  try {
    await attachConsole();
  } finally {
    loggingReady = true;
  }
}

/** Registra un evento del frontend tanto en consola como en el log persistente del backend. */
export async function logClient(
  scope: string,
  message: string,
  level: LogLevel = 'info',
): Promise<void> {
  const text = `[ui:${scope}] ${message}`;

  try {
    switch (level) {
      case 'debug':
        await logDebug(text);
        break;
      case 'warn':
        await logWarn(text);
        break;
      case 'error':
        await logError(text);
        break;
      default:
        await logInfo(text);
        break;
    }
  } catch {
    // No bloqueamos la UI por fallos de logging en consola.
  }

  try {
    await invokeCommand<void>('log_client_event', { scope, level, message });
  } catch {
    // Tampoco dejamos que el log rompa el flujo principal.
  }
}

/** Abre el selector nativo y devuelve la ruta del archivo elegido. */
export async function pickImagePath(): Promise<string | null> {
  try {
    const result = await open({
      title: 'Select Wallpaper Image',
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp', 'tif', 'tiff'],
        },
      ],
      multiple: false,
    });

    if (Array.isArray(result)) {
      return result[0] ?? null;
    }

    return result ?? null;
  } catch (error) {
    throw normalizeErrorPayload(error);
  }
}

export async function fetchMonitors(): Promise<MonitorInfo[]> {
  return invokeCommand<MonitorInfo[]>('get_monitors');
}

export async function applyWallpaper(
  monitorId: string,
  imagePath: string,
  fitMode: FitMode,
): Promise<void> {
  await invokeCommand<void>('apply_wallpaper', {
    monitor_id: monitorId,
    image_path: imagePath,
    fit_mode: fitMode,
  });
}

export async function applyConfiguration(
  configs: Array<{ monitorId: string; imagePath: string; fitMode: FitMode }>,
): Promise<void> {
  await invokeCommand<void>('apply_configuration', {
    configs: configs.map((config) => ({
      monitorId: config.monitorId,
      imagePath: config.imagePath,
      fitMode: config.fitMode,
    })),
  });
}

export async function saveProfile(name: string, monitors: ProfileMonitor[]): Promise<void> {
  await invokeCommand<void>('save_profile', { name, monitors });
}

export async function loadProfile(name: string): Promise<Profile> {
  return invokeCommand<Profile>('load_profile', { name });
}

export async function listProfiles(): Promise<string[]> {
  return invokeCommand<string[]>('list_profiles');
}

export async function deleteProfile(name: string): Promise<void> {
  await invokeCommand<void>('delete_profile', { name });
}

export async function identifyMonitors(): Promise<void> {
  await invokeCommand<void>('identify_monitors');
}

export async function getLogs(): Promise<string> {
  return invokeCommand<string>('get_logs');
}

export async function clearLogs(): Promise<void> {
  await invokeCommand<void>('clear_logs');
}

export async function getImageDataUrl(imagePath: string): Promise<string> {
  return invokeCommand<string>('get_image_data_url', { imagePath });
}

export async function saveEditedWallpaper(
  monitorId: string,
  dataUrl: string,
): Promise<string> {
  return invokeCommand<string>('save_edited_wallpaper', { monitorId, dataUrl });
}

/** Resultado del health check del sistema. */
export interface HealthCheckResult {
  comOk: boolean;
  monitorCount: number;
  profilesDirOk: boolean;
  logsDirOk: boolean;
  editedDirOk: boolean;
  issues: string[];
}

/** Verifica el estado del subsistema COM, monitores y directorios de datos. */
export async function healthCheck(): Promise<HealthCheckResult> {
  return invokeCommand<HealthCheckResult>('health_check');
}

/** Muestra un diálogo de confirmación nativo de Tauri. */
export async function confirmDialog(
  message: string,
  title?: string,
): Promise<boolean> {
  const options = title ? { title, kind: 'warning' as const } : { kind: 'warning' as const };
  return confirm(message, options);
}

/** Convierte el estado actual de borradores en el formato de perfil persistible. */
export function draftsToProfileMonitors(
  drafts: Record<string, WallpaperDraft>,
): ProfileMonitor[] {
  return Object.entries(drafts).map(([monitorId, draft]) => ({
    monitorId,
    imagePath: draft.imagePath,
    fitMode: draft.fitMode,
  }));
}
