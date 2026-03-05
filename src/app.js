// ============================================
// Wallpaper Manager — Frontend Logic
// ============================================

const TAURI = window.__TAURI__ || {};
const CORE = TAURI.core || {};
const DIALOG = TAURI.dialog || {};

const invoke = typeof CORE.invoke === 'function' ? CORE.invoke : null;

async function openDialog(options) {
  // Preferred path (global dialog API if available)
  if (typeof DIALOG.open === 'function') {
    return DIALOG.open(options);
  }

  // Fallback path (plugin command via invoke)
  if (typeof invoke === 'function') {
    return invoke('plugin:dialog|open', options);
  }

  throw new Error('Tauri dialog API is unavailable');
}

const FIT_OPTIONS = ['Center', 'Tile', 'Stretch', 'Fit', 'Fill', 'Span'];

const NONE_MARKER = '__NONE__';
const SOLID_PREFIX = '__SOLID__:';

// State
let monitors = [];
let currentConfigs = new Map(); // monitorId -> { imagePath, fitMode }
let baselineConfigs = new Map(); // monitorId -> { imagePath, fitMode }
let previewCache = new Map(); // imagePath -> data URL
let previewPending = new Set(); // imagePath
let previewFailed = new Set(); // imagePath

// ============================================
// DOM References
// ============================================

const monitorsContainer = document.getElementById('monitors-container');
const btnApply = document.getElementById('btn-apply');
const btnRefresh = document.getElementById('btn-refresh');
const btnSaveProfile = document.getElementById('btn-save-profile');
const btnLoadProfile = document.getElementById('btn-load-profile');
const btnDeleteProfile = document.getElementById('btn-delete-profile');
const btnViewLogs = document.getElementById('btn-view-logs');
const btnClearLogs = document.getElementById('btn-clear-logs');
const btnIdentify = document.getElementById('btn-identify');
const profileSelect = document.getElementById('profile-select');
const monitorLayout = document.getElementById('monitor-layout');
const topologyWarning = document.getElementById('topology-warning');
const statusSummary = document.getElementById('status-summary');
const saveModal = document.getElementById('save-modal');
const profileNameInput = document.getElementById('profile-name-input');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');
const logsModal = document.getElementById('logs-modal');
const logsContent = document.getElementById('logs-content');
const logsRefresh = document.getElementById('logs-refresh');
const logsClose = document.getElementById('logs-close');

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} visible`;

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.className = `toast hidden`;
  }, 3000);
}

async function logClient(scope, message) {
  try {
    if (typeof invoke !== 'function') return;
    await invoke('log_client_event', { scope, message: String(message) });
  } catch {
    // Logging must never break app flow.
  }
}

function parseWallpaperSource(imagePath) {
  const value = String(imagePath || '');
  if (!value) return { type: 'none', color: '#000000', imagePath: '' };
  if (value === NONE_MARKER) return { type: 'none', color: '#000000', imagePath: '' };
  if (value.startsWith(SOLID_PREFIX)) {
    const color = normalizeColorHex(value.slice(SOLID_PREFIX.length));
    return { type: 'solid', color, imagePath: '' };
  }
  return { type: 'image', color: '#000000', imagePath: value };
}

function normalizeColorHex(color) {
  const raw = String(color || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : '#000000';
}

function normalizeFitMode(fitMode) {
  const candidate = String(fitMode || '').trim();
  return FIT_OPTIONS.includes(candidate) ? candidate : 'Fill';
}

function makeSolidMarker(color) {
  const normalized = normalizeColorHex(color);
  return `${SOLID_PREFIX}${normalized}`;
}

function normalizeFitClass(fitMode) {
  return normalizeFitMode(fitMode).toLowerCase();
}

function normalizeImagePath(path) {
  const source = parseWallpaperSource(path);
  if (source.type === 'none') return NONE_MARKER;
  if (source.type === 'solid') return makeSolidMarker(source.color || '#000000');
  return source.imagePath || '';
}

function snapshotConfig(config) {
  return {
    imagePath: normalizeImagePath(config?.imagePath || ''),
    fitMode: normalizeFitMode(config?.fitMode || 'Fill'),
  };
}

function setBaselineFromMonitors() {
  baselineConfigs.clear();
  monitors.forEach((m) => {
    baselineConfigs.set(m.id, snapshotConfig({
      imagePath: m.current_wallpaper || NONE_MARKER,
      fitMode: m.current_fit || 'Fill',
    }));
  });
}

function setBaselineFromCurrent() {
  baselineConfigs.clear();
  for (const [id, config] of currentConfigs) {
    baselineConfigs.set(id, snapshotConfig(config));
  }
}

function isMonitorDirty(monitorId) {
  const current = snapshotConfig(currentConfigs.get(monitorId) || {});
  const baseline = snapshotConfig(baselineConfigs.get(monitorId) || {});
  return current.imagePath !== baseline.imagePath || current.fitMode !== baseline.fitMode;
}

function getDirtyCount() {
  let count = 0;
  for (const m of monitors) {
    if (isMonitorDirty(m.id)) count += 1;
  }
  return count;
}

function renderStatusSummary() {
  if (!statusSummary) return;
  const dirtyCount = getDirtyCount();
  const monitorsCount = monitors.length;
  statusSummary.textContent = dirtyCount > 0
    ? `${monitorsCount} displays · ${dirtyCount} pending change${dirtyCount > 1 ? 's' : ''}`
    : `${monitorsCount} displays · all applied`;
}

async function requestPreviewDataUrl(imagePath) {
  if (!imagePath || previewCache.has(imagePath) || previewPending.has(imagePath) || previewFailed.has(imagePath)) {
    return;
  }
  if (typeof invoke !== 'function') return;

  previewPending.add(imagePath);
  try {
    await logClient('preview', `request preview for ${imagePath}`);
    const dataUrl = await invoke('get_image_data_url', { imagePath });
    if (dataUrl && typeof dataUrl === 'string') {
      previewCache.set(imagePath, dataUrl);
      await logClient('preview', `preview ready for ${imagePath}`);
    } else {
      previewFailed.add(imagePath);
      await logClient('preview', `preview empty for ${imagePath}`);
    }
  } catch (err) {
    previewFailed.add(imagePath);
    await logClient('preview', `preview error for ${imagePath}: ${err?.message || err}`);
  } finally {
    previewPending.delete(imagePath);
    renderMonitors();
  }
}

function queuePreviewRequests() {
  for (const monitor of monitors) {
    const config = currentConfigs.get(monitor.id);
    if (!config?.imagePath) continue;
    const source = parseWallpaperSource(config.imagePath);
    if (source.type === 'image' && source.imagePath) {
      void requestPreviewDataUrl(source.imagePath);
    }
  }
}

window.handlePreviewError = function(imgElement) {
  if (!imgElement) return;
  const preview = imgElement.closest('.monitor-preview');
  if (preview) {
    preview.classList.add('preview-fallback');
  }
  imgElement.style.display = 'none';
  const src = imgElement?.getAttribute('src') || '';
  logClient('preview', `image load failed: ${src}`);
};

window.addEventListener('error', (event) => {
  logClient('window-error', `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
});

window.addEventListener('unhandledrejection', (event) => {
  logClient('unhandled-rejection', `${event.reason?.message || event.reason || 'unknown rejection'}`);
});

// ============================================
// Monitor Rendering
// ============================================

function renderMonitors() {
  if (monitors.length === 0) {
    monitorsContainer.innerHTML = `
      <div class="loading-state">
        <p>No monitors detected</p>
      </div>`;
    return;
  }

  monitorsContainer.innerHTML = monitors.map((monitor, i) => {
    const config = currentConfigs.get(monitor.id) || {
      imagePath: monitor.current_wallpaper || '',
      fitMode: normalizeFitMode(monitor.current_fit),
    };

    config.fitMode = normalizeFitMode(config.fitMode);

    // Ensure config is synced to state
    currentConfigs.set(monitor.id, config);

    const source = parseWallpaperSource(config.imagePath);
    const hasImage = source.type === 'image' && source.imagePath.length > 0;
    const imgSrc = hasImage ? (previewCache.get(source.imagePath) || '') : '';
    const isLoadingPreview = hasImage && !imgSrc && !previewFailed.has(source.imagePath);

    const fitOptionsHtml = FIT_OPTIONS.map(opt =>
      `<option value="${opt}" ${config.fitMode === opt ? 'selected' : ''}>${opt}</option>`
    ).join('');

    const monitorNumber = Number.isFinite(monitor.display_index) ? monitor.display_index : (i + 1);
    const aspectStyle = `--monitor-aspect: ${Math.max(1, monitor.width)} / ${Math.max(1, monitor.height)};`;
    const dirty = isMonitorDirty(monitor.id);
    const fitClass = normalizeFitClass(config.fitMode);

    let imagePreviewHtml = '';
    if (hasImage && imgSrc) {
      if (fitClass === 'tile') {
        imagePreviewHtml = `
          <div class="preview-tile" style="background-image:url('${imgSrc}')"></div>
          <div class="overlay"><span class="overlay-text">Browse Image</span></div>
        `;
      } else {
        imagePreviewHtml = `
          <img class="preview-image preview-fit-${fitClass}" src="${imgSrc}" alt="Wallpaper preview" onerror="window.handlePreviewError(this)" />
          <div class="overlay"><span class="overlay-text">Browse Image</span></div>
        `;
      }
    }

    return `
      <div class="monitor-card ${dirty ? 'dirty' : ''}" data-monitor-id="${monitor.id}" data-monitor-number="${monitorNumber}">
        <div class="monitor-card-header">
          <div class="monitor-label">
            <span class="monitor-index">${monitorNumber}</span>
            <span class="monitor-name">${monitor.name}</span>
            ${dirty ? '<span class="dirty-badge">Pending</span>' : ''}
          </div>
          <span class="monitor-position">x:${monitor.x} y:${monitor.y}</span>
        </div>

          <div class="monitor-preview ${(!hasImage || !imgSrc) ? 'preview-fallback' : ''}" style="${aspectStyle}" data-action="browse" data-monitor-id="${monitor.id}">
            ${source.type === 'solid'
              ? `<div class="fallback-gradient" style="background: ${source.color};"></div>
                 <div class="fallback-label">Solid Color ${source.color}</div>
                 <div class="overlay"><span class="overlay-text">Browse Image</span></div>`
              : source.type === 'none'
              ? `<div class="fallback-gradient"></div>
                 <div class="fallback-label">No Background</div>
                 <div class="overlay"><span class="overlay-text">Browse Image</span></div>`
              : hasImage
            ? (imgSrc
               ? imagePreviewHtml
               : `<div class="fallback-gradient"></div>
                 <div class="fallback-label">${isLoadingPreview ? 'Loading preview...' : 'No preview available'}</div>
                 <div class="overlay"><span class="overlay-text">Browse Image</span></div>`)
            : `<div class="fallback-gradient"></div>
               <div class="fallback-label">No wallpaper detected</div>
               <div class="placeholder">
                 <span>Browse Image</span>
               </div>
               <div class="overlay"><span class="overlay-text">Browse Image</span></div>`
          }
        </div>

        <div class="monitor-controls">
            <div class="fit-group fit-group-bg">
              <span class="fit-label">BG</span>
              <select class="select source-select" data-monitor-id="${monitor.id}">
                <option value="image" ${source.type === 'image' ? 'selected' : ''}>Image</option>
                <option value="solid" ${source.type === 'solid' ? 'selected' : ''}>Solid Color</option>
                <option value="none" ${source.type === 'none' ? 'selected' : ''}>No Background</option>
              </select>
              ${source.type === 'solid'
                ? `<input type="color" class="solid-color-input" data-monitor-id="${monitor.id}" value="${source.color}" />`
                : ''}
            </div>
          <div class="fit-group fit-group-fit">
            <span class="fit-label">Fit</span>
            <select class="select fit-select" data-monitor-id="${monitor.id}">
              ${fitOptionsHtml}
            </select>
          </div>
          <div class="monitor-actions">
            <button class="btn btn-sm btn-danger btn-clear" data-action="clear" data-monitor-id="${monitor.id}" ${source.type === 'none' ? 'disabled' : ''}>
              Clear
            </button>
            <button class="btn btn-sm btn-secondary btn-monitor-apply" data-action="apply-monitor" data-monitor-id="${monitor.id}">
              Apply Monitor
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Attach event listeners
  attachMonitorEvents();
  renderMonitorLayout();
  queuePreviewRequests();
  renderStatusSummary();
}

function renderMonitorLayout() {
  if (!monitorLayout) return;
  if (monitors.length === 0) {
    monitorLayout.innerHTML = '';
    return;
  }

  const minX = Math.min(...monitors.map(m => m.x));
  const minY = Math.min(...monitors.map(m => m.y));
  const maxX = Math.max(...monitors.map(m => m.x + m.width));
  const maxY = Math.max(...monitors.map(m => m.y + m.height));

  const virtualWidth = Math.max(1, maxX - minX);
  const virtualHeight = Math.max(1, maxY - minY);

  const bounds = monitorLayout.getBoundingClientRect();
  const pad = 12;
  const scaleX = (bounds.width - pad * 2) / virtualWidth;
  const scaleY = (bounds.height - pad * 2) / virtualHeight;
  const scale = Math.max(0.02, Math.min(scaleX, scaleY));
  const contentWidth = virtualWidth * scale;
  const contentHeight = virtualHeight * scale;
  const offsetX = Math.max(pad, (bounds.width - contentWidth) / 2);
  const offsetY = Math.max(pad, (bounds.height - contentHeight) / 2);
  const gap = 2;

  monitorLayout.innerHTML = monitors.map((monitor, i) => {
    const number = Number.isFinite(monitor.display_index) ? monitor.display_index : (i + 1);
    const left = Math.round((monitor.x - minX) * scale + offsetX + gap / 2);
    const top = Math.round((monitor.y - minY) * scale + offsetY + gap / 2);
    const width = Math.max(54, Math.round(monitor.width * scale) - gap);
    const height = Math.max(36, Math.round(monitor.height * scale) - gap);

    return `
      <div
        class="layout-monitor"
        data-monitor-id="${monitor.id}"
        data-monitor-number="${number}"
        style="left:${left}px;top:${top}px;width:${width}px;height:${height}px;"
      >
        <span class="layout-label">${monitor.width}×${monitor.height}</span>
        ${number}
      </div>
    `;
  }).join('');
}

async function identifyMonitors() {
  if (!monitors.length) {
    showToast('No monitors detected', 'error');
    return;
  }

  try {
    await invoke('identify_monitors');
    showToast('Showing monitor overlays', 'success');
  } catch {
    const ordered = [...monitors].sort((a, b) => {
      const na = Number.isFinite(a.display_index) ? a.display_index : Number.MAX_SAFE_INTEGER;
      const nb = Number.isFinite(b.display_index) ? b.display_index : Number.MAX_SAFE_INTEGER;
      return na - nb;
    });

    showToast('Overlay unavailable, using in-app highlight', 'error');
    for (const monitor of ordered) {
      const id = String(monitor.id);
      const number = Number.isFinite(monitor.display_index) ? monitor.display_index : '?';

      document.querySelector(`.layout-monitor[data-monitor-id="${CSS.escape(id)}"]`)?.classList.add('identify-active');
      document.querySelector(`.monitor-card[data-monitor-id="${CSS.escape(id)}"]`)?.classList.add('identify-active');
      showToast(`Display ${number}`, 'success');

      await new Promise(resolve => setTimeout(resolve, 700));

      document.querySelector(`.layout-monitor[data-monitor-id="${CSS.escape(id)}"]`)?.classList.remove('identify-active');
      document.querySelector(`.monitor-card[data-monitor-id="${CSS.escape(id)}"]`)?.classList.remove('identify-active');
    }
  }
}

function attachMonitorEvents() {
  // Browse image click
  document.querySelectorAll('[data-action="browse"]').forEach(el => {
    el.addEventListener('click', () => browseImage(el.dataset.monitorId));
  });

  // Clear image
  document.querySelectorAll('[data-action="clear"]').forEach(el => {
    el.addEventListener('click', () => clearImage(el.dataset.monitorId));
  });

  // Apply one monitor
  document.querySelectorAll('[data-action="apply-monitor"]').forEach(el => {
    el.addEventListener('click', () => applySingleMonitor(el.dataset.monitorId));
  });

  // Fit mode change
  document.querySelectorAll('.fit-select').forEach(el => {
    el.addEventListener('change', (e) => {
      const monitorId = el.dataset.monitorId;
      const config = currentConfigs.get(monitorId);
      if (config) {
        // Windows IDesktopWallpaper fit is global.
        // Keep all monitor configs aligned to avoid misleading per-monitor state.
        const nextFit = normalizeFitMode(e.target.value);
        for (const [, cfg] of currentConfigs) {
          cfg.fitMode = nextFit;
        }
        renderMonitors();
      }
    });
  });

  // Source type change
  document.querySelectorAll('.source-select').forEach(el => {
    el.addEventListener('change', async (e) => {
      const monitorId = el.dataset.monitorId;
      const config = currentConfigs.get(monitorId);
      if (!config) return;

      const nextType = e.target.value;
      const currentSource = parseWallpaperSource(config.imagePath);

      if (nextType === 'image') {
        const previousRaw = config.imagePath;
        config.imagePath = currentSource.type === 'image' ? currentSource.imagePath : '';
        renderMonitors();
        if (!config.imagePath) {
          const selected = await browseImage(monitorId);
          if (!selected) {
            config.imagePath = previousRaw;
            renderMonitors();
          }
        }
        return;
      }

      if (nextType === 'solid') {
        config.imagePath = makeSolidMarker(
          currentSource.type === 'solid' ? (currentSource.color || '#000000') : '#000000'
        );
        renderMonitors();
        return;
      }

      config.imagePath = NONE_MARKER;
      renderMonitors();
    });
  });

  // Solid color picker
  document.querySelectorAll('.solid-color-input').forEach(el => {
    el.addEventListener('input', (e) => {
      const monitorId = el.dataset.monitorId;
      const config = currentConfigs.get(monitorId);
      if (!config) return;
      config.imagePath = makeSolidMarker(e.target.value);
      renderMonitors();
    });
  });
}

// ============================================
// Image Operations
// ============================================

async function browseImage(monitorId) {
  try {
    await logClient('browse', `open dialog for monitor ${monitorId}`);
    const result = await openDialog({
      title: 'Select Wallpaper Image',
      filters: [{
        name: 'Images',
        extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp', 'tif', 'tiff']
      }],
      multiple: false,
    });

    if (result) {
      const path = typeof result === 'string' ? result : (result.path || result);
      if (path) {
        await logClient('browse', `selected image for monitor ${monitorId}: ${path}`);
        const config = currentConfigs.get(monitorId) || { imagePath: '', fitMode: 'Fill' };
        const previousPath = config.imagePath;
        if (previousPath && previousPath !== path) {
          previewCache.delete(previousPath);
          previewPending.delete(previousPath);
          previewFailed.delete(previousPath);
        }
        config.imagePath = path;
        currentConfigs.set(monitorId, config);
        previewFailed.delete(path);
        renderMonitors();
        void requestPreviewDataUrl(path);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Browse error:', err);
    await logClient('browse', `dialog error: ${err?.message || err}`);
    showToast(`Failed to open file dialog: ${err?.message || err}`, 'error');
    return false;
  }
}

async function applySingleMonitor(monitorId) {
  if (typeof invoke !== 'function') {
    showToast('Tauri API not available', 'error');
    return;
  }
  const config = currentConfigs.get(monitorId);
  if (!config?.imagePath) {
    showToast('No wallpaper configured for this monitor', 'error');
    return;
  }
  try {
    await logClient('apply', `apply_wallpaper start: ${monitorId}`);
    await invoke('apply_wallpaper', {
      monitorId,
      imagePath: config.imagePath,
      fitMode: normalizeFitMode(config.fitMode),
    });

    // Single-monitor apply also sets global fit in Windows; sync baseline fit for all.
    const fit = normalizeFitMode(config.fitMode);
    for (const [id, base] of baselineConfigs) {
      baselineConfigs.set(id, snapshotConfig({ imagePath: base.imagePath, fitMode: fit }));
    }
    baselineConfigs.set(monitorId, snapshotConfig(config));

    await logClient('apply', `apply_wallpaper success: ${monitorId}`);
    showToast('Monitor applied successfully', 'success');
    renderMonitors();
  } catch (err) {
    await logClient('apply', `apply_wallpaper error (${monitorId}): ${err?.message || err}`);
    showToast(`Apply monitor failed: ${err}`, 'error');
  }
}

function clearImage(monitorId) {
  const config = currentConfigs.get(monitorId);
  if (config) {
    if (config.imagePath) {
      previewCache.delete(config.imagePath);
      previewPending.delete(config.imagePath);
      previewFailed.delete(config.imagePath);
    }
    config.imagePath = NONE_MARKER;
    renderMonitors();
  }
}

// ============================================
// Monitor Detection
// ============================================

async function loadMonitors(options = {}) {
  const { preserveLocal = false } = options;

  if (typeof invoke !== 'function') {
    monitorsContainer.innerHTML = `
      <div class="loading-state">
        <p style="color: var(--danger)">Tauri API not available. Reload the app.</p>
      </div>`;
    return;
  }

  monitorsContainer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Detecting monitors...</p>
    </div>`;

  try {
    await logClient('monitors', 'get_monitors invoke start');
    monitors = await invoke('get_monitors');
    monitors.sort((a, b) => {
      const na = Number.isFinite(a.display_index) ? a.display_index : Number.MAX_SAFE_INTEGER;
      const nb = Number.isFinite(b.display_index) ? b.display_index : Number.MAX_SAFE_INTEGER;
      return na - nb;
    });
    await logClient('monitors', `get_monitors ok: ${monitors.length} monitors`);

    const hasFallbackIds = monitors.some(m => (m.id || '').startsWith('GDI_MONITOR_'));
    if (topologyWarning) {
      if (hasFallbackIds) {
        topologyWarning.classList.remove('hidden');
        topologyWarning.textContent = 'Diagnostic mode: Windows did not return monitor IDs. You can preview layout, but per-monitor apply is limited in this session.';
      } else {
        topologyWarning.classList.add('hidden');
        topologyWarning.textContent = '';
      }
    }

    // Remove stale monitor configs that no longer exist (e.g. unplugged display)
    const activeIds = new Set(monitors.map(m => m.id));
    for (const monitorId of currentConfigs.keys()) {
      if (!activeIds.has(monitorId)) {
        currentConfigs.delete(monitorId);
      }
    }

    // Always refresh from backend unless we explicitly want to preserve local edits.
    monitors.forEach(m => {
      const hasLocal = currentConfigs.has(m.id);
      if (!preserveLocal || !hasLocal) {
        currentConfigs.set(m.id, {
          imagePath: m.current_wallpaper || '',
          fitMode: normalizeFitMode(m.current_fit),
        });
      }
    });

    if (!preserveLocal || baselineConfigs.size === 0) {
      setBaselineFromMonitors();
    }

    renderMonitors();
  } catch (err) {
    console.error('Monitor detection failed:', err);
    await logClient('monitors', `get_monitors error: ${err?.message || err}`);
    monitorsContainer.innerHTML = `
      <div class="loading-state">
        <p style="color: var(--danger)">Failed to detect monitors: ${err}</p>
      </div>`;
  }
}

// ============================================
// Apply Configuration
// ============================================

async function applyConfiguration() {
  if (typeof invoke !== 'function') {
    showToast('Tauri API not available', 'error');
    return;
  }

  const configs = [];

  const hasFallbackIds = monitors.some(m => (m.id || '').startsWith('GDI_MONITOR_'));
  if (hasFallbackIds) {
    showToast('Windows did not provide monitor IDs (IDesktopWallpaper). Cannot apply per-monitor wallpaper on this session.', 'error');
    return;
  }

  for (const monitor of monitors) {
    const monitorId = monitor.id;
    const config = currentConfigs.get(monitorId);
    if (config?.imagePath) {
      configs.push({
        monitor_id: monitorId,
        image_path: config.imagePath,
        fit_mode: normalizeFitMode(config.fitMode),
      });
    }
  }

  if (configs.length === 0) {
    showToast('No wallpapers configured', 'error');
    return;
  }

  try {
    await logClient('apply', `apply_configuration start: ${configs.length} configs`);
    await invoke('apply_configuration', { configs });
    await logClient('apply', 'apply_configuration success');
    setBaselineFromCurrent();
    showToast('Configuration applied successfully!', 'success');
    renderMonitors();
  } catch (err) {
    console.error('Apply failed:', err);
    await logClient('apply', `apply_configuration error: ${err?.message || err}`);
    showToast(`Apply failed: ${err}`, 'error');
  }
}

async function refreshLogsModal() {
  if (typeof invoke !== 'function') {
    logsContent.textContent = 'Tauri API not available.';
    return;
  }
  try {
    const content = await invoke('get_logs');
    logsContent.textContent = content || 'No logs yet.';
  } catch (err) {
    logsContent.textContent = `Failed to load logs: ${err?.message || err}`;
  }
}

async function openLogsModal() {
  logsModal.classList.remove('hidden');
  await refreshLogsModal();
}

function closeLogsModal() {
  logsModal.classList.add('hidden');
}

async function clearLogsHandler() {
  if (typeof invoke !== 'function') {
    showToast('Tauri API not available', 'error');
    return;
  }
  try {
    await invoke('clear_logs');
    await logClient('logs', 'logs cleared by user');
    showToast('Logs cleared', 'success');
    if (!logsModal.classList.contains('hidden')) {
      await refreshLogsModal();
    }
  } catch (err) {
    showToast(`Failed to clear logs: ${err?.message || err}`, 'error');
  }
}

// ============================================
// Profile Management
// ============================================

async function refreshProfiles() {
  if (typeof invoke !== 'function') return;

  try {
    const profiles = await invoke('list_profiles');
    profileSelect.innerHTML = '<option value="">— Select Profile —</option>';
    profiles.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      profileSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('List profiles failed:', err);
  }
}

async function loadSelectedProfile() {
  if (typeof invoke !== 'function') {
    showToast('Tauri API not available', 'error');
    return;
  }

  const name = profileSelect.value;
  if (!name) {
    showToast('Select a profile first', 'error');
    return;
  }

  try {
    const profile = await invoke('load_profile', { name });

    // Update configs from profile
    currentConfigs.clear();
    const activeIds = new Set(monitors.map(m => m.id));
    profile.monitors.forEach(m => {
      if (!activeIds.has(m.monitorId)) return;
      currentConfigs.set(m.monitorId, {
        imagePath: m.imagePath,
        fitMode: normalizeFitMode(m.fitMode),
      });
    });

    renderMonitors();
    showToast(`Profile "${name}" loaded`, 'success');
  } catch (err) {
    console.error('Load profile failed:', err);
    showToast(`Load failed: ${err}`, 'error');
  }
}

function openSaveModal() {
  saveModal.classList.remove('hidden');
  profileNameInput.value = '';
  profileNameInput.focus();
}

function closeSaveModal() {
  saveModal.classList.add('hidden');
}

async function saveCurrentProfile() {
  if (typeof invoke !== 'function') {
    showToast('Tauri API not available', 'error');
    return;
  }

  const name = profileNameInput.value.trim();
  if (!name) {
    showToast('Enter a profile name', 'error');
    return;
  }

  const monitorsList = [];
  for (const [monitorId, config] of currentConfigs) {
    monitorsList.push({
      monitorId,
      imagePath: config.imagePath,
      fitMode: config.fitMode,
    });
  }

  try {
    await invoke('save_profile', { name, monitors: monitorsList });
    closeSaveModal();
    showToast(`Profile "${name}" saved`, 'success');
    await refreshProfiles();
  } catch (err) {
    console.error('Save profile failed:', err);
    showToast(`Save failed: ${err}`, 'error');
  }
}

async function deleteSelectedProfile() {
  if (typeof invoke !== 'function') {
    showToast('Tauri API not available', 'error');
    return;
  }

  const name = profileSelect.value;
  if (!name) {
    showToast('Select a profile to delete', 'error');
    return;
  }

  try {
    await invoke('delete_profile', { name });
    showToast(`Profile "${name}" deleted`, 'success');
    await refreshProfiles();
  } catch (err) {
    console.error('Delete profile failed:', err);
    showToast(`Delete failed: ${err}`, 'error');
  }
}

// ============================================
// Event Listeners
// ============================================

btnApply.addEventListener('click', applyConfiguration);
btnRefresh.addEventListener('click', loadMonitors);
btnSaveProfile.addEventListener('click', openSaveModal);
btnLoadProfile.addEventListener('click', loadSelectedProfile);
btnDeleteProfile.addEventListener('click', deleteSelectedProfile);
btnViewLogs.addEventListener('click', openLogsModal);
btnClearLogs.addEventListener('click', clearLogsHandler);
if (btnIdentify) {
  btnIdentify.addEventListener('click', identifyMonitors);
}
modalCancel.addEventListener('click', closeSaveModal);
modalSave.addEventListener('click', saveCurrentProfile);
logsRefresh.addEventListener('click', refreshLogsModal);
logsClose.addEventListener('click', closeLogsModal);
window.addEventListener('resize', renderMonitorLayout);

// Close modal on backdrop click
saveModal.querySelector('.modal-backdrop').addEventListener('click', closeSaveModal);
logsModal.querySelector('.modal-backdrop').addEventListener('click', closeLogsModal);

// Enter key in modal input
profileNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveCurrentProfile();
  if (e.key === 'Escape') closeSaveModal();
});

// ============================================
// Init
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadMonitors({ preserveLocal: false });
  await refreshProfiles();
  renderStatusSummary();
});
