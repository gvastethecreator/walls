import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type WheelEvent as ReactWheelEvent,
} from 'react';
import { useI18n } from '../i18n';
import type { FitMode, MonitorInfo } from '../lib/types';
import { formatError, normalizeColorHex } from '../lib/wallpaper';

interface EditorDialogProps {
    open: boolean;
    monitor: MonitorInfo | null;
    fitMode: FitMode;
    sourceImagePath: string;
    onClose: () => void;
    onPickImage: () => Promise<string | null>;
    resolvePreviewDataUrl: (imagePath: string) => Promise<string>;
    onSave: (payload: { monitorId: string; fitMode: FitMode; dataUrl: string }) => Promise<void>;
}

interface DragState {
    active: boolean;
    lastX: number;
    lastY: number;
}

const DEFAULT_TINT = '#ff7b00';

function clampLocal(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function hexToRgba(hex: string, alpha: number): string {
    const normalized = normalizeColorHex(hex).slice(1);
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${clampLocal(alpha, 0, 1)})`;
}

async function loadBrowserImage(dataUrl: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.decoding = 'async';

    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Editor image failed to load'));
        image.src = dataUrl;
    });

    return image;
}

/** Editor no destructivo basado en canvas para preparar un PNG ya ajustado al monitor. */
export function EditorDialog({
    open,
    monitor,
    fitMode,
    sourceImagePath,
    onClose,
    onPickImage,
    resolvePreviewDataUrl,
    onSave,
}: EditorDialogProps) {
    const { t } = useI18n();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dragRef = useRef<DragState>({ active: false, lastX: 0, lastY: 0 });

    const [workingImagePath, setWorkingImagePath] = useState(sourceImagePath);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [scale, setScale] = useState(1);
    const [rotationDeg, setRotationDeg] = useState(0);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [hue, setHue] = useState(0);
    const [blur, setBlur] = useState(0);
    const [tintColor, setTintColor] = useState(DEFAULT_TINT);
    const [tintStrength, setTintStrength] = useState(0);

    const canvasWidth = Math.max(1, monitor?.width ?? 1920);
    const canvasHeight = Math.max(1, monitor?.height ?? 1080);

    const resetAdjustments = useCallback(
        (nextImage = image) => {
            setOffsetX(0);
            setOffsetY(0);
            setRotationDeg(0);
            setBrightness(100);
            setContrast(100);
            setSaturation(100);
            setHue(0);
            setBlur(0);
            setTintColor(DEFAULT_TINT);
            setTintStrength(0);

            if (nextImage) {
                const fitScale = Math.max(
                    canvasWidth / Math.max(1, nextImage.width),
                    canvasHeight / Math.max(1, nextImage.height),
                );
                setScale(clampLocal(fitScale, 0.2, 8));
            } else {
                setScale(1);
            }
        },
        [canvasHeight, canvasWidth, image],
    );

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) {
            return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);

        if (!image) {
            context.fillStyle = '#9aa0ad';
            context.font = '16px Segoe UI';
            context.textAlign = 'center';
            context.fillText(t('editor.noImagePrompt'), canvas.width / 2, canvas.height / 2);
            return;
        }

        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;

        context.save();
        context.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg) blur(${blur}px)`;
        context.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
        context.rotate((rotationDeg * Math.PI) / 180);
        context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        context.restore();

        if (tintStrength > 0) {
            context.fillStyle = hexToRgba(tintColor, tintStrength / 100);
            context.fillRect(0, 0, canvas.width, canvas.height);
        }
    }, [blur, brightness, contrast, hue, image, offsetX, offsetY, rotationDeg, saturation, scale, t, tintColor, tintStrength]);

    const loadImagePath = useCallback(
        async (path: string) => {
            if (!path) {
                setImage(null);
                setWorkingImagePath('');
                return;
            }

            setIsLoading(true);
            setErrorMessage('');
            try {
                const dataUrl = await resolvePreviewDataUrl(path);
                const nextImage = await loadBrowserImage(dataUrl);
                setImage(nextImage);
                setWorkingImagePath(path);
                resetAdjustments(nextImage);
            } catch (error) {
                setErrorMessage(formatError(error));
                setImage(null);
            } finally {
                setIsLoading(false);
            }
        },
        [resetAdjustments, resolvePreviewDataUrl],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        void loadImagePath(sourceImagePath);
    }, [loadImagePath, open, sourceImagePath]);

    useEffect(() => {
        if (!open) {
            return;
        }
        drawCanvas();
    }, [drawCanvas, open]);

    const title = useMemo(() => {
        if (!monitor) {
            return t('editor.title');
        }
        return t('editor.titleMonitor', { name: monitor.name });
    }, [monitor, t]);

    const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        dragRef.current = {
            active: true,
            lastX: event.clientX,
            lastY: event.clientY,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!dragRef.current.active) {
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const bounds = canvas.getBoundingClientRect();
        const ratioX = canvas.width / Math.max(1, bounds.width);
        const ratioY = canvas.height / Math.max(1, bounds.height);
        const deltaX = (event.clientX - dragRef.current.lastX) * ratioX;
        const deltaY = (event.clientY - dragRef.current.lastY) * ratioY;

        dragRef.current.lastX = event.clientX;
        dragRef.current.lastY = event.clientY;
        setOffsetX((value: number) => value + deltaX);
        setOffsetY((value: number) => value + deltaY);
    };

    const stopDragging = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!dragRef.current.active) {
            return;
        }

        dragRef.current.active = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.05 : 0.95;
        setScale((value: number) => clampLocal(value * factor, 0.2, 8));
    };

    const handlePickAnotherImage = async () => {
        const nextPath = await onPickImage();
        if (!nextPath) {
            return;
        }
        await loadImagePath(nextPath);
    };

    const handleSave = async () => {
        if (!canvasRef.current || !monitor) {
            return;
        }

        setIsSaving(true);
        setErrorMessage('');
        try {
            await onSave({
                monitorId: monitor.id,
                fitMode,
                dataUrl: canvasRef.current.toDataURL('image/png'),
            });
            onClose();
        } catch (error) {
            setErrorMessage(formatError(error));
        } finally {
            setIsSaving(false);
        }
    };

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <section
                className="relative flex h-[min(88vh,860px)] w-[min(96vw,1220px)] flex-col gap-3 rounded-2xl border border-white/8 p-5 shadow-xl"
                style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
            >
                <header className="flex items-baseline justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold">{title}</h2>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {t('editor.dragToMove')}
                        </p>
                    </div>
                    <span
                        className="rounded-full bg-white/5 px-3 py-1 text-[11px]"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {t('editor.fitMode', { mode: fitMode })}
                    </span>
                </header>

                <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-xl border border-[#262a33] bg-[#101217]">
                        <canvas
                            ref={canvasRef}
                            className={`max-h-full max-w-full bg-black ${dragRef.current.active ? 'cursor-grabbing' : 'cursor-grab'}`}
                            height={canvasHeight}
                            width={canvasWidth}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={stopDragging}
                            onPointerCancel={stopDragging}
                            onPointerLeave={stopDragging}
                            onWheel={handleWheel}
                        />
                    </div>

                    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-xl border border-[#272c36] bg-[#12141a] p-3">
                        <button className="btn btn-secondary" type="button" onClick={() => void handlePickAnotherImage()}>
                            {t('editor.chooseImage')}
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => resetAdjustments()}>
                            {t('editor.reset')}
                        </button>

                        <label className="editor-control">
                            <span>{t('editor.zoom')}</span>
                            <input type="range" min="20" max="300" step="1" value={Math.round(scale * 100)} onChange={(event) => setScale(clampLocal(Number(event.target.value) / 100, 0.2, 8))} />
                        </label>
                        <label className="editor-control">
                            <span>{t('editor.rotation')}</span>
                            <input type="range" min="-180" max="180" step="1" value={rotationDeg} onChange={(event) => setRotationDeg(Number(event.target.value))} />
                        </label>
                        <label className="editor-control">
                            <span>{t('editor.brightness')}</span>
                            <input type="range" min="0" max="200" step="1" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} />
                        </label>
                        <label className="editor-control">
                            <span>{t('editor.contrast')}</span>
                            <input type="range" min="0" max="200" step="1" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} />
                        </label>
                        <label className="editor-control">
                            <span>{t('editor.saturation')}</span>
                            <input type="range" min="0" max="200" step="1" value={saturation} onChange={(event) => setSaturation(Number(event.target.value))} />
                        </label>
                        <label className="editor-control">
                            <span>{t('editor.hue')}</span>
                            <input type="range" min="-180" max="180" step="1" value={hue} onChange={(event) => setHue(Number(event.target.value))} />
                        </label>
                        <label className="editor-control">
                            <span>{t('editor.blur')}</span>
                            <input type="range" min="0" max="12" step="0.1" value={blur} onChange={(event) => setBlur(Number(event.target.value))} />
                        </label>
                        <label className="editor-control">
                            <span>{t('editor.tint')}</span>
                            <input type="color" value={tintColor} onChange={(event) => setTintColor(normalizeColorHex(event.target.value))} />
                        </label>
                        <label className="editor-control">
                            <span>{t('editor.tintStrength')}</span>
                            <input type="range" min="0" max="100" step="1" value={tintStrength} onChange={(event) => setTintStrength(Number(event.target.value))} />
                        </label>
                    </aside>
                </div>

                {isLoading ? (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {t('editor.loading')}
                    </p>
                ) : null}
                {workingImagePath ? (
                    <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {t('editor.source', { path: workingImagePath })}
                    </p>
                ) : null}
                {errorMessage ? <p className="text-xs text-rose-300">{errorMessage}</p> : null}

                <div className="flex justify-end gap-2">
                    <button className="btn btn-secondary" type="button" onClick={onClose}>
                        {t('editor.cancel')}
                    </button>
                    <button className="btn btn-primary" disabled={isLoading || isSaving || !image} type="button" onClick={() => void handleSave()}>
                        {isSaving ? t('editor.saving') : t('editor.saveApply')}
                    </button>
                </div>
            </section>
        </div>
    );
}
