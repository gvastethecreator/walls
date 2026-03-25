mod error;
pub mod logger;
pub mod profiles;
pub mod wallpaper;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use error::{AppError, AppResult, CommandError, CommandResult};
use profiles::{Profile, ProfileMonitor};
use std::{
	fs,
	path::{Path, PathBuf},
	sync::{Arc, Mutex},
	time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{
	async_runtime,
	Manager, State, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_log::{Target, TargetKind};
use wallpaper::WallpaperConfig;

const IDENTIFY_WINDOW_CLOSE_DELAY_MS: u64 = 1_800;
const IMAGE_PREVIEW_MAX_BYTES: u64 = 20 * 1024 * 1024;
const EDITED_IMAGE_MAX_BYTES: u64 = 50 * 1024 * 1024;

/// Estado global de la aplicación para serializar operaciones del subsistema de wallpapers.
#[derive(Clone, Default)]
struct AppState {
	wallpaper_lock: Arc<Mutex<()>>,
}

fn background_task_failed(name: &'static str, error: impl std::fmt::Display) -> CommandError {
	logger::error(
		"runtime",
		&format!("background task '{name}' failed to join: {error}"),
	);
	CommandError::from(AppError::runtime(format!(
		"Background task '{name}' failed unexpectedly"
	)))
}

async fn run_blocking<T, F>(name: &'static str, task: F) -> CommandResult<T>
where
	T: Send + 'static,
	F: FnOnce() -> AppResult<T> + Send + 'static,
{
	async_runtime::spawn_blocking(task)
		.await
		.map_err(|error| background_task_failed(name, error))?
		.map_err(CommandError::from)
}

fn guess_mime_from_path(path: &str) -> &'static str {
	let extension = Path::new(path)
		.extension()
		.and_then(|value| value.to_str())
		.unwrap_or_default()
		.to_ascii_lowercase();

	match extension.as_str() {
		"jpg" | "jpeg" => "image/jpeg",
		"png" => "image/png",
		"bmp" => "image/bmp",
		"gif" => "image/gif",
		"webp" => "image/webp",
		"tif" | "tiff" => "image/tiff",
		_ => "application/octet-stream",
	}
}

fn edited_wallpapers_dir() -> AppResult<PathBuf> {
	let base = dirs::data_dir()
		.or_else(dirs::config_dir)
		.ok_or_else(|| AppError::runtime("Cannot determine app data directory"))?;

	let directory = base.join("WallpaperManager").join("edited");
	fs::create_dir_all(&directory).map_err(|source| AppError::io("Failed to create edited dir", source))?;
	Ok(directory)
}

fn parse_png_data_url(data_url: &str) -> AppResult<Vec<u8>> {
	let trimmed = data_url.trim();
	let payload = trimmed
		.strip_prefix("data:image/png;base64,")
		.ok_or_else(|| AppError::image("Only PNG data URLs are supported"))?;

	let bytes = STANDARD
		.decode(payload)
		.map_err(|error| AppError::image(format!("Invalid base64 payload: {error}")))?;

	if bytes.is_empty() {
		return Err(AppError::image("Edited image payload is empty"));
	}

	if bytes.len() as u64 > EDITED_IMAGE_MAX_BYTES {
		return Err(AppError::image(format!(
			"Edited image too large ({} bytes)",
			bytes.len()
		)));
	}

	Ok(bytes)
}

fn sanitize_monitor_id_for_filename(value: &str) -> String {
	let cleaned: String = value
		.chars()
		.map(|character| {
			if character.is_alphanumeric() || matches!(character, '-' | '_') {
				character
			} else {
				'_'
			}
		})
		.collect();

	let trimmed = cleaned.trim_matches('_');
	if trimmed.is_empty() {
		"monitor".to_string()
	} else {
		trimmed.to_string()
	}
}

#[tauri::command]
async fn get_monitors(state: State<'_, AppState>) -> CommandResult<Vec<wallpaper::MonitorInfo>> {
	let wallpaper_lock = state.wallpaper_lock.clone();

	run_blocking("get_monitors", move || {
		let _guard = wallpaper_lock
			.lock()
			.map_err(|_| AppError::runtime("Wallpaper state lock poisoned"))?;
		logger::info("backend", "get_monitors called");
		let monitors = wallpaper::get_monitors()?;
		logger::info(
			"backend",
			&format!("get_monitors succeeded with {} monitor(s)", monitors.len()),
		);
		Ok(monitors)
	})
	.await
}

#[tauri::command]
async fn apply_wallpaper(
	state: State<'_, AppState>,
	monitor_id: String,
	image_path: String,
	fit_mode: String,
) -> CommandResult<()> {
	let wallpaper_lock = state.wallpaper_lock.clone();

	run_blocking("apply_wallpaper", move || {
		let _guard = wallpaper_lock
			.lock()
			.map_err(|_| AppError::runtime("Wallpaper state lock poisoned"))?;
		logger::info(
			"backend",
			&format!(
				"apply_wallpaper called for monitor '{monitor_id}' with fit '{fit_mode}'"
			),
		);
		wallpaper::set_wallpaper(&monitor_id, &image_path, &fit_mode)?;
		logger::info("backend", "apply_wallpaper completed successfully");
		Ok(())
	})
	.await
}

#[tauri::command]
async fn apply_configuration(
	state: State<'_, AppState>,
	configs: Vec<WallpaperConfig>,
) -> CommandResult<()> {
	let wallpaper_lock = state.wallpaper_lock.clone();

	run_blocking("apply_configuration", move || {
		let _guard = wallpaper_lock
			.lock()
			.map_err(|_| AppError::runtime("Wallpaper state lock poisoned"))?;
		logger::info(
			"backend",
			&format!("apply_configuration called with {} config(s)", configs.len()),
		);
		wallpaper::apply_configuration(&configs)?;
		logger::info("backend", "apply_configuration completed successfully");
		Ok(())
	})
	.await
}

#[tauri::command]
async fn save_profile(name: String, monitors: Vec<ProfileMonitor>) -> CommandResult<()> {
	run_blocking("save_profile", move || {
		logger::info(
			"backend",
			&format!("save_profile called for '{name}' with {} monitor(s)", monitors.len()),
		);
		let profile = Profile {
			profile_name: name,
			monitors,
		};
		profiles::save_profile(&profile)?;
		logger::info("backend", "save_profile completed successfully");
		Ok(())
	})
	.await
}

#[tauri::command]
async fn load_profile(name: String) -> CommandResult<Profile> {
	run_blocking("load_profile", move || {
		logger::info("backend", &format!("load_profile called for '{name}'"));
		let profile = profiles::load_profile(&name)?;
		logger::info("backend", "load_profile completed successfully");
		Ok(profile)
	})
	.await
}

#[tauri::command]
async fn list_profiles() -> CommandResult<Vec<String>> {
	run_blocking("list_profiles", move || {
		logger::debug("backend", "list_profiles called");
		profiles::list_profiles()
	})
	.await
}

#[tauri::command]
async fn delete_profile(name: String) -> CommandResult<()> {
	run_blocking("delete_profile", move || {
		logger::warn("backend", &format!("delete_profile called for '{name}'"));
		profiles::delete_profile(&name)
	})
	.await
}

#[tauri::command]
fn log_client_event(scope: String, level: String, message: String) {
	match level.trim().to_ascii_lowercase().as_str() {
		"debug" => logger::debug(&format!("client:{scope}"), &message),
		"warn" => logger::warn(&format!("client:{scope}"), &message),
		"error" => logger::error(&format!("client:{scope}"), &message),
		_ => logger::info(&format!("client:{scope}"), &message),
	}
}

#[tauri::command]
async fn get_logs() -> CommandResult<String> {
	run_blocking("get_logs", logger::read_logs).await
}

#[tauri::command]
async fn clear_logs() -> CommandResult<()> {
	run_blocking("clear_logs", logger::clear_logs).await
}

#[tauri::command]
async fn identify_monitors(
	app: tauri::AppHandle,
	state: State<'_, AppState>,
) -> CommandResult<()> {
	logger::info("backend", "identify_monitors called");

	let wallpaper_lock = state.wallpaper_lock.clone();
	let monitors = run_blocking("identify_monitors", move || {
		let _guard = wallpaper_lock
			.lock()
			.map_err(|_| AppError::runtime("Wallpaper state lock poisoned"))?;
		wallpaper::get_monitors()
	})
	.await?;

	if monitors.is_empty() {
		return Err(CommandError::from(AppError::not_found(
			"No monitors detected",
		)));
	}

	let mut labels = Vec::with_capacity(monitors.len());
	for monitor in &monitors {
		let label = format!("identify-{}", monitor.display_index);
		labels.push(label.clone());

		if let Some(existing) = app.get_webview_window(&label) {
			let _ = existing.close();
		}

		let url = format!("identify.html?n={}", monitor.display_index);
		WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
			.decorations(false)
			.shadow(false)
			.transparent(true)
			.always_on_top(true)
			.resizable(false)
			.skip_taskbar(true)
			.focused(false)
			.visible(true)
			.position(monitor.x as f64, monitor.y as f64)
			.inner_size(monitor.width as f64, monitor.height as f64)
			.build()
			.map_err(|error| {
				CommandError::from(AppError::window(format!(
					"Failed to create identify window '{label}': {error}"
				)))
			})?;
	}

	let app_for_close = app.clone();
	std::thread::spawn(move || {
		std::thread::sleep(Duration::from_millis(IDENTIFY_WINDOW_CLOSE_DELAY_MS));
		for label in labels {
			if let Some(window) = app_for_close.get_webview_window(&label) {
				let _ = window.close();
			}
		}
	});

	Ok(())
}

#[allow(non_snake_case)]
#[tauri::command]
async fn get_image_data_url(imagePath: String) -> CommandResult<String> {
	run_blocking("get_image_data_url", move || {
		logger::debug("backend", &format!("get_image_data_url called for '{imagePath}'"));

		if imagePath.trim().is_empty() {
			return Err(AppError::validation("Image path cannot be empty"));
		}

		let metadata = fs::metadata(&imagePath)
			.map_err(|source| AppError::io("Failed to read image metadata", source))?;
		if metadata.len() > IMAGE_PREVIEW_MAX_BYTES {
			return Err(AppError::image(format!(
				"File too large for preview ({} bytes)",
				metadata.len()
			)));
		}

		let bytes = fs::read(&imagePath)
			.map_err(|source| AppError::io("Failed to read preview image", source))?;
		let mime = guess_mime_from_path(&imagePath);
		let encoded = STANDARD.encode(bytes);
		Ok(format!("data:{mime};base64,{encoded}"))
	})
	.await
}

#[allow(non_snake_case)]
#[tauri::command]
async fn save_edited_wallpaper(monitorId: String, dataUrl: String) -> CommandResult<String> {
	run_blocking("save_edited_wallpaper", move || {
		logger::info(
			"backend",
			&format!("save_edited_wallpaper called for monitor '{monitorId}'"),
		);

		if monitorId.trim().is_empty() {
			return Err(AppError::validation("Monitor ID cannot be empty"));
		}

		let bytes = parse_png_data_url(&dataUrl)?;
		let directory = edited_wallpapers_dir()?;
		let timestamp = SystemTime::now()
			.duration_since(UNIX_EPOCH)
			.map(|duration| duration.as_millis())
			.unwrap_or_default();
		let file_name = format!(
			"edited_{}_{}.png",
			sanitize_monitor_id_for_filename(&monitorId),
			timestamp
		);
		let output_path = directory.join(file_name);

		fs::write(&output_path, bytes)
			.map_err(|source| AppError::io("Failed to write edited image", source))?;

		let saved_path = output_path.to_string_lossy().to_string();
		logger::info(
			"backend",
			&format!("save_edited_wallpaper stored '{saved_path}'"),
		);
		Ok(saved_path)
	})
	.await
}

/// Punto de entrada principal del runtime Tauri.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	let builder = tauri::Builder::default()
		.manage(AppState::default())
		.plugin(tauri_plugin_dialog::init())
		.plugin(
			tauri_plugin_log::Builder::new()
				.targets([
					Target::new(TargetKind::Stdout),
					Target::new(TargetKind::Webview),
				])
				.build(),
		)
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
			identify_monitors,
			get_image_data_url,
			save_edited_wallpaper,
		]);

	if let Err(error) = builder.run(tauri::generate_context!()) {
		eprintln!("failed to run tauri application: {error}");
	}
}

#[cfg(test)]
mod tests {
	use super::{
		guess_mime_from_path, parse_png_data_url, sanitize_monitor_id_for_filename,
	};
	use crate::error::{AppError, CommandError};

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
	fn parse_png_data_url_validates_prefix_and_decodes() {
		let encoded = "aGVsbG8=";
		let data_url = format!("data:image/png;base64,{encoded}");
		let bytes = parse_png_data_url(&data_url).expect("decode should succeed");
		assert_eq!(bytes, b"hello");
		assert!(parse_png_data_url("data:image/jpeg;base64,aGVsbG8=").is_err());
	}

	#[test]
	fn sanitize_monitor_id_for_filename_rewrites_invalid_characters() {
		assert_eq!(sanitize_monitor_id_for_filename("DISPLAY#1"), "DISPLAY_1");
		assert_eq!(sanitize_monitor_id_for_filename("***"), "monitor");
	}

	#[test]
	fn command_error_serializes_app_error() {
		let error = CommandError::from(AppError::validation("bad input"));
		let encoded = serde_json::to_string(&error).expect("error should serialize");
		assert!(encoded.contains("validation_error"));
		assert!(encoded.contains("bad input"));
	}
}
