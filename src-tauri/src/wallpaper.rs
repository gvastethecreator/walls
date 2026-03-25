use crate::{
    error::{AppError, AppResult},
    logger,
};
use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::fs;
use std::os::windows::ffi::OsStringExt;
use std::path::{Path, PathBuf};
use windows::core::{HSTRING, PCWSTR};
use windows::Win32::Foundation::LPARAM;
use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::{
    EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFOEXW,
};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_APARTMENTTHREADED,
    COINIT_MULTITHREADED,
};
use windows::Win32::UI::Shell::{
    DesktopWallpaper, IDesktopWallpaper, DESKTOP_WALLPAPER_POSITION,
    DWPOS_CENTER, DWPOS_FILL, DWPOS_FIT, DWPOS_SPAN, DWPOS_STRETCH, DWPOS_TILE,
};

const NONE_MARKER: &str = "__NONE__";
const SOLID_PREFIX: &str = "__SOLID__:";
const GDI_FALLBACK_PREFIX: &str = "GDI_MONITOR_";

/// Estado detectado para un monitor individual.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub id: String,
    pub display_index: u32,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub current_wallpaper: String,
    pub current_fit: String,
}

fn is_supported_fit_mode(value: &str) -> bool {
    matches!(value, "Center" | "Tile" | "Stretch" | "Fit" | "Fill" | "Span")
}

fn validate_monitor_id(monitor_id: &str) -> AppResult<()> {
    if monitor_id.trim().is_empty() {
        return Err(AppError::validation("Monitor ID cannot be empty"));
    }
    if monitor_id.starts_with(GDI_FALLBACK_PREFIX) {
        return Err(AppError::validation(
            "Diagnostic monitor IDs cannot be used for wallpaper operations",
        ));
    }
    Ok(())
}

fn validate_fit_mode(fit_mode: &str) -> AppResult<()> {
    if !is_supported_fit_mode(fit_mode) {
        return Err(AppError::validation(format!(
            "Unsupported fit mode: {fit_mode}"
        )));
    }
    Ok(())
}

fn validate_resolved_image_path(path: &Path) -> AppResult<()> {
    let metadata = fs::metadata(path)
        .map_err(|source| AppError::io("Failed to read wallpaper metadata", source))?;
    if !metadata.is_file() {
        return Err(AppError::validation(format!(
            "Wallpaper path is not a file: {}",
            path.display()
        )));
    }
    Ok(())
}

/// Configuración de fondo a aplicar sobre un monitor.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WallpaperConfig {
    pub monitor_id: String,
    pub image_path: String,
    pub fit_mode: String,
}

fn fit_str_to_position(fit: &str) -> AppResult<DESKTOP_WALLPAPER_POSITION> {
    match fit.to_ascii_lowercase().as_str() {
        "center" => Ok(DWPOS_CENTER),
        "tile" => Ok(DWPOS_TILE),
        "stretch" => Ok(DWPOS_STRETCH),
        "fit" => Ok(DWPOS_FIT),
        "fill" => Ok(DWPOS_FILL),
        "span" => Ok(DWPOS_SPAN),
        _ => Err(AppError::validation(format!("Unsupported fit mode: {fit}"))),
    }
}

fn position_to_fit_str(pos: DESKTOP_WALLPAPER_POSITION) -> &'static str {
    match pos {
        DWPOS_CENTER => "Center",
        DWPOS_TILE => "Tile",
        DWPOS_STRETCH => "Stretch",
        DWPOS_FIT => "Fit",
        DWPOS_FILL => "Fill",
        DWPOS_SPAN => "Span",
        _ => "Fill",
    }
}

fn parse_hex_color(color: &str) -> Option<(u8, u8, u8)> {
    let c = color.trim().trim_start_matches('#');
    if c.len() != 6 {
        return None;
    }
    let r = u8::from_str_radix(&c[0..2], 16).ok()?;
    let g = u8::from_str_radix(&c[2..4], 16).ok()?;
    let b = u8::from_str_radix(&c[4..6], 16).ok()?;
    Some((r, g, b))
}

fn solid_cache_dir() -> AppResult<PathBuf> {
    let base = dirs::data_dir()
        .or_else(dirs::config_dir)
        .ok_or_else(|| AppError::runtime("Cannot determine app data directory"))?;
    let directory = base.join("WallpaperManager").join("cache");
    fs::create_dir_all(&directory)
        .map_err(|source| AppError::io("Failed to create cache dir", source))?;
    Ok(directory)
}

fn write_solid_bmp(path: &Path, r: u8, g: u8, b: u8) -> AppResult<()> {
    let width: u32 = 64;
    let height: u32 = 64;
    let row_stride = (24 * width).div_ceil(32) * 4;
    let pixel_array_size = row_stride * height;
    let file_size: u32 = 14 + 40 + pixel_array_size;
    let mut data = Vec::with_capacity(file_size as usize);

    data.extend_from_slice(b"BM");
    data.extend_from_slice(&file_size.to_le_bytes());
    data.extend_from_slice(&0u16.to_le_bytes());
    data.extend_from_slice(&0u16.to_le_bytes());
    data.extend_from_slice(&(14u32 + 40u32).to_le_bytes());

    data.extend_from_slice(&40u32.to_le_bytes());
    data.extend_from_slice(&(width as i32).to_le_bytes());
    data.extend_from_slice(&(height as i32).to_le_bytes());
    data.extend_from_slice(&1u16.to_le_bytes());
    data.extend_from_slice(&24u16.to_le_bytes());
    data.extend_from_slice(&0u32.to_le_bytes());
    data.extend_from_slice(&pixel_array_size.to_le_bytes());
    data.extend_from_slice(&0i32.to_le_bytes());
    data.extend_from_slice(&0i32.to_le_bytes());
    data.extend_from_slice(&0u32.to_le_bytes());
    data.extend_from_slice(&0u32.to_le_bytes());

    let padding = (row_stride - (width * 3)) as usize;
    for _ in 0..height {
        for _ in 0..width {
            data.push(b);
            data.push(g);
            data.push(r);
        }
        data.extend(std::iter::repeat_n(0, padding));
    }

    fs::write(path, data).map_err(|source| AppError::io("Failed to write solid bmp", source))
}

fn resolve_image_path_marker(image_path: &str) -> AppResult<Option<PathBuf>> {
    let trimmed = image_path.trim();
    if trimmed.is_empty() || trimmed == NONE_MARKER {
        let path = solid_cache_dir()?.join("solid_none_black.bmp");
        if !path.exists() {
            write_solid_bmp(&path, 0, 0, 0)?;
        }
        return Ok(Some(path));
    }

    if let Some(hex) = trimmed.strip_prefix(SOLID_PREFIX) {
        let (r, g, b) = parse_hex_color(hex)
            .ok_or_else(|| AppError::validation(format!("Invalid solid color marker: {trimmed}")))?;
        let path = solid_cache_dir()?.join(format!("solid_{}_{}_{}.bmp", r, g, b));
        if !path.exists() {
            write_solid_bmp(&path, r, g, b)?;
        }
        return Ok(Some(path));
    }

    Ok(Some(PathBuf::from(trimmed)))
}

struct ComGuard;

impl ComGuard {
    fn new() -> windows::core::Result<Self> {
        // SAFETY: Initializar COM es obligatorio antes de interactuar con IDesktopWallpaper.
        // Si el hilo ya estaba inicializado con otro modelo, reintentamos con MTA.
        let hr_sta = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
        if hr_sta.is_err() {
            // SAFETY: Segundo intento con MTA en el mismo hilo por compatibilidad con hilos del runtime.
            let hr_mta = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
            if hr_mta.is_err() {
                return Err(hr_mta.into());
            }
        }
        Ok(ComGuard)
    }
}

impl Drop for ComGuard {
    fn drop(&mut self) {
        // SAFETY: Sólo puede existir ComGuard si CoInitializeEx devolvió éxito previamente.
        unsafe { CoUninitialize() };
    }
}

fn create_desktop_wallpaper() -> windows::core::Result<IDesktopWallpaper> {
    // SAFETY: DesktopWallpaper es un COM object oficial y ComGuard garantiza inicialización previa.
    unsafe { CoCreateInstance(&DesktopWallpaper, None, CLSCTX_ALL) }
}

/// Struct to collect monitor handles via the EnumDisplayMonitors callback.
struct MonitorCollector {
    monitors: Vec<HMONITOR>,
}

unsafe extern "system" fn enum_monitor_proc(
    hmonitor: HMONITOR,
    _hdc: HDC,
    _lprect: *mut windows::Win32::Foundation::RECT,
    lparam: LPARAM,
) -> windows::Win32::Foundation::BOOL {
    // SAFETY: lparam contiene un puntero válido a MonitorCollector suministrado por get_monitor_display_names.
    let collector = &mut *(lparam.0 as *mut MonitorCollector);
    collector.monitors.push(hmonitor);
    windows::Win32::Foundation::TRUE
}

fn get_monitor_display_names() -> Vec<(String, i32, i32, u32, u32)> {
    let mut collector = MonitorCollector {
        monitors: Vec::new(),
    };
    // SAFETY: Pasamos un callback estático y un puntero válido a collector que vive toda la llamada.
    unsafe {
        let _ = EnumDisplayMonitors(
            None,
            None,
            Some(enum_monitor_proc),
            LPARAM(&mut collector as *mut MonitorCollector as isize),
        );
    }

    let mut result = Vec::new();
    for hmon in &collector.monitors {
        // SAFETY: MONITORINFOEXW es un POD Win32 y cero-inicializarlo es el patrón esperado antes de GetMonitorInfoW.
        let mut info: MONITORINFOEXW = unsafe { std::mem::zeroed() };
        info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
        // SAFETY: hmon proviene de EnumDisplayMonitors y info apunta a memoria válida con cbSize inicializado.
        unsafe {
            let _ = GetMonitorInfoW(*hmon, &mut info.monitorInfo as *mut _ as *mut _);
        }

        let device_name = {
            let len = info
                .szDevice
                .iter()
                .position(|&c| c == 0)
                .unwrap_or(info.szDevice.len());
            OsString::from_wide(&info.szDevice[..len])
                .to_string_lossy()
                .to_string()
        };

        let rc = info.monitorInfo.rcMonitor;
        let x = rc.left;
        let y = rc.top;
        let w = (rc.right - rc.left) as u32;
        let h = (rc.bottom - rc.top) as u32;

        result.push((device_name, x, y, w, h));
    }
    result
}

/// Devuelve la lista de monitores detectados con su configuración actual.
pub fn get_monitors() -> AppResult<Vec<MonitorInfo>> {
    logger::debug("wallpaper", "get_monitors start");
    let _com = ComGuard::new().map_err(|error| AppError::wallpaper(format!("COM init failed: {error}")))?;
    let dw = create_desktop_wallpaper()
        .map_err(|error| AppError::wallpaper(format!("IDesktopWallpaper failed: {error}")))?;

    // SAFETY: dw es una interfaz COM válida inicializada por create_desktop_wallpaper.
    let count = unsafe { dw.GetMonitorDevicePathCount() }
        .map_err(|error| AppError::wallpaper(error.to_string()))?;
    logger::debug("wallpaper", &format!("GetMonitorDevicePathCount={count}"));
    let display_names = get_monitor_display_names();
    logger::debug(
        "wallpaper",
        &format!("GDI monitors found={}", display_names.len()),
    );

    // SAFETY: dw es una interfaz COM válida; si falla usamos Fill como fallback observable.
    let current_pos = unsafe { dw.GetPosition() }.unwrap_or(DWPOS_FILL);

    let mut monitors = Vec::new();

    // SAFETY: pedir el wallpaper global con PCWSTR nulo es la API soportada por IDesktopWallpaper.
    let global_wp = unsafe { dw.GetWallpaper(PCWSTR::null()) }
        .map(|p| unsafe { p.to_string() }.unwrap_or_default())
        .unwrap_or_default();

    for i in 0..count {
        // SAFETY: i está en el rango 0..count proporcionado por GetMonitorDevicePathCount.
        let raw_id = unsafe { dw.GetMonitorDevicePathAt(i) }
            .map_err(|error| AppError::wallpaper(error.to_string()))?;
        let id_str = unsafe { raw_id.to_string() }.unwrap_or_default();
        logger::debug("wallpaper", &format!("Monitor index={i} id='{id_str}'"));

        let monitor_hstr = HSTRING::from(&id_str);
        // SAFETY: monitor_hstr apunta a una cadena UTF-16 válida y el monitor ID proviene del propio sistema.
        let mut current_wp = unsafe { dw.GetWallpaper(PCWSTR(monitor_hstr.as_ptr())) }
            .map(|p| unsafe { p.to_string() }.unwrap_or_default())
            .unwrap_or_default();

        if current_wp.is_empty() {
            current_wp = global_wp.clone();
        }
        logger::debug(
            "wallpaper",
            &format!("Monitor index={i} wallpaper='{current_wp}'"),
        );

        // SAFETY: el monitor ID proviene del propio IDesktopWallpaper.
        let monitor_rect = unsafe { dw.GetMonitorRECT(PCWSTR(monitor_hstr.as_ptr())) }
            .unwrap_or(RECT {
                left: 0,
                top: 0,
                right: 1920,
                bottom: 1080,
            });

        let x = monitor_rect.left;
        let y = monitor_rect.top;
        let w = (monitor_rect.right - monitor_rect.left).max(0) as u32;
        let h = (monitor_rect.bottom - monitor_rect.top).max(0) as u32;

        monitors.push(MonitorInfo {
            id: id_str,
            display_index: i + 1,
            name: format!("Monitor {} ({}x{})", i + 1, w, h),
            width: w,
            height: h,
            x,
            y,
            current_wallpaper: current_wp,
            current_fit: position_to_fit_str(current_pos).to_string(),
        });
    }

    if monitors.is_empty() && !display_names.is_empty() {
        logger::warn("wallpaper", "Using GDI fallback monitor list");
        for (i, (_device, x, y, w, h)) in display_names.iter().enumerate() {
            monitors.push(MonitorInfo {
                id: format!("{GDI_FALLBACK_PREFIX}{}", i + 1),
                display_index: (i + 1) as u32,
                name: format!("Monitor {} ({}x{})", i + 1, w, h),
                width: *w,
                height: *h,
                x: *x,
                y: *y,
                current_wallpaper: String::new(),
                current_fit: position_to_fit_str(current_pos).to_string(),
            });
        }
    }

    logger::debug(
        "wallpaper",
        &format!("get_monitors done: {} monitor(s)", monitors.len()),
    );

    Ok(monitors)
}

/// Aplica un fondo individual a un monitor concreto.
pub fn set_wallpaper(monitor_id: &str, image_path: &str, fit_mode: &str) -> AppResult<()> {
    logger::info(
        "wallpaper",
        &format!(
            "set_wallpaper monitor_id='{monitor_id}' image_path='{image_path}' fit='{fit_mode}'"
        ),
    );

    validate_monitor_id(monitor_id)?;
    validate_fit_mode(fit_mode)?;

    let _com = ComGuard::new().map_err(|error| AppError::wallpaper(format!("COM init failed: {error}")))?;
    let dw = create_desktop_wallpaper()
        .map_err(|error| AppError::wallpaper(format!("IDesktopWallpaper failed: {error}")))?;

    let monitor_hstr = HSTRING::from(monitor_id);
    let position = fit_str_to_position(fit_mode)?;
    let resolved = resolve_image_path_marker(image_path)?;

    if let Some(path) = resolved.as_deref() {
        validate_resolved_image_path(path)?;
    }

    // SAFETY: el monitor ID y la ruta resuelta provienen de datos validados antes de invocar la API COM.
    unsafe {
        if let Some(path) = resolved {
            let image_hstr = HSTRING::from(path.to_string_lossy().to_string());
            dw.SetWallpaper(PCWSTR(monitor_hstr.as_ptr()), &image_hstr)
                .map_err(|error| AppError::wallpaper(format!("SetWallpaper failed: {error}")))?;
        } else {
            let empty_hstr = HSTRING::from("");
            dw.SetWallpaper(PCWSTR(monitor_hstr.as_ptr()), &empty_hstr)
                .map_err(|error| AppError::wallpaper(format!("Clear wallpaper failed: {error}")))?;
        }
        dw.SetPosition(position)
            .map_err(|error| AppError::wallpaper(format!("SetPosition failed: {error}")))?;
    }

    logger::info("wallpaper", "set_wallpaper success");

    Ok(())
}

/// Aplica una configuración completa multi-monitor.
pub fn apply_configuration(configs: &[WallpaperConfig]) -> AppResult<()> {
    logger::info(
        "wallpaper",
        &format!("apply_configuration count={}", configs.len()),
    );

    if configs.is_empty() {
        return Err(AppError::validation("Configuration list cannot be empty"));
    }

    let mut seen = std::collections::HashSet::new();
    for config in configs {
        validate_monitor_id(&config.monitor_id)?;
        validate_fit_mode(&config.fit_mode)?;
        if !seen.insert(config.monitor_id.clone()) {
            return Err(AppError::validation(format!(
                "Duplicate monitor in configuration: {}",
                config.monitor_id
            )));
        }
    }

    let _com = ComGuard::new().map_err(|error| AppError::wallpaper(format!("COM init failed: {error}")))?;
    let dw = create_desktop_wallpaper()
        .map_err(|error| AppError::wallpaper(format!("IDesktopWallpaper failed: {error}")))?;

    for config in configs {
        logger::debug(
            "wallpaper",
            &format!(
                "apply monitor='{}' image='{}' fit='{}'",
                config.monitor_id, config.image_path, config.fit_mode
            ),
        );

        let monitor_hstr = HSTRING::from(&config.monitor_id);
        let resolved = resolve_image_path_marker(&config.image_path)?;

        if let Some(path) = resolved.as_deref() {
            validate_resolved_image_path(path)?;
        }

        // SAFETY: todos los identificadores y rutas han sido validados previamente.
        unsafe {
            if let Some(path) = resolved {
                let image_hstr = HSTRING::from(path.to_string_lossy().to_string());
                dw.SetWallpaper(PCWSTR(monitor_hstr.as_ptr()), &image_hstr)
                    .map_err(|error| {
                        AppError::wallpaper(format!(
                            "SetWallpaper failed for {}: {}",
                            config.monitor_id, error
                        ))
                    })?;
            } else {
                let empty_hstr = HSTRING::from("");
                dw.SetWallpaper(PCWSTR(monitor_hstr.as_ptr()), &empty_hstr)
                    .map_err(|error| {
                        AppError::wallpaper(format!(
                            "Clear wallpaper failed for {}: {}",
                            config.monitor_id, error
                        ))
                    })?;
            }
        }
    }

    if let Some(first) = configs.first() {
        let position = fit_str_to_position(&first.fit_mode)?;
        // SAFETY: el valor de position procede de una validación previa del fit mode.
        unsafe {
            dw.SetPosition(position)
                .map_err(|error| AppError::wallpaper(format!("SetPosition failed: {error}")))?;
        }
        logger::debug(
            "wallpaper",
            &format!("SetPosition from first fit='{}'", first.fit_mode),
        );
    }

    logger::info("wallpaper", "apply_configuration success");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn parses_hex_color() {
        assert_eq!(parse_hex_color("#112233"), Some((0x11, 0x22, 0x33)));
        assert_eq!(parse_hex_color("AABBCC"), Some((0xAA, 0xBB, 0xCC)));
        assert_eq!(parse_hex_color("#GG2233"), None);
        assert_eq!(parse_hex_color("#123"), None);
    }

    #[test]
    fn resolves_none_and_passthrough_markers() {
        assert!(resolve_image_path_marker("" ).unwrap().is_some());
        assert!(resolve_image_path_marker("__NONE__").unwrap().is_some());

        let regular = r"C:\\wallpapers\\sample.png";
        assert_eq!(
            resolve_image_path_marker(regular).unwrap(),
            Some(PathBuf::from(regular))
        );
    }

    #[test]
    fn fit_mapping_is_stable() {
        assert_eq!(position_to_fit_str(fit_str_to_position("Center").unwrap()), "Center");
        assert_eq!(position_to_fit_str(fit_str_to_position("Tile").unwrap()), "Tile");
        assert_eq!(position_to_fit_str(fit_str_to_position("Stretch").unwrap()), "Stretch");
        assert_eq!(position_to_fit_str(fit_str_to_position("Fit").unwrap()), "Fit");
        assert_eq!(position_to_fit_str(fit_str_to_position("Fill").unwrap()), "Fill");
        assert_eq!(position_to_fit_str(fit_str_to_position("Span").unwrap()), "Span");
    }

    #[test]
    fn writes_valid_solid_bmp_file() {
        let mut path = env::temp_dir();
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        path.push(format!("wallpaper_manager_test_{}.bmp", ts));

        write_solid_bmp(&path, 0x12, 0x34, 0x56).unwrap();

        let bytes = fs::read(&path).unwrap();
        assert!(bytes.len() > 54); // headers + pixel data
        assert_eq!(&bytes[0..2], b"BM");

        let _ = fs::remove_file(&path);
    }
}
