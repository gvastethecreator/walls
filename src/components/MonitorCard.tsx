import { memo } from 'react';
import type { FitMode, MonitorInfo, WallpaperDraft, WallpaperSourceType } from '../lib/types';
import {
    FIT_OPTIONS,
    normalizeFitMode,
    parseWallpaperSource,
} from '../lib/wallpaper';

interface MonitorCardProps {
    monitor: MonitorInfo;
    draft: WallpaperDraft;
    dirty: boolean;
    highlighted: boolean;
    previewUrl: string;
    isPreviewLoading: boolean;
    hasPreviewError: boolean;
    onBrowse: (monitorId: string) => void;
    onSourceChange: (monitorId: string, nextType: WallpaperSourceType) => void;
    onSolidColorChange: (monitorId: string, color: string) => void;
    onFitChange: (monitorId: string, fitMode: FitMode) => void;
    onClear: (monitorId: string) => void;
    onEdit: (monitorId: string) => void;
    onApply: (monitorId: string) => void;
}

/** Tarjeta principal de edición/aplicación para un monitor individual. */
export const MonitorCard = memo(function MonitorCard({
    monitor,
    draft,
    dirty,
    highlighted,
    previewUrl,
    isPreviewLoading,
    hasPreviewError,
    onBrowse,
    onSourceChange,
    onSolidColorChange,
    onFitChange,
    onClear,
    onEdit,
    onApply,
}: MonitorCardProps) {
    const source = parseWallpaperSource(draft.imagePath);
    const hasImage = source.type === 'image' && source.imagePath.length > 0;
    const fitMode = normalizeFitMode(draft.fitMode);
    const fitClass = fitMode.toLowerCase();

    return (
        <article
            className={`js-monitor-card overflow-hidden rounded-2xl border transition duration-200 ${highlighted
                ? 'border-white/15 shadow-[0_0_0_2px_rgba(208,214,223,0.22)]'
                : dirty
                    ? 'border-emerald-400/35 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]'
                    : 'border-white/5'
                } hover:-translate-y-0.5 hover:bg-[#1c1d22] hover:shadow-xl`}
            data-monitor-id={monitor.id}
            style={{ background: 'var(--bg-card)' }}
        >
            <header className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#262930] text-[13px] font-bold text-[#c7ccd6]">
                        {monitor.displayIndex}
                    </span>
                    <span className="truncate text-sm font-semibold">{monitor.name}</span>
                    {dirty ? (
                        <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#052b1c]">
                            Pending
                        </span>
                    ) : null}
                </div>
                <span
                    className="rounded-md border border-white/5 bg-[#0d0f13] px-2 py-1 text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                >
                    x:{monitor.x} y:{monitor.y}
                </span>
            </header>

            <div className="border-y border-white/5 bg-black">
                <button
                    type="button"
                    className="group relative flex w-full items-center justify-center overflow-hidden bg-transparent"
                    onClick={() => onBrowse(monitor.id)}
                >
                    <div
                        className="relative w-full"
                        style={{ aspectRatio: `${Math.max(1, monitor.width)} / ${Math.max(1, monitor.height)}` }}
                    >
                        {source.type === 'solid' ? (
                            <>
                                <div className="absolute inset-0" style={{ background: source.color }} />
                                <div className="absolute bottom-3 left-3 z-10 rounded-full border border-white/10 bg-black/60 px-2 py-1 text-[11px] text-white backdrop-blur-sm">
                                    Solid Color {source.color}
                                </div>
                            </>
                        ) : source.type === 'none' ? (
                            <>
                                <div className="absolute inset-0 bg-black" />
                                <div className="absolute bottom-3 left-3 z-10 rounded-full border border-white/10 bg-black/60 px-2 py-1 text-[11px] text-white backdrop-blur-sm">
                                    No Background
                                </div>
                            </>
                        ) : hasImage && previewUrl ? (
                            fitClass === 'tile' ? (
                                <div
                                    className="absolute inset-0 bg-repeat"
                                    style={{ backgroundImage: `url(${previewUrl})` }}
                                />
                            ) : (
                                <img
                                    alt={`Wallpaper preview for ${monitor.name}`}
                                    className={`absolute inset-0 h-full w-full ${fitClass === 'fill' || fitClass === 'span'
                                        ? 'object-cover'
                                        : fitClass === 'fit'
                                            ? 'bg-black object-contain'
                                            : fitClass === 'stretch'
                                                ? 'object-fill'
                                                : fitClass === 'center'
                                                    ? 'object-none object-center'
                                                    : 'object-contain'
                                        }`}
                                    src={previewUrl}
                                />
                            )
                        ) : (
                            <>
                                <div className="absolute inset-0 bg-black" />
                                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80">
                                    {isPreviewLoading
                                        ? 'Loading preview...'
                                        : hasPreviewError
                                            ? 'No preview available'
                                            : 'No wallpaper detected'}
                                </div>
                            </>
                        )}

                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition duration-150 group-hover:opacity-100">
                            <span className="rounded-md bg-[#21242a]/90 px-2.5 py-1.5 text-[11px] font-medium text-white">
                                Browse Image
                            </span>
                        </div>
                    </div>
                </button>
            </div>

            <div className="grid grid-cols-1 gap-2 bg-black/20 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                <label className="flex min-w-0 items-center gap-2 rounded-md border border-white/5 bg-white/3 p-1.5">
                    <span
                        className="pl-1 text-[10px] font-semibold uppercase tracking-[0.5px]"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        BG
                    </span>
                    <select
                        className="input-select"
                        value={source.type}
                        onChange={(event) =>
                            onSourceChange(monitor.id, event.target.value as WallpaperSourceType)
                        }
                    >
                        <option value="image">Image</option>
                        <option value="solid">Solid Color</option>
                        <option value="none">No Background</option>
                    </select>
                    {source.type === 'solid' ? (
                        <input
                            aria-label={`Solid color for ${monitor.name}`}
                            className="h-6 w-7 cursor-pointer rounded-md border-0 p-0.5"
                            style={{ background: 'var(--bg-input)' }}
                            type="color"
                            value={source.color}
                            onChange={(event) => onSolidColorChange(monitor.id, event.target.value)}
                        />
                    ) : null}
                </label>

                <label className="flex min-w-0 items-center gap-2 rounded-md border border-white/5 bg-white/3 p-1.5">
                    <span
                        className="pl-1 text-[10px] font-semibold uppercase tracking-[0.5px]"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Fit
                    </span>
                    <select
                        className="input-select"
                        value={fitMode}
                        onChange={(event) => onFitChange(monitor.id, event.target.value as FitMode)}
                    >
                        {FIT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <button
                        className="btn btn-danger"
                        disabled={source.type === 'none'}
                        type="button"
                        onClick={() => onClear(monitor.id)}
                    >
                        Clear
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => onEdit(monitor.id)}>
                        Edit
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => onApply(monitor.id)}>
                        Apply Monitor
                    </button>
                </div>
            </div>
        </article>
    );
});
