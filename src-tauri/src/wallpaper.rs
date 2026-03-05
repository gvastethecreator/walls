use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::fs;
use std::os::windows::ffi::OsStringExt;
use std::path::PathBuf;
use crate::logger;
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WallpaperConfig {
    pub monitor_id: String,
    pub image_path: String,
    pub fit_mode: String,
}

fn fit_str_to_position(fit: &str) -> DESKTOP_WALLPAPER_POSITION {
    match fit.to_lowercase().as_str() {
        "center" => DWPOS_CENTER,
        "tile" => DWPOS_TILE,
        "stretch" => DWPOS_STRETCH,
        "fit" => DWPOS_FIT,
        "fill" => DWPOS_FILL,
        "span" => DWPOS_SPAN,
        _ => DWPOS_FILL,
    }
}

fn position_to_fit_str(pos: DESKTOP_WALLPAPER_POSITION) -> String {
    match pos {
        DWPOS_CENTER => "Center".to_string(),
        DWPOS_TILE => "Tile".to_string(),
        DWPOS_STRETCH => "Stretch".to_string(),
        DWPOS_FIT => "Fit".to_string(),
        DWPOS_FILL => "Fill".to_string(),
        DWPOS_SPAN => "Span".to_string(),
        _ => "Fill".to_string(),
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

fn solid_cache_dir() -> Result<PathBuf, String> {
    let base = dirs::data_dir()
        .or_else(|| dirs::config_dir())
        .ok_or_else(|| "Cannot determine app data directory".to_string())?;
    let dir = base.join("WallpaperManager").join("cache");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create cache dir: {}", e))?;
    }
    Ok(dir)
}

fn write_solid_bmp(path: &PathBuf, r: u8, g: u8, b: u8) -> Result<(), String> {
    // 64x64, 24-bit BMP with row padding to 4 bytes.
    let width: u32 = 64;
    let height: u32 = 64;
    let row_stride = ((24 * width + 31) / 32) * 4;
    let pixel_array_size = row_stride * height;
    let file_size: u32 = 14 + 40 + pixel_array_size;
    let mut data = Vec::with_capacity(file_size as usize);

    // BITMAPFILEHEADER (14 bytes)
    data.extend_from_slice(b"BM");
    data.extend_from_slice(&file_size.to_le_bytes());
    data.extend_from_slice(&0u16.to_le_bytes());
    data.extend_from_slice(&0u16.to_le_bytes());
    data.extend_from_slice(&(14u32 + 40u32).to_le_bytes());

    // BITMAPINFOHEADER (40 bytes)
    data.extend_from_slice(&40u32.to_le_bytes());
    data.extend_from_slice(&(width as i32).to_le_bytes()); // width
    data.extend_from_slice(&(height as i32).to_le_bytes()); // height
    data.extend_from_slice(&1u16.to_le_bytes()); // planes
    data.extend_from_slice(&24u16.to_le_bytes()); // bpp
    data.extend_from_slice(&0u32.to_le_bytes()); // BI_RGB
    data.extend_from_slice(&pixel_array_size.to_le_bytes()); // image size
    data.extend_from_slice(&0i32.to_le_bytes());
    data.extend_from_slice(&0i32.to_le_bytes());
    data.extend_from_slice(&0u32.to_le_bytes());
    data.extend_from_slice(&0u32.to_le_bytes());

    // Pixel data (bottom-up rows)
    let padding = (row_stride - (width * 3)) as usize;
    for _ in 0..height {
        for _ in 0..width {
            data.push(b);
            data.push(g);
            data.push(r);
        }
        for _ in 0..padding {
            data.push(0);
        }
    }

    fs::write(path, data).map_err(|e| format!("Failed to write solid bmp: {}", e))
}

fn resolve_image_path_marker(image_path: &str) -> Result<Option<String>, String> {
    let trimmed = image_path.trim();
    if trimmed.is_empty() || trimmed == NONE_MARKER {
        // "No background" fallback for Windows: set a black bitmap explicitly,
        // since empty wallpaper can keep previous image depending on shell state.
        let path = solid_cache_dir()?.join("solid_none_black.bmp");
        if !path.exists() {
            write_solid_bmp(&path, 0, 0, 0)?;
        }
        return Ok(Some(path.to_string_lossy().to_string()));
    }

    if let Some(hex) = trimmed.strip_prefix(SOLID_PREFIX) {
        let (r, g, b) = parse_hex_color(hex).ok_or_else(|| format!("Invalid solid color marker: {}", trimmed))?;
        let path = solid_cache_dir()?.join(format!("solid_{}_{}_{}.bmp", r, g, b));
        if !path.exists() {
            write_solid_bmp(&path, r, g, b)?;
        }
        return Ok(Some(path.to_string_lossy().to_string()));
    }

    Ok(Some(trimmed.to_string()))
}

struct ComGuard;

impl ComGuard {
    fn new() -> windows::core::Result<Self> {
        // Tauri may execute commands on threads with a pre-configured COM model.
        // If apartment init fails due to changed mode, retry as MTA.
        let hr_sta = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
        if hr_sta.is_err() {
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
        unsafe { CoUninitialize() };
    }
}

fn create_desktop_wallpaper() -> windows::core::Result<IDesktopWallpaper> {
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
    let collector = &mut *(lparam.0 as *mut MonitorCollector);
    collector.monitors.push(hmonitor);
    windows::Win32::Foundation::TRUE
}

fn get_monitor_display_names() -> Vec<(String, i32, i32, u32, u32)> {
    let mut collector = MonitorCollector {
        monitors: Vec::new(),
    };
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
        let mut info: MONITORINFOEXW = unsafe { std::mem::zeroed() };
        info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
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

pub fn get_monitors() -> Result<Vec<MonitorInfo>, String> {
    logger::log_event("wallpaper", "get_monitors start");
    let _com = ComGuard::new().map_err(|e| format!("COM init failed: {}", e))?;
    let dw = create_desktop_wallpaper().map_err(|e| format!("IDesktopWallpaper failed: {}", e))?;

    let count = unsafe { dw.GetMonitorDevicePathCount() }.map_err(|e| format!("{}", e))?;
    logger::log_event("wallpaper", &format!("GetMonitorDevicePathCount={}", count));
    let display_names = get_monitor_display_names();
    logger::log_event("wallpaper", &format!("GDI monitors found={}", display_names.len()));

    // Get current position (global — IDesktopWallpaper uses one position for all)
    let current_pos = unsafe { dw.GetPosition() }.unwrap_or(DWPOS_FILL);

    let mut monitors = Vec::new();

    // Global wallpaper fallback (used when per-monitor wallpaper is unavailable)
    let global_wp = unsafe { dw.GetWallpaper(PCWSTR::null()) }
        .map(|p| unsafe { p.to_string() }.unwrap_or_default())
        .unwrap_or_default();

    for i in 0..count {
        let raw_id = unsafe { dw.GetMonitorDevicePathAt(i) }.map_err(|e| format!("{}", e))?;
        let id_str = unsafe { raw_id.to_string() }.unwrap_or_default();
        logger::log_event("wallpaper", &format!("Monitor index={} id='{}'", i, id_str));

        // Get current wallpaper for this monitor
        let monitor_hstr = HSTRING::from(&id_str);
        let mut current_wp = unsafe { dw.GetWallpaper(PCWSTR(monitor_hstr.as_ptr())) }
            .map(|p| unsafe { p.to_string() }.unwrap_or_default())
            .unwrap_or_default();

        if current_wp.is_empty() {
            current_wp = global_wp.clone();
        }
        logger::log_event(
            "wallpaper",
            &format!("Monitor index={} wallpaper='{}'", i, current_wp),
        );

        // Always resolve monitor geometry from IDesktopWallpaper monitor ID
        // to avoid index/order mismatches with GDI enumeration.
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
            current_fit: position_to_fit_str(current_pos),
        });
    }

    // Fallback: if IDesktopWallpaper returns 0 monitors, use GDI enumeration
    // only for visual display. These IDs are not valid for per-monitor apply.
    if monitors.is_empty() && !display_names.is_empty() {
        logger::log_event("wallpaper", "Using GDI fallback monitor list");
        for (i, (_device, x, y, w, h)) in display_names.iter().enumerate() {
            monitors.push(MonitorInfo {
                id: format!("GDI_MONITOR_{}", i + 1),
                display_index: (i + 1) as u32,
                name: format!("Monitor {} ({}x{})", i + 1, w, h),
                width: *w,
                height: *h,
                x: *x,
                y: *y,
                current_wallpaper: String::new(),
                current_fit: position_to_fit_str(current_pos),
            });
        }
    }

    logger::log_event("wallpaper", &format!("get_monitors done: {} monitors", monitors.len()));

    Ok(monitors)
}

pub fn set_wallpaper(monitor_id: &str, image_path: &str, fit_mode: &str) -> Result<(), String> {
    logger::log_event(
        "wallpaper",
        &format!("set_wallpaper monitor_id='{}' image_path='{}' fit='{}'", monitor_id, image_path, fit_mode),
    );
    let _com = ComGuard::new().map_err(|e| format!("COM init failed: {}", e))?;
    let dw = create_desktop_wallpaper().map_err(|e| format!("IDesktopWallpaper failed: {}", e))?;

    let monitor_hstr = HSTRING::from(monitor_id);
    let position = fit_str_to_position(fit_mode);
    let resolved = resolve_image_path_marker(image_path)?;

    unsafe {
        if let Some(path) = resolved {
            let image_hstr = HSTRING::from(path);
            dw.SetWallpaper(PCWSTR(monitor_hstr.as_ptr()), &image_hstr)
                .map_err(|e| format!("SetWallpaper failed: {}", e))?;
        } else {
            let empty_hstr = HSTRING::from("");
            dw.SetWallpaper(PCWSTR(monitor_hstr.as_ptr()), &empty_hstr)
                .map_err(|e| format!("Clear wallpaper failed: {}", e))?;
        }
        dw.SetPosition(position)
            .map_err(|e| format!("SetPosition failed: {}", e))?;
    }

    logger::log_event("wallpaper", "set_wallpaper success");

    Ok(())
}

pub fn apply_configuration(configs: &[WallpaperConfig]) -> Result<(), String> {
    logger::log_event("wallpaper", &format!("apply_configuration count={}", configs.len()));
    let _com = ComGuard::new().map_err(|e| format!("COM init failed: {}", e))?;
    let dw = create_desktop_wallpaper().map_err(|e| format!("IDesktopWallpaper failed: {}", e))?;

    for config in configs {
        logger::log_event(
            "wallpaper",
            &format!("apply monitor='{}' image='{}' fit='{}'", config.monitor_id, config.image_path, config.fit_mode),
        );

        let monitor_hstr = HSTRING::from(&config.monitor_id);
        let resolved = resolve_image_path_marker(&config.image_path)?;

        unsafe {
            if let Some(path) = resolved {
                let image_hstr = HSTRING::from(path);
                dw.SetWallpaper(PCWSTR(monitor_hstr.as_ptr()), &image_hstr)
                    .map_err(|e| format!("SetWallpaper failed for {}: {}", config.monitor_id, e))?;
            } else {
                let empty_hstr = HSTRING::from("");
                dw.SetWallpaper(PCWSTR(monitor_hstr.as_ptr()), &empty_hstr)
                    .map_err(|e| format!("Clear wallpaper failed for {}: {}", config.monitor_id, e))?;
            }
        }
    }

    // NOTE: IDesktopWallpaper position is global (not per-monitor).
    // Use first config deterministically after all wallpapers are assigned.
    if let Some(first) = configs.first() {
        let position = fit_str_to_position(&first.fit_mode);
        unsafe {
            dw.SetPosition(position)
                .map_err(|e| format!("SetPosition failed: {}", e))?;
        }
        logger::log_event("wallpaper", &format!("SetPosition from first fit='{}'", first.fit_mode));
    }

    logger::log_event("wallpaper", "apply_configuration success");

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
            Some(regular.to_string())
        );
    }

    #[test]
    fn fit_mapping_is_stable() {
        assert_eq!(position_to_fit_str(fit_str_to_position("Center")), "Center");
        assert_eq!(position_to_fit_str(fit_str_to_position("Tile")), "Tile");
        assert_eq!(position_to_fit_str(fit_str_to_position("Stretch")), "Stretch");
        assert_eq!(position_to_fit_str(fit_str_to_position("Fit")), "Fit");
        assert_eq!(position_to_fit_str(fit_str_to_position("Fill")), "Fill");
        assert_eq!(position_to_fit_str(fit_str_to_position("Span")), "Span");
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
