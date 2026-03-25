import { describe, expect, it } from 'vitest';
import type { MonitorInfo } from './types';
import {
  DEFAULT_FIT_MODE,
  FIT_OPTIONS,
  NONE_MARKER,
  SOLID_PREFIX,
  buildApplyConfiguration,
  computeLayoutMonitors,
  countDirtyMonitors,
  createDraftsFromMonitors,
  formatError,
  makeSolidMarker,
  normalizeColorHex,
  normalizeFitMode,
  parseWallpaperSource,
  snapshotDraft,
  updateBaselineAfterSingleApply,
} from './wallpaper';

const monitorFixture: MonitorInfo[] = [
  {
    id: 'DISPLAY1',
    displayIndex: 1,
    name: 'Monitor 1',
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    currentWallpaper: 'first.png',
    currentFit: 'Fill',
  },
  {
    id: 'DISPLAY2',
    displayIndex: 2,
    name: 'Monitor 2',
    width: 2560,
    height: 1440,
    x: 1920,
    y: 0,
    currentWallpaper: NONE_MARKER,
    currentFit: 'Fit',
  },
];

describe('wallpaper helpers', () => {
  it('normalizes fit modes and colors safely', () => {
    expect(normalizeFitMode('Span')).toBe('Span');
    expect(normalizeFitMode('wat')).toBe(DEFAULT_FIT_MODE);
    expect(normalizeColorHex('#AABBCC')).toBe('#aabbcc');
    expect(normalizeColorHex('oops')).toBe('#000000');
    expect(FIT_OPTIONS).toContain('Fill');
  });

  it('parses wallpaper sources', () => {
    expect(parseWallpaperSource('')).toEqual({
      type: 'none',
      color: '#000000',
      imagePath: '',
    });
    expect(parseWallpaperSource(makeSolidMarker('#336699'))).toEqual({
      type: 'solid',
      color: '#336699',
      imagePath: '',
    });
    expect(parseWallpaperSource('image.png')).toEqual({
      type: 'image',
      color: '#000000',
      imagePath: 'image.png',
    });
    expect(makeSolidMarker('#112233')).toBe(`${SOLID_PREFIX}#112233`);
  });

  it('creates drafts and detects dirtiness', () => {
    const drafts = createDraftsFromMonitors(monitorFixture);
    const baseline = createDraftsFromMonitors(monitorFixture);

    expect(countDirtyMonitors(monitorFixture, drafts, baseline)).toBe(0);

    const changed = {
      ...drafts,
      DISPLAY2: snapshotDraft({ imagePath: 'second.png', fitMode: 'Span' }),
    };

    expect(countDirtyMonitors(monitorFixture, changed, baseline)).toBe(1);
  });

  it('builds apply payloads and updates global-fit baseline', () => {
    const drafts = {
      DISPLAY1: snapshotDraft({ imagePath: 'one.png', fitMode: 'Fill' }),
      DISPLAY2: snapshotDraft({ imagePath: NONE_MARKER, fitMode: 'Fit' }),
    };

    expect(buildApplyConfiguration(monitorFixture, drafts)).toEqual([
      { monitorId: 'DISPLAY1', imagePath: 'one.png', fitMode: 'Fill' },
      { monitorId: 'DISPLAY2', imagePath: NONE_MARKER, fitMode: 'Fit' },
    ]);

    expect(
      updateBaselineAfterSingleApply(drafts, 'DISPLAY2', snapshotDraft({ imagePath: NONE_MARKER, fitMode: 'Span' })),
    ).toEqual({
      DISPLAY1: snapshotDraft({ imagePath: 'one.png', fitMode: 'Span' }),
      DISPLAY2: snapshotDraft({ imagePath: NONE_MARKER, fitMode: 'Span' }),
    });
  });

  it('computes stable layout metrics', () => {
    const layout = computeLayoutMonitors(monitorFixture, 800, 200);
    expect(layout).toHaveLength(2);
    expect(layout[0]?.left).toBeLessThan(layout[1]?.left ?? 0);
    expect(layout[0]?.layoutWidth).toBeGreaterThan(50);
  });

  it('formats structured errors cleanly', () => {
    expect(
      formatError({ code: 'validation_error', message: 'Bad input', details: 'missing fit' }),
    ).toBe('Bad input (missing fit)');
    expect(formatError(new Error('Boom'))).toBe('Boom');
  });
});
