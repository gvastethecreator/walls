import { memo, useMemo, useRef } from 'react';
import type { MonitorInfo } from '../lib/types';
import { computeLayoutMonitors } from '../lib/wallpaper';
import { useElementSize } from '../hooks/useElementSize';

interface MonitorLayoutProps {
    monitors: MonitorInfo[];
    highlightedMonitorId: string | null;
}

/** Minimapa de la topología real de pantallas con escalado proporcional. */
export const MonitorLayout = memo(function MonitorLayout({
    monitors,
    highlightedMonitorId,
}: MonitorLayoutProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const size = useElementSize(containerRef);

    const layoutMonitors = useMemo(
        () => computeLayoutMonitors(monitors, size.width, size.height),
        [monitors, size.height, size.width],
    );

    return (
        <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl border border-white/6 bg-[#0a0b0d]"
            style={{ height: '200px' }}
        >
            {layoutMonitors.map((monitor) => {
                const highlighted = highlightedMonitorId === monitor.id;
                return (
                    <div
                        key={monitor.id}
                        className={`absolute flex items-center justify-center rounded-lg border border-white/10 text-[42px] font-semibold text-slate-100 shadow-sm transition ${highlighted
                            ? 'scale-[1.02] bg-slate-400 ring-2 ring-slate-200/35 shadow-[0_0_22px_rgba(144,149,161,0.3)]'
                            : 'bg-[#2a2d35]'
                            }`}
                        style={{
                            left: `${monitor.left}px`,
                            top: `${monitor.top}px`,
                            width: `${monitor.layoutWidth}px`,
                            height: `${monitor.layoutHeight}px`,
                        }}
                    >
                        <span className="absolute left-2 top-1.5 text-[12px] text-white/60">
                            {monitor.width}×{monitor.height}
                        </span>
                        {monitor.displayIndex}
                    </div>
                );
            })}
        </div>
    );
});
