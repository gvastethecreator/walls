import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { EditorDialog } from './components/EditorDialog';
import { MonitorCard } from './components/MonitorCard';
import { MonitorLayout } from './components/MonitorLayout';
import { useI18n } from './i18n';
import {
    applyConfiguration,
    applyWallpaper,
    clearLogs,
    confirmDialog,
    deleteProfile,
    draftsToProfileMonitors,
    fetchMonitors,
    getImageDataUrl,
    getLogs,
    identifyMonitors,
    initializeLogging,
    listProfiles,
    loadProfile,
    logClient,
    pickImagePath,
    saveEditedWallpaper,
    saveProfile,
} from './lib/tauri';
import type {
    FitMode,
    MonitorInfo,
    Profile,
    ToastState,
    WallpaperDraft,
    WallpaperSourceType,
} from './lib/types';
import {
    DEFAULT_FIT_MODE,
    NONE_MARKER,
    buildApplyConfiguration,
    countDirtyMonitors,
    createDraftsFromMonitors,
    formatError,
    isMonitorDirty,
    makeSolidMarker,
    normalizeFitMode,
    parseWallpaperSource,
    removeKey,
    snapshotDraft,
    sortMonitors,
    updateBaselineAfterSingleApply,
} from './lib/wallpaper';

const IDENTIFY_FALLBACK_DELAY_MS = 700;

function createSnapshotRecord(
    record: Record<string, WallpaperDraft>,
): Record<string, WallpaperDraft> {
    return Object.fromEntries(
        Object.entries(record).map(([id, draft]) => [id, snapshotDraft(draft)]),
    ) as Record<string, WallpaperDraft>;
}

function hasFallbackMonitorIds(monitors: readonly MonitorInfo[]): boolean {
    return monitors.some((monitor) => monitor.id.startsWith('GDI_MONITOR_'));
}

function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

export default function App() {
    const gridRef = useRef<HTMLDivElement>(null);
    const toastTimerRef = useRef<number | null>(null);
    const { t, locale, setLocale } = useI18n();

    const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
    const [drafts, setDrafts] = useState<Record<string, WallpaperDraft>>({});
    const [baseline, setBaseline] = useState<Record<string, WallpaperDraft>>({});
    const [profiles, setProfiles] = useState<string[]>([]);
    const [selectedProfileName, setSelectedProfileName] = useState('');
    const [profileNameInput, setProfileNameInput] = useState('');
    const [previewCache, setPreviewCache] = useState<Record<string, string>>({});
    const [previewPending, setPreviewPending] = useState<Record<string, boolean>>({});
    const [previewFailed, setPreviewFailed] = useState<Record<string, boolean>>({});
    const [toast, setToast] = useState<ToastState | null>(null);
    const [highlightedMonitorId, setHighlightedMonitorId] = useState<string | null>(null);
    const [isLoadingMonitors, setIsLoadingMonitors] = useState(false);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [logsModalOpen, setLogsModalOpen] = useState(false);
    const [logsContent, setLogsContent] = useState('No logs yet.');
    const [editorState, setEditorState] = useState<{
        open: boolean;
        monitor: MonitorInfo | null;
        sourceImagePath: string;
    }>({
        open: false,
        monitor: null,
        sourceImagePath: '',
    });

    const sortedMonitors = useMemo(() => sortMonitors(monitors), [monitors]);
    const fallbackIdsDetected = useMemo(
        () => hasFallbackMonitorIds(sortedMonitors),
        [sortedMonitors],
    );
    const dirtyCount = useMemo(
        () => countDirtyMonitors(sortedMonitors, drafts, baseline),
        [baseline, drafts, sortedMonitors],
    );
    const statusSummary = useMemo(() => {
        if (!sortedMonitors.length) {
            return t('status.loading');
        }
        if (dirtyCount > 0) {
            const key = dirtyCount > 1 ? 'status.pendingChanges' : 'status.pendingChange';
            return `${t('status.displays', { count: sortedMonitors.length })} · ${t(key, { count: dirtyCount })}`;
        }
        return `${t('status.displays', { count: sortedMonitors.length })} · ${t('status.allApplied')}`;
    }, [dirtyCount, sortedMonitors.length, t]);
    const animationKey = useMemo(
        () => `${sortedMonitors.map((monitor) => monitor.id).join('|')}::${dirtyCount}`,
        [dirtyCount, sortedMonitors],
    );
    const activeEditorFitMode = useMemo(() => {
        if (!editorState.monitor) {
            return DEFAULT_FIT_MODE;
        }
        return normalizeFitMode(drafts[editorState.monitor.id]?.fitMode);
    }, [drafts, editorState.monitor]);

    const pushToast = useCallback((message: string, tone: ToastState['tone']) => {
        setToast({ message, tone });
        if (toastTimerRef.current !== null) {
            window.clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = window.setTimeout(() => {
            setToast(null);
            toastTimerRef.current = null;
        }, 3000);
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current !== null) {
                window.clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    useGSAP(
        () => {
            const media = gsap.matchMedia();
            media.add(
                {
                    reduceMotion: '(prefers-reduced-motion: reduce)',
                },
                (context) => {
                    const reduceMotion = context.conditions?.reduceMotion;
                    if (reduceMotion) {
                        gsap.set('.js-monitor-card', { autoAlpha: 1, y: 0 });
                        return;
                    }

                    gsap.fromTo(
                        '.js-monitor-card',
                        { autoAlpha: 0, y: 12 },
                        {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.28,
                            ease: 'power2.out',
                            stagger: 0.05,
                            overwrite: 'auto',
                        },
                    );
                },
            );

            return () => media.revert();
        },
        { scope: gridRef, dependencies: [animationKey], revertOnUpdate: true },
    );

    const syncDraftsFromMonitors = useCallback(
        (nextMonitors: MonitorInfo[], preserveLocal: boolean) => {
            setDrafts((previous) => {
                const next: Record<string, WallpaperDraft> = {};
                for (const monitor of nextMonitors) {
                    next[monitor.id] = preserveLocal && previous[monitor.id]
                        ? snapshotDraft(previous[monitor.id])
                        : snapshotDraft({
                            imagePath: monitor.currentWallpaper,
                            fitMode: normalizeFitMode(monitor.currentFit),
                        });
                }
                return next;
            });

            setBaseline((previous) => {
                if (preserveLocal && Object.keys(previous).length > 0) {
                    return previous;
                }
                return createDraftsFromMonitors(nextMonitors);
            });
        },
        [],
    );

    const resolvePreviewDataUrl = useCallback(
        async (imagePath: string): Promise<string> => {
            if (!imagePath) {
                throw new Error('Image path cannot be empty');
            }
            if (previewCache[imagePath]) {
                return previewCache[imagePath];
            }
            if (previewPending[imagePath]) {
                throw new Error('Preview request already in flight');
            }

            setPreviewPending((previous) => ({ ...previous, [imagePath]: true }));
            try {
                const dataUrl = await getImageDataUrl(imagePath);
                setPreviewCache((previous) => ({ ...previous, [imagePath]: dataUrl }));
                setPreviewFailed((previous) => removeKey(previous, imagePath));
                return dataUrl;
            } catch (error) {
                setPreviewFailed((previous) => ({ ...previous, [imagePath]: true }));
                throw error;
            } finally {
                setPreviewPending((previous) => removeKey(previous, imagePath));
            }
        },
        [previewCache, previewPending],
    );

    const refreshProfiles = useCallback(async () => {
        try {
            const nextProfiles = await listProfiles();
            setProfiles(nextProfiles);
            if (selectedProfileName && !nextProfiles.includes(selectedProfileName)) {
                setSelectedProfileName('');
            }
        } catch (error) {
            await logClient('profiles', `list error: ${formatError(error)}`, 'warn');
        }
    }, [selectedProfileName]);

    const loadMonitors = useCallback(
        async (preserveLocal = false) => {
            setIsLoadingMonitors(true);
            try {
                await logClient('monitors', 'get_monitors invoke start', 'debug');
                const nextMonitors = sortMonitors(await fetchMonitors());
                setMonitors(nextMonitors);
                syncDraftsFromMonitors(nextMonitors, preserveLocal);
                await logClient('monitors', `get_monitors ok: ${nextMonitors.length} monitor(s)`, 'info');
            } catch (error) {
                await logClient('monitors', `get_monitors error: ${formatError(error)}`, 'error');
                pushToast(t('error.detectMonitors', { error: formatError(error) }), 'error');
            } finally {
                setIsLoadingMonitors(false);
            }
        },
        [pushToast, syncDraftsFromMonitors, t],
    );

    useEffect(() => {
        void initializeLogging();
        void loadMonitors(false);
        void refreshProfiles();
    }, [loadMonitors, refreshProfiles]);

    useEffect(() => {
        const targets = sortedMonitors
            .map((monitor) => parseWallpaperSource(drafts[monitor.id]?.imagePath).imagePath)
            .filter(Boolean);

        for (const imagePath of targets) {
            if (previewCache[imagePath] || previewPending[imagePath] || previewFailed[imagePath]) {
                continue;
            }

            void resolvePreviewDataUrl(imagePath).catch(async (error) => {
                await logClient('preview', `preview error for ${imagePath}: ${formatError(error)}`, 'warn');
            });
        }
    }, [drafts, previewCache, previewFailed, previewPending, resolvePreviewDataUrl, sortedMonitors]);

    useEffect(() => {
        const handleWindowError = (event: ErrorEvent) => {
            void logClient(
                'window-error',
                `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
                'error',
            );
        };
        const handleRejection = (event: PromiseRejectionEvent) => {
            void logClient(
                'unhandled-rejection',
                formatError(event.reason ?? 'unknown rejection'),
                'error',
            );
        };

        window.addEventListener('error', handleWindowError);
        window.addEventListener('unhandledrejection', handleRejection);
        return () => {
            window.removeEventListener('error', handleWindowError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    const updateDraft = useCallback(
        (monitorId: string, nextDraft: Partial<WallpaperDraft>) => {
            setDrafts((previous) => ({
                ...previous,
                [monitorId]: snapshotDraft({
                    ...previous[monitorId],
                    ...nextDraft,
                }),
            }));
        },
        [],
    );

    const browseMonitorImage = useCallback(
        async (monitorId: string) => {
            try {
                const path = await pickImagePath();
                if (!path) {
                    return null;
                }

                await logClient('browse', `selected image for monitor ${monitorId}: ${path}`, 'info');
                updateDraft(monitorId, { imagePath: path });
                setPreviewFailed((previous) => removeKey(previous, path));
                void resolvePreviewDataUrl(path).catch(() => undefined);
                return path;
            } catch (error) {
                pushToast(t('error.fileDialog', { error: formatError(error) }), 'error');
                await logClient('browse', `dialog error: ${formatError(error)}`, 'error');
                return null;
            }
        },
        [pushToast, resolvePreviewDataUrl, updateDraft],
    );

    const pickImageForEditor = useCallback(async () => pickImagePath(), []);

    const handleSourceChange = useCallback(
        async (monitorId: string, nextType: WallpaperSourceType) => {
            const currentDraft = drafts[monitorId] ?? snapshotDraft();
            const currentSource = parseWallpaperSource(currentDraft.imagePath);

            if (nextType === 'image') {
                if (currentSource.type === 'image' && currentSource.imagePath) {
                    return;
                }
                await browseMonitorImage(monitorId);
                return;
            }

            if (nextType === 'solid') {
                updateDraft(monitorId, {
                    imagePath: makeSolidMarker(
                        currentSource.type === 'solid' ? currentSource.color : '#000000',
                    ),
                });
                return;
            }

            updateDraft(monitorId, { imagePath: NONE_MARKER });
        },
        [browseMonitorImage, drafts, updateDraft],
    );

    const handleFitChange = useCallback((_: string, fitMode: FitMode) => {
        const normalized = normalizeFitMode(fitMode);
        setDrafts((previous) =>
            Object.fromEntries(
                Object.entries(previous).map(([id, draft]) => [
                    id,
                    snapshotDraft({ ...draft, fitMode: normalized }),
                ]),
            ) as Record<string, WallpaperDraft>,
        );
    }, []);

    const handleSolidColorChange = useCallback(
        (monitorId: string, color: string) => {
            updateDraft(monitorId, { imagePath: makeSolidMarker(color) });
        },
        [updateDraft],
    );

    const handleClearMonitor = useCallback(
        (monitorId: string) => {
            updateDraft(monitorId, { imagePath: NONE_MARKER });
        },
        [updateDraft],
    );

    const handleApplyMonitor = useCallback(
        async (monitorId: string) => {
            const draft = drafts[monitorId];
            if (!draft?.imagePath) {
                pushToast(t('monitor.noWallpaperConfigured'), 'error');
                return;
            }

            try {
                await logClient('apply', `apply_wallpaper start: ${monitorId}`, 'info');
                const nextDraft = snapshotDraft(draft);
                await applyWallpaper(monitorId, nextDraft.imagePath, nextDraft.fitMode);
                setBaseline((previous) =>
                    updateBaselineAfterSingleApply(previous, monitorId, nextDraft),
                );
                pushToast(t('monitor.applied'), 'success');
            } catch (error) {
                await logClient('apply', `apply_wallpaper error: ${formatError(error)}`, 'error');
                pushToast(t('monitor.applyFailed', { error: formatError(error) }), 'error');
            }
        },
        [drafts, pushToast, t],
    );

    const handleApplyConfiguration = useCallback(async () => {
        if (fallbackIdsDetected) {
            pushToast(t('apply.fallbackDisabled'), 'error');
            return;
        }

        const configs = buildApplyConfiguration(sortedMonitors, drafts);
        if (!configs.length) {
            pushToast(t('apply.noWallpapers'), 'error');
            return;
        }

        try {
            await logClient('apply', `apply_configuration start: ${configs.length} config(s)`, 'info');
            await applyConfiguration(configs);
            setBaseline(createSnapshotRecord(drafts));
            pushToast(t('apply.success'), 'success');
        } catch (error) {
            await logClient('apply', `apply_configuration error: ${formatError(error)}`, 'error');
            pushToast(t('apply.failed', { error: formatError(error) }), 'error');
        }
    }, [drafts, fallbackIdsDetected, pushToast, sortedMonitors, t]);

    const handleOpenEditor = useCallback(
        async (monitorId: string) => {
            const monitor = sortedMonitors.find((candidate) => candidate.id === monitorId);
            if (!monitor) {
                pushToast(t('error.monitorNotFound'), 'error');
                return;
            }
            if (monitor.id.startsWith('GDI_MONITOR_')) {
                pushToast(t('error.editorDiagnostic'), 'error');
                return;
            }

            const draft = drafts[monitorId] ?? snapshotDraft();
            const source = parseWallpaperSource(draft.imagePath);
            let nextPath = source.type === 'image' ? source.imagePath : '';

            if (!nextPath) {
                nextPath = (await pickImageForEditor()) ?? '';
            }
            if (!nextPath) {
                return;
            }

            setEditorState({
                open: true,
                monitor,
                sourceImagePath: nextPath,
            });
        },
        [drafts, pickImageForEditor, pushToast, sortedMonitors],
    );

    const handleSaveEditedWallpaper = useCallback(
        async ({
            monitorId,
            fitMode,
            dataUrl,
        }: {
            monitorId: string;
            fitMode: FitMode;
            dataUrl: string;
        }) => {
            await logClient('editor', `save start for ${monitorId}`, 'info');
            const savedPath = await saveEditedWallpaper(monitorId, dataUrl);
            await applyWallpaper(monitorId, savedPath, fitMode);

            const nextDraft = snapshotDraft({ imagePath: savedPath, fitMode });
            setDrafts((previous) => ({
                ...previous,
                [monitorId]: nextDraft,
            }));
            setBaseline((previous) =>
                updateBaselineAfterSingleApply(previous, monitorId, nextDraft),
            );
            setPreviewCache((previous) => ({ ...previous, [savedPath]: dataUrl }));
            setPreviewPending((previous) => removeKey(previous, savedPath));
            setPreviewFailed((previous) => removeKey(previous, savedPath));
            pushToast(t('editor.saved'), 'success');
            await logClient('editor', `save success for ${monitorId}`, 'info');
        },
        [pushToast, t],
    );

    const handleIdentifyMonitors = useCallback(async () => {
        if (!sortedMonitors.length) {
            pushToast(t('layout.noMonitors'), 'error');
            return;
        }

        try {
            await identifyMonitors();
            pushToast(t('identify.showing'), 'success');
        } catch {
            pushToast(t('identify.fallback'), 'info');
            for (const monitor of sortedMonitors) {
                setHighlightedMonitorId(monitor.id);
                await wait(IDENTIFY_FALLBACK_DELAY_MS);
            }
            setHighlightedMonitorId(null);
        }
    }, [pushToast, sortedMonitors, t]);

    const handleLoadSelectedProfile = useCallback(async () => {
        if (!selectedProfileName) {
            pushToast(t('profile.selectFirst'), 'error');
            return;
        }

        try {
            const profile: Profile = await loadProfile(selectedProfileName);
            const nextDrafts = createDraftsFromMonitors(sortedMonitors);
            const activeIds = new Set(sortedMonitors.map((monitor) => monitor.id));

            for (const monitor of profile.monitors) {
                if (!activeIds.has(monitor.monitorId)) {
                    continue;
                }
                nextDrafts[monitor.monitorId] = snapshotDraft({
                    imagePath: monitor.imagePath,
                    fitMode: monitor.fitMode,
                });
            }

            setDrafts(nextDrafts);
            pushToast(t('profile.loaded', { name: selectedProfileName }), 'success');
        } catch (error) {
            pushToast(t('profile.loadFailed', { error: formatError(error) }), 'error');
        }
    }, [pushToast, selectedProfileName, sortedMonitors, t]);

    const handleSaveCurrentProfile = useCallback(async () => {
        const name = profileNameInput.trim();
        if (!name) {
            pushToast(t('profile.enterName'), 'error');
            return;
        }

        try {
            await saveProfile(name, draftsToProfileMonitors(drafts));
            setSaveModalOpen(false);
            setProfileNameInput('');
            setSelectedProfileName(name);
            await refreshProfiles();
            pushToast(t('profile.saved', { name }), 'success');
        } catch (error) {
            pushToast(t('profile.saveFailed', { error: formatError(error) }), 'error');
        }
    }, [drafts, profileNameInput, pushToast, refreshProfiles, t]);

    const handleDeleteSelectedProfile = useCallback(async () => {
        if (!selectedProfileName) {
            pushToast(t('profile.selectToDelete'), 'error');
            return;
        }

        const confirmed = await confirmDialog(
            t('profile.deleteConfirm', { name: selectedProfileName }),
        );
        if (!confirmed) {
            return;
        }

        try {
            await deleteProfile(selectedProfileName);
            await refreshProfiles();
            setSelectedProfileName('');
            pushToast(t('profile.deleted', { name: selectedProfileName }), 'success');
        } catch (error) {
            pushToast(t('profile.deleteFailed', { error: formatError(error) }), 'error');
        }
    }, [pushToast, refreshProfiles, selectedProfileName, t]);

    const refreshLogsModal = useCallback(async () => {
        try {
            const content = await getLogs();
            setLogsContent(content || t('logsModal.noLogs'));
        } catch (error) {
            setLogsContent(t('logsModal.loadFailed', { error: formatError(error) }));
        }
    }, [t]);

    const handleOpenLogsModal = useCallback(async () => {
        setLogsModalOpen(true);
        await refreshLogsModal();
    }, [refreshLogsModal]);

    const handleClearLogs = useCallback(async () => {
        try {
            await clearLogs();
            await logClient('logs', 'logs cleared by user', 'warn');
            pushToast(t('logsModal.cleared'), 'success');
            if (logsModalOpen) {
                await refreshLogsModal();
            }
        } catch (error) {
            pushToast(t('logsModal.clearFailed', { error: formatError(error) }), 'error');
        }
    }, [logsModalOpen, pushToast, refreshLogsModal, t]);

    return (
        <div
            className="flex min-h-screen flex-col"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
            <header className="flex items-center justify-between gap-3 px-3 py-2" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex items-center gap-2">
                        <svg
                            className="text-[#b5bac4]"
                            fill="none"
                            height="24"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            width="24"
                        >
                            <rect height="14" rx="2" width="20" x="2" y="3" />
                            <line x1="8" x2="16" y1="21" y2="21" />
                            <line x1="12" x2="12" y1="17" y2="21" />
                        </svg>
                        <h1 className="text-sm font-semibold tracking-tight">{t('app.title')}</h1>
                    </div>
                    <span className="rounded-full bg-[#1d1f24] px-3 py-1 text-[11px] text-[#d7d9de]">
                        {statusSummary}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="input-select text-xs"
                        value={locale}
                        onChange={(event) => setLocale(event.target.value as 'en' | 'es')}
                    >
                        <option value="en">EN</option>
                        <option value="es">ES</option>
                    </select>
                    <button className="btn btn-ghost" type="button" onClick={() => void loadMonitors(true)}>
                        {t('app.refresh')}
                    </button>
                </div>
            </header>

            <section className="border-b border-white/5 bg-[#101115] px-3 py-2">
                <div className="mx-auto flex w-full max-w-350 flex-wrap items-center gap-2">
                    <select
                        className="input-select min-w-50"
                        value={selectedProfileName}
                        onChange={(event) => setSelectedProfileName(event.target.value)}
                    >
                        <option value="">{t('profile.select')}</option>
                        {profiles.map((profile) => (
                            <option key={profile} value={profile}>
                                {profile}
                            </option>
                        ))}
                    </select>
                    <button className="btn btn-secondary" type="button" onClick={() => void handleLoadSelectedProfile()}>
                        {t('profile.load')}
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => setSaveModalOpen(true)}>
                        {t('profile.save')}
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void handleDeleteSelectedProfile()}>
                        {t('profile.delete')}
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => void handleOpenLogsModal()}>
                        {t('profile.logs')}
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => void handleClearLogs()}>
                        {t('profile.clearLogs')}
                    </button>
                </div>
            </section>

            <main className="flex-1 overflow-y-auto px-3 py-3">
                <section className="mx-auto max-w-350">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-[13px] font-bold uppercase tracking-[0.6px]">{t('layout.title')}</h2>
                            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {t('layout.fitGlobal')}
                            </p>
                        </div>
                        <button className="btn btn-secondary" type="button" onClick={() => void handleIdentifyMonitors()}>
                            {t('layout.identify')}
                        </button>
                    </div>

                    {fallbackIdsDetected ? (
                        <p className="mb-3 rounded-md border border-[#d4c6a2]/20 bg-[#1d1a13] px-3 py-2 text-xs text-[#d4c6a2]">
                            {t('layout.diagnosticMode')}
                        </p>
                    ) : null}

                    <MonitorLayout
                        highlightedMonitorId={highlightedMonitorId}
                        monitors={sortedMonitors}
                    />

                    <div ref={gridRef} className="mt-5 grid gap-4 xl:grid-cols-3 md:grid-cols-2">
                        {isLoadingMonitors && !sortedMonitors.length ? (
                            <div
                                className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-white/5 px-6 py-14"
                                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                            >
                                <div className="spinner" />
                                <p>{t('layout.detecting')}</p>
                            </div>
                        ) : null}

                        {!isLoadingMonitors && !sortedMonitors.length ? (
                            <div
                                className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-white/5 px-6 py-14"
                                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                            >
                                <p>{t('layout.noMonitors')}</p>
                            </div>
                        ) : null}

                        {sortedMonitors.map((monitor) => {
                            const draft = drafts[monitor.id] ?? snapshotDraft({
                                imagePath: monitor.currentWallpaper,
                                fitMode: normalizeFitMode(monitor.currentFit),
                            });
                            const source = parseWallpaperSource(draft.imagePath);
                            const previewUrl = source.type === 'image' ? previewCache[source.imagePath] ?? '' : '';
                            return (
                                <MonitorCard
                                    key={monitor.id}
                                    dirty={isMonitorDirty(monitor.id, drafts, baseline)}
                                    draft={draft}
                                    hasPreviewError={Boolean(source.imagePath && previewFailed[source.imagePath])}
                                    highlighted={highlightedMonitorId === monitor.id}
                                    isPreviewLoading={Boolean(source.imagePath && previewPending[source.imagePath])}
                                    monitor={monitor}
                                    previewUrl={previewUrl}
                                    onApply={(monitorId) => void handleApplyMonitor(monitorId)}
                                    onBrowse={(monitorId) => void browseMonitorImage(monitorId)}
                                    onClear={handleClearMonitor}
                                    onEdit={(monitorId) => void handleOpenEditor(monitorId)}
                                    onFitChange={handleFitChange}
                                    onSolidColorChange={handleSolidColorChange}
                                    onSourceChange={(monitorId, nextType) => void handleSourceChange(monitorId, nextType)}
                                />
                            );
                        })}
                    </div>
                </section>
            </main>

            <footer className="flex items-center justify-center px-3 py-3" style={{ background: 'var(--bg-secondary)' }}>
                <button className="btn btn-primary min-w-65 justify-center" type="button" onClick={() => void handleApplyConfiguration()}>
                    {t('apply.button')}
                </button>
            </footer>

            {saveModalOpen ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSaveModalOpen(false)} />
                    <section
                        className="relative w-95 rounded-2xl border border-white/8 p-6 shadow-xl"
                        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
                    >
                        <h2 className="mb-4 text-base font-semibold">{t('saveModal.title')}</h2>
                        <input
                            autoFocus
                            className="input-field"
                            placeholder={t('profile.namePlaceholder')}
                            type="text"
                            value={profileNameInput}
                            onChange={(event) => setProfileNameInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    void handleSaveCurrentProfile();
                                }
                                if (event.key === 'Escape') {
                                    setSaveModalOpen(false);
                                }
                            }}
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button className="btn btn-secondary" type="button" onClick={() => setSaveModalOpen(false)}>
                                {t('saveModal.cancel')}
                            </button>
                            <button className="btn btn-primary" type="button" onClick={() => void handleSaveCurrentProfile()}>
                                {t('saveModal.save')}
                            </button>
                        </div>
                    </section>
                </div>
            ) : null}

            {logsModalOpen ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLogsModalOpen(false)} />
                    <section
                        className="relative flex h-[min(74vh,720px)] w-[min(92vw,980px)] flex-col rounded-2xl border border-white/8 p-6 shadow-xl"
                        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
                    >
                        <h2 className="mb-4 text-base font-semibold">{t('logsModal.title')}</h2>
                        <pre className="logs-view flex-1">{logsContent}</pre>
                        <div className="mt-4 flex justify-end gap-2">
                            <button className="btn btn-secondary" type="button" onClick={() => void refreshLogsModal()}>
                                {t('logsModal.refresh')}
                            </button>
                            <button className="btn btn-primary" type="button" onClick={() => setLogsModalOpen(false)}>
                                {t('logsModal.close')}
                            </button>
                        </div>
                    </section>
                </div>
            ) : null}

            <EditorDialog
                fitMode={activeEditorFitMode}
                monitor={editorState.monitor}
                open={editorState.open}
                resolvePreviewDataUrl={resolvePreviewDataUrl}
                sourceImagePath={editorState.sourceImagePath}
                onClose={() =>
                    setEditorState({
                        open: false,
                        monitor: null,
                        sourceImagePath: '',
                    })
                }
                onPickImage={pickImageForEditor}
                onSave={handleSaveEditedWallpaper}
            />

            {toast ? (
                <div className={`toast toast-${toast.tone}`}>
                    {toast.message}
                </div>
            ) : null}
        </div>
    );
}
