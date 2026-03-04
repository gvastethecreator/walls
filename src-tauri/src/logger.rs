use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_LOG_BYTES: u64 = 2 * 1024 * 1024;

fn app_logs_dir() -> Result<PathBuf, String> {
    let base = dirs::data_dir()
        .or_else(|| dirs::config_dir())
        .ok_or_else(|| "Cannot determine app data directory for logs".to_string())?;

    let dir = base.join("WallpaperManager").join("logs");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create logs directory: {}", e))?;
    }
    Ok(dir)
}

fn app_log_file() -> Result<PathBuf, String> {
    Ok(app_logs_dir()?.join("app.log"))
}

fn now_epoch_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn log_event(scope: &str, message: &str) {
    let line = format!("[{}] [{}] {}\n", now_epoch_secs(), scope, message);

    if let Ok(path) = app_log_file() {
        if let Ok(meta) = fs::metadata(&path) {
            if meta.len() > MAX_LOG_BYTES {
                let _ = fs::write(&path, "");
            }
        }
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
            let _ = file.write_all(line.as_bytes());
        }
    }
}

pub fn read_logs() -> Result<String, String> {
    let path = app_log_file()?;
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(path).map_err(|e| format!("Read logs failed: {}", e))
}

pub fn clear_logs() -> Result<(), String> {
    let path = app_log_file()?;
    if path.exists() {
        fs::write(&path, "").map_err(|e| format!("Clear logs failed: {}", e))?;
    }
    Ok(())
}
