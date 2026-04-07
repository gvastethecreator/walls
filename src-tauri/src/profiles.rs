use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fs, path::PathBuf};

/// Asociación persistible entre un monitor y su fondo configurado.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileMonitor {
    pub monitor_id: String,
    pub image_path: String,
    pub fit_mode: String,
}

/// Perfil completo de fondos que puede guardarse y restaurarse.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub profile_name: String,
    pub monitors: Vec<ProfileMonitor>,
}

fn profiles_dir() -> AppResult<PathBuf> {
    let base = dirs::data_dir()
        .or_else(dirs::config_dir)
        .ok_or_else(|| AppError::runtime("Cannot determine app data directory"))?;

    let directory = base.join("WallpaperManager").join("profiles");
    fs::create_dir_all(&directory)
        .map_err(|source| AppError::io("Failed to create profiles directory", source))?;
    Ok(directory)
}

/// Devuelve el directorio de perfiles sin crearlo; útil para health check.
pub fn profiles_dir_for_health() -> AppResult<PathBuf> {
    let base = dirs::data_dir()
        .or_else(dirs::config_dir)
        .ok_or_else(|| AppError::runtime("Cannot determine app data directory"))?;
    Ok(base.join("WallpaperManager").join("profiles"))
}

fn profile_path(name: &str) -> AppResult<PathBuf> {
    let sanitized = sanitize_profile_name(name);
    Ok(profiles_dir()?.join(format!("{sanitized}.json")))
}

fn sanitize_profile_name(name: &str) -> String {
    name.chars()
        .map(|character| {
            if character.is_alphanumeric() || matches!(character, '-' | '_' | ' ') {
                character
            } else {
                '_'
            }
        })
        .collect()
}

fn is_supported_fit_mode(value: &str) -> bool {
    matches!(value, "Center" | "Tile" | "Stretch" | "Fit" | "Fill" | "Span")
}

fn validate_profile_name(name: &str) -> AppResult<()> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::validation("Profile name cannot be empty"));
    }
    if trimmed.len() > 80 {
        return Err(AppError::validation(
            "Profile name is too long (max 80 chars)",
        ));
    }

    let sanitized = sanitize_profile_name(trimmed);
    if sanitized.trim().is_empty() {
        return Err(AppError::validation(
            "Profile name contains no valid characters",
        ));
    }

    Ok(())
}

const MAX_PROFILE_MONITORS: usize = 32;

fn validate_profile_monitors(monitors: &[ProfileMonitor]) -> AppResult<()> {
    if monitors.len() > MAX_PROFILE_MONITORS {
        return Err(AppError::validation(format!(
            "Profile contains too many monitors (max {MAX_PROFILE_MONITORS})"
        )));
    }

    let mut seen = HashSet::new();
    for monitor in monitors {
        if monitor.monitor_id.trim().is_empty() {
            return Err(AppError::validation(
                "Profile contains a monitor with empty ID",
            ));
        }
        if !seen.insert(monitor.monitor_id.clone()) {
            return Err(AppError::validation(format!(
                "Profile contains duplicate monitor ID: {}",
                monitor.monitor_id
            )));
        }
        if !is_supported_fit_mode(&monitor.fit_mode) {
            return Err(AppError::validation(format!(
                "Unsupported fit mode in profile: {}",
                monitor.fit_mode
            )));
        }
        if monitor.image_path.len() > 4096 {
            return Err(AppError::validation(format!(
                "Image path too long for monitor: {}",
                monitor.monitor_id
            )));
        }
    }

    Ok(())
}

fn validate_profile(profile: &Profile) -> AppResult<()> {
    validate_profile_name(&profile.profile_name)?;
    validate_profile_monitors(&profile.monitors)
}

/// Guarda un perfil en disco validando previamente su estructura.
pub fn save_profile(profile: &Profile) -> AppResult<()> {
    validate_profile(profile)?;

    let path = profile_path(&profile.profile_name)?;
    let json = serde_json::to_string_pretty(profile)
        .map_err(|source| AppError::json("Failed to serialize profile", source))?;
    fs::write(&path, json).map_err(|source| AppError::io("Failed to write profile", source))?;
    Ok(())
}

/// Carga un perfil desde disco y vuelve a validarlo antes de devolverlo.
pub fn load_profile(name: &str) -> AppResult<Profile> {
    validate_profile_name(name)?;

    let path = profile_path(name)?;
    if !path.exists() {
        return Err(AppError::not_found(format!("Profile '{name}' not found")));
    }

    let content = fs::read_to_string(&path)
        .map_err(|source| AppError::io("Failed to read profile", source))?;
    let profile = serde_json::from_str::<Profile>(&content)
        .map_err(|source| AppError::json("Failed to parse profile", source))?;
    validate_profile(&profile)?;
    Ok(profile)
}

/// Lista los perfiles disponibles ordenados alfabéticamente.
pub fn list_profiles() -> AppResult<Vec<String>> {
    let directory = profiles_dir()?;
    let mut names = Vec::new();

    for entry in fs::read_dir(&directory)
        .map_err(|source| AppError::io("Failed to read profiles directory", source))?
    {
        let entry = entry.map_err(|source| AppError::io("Failed to enumerate profiles", source))?;
        let path = entry.path();
        if path.extension().is_some_and(|extension| extension == "json") {
            if let Some(stem) = path.file_stem() {
                names.push(stem.to_string_lossy().to_string());
            }
        }
    }

    names.sort();
    Ok(names)
}

/// Elimina un perfil existente.
pub fn delete_profile(name: &str) -> AppResult<()> {
    validate_profile_name(name)?;

    let path = profile_path(name)?;
    if !path.exists() {
        return Err(AppError::not_found(format!("Profile '{name}' not found")));
    }

    fs::remove_file(&path).map_err(|source| AppError::io("Failed to delete profile", source))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn sanitize_profile_name_replaces_invalid_characters() {
        assert_eq!(sanitize_profile_name("Work/Profile:2026"), "Work_Profile_2026");
        assert_eq!(sanitize_profile_name("My Profile-01_ok"), "My Profile-01_ok");
    }

    #[test]
    fn validate_profile_name_rejects_invalid_inputs() {
        assert!(validate_profile_name("  ").is_err());
        assert!(validate_profile_name(&"x".repeat(81)).is_err());
        assert!(validate_profile_name("valid_name").is_ok());
    }

    #[test]
    fn validate_profile_monitors_rejects_duplicates_and_invalid_fit() {
        let duplicated = vec![
            ProfileMonitor {
                monitor_id: "MON1".to_string(),
                image_path: "a.png".to_string(),
                fit_mode: "Fill".to_string(),
            },
            ProfileMonitor {
                monitor_id: "MON1".to_string(),
                image_path: "b.png".to_string(),
                fit_mode: "Fill".to_string(),
            },
        ];
        assert!(validate_profile_monitors(&duplicated).is_err());

        let invalid_fit = vec![ProfileMonitor {
            monitor_id: "MON2".to_string(),
            image_path: "a.png".to_string(),
            fit_mode: "Whatever".to_string(),
        }];
        assert!(validate_profile_monitors(&invalid_fit).is_err());
    }

    #[test]
    fn validate_profile_monitors_rejects_too_many() {
        let monitors: Vec<ProfileMonitor> = (0..=MAX_PROFILE_MONITORS)
            .map(|i| ProfileMonitor {
                monitor_id: format!("MON{i}"),
                image_path: "a.png".to_string(),
                fit_mode: "Fill".to_string(),
            })
            .collect();
        assert!(validate_profile_monitors(&monitors).is_err());
    }

    #[test]
    fn validate_profile_monitors_rejects_long_image_path() {
        let monitors = vec![ProfileMonitor {
            monitor_id: "MON1".to_string(),
            image_path: "x".repeat(4097),
            fit_mode: "Fill".to_string(),
        }];
        assert!(validate_profile_monitors(&monitors).is_err());
    }

    #[test]
    fn profile_roundtrip_save_load_list_delete() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
        let name = format!("smoke_profile_{}", unique);

        let profile = Profile {
            profile_name: name.clone(),
            monitors: vec![ProfileMonitor {
                monitor_id: "MONITOR_TEST_1".to_string(),
                image_path: "__SOLID__:#112233".to_string(),
                fit_mode: "Fill".to_string(),
            }],
        };

        save_profile(&profile).expect("save_profile should succeed");

        let loaded = load_profile(&name).expect("load_profile should succeed");
        assert_eq!(loaded.profile_name, name);
        assert_eq!(loaded.monitors.len(), 1);
        assert_eq!(loaded.monitors[0].fit_mode, "Fill");

        let listed = list_profiles().expect("list_profiles should succeed");
        assert!(listed.iter().any(|n| n == &name));

        delete_profile(&name).expect("delete_profile should succeed");
    }
}
