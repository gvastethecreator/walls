export type FitMode = 'Center' | 'Tile' | 'Stretch' | 'Fit' | 'Fill' | 'Span';
export type WallpaperSourceType = 'image' | 'solid' | 'none';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppErrorPayload {
  code: string;
  message: string;
  details?: string;
}

export interface MonitorInfo {
  id: string;
  displayIndex: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  currentWallpaper: string;
  currentFit: string;
}

export interface WallpaperDraft {
  imagePath: string;
  fitMode: FitMode;
}

export interface WallpaperSource {
  type: WallpaperSourceType;
  color: string;
  imagePath: string;
}

export interface ProfileMonitor {
  monitorId: string;
  imagePath: string;
  fitMode: FitMode;
}

export interface Profile {
  profileName: string;
  monitors: ProfileMonitor[];
}

export interface LayoutMonitor {
  id: string;
  displayIndex: number;
  width: number;
  height: number;
  left: number;
  top: number;
  layoutWidth: number;
  layoutHeight: number;
}

export interface ToastState {
  tone: 'success' | 'error' | 'info';
  message: string;
}
