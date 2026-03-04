mod logger;
mod profiles;
mod wallpaper;

use profiles::{Profile, ProfileMonitor};
use wallpaper::WallpaperConfig;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::fs;
use std::path::Path;

#[tauri::command]
fn get_monitors() -> Result<Vec<wallpaper::MonitorInfo>, String> {
    logger::log_event("backend", "get_monitors called");
    let result = wallpaper::get_monitors();
    match &result {
        Ok(monitors) => logger::log_event("backend", &format!("get_monitors ok: {} monitors", monitors.len())),
        Err(err) => logger::log_event("backend", &format!("get_monitors error: {}", err)),
    }
    result
}

#[tauri::command]
fn apply_wallpaper(monitor_id: String, image_path: String, fit_mode: String) -> Result<(), String> {
    logger::log_event(
        "backend",
        &format!(
            "apply_wallpaper called: monitor_id='{}', image_path='{}', fit_mode='{}'",
            monitor_id, image_path, fit_mode
        ),
    );
    let result = wallpaper::set_wallpaper(&monitor_id, &image_path, &fit_mode);
    if let Err(err) = &result {
        logger::log_event("backend", &format!("apply_wallpaper error: {}", err));
    }
    result
}

#[tauri::command]
fn apply_configuration(configs: Vec<WallpaperConfig>) -> Result<(), String> {
    logger::log_event("backend", &format!("apply_configuration called: {} configs", configs.len()));
    let result = wallpaper::apply_configuration(&configs);
    if let Err(err) = &result {
        logger::log_event("backend", &format!("apply_configuration error: {}", err));
    }
    result
}

#[tauri::command]
fn save_profile(name: String, monitors: Vec<ProfileMonitor>) -> Result<(), String> {
    logger::log_event("backend", &format!("save_profile called: '{}' with {} monitors", name, monitors.len()));
    let profile = Profile {
        profile_name: name,
        monitors,
    };
    let result = profiles::save_profile(&profile);
    if let Err(err) = &result {
        logger::log_event("backend", &format!("save_profile error: {}", err));
    }
    result
}

#[tauri::command]
fn load_profile(name: String) -> Result<Profile, String> {
    logger::log_event("backend", &format!("load_profile called: '{}'", name));
    let result = profiles::load_profile(&name);
    if let Err(err) = &result {
        logger::log_event("backend", &format!("load_profile error: {}", err));
    }
    result
}

#[tauri::command]
fn list_profiles() -> Result<Vec<String>, String> {
    logger::log_event("backend", "list_profiles called");
    profiles::list_profiles()
}

#[tauri::command]
fn delete_profile(name: String) -> Result<(), String> {
    logger::log_event("backend", &format!("delete_profile called: '{}'", name));
    let result = profiles::delete_profile(&name);
    if let Err(err) = &result {
        logger::log_event("backend", &format!("delete_profile error: {}", err));
    }
    result
}

#[tauri::command]
fn log_client_event(scope: String, message: String) {
    logger::log_event(&format!("client:{}", scope), &message);
}

#[tauri::command]
fn get_logs() -> Result<String, String> {
    logger::read_logs()
}

#[tauri::command]
fn clear_logs() -> Result<(), String> {
    logger::clear_logs()
}

fn guess_mime_from_path(path: &str) -> &'static str {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "bmp" => "image/bmp",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "tif" | "tiff" => "image/tiff",
        _ => "application/octet-stream",
    }
}

#[allow(non_snake_case)]
#[tauri::command]
fn get_image_data_url(imagePath: String) -> Result<String, String> {
    logger::log_event("backend", &format!("get_image_data_url called: '{}'", imagePath));

    let metadata = fs::metadata(&imagePath).map_err(|e| format!("metadata error: {}", e))?;
    let max_bytes: u64 = 20 * 1024 * 1024;
    if metadata.len() > max_bytes {
        return Err(format!("file too large for preview ({} bytes)", metadata.len()));
    }

    let bytes = fs::read(&imagePath).map_err(|e| format!("read error: {}", e))?;
    let mime = guess_mime_from_path(&imagePath);
    let encoded = STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime, encoded))
}

#[cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_monitors,
            apply_wallpaper,
            apply_configuration,
            save_profile,
            load_profile,
            list_profiles,
            delete_profile,
            log_client_event,
            get_logs,
            clear_logs,
            get_image_data_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{get_image_data_url, guess_mime_from_path};
    use std::env;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn guess_mime_from_path_maps_extensions() {
        assert_eq!(guess_mime_from_path("a.jpg"), "image/jpeg");
        assert_eq!(guess_mime_from_path("a.jpeg"), "image/jpeg");
        assert_eq!(guess_mime_from_path("a.png"), "image/png");
        assert_eq!(guess_mime_from_path("a.bmp"), "image/bmp");
        assert_eq!(guess_mime_from_path("a.webp"), "image/webp");
        assert_eq!(guess_mime_from_path("a.unknown"), "application/octet-stream");
    }

    #[test]
    fn get_image_data_url_reads_file_and_returns_data_url() {
        let mut path = env::temp_dir();
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        path.push(format!("wallpaper_manager_preview_test_{}.png", ts));

        // Minimal content for smoke validation (not decoding image, only transport path)
        fs::write(&path, b"fakepngdata").expect("temp file write should succeed");

        let data_url = get_image_data_url(path.to_string_lossy().to_string())
            .expect("get_image_data_url should succeed");
        assert!(data_url.starts_with("data:image/png;base64,"));

        let _ = fs::remove_file(&path);
    }
}
