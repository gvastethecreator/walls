use crate::error::{AppError, AppResult};
use log::Level;
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

const LOG_FILE_NAME: &str = "app.log";
const MAX_LOG_BYTES: u64 = 2 * 1024 * 1024;

fn app_logs_dir() -> AppResult<PathBuf> {
    let base = dirs::data_dir()
        .or_else(dirs::config_dir)
        .ok_or_else(|| AppError::runtime("Cannot determine app data directory for logs"))?;

    let directory = base.join("WallpaperManager").join("logs");
    fs::create_dir_all(&directory).map_err(|source| AppError::io("Failed to create logs directory", source))?;
    Ok(directory)
}

/// Devuelve el directorio de logs sin crearlo; útil para health check.
pub fn logs_dir_for_health() -> AppResult<PathBuf> {
    let base = dirs::data_dir()
        .or_else(dirs::config_dir)
        .ok_or_else(|| AppError::runtime("Cannot determine app data directory for logs"))?;
    Ok(base.join("WallpaperManager").join("logs"))
}

fn app_log_file() -> AppResult<PathBuf> {
    Ok(app_logs_dir()?.join(LOG_FILE_NAME))
}

fn now_epoch_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

fn rotate_if_needed(path: &PathBuf) -> AppResult<()> {
    if let Ok(metadata) = fs::metadata(path) {
        if metadata.len() > MAX_LOG_BYTES {
            let bak = path.with_extension("log.bak");
            // Intentamos renombrar; si falla (mismo volumen o permisos) truncamos directamente.
            if fs::rename(path, &bak).is_err() {
                fs::write(path, "").map_err(|source| AppError::io("Failed to rotate log file", source))?;
            }
        }
    }
    Ok(())
}

/// Escribe un evento en el log persistente y lo refleja en la consola del runtime.
pub fn log_event(level: Level, scope: &str, message: &str) {
    log::log!(target: scope, level, "{message}");

    let result = (|| -> AppResult<()> {
        let path = app_log_file()?;
        rotate_if_needed(&path)?;

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|source| AppError::io("Failed to open log file", source))?;
        let line = format!("[{}] [{}] [{}] {}\n", now_epoch_secs(), level, scope, message);
        file.write_all(line.as_bytes())
            .map_err(|source| AppError::io("Failed to write log event", source))
    })();

    if let Err(error) = result {
        eprintln!("failed to persist log entry: {error}");
    }
}

/// Registra un mensaje de nivel debug.
pub fn debug(scope: &str, message: &str) {
    log_event(Level::Debug, scope, message);
}

/// Registra un mensaje de nivel info.
pub fn info(scope: &str, message: &str) {
    log_event(Level::Info, scope, message);
}

/// Registra un mensaje de nivel warn.
pub fn warn(scope: &str, message: &str) {
    log_event(Level::Warn, scope, message);
}

/// Registra un mensaje de nivel error.
pub fn error(scope: &str, message: &str) {
    log_event(Level::Error, scope, message);
}

/// Devuelve el contenido completo del log persistente usado por la UI de diagnóstico.
pub fn read_logs() -> AppResult<String> {
    let path = app_log_file()?;
    if !path.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(path).map_err(|source| AppError::io("Failed to read logs", source))
}

/// Limpia el archivo de log persistente.
pub fn clear_logs() -> AppResult<()> {
    let path = app_log_file()?;
    if path.exists() {
        fs::write(path, "").map_err(|source| AppError::io("Failed to clear logs", source))?;
    }
    Ok(())
}
