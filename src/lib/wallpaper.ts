import type {
  AppErrorPayload,
  FitMode,
  LayoutMonitor,
  MonitorInfo,
  WallpaperDraft,
  WallpaperSource,
} from './types';

export const FIT_OPTIONS: FitMode[] = ['Center', 'Tile', 'Stretch', 'Fit', 'Fill', 'Span'];
export const NONE_MARKER = '__NONE__';
export const SOLID_PREFIX = '__SOLID__:';
export const DEFAULT_FIT_MODE: FitMode = 'Fill';
export const DEFAULT_SOLID_COLOR = '#000000';

/** Devuelve un valor de fit válido o usa `Fill` como fallback seguro. */
export function normalizeFitMode(value: string | null | undefined): FitMode {
  const candidate = String(value ?? '').trim() as FitMode;
  return FIT_OPTIONS.includes(candidate) ? candidate : DEFAULT_FIT_MODE;
}

/** Fuerza un color hexadecimal `#rrggbb` válido. */
export function normalizeColorHex(color: string | null | undefined): string {
  const raw = String(color ?? '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/u.test(raw) ? raw : DEFAULT_SOLID_COLOR;
}

/** Construye el marcador de color sólido consumido por el backend. */
export function makeSolidMarker(color: string): string {
  return `${SOLID_PREFIX}${normalizeColorHex(color)}`;
}

/** Interpreta una ruta de wallpaper en una fuente de UI más expresiva. */
export function parseWallpaperSource(imagePath: string | null | undefined): WallpaperSource {
  const value = String(imagePath ?? '');
  if (!value || value === NONE_MARKER) {
    return { type: 'none', color: DEFAULT_SOLID_COLOR, imagePath: '' };
  }

  if (value.startsWith(SOLID_PREFIX)) {
    return {
      type: 'solid',
      color: normalizeColorHex(value.slice(SOLID_PREFIX.length)),
      imagePath: '',
    };
  }

  return { type: 'image', color: DEFAULT_SOLID_COLOR, imagePath: value };
}

/** Normaliza la ruta persistible de un borrador. */
export function normalizeImagePath(imagePath: string | null | undefined): string {
  const source = parseWallpaperSource(imagePath);
  if (source.type === 'none') {
    return NONE_MARKER;
  }
  if (source.type === 'solid') {
    return makeSolidMarker(source.color);
  }
  return source.imagePath;
}

/** Genera un snapshot consistente para comparar cambios locales contra baseline. */
export function snapshotDraft(draft?: Partial<WallpaperDraft>): WallpaperDraft {
  return {
    imagePath: normalizeImagePath(draft?.imagePath),
    fitMode: normalizeFitMode(draft?.fitMode),
  };
}

/** Ordena monitores por índice visual para mantener una UI estable. */
export function sortMonitors(monitors: readonly MonitorInfo[]): MonitorInfo[] {
  return [...monitors].sort((left, right) => left.displayIndex - right.displayIndex);
}

/** Crea el mapa inicial de borradores desde el backend. */
export function createDraftsFromMonitors(
  monitors: readonly MonitorInfo[],
): Record<string, WallpaperDraft> {
  return Object.fromEntries(
    monitors.map((monitor) => [
      monitor.id,
      snapshotDraft({
        imagePath: monitor.currentWallpaper,
        fitMode: normalizeFitMode(monitor.currentFit),
      }),
    ]),
  );
}

/** Comprueba si un monitor tiene cambios pendientes respecto al baseline. */
export function isMonitorDirty(
  monitorId: string,
  drafts: Record<string, WallpaperDraft>,
  baseline: Record<string, WallpaperDraft>,
): boolean {
  const current = snapshotDraft(drafts[monitorId]);
  const base = snapshotDraft(baseline[monitorId]);
  return current.imagePath !== base.imagePath || current.fitMode !== base.fitMode;
}

/** Cuenta cuántos monitores tienen cambios locales sin aplicar. */
export function countDirtyMonitors(
  monitors: readonly MonitorInfo[],
  drafts: Record<string, WallpaperDraft>,
  baseline: Record<string, WallpaperDraft>,
): number {
  return monitors.reduce(
    (count, monitor) => count + Number(isMonitorDirty(monitor.id, drafts, baseline)),
    0,
  );
}

/** Elimina una clave de un diccionario inmutable. */
export function removeKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _ignored, ...rest } = record;
  return rest;
}

/** Construye el payload de configuración que consume el backend para aplicar todos los monitores. */
export function buildApplyConfiguration(
  monitors: readonly MonitorInfo[],
  drafts: Record<string, WallpaperDraft>,
): Array<{ monitorId: string; imagePath: string; fitMode: FitMode }> {
  return monitors.flatMap((monitor) => {
    const draft = drafts[monitor.id];
    if (!draft?.imagePath) {
      return [];
    }

    return [
      {
        monitorId: monitor.id,
        imagePath: draft.imagePath,
        fitMode: normalizeFitMode(draft.fitMode),
      },
    ];
  });
}

/** Ajusta el baseline cuando Windows cambia el fit global tras aplicar un solo monitor. */
export function updateBaselineAfterSingleApply(
  baseline: Record<string, WallpaperDraft>,
  monitorId: string,
  appliedDraft: WallpaperDraft,
): Record<string, WallpaperDraft> {
  const next = Object.fromEntries(
    Object.entries(baseline).map(([id, draft]) => [
      id,
      snapshotDraft({ ...draft, fitMode: appliedDraft.fitMode }),
    ]),
  ) as Record<string, WallpaperDraft>;

  next[monitorId] = snapshotDraft(appliedDraft);
  return next;
}

/** Calcula las posiciones del minimapa de monitores respetando topología y relación de aspecto. */
export function computeLayoutMonitors(
  monitors: readonly MonitorInfo[],
  containerWidth: number,
  containerHeight: number,
): LayoutMonitor[] {
  if (!monitors.length || containerWidth <= 0 || containerHeight <= 0) {
    return [];
  }

  const pad = 12;
  const gap = 2;
  const minX = Math.min(...monitors.map((monitor) => monitor.x));
  const minY = Math.min(...monitors.map((monitor) => monitor.y));
  const maxX = Math.max(...monitors.map((monitor) => monitor.x + monitor.width));
  const maxY = Math.max(...monitors.map((monitor) => monitor.y + monitor.height));

  const virtualWidth = Math.max(1, maxX - minX);
  const virtualHeight = Math.max(1, maxY - minY);
  const scaleX = (containerWidth - pad * 2) / virtualWidth;
  const scaleY = (containerHeight - pad * 2) / virtualHeight;
  const scale = Math.max(0.02, Math.min(scaleX, scaleY));
  const contentWidth = virtualWidth * scale;
  const contentHeight = virtualHeight * scale;
  const offsetX = Math.max(pad, (containerWidth - contentWidth) / 2);
  const offsetY = Math.max(pad, (containerHeight - contentHeight) / 2);

  return monitors.map((monitor) => ({
    id: monitor.id,
    displayIndex: monitor.displayIndex,
    width: monitor.width,
    height: monitor.height,
    left: Math.round((monitor.x - minX) * scale + offsetX + gap / 2),
    top: Math.round((monitor.y - minY) * scale + offsetY + gap / 2),
    layoutWidth: Math.max(54, Math.round(monitor.width * scale) - gap),
    layoutHeight: Math.max(36, Math.round(monitor.height * scale) - gap),
  }));
}

/** Normaliza errores desconocidos a un payload homogéneo. */
export function normalizeErrorPayload(error: unknown): AppErrorPayload {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  ) {
    const details =
      'details' in error && typeof error.details === 'string' ? error.details : undefined;

    return details
      ? {
          code: error.code,
          message: error.message,
          details,
        }
      : {
          code: error.code,
          message: error.message,
        };
  }

  if (error instanceof Error) {
    return { code: 'unknown_error', message: error.message };
  }

  return { code: 'unknown_error', message: String(error ?? 'Unknown error') };
}

/** Devuelve un texto corto y legible para mostrar errores en la UI. */
export function formatError(error: unknown): string {
  const normalized = normalizeErrorPayload(error);
  return normalized.details
    ? `${normalized.message} (${normalized.details})`
    : normalized.message;
}
