use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileMonitor {
    #[serde(rename = "monitorId")]
    pub monitor_id: String,
    #[serde(rename = "imagePath")]
    pub image_path: String,
    #[serde(rename = "fitMode")]
    pub fit_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    #[serde(rename = "profileName")]
    pub profile_name: String,
    pub monitors: Vec<ProfileMonitor>,
}

fn profiles_dir() -> Result<PathBuf, String> {
    let base = dirs::data_dir()
        .or_else(|| dirs::config_dir())
        .ok_or_else(|| "Cannot determine app data directory".to_string())?;

    let dir = base.join("WallpaperManager").join("profiles");
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create profiles directory: {}", e))?;
    }
    Ok(dir)
}

fn profile_path(name: &str) -> Result<PathBuf, String> {
    let sanitized = sanitize_profile_name(name);
    let dir = profiles_dir()?;
    Ok(dir.join(format!("{}.json", sanitized)))
}

fn sanitize_profile_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' { c } else { '_' })
        .collect()
}

pub fn save_profile(profile: &Profile) -> Result<(), String> {
    let path = profile_path(&profile.profile_name)?;
    let json = serde_json::to_string_pretty(profile)
        .map_err(|e| format!("Serialization failed: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Write failed: {}", e))?;
    Ok(())
}

pub fn load_profile(name: &str) -> Result<Profile, String> {
    let path = profile_path(name)?;
    if !path.exists() {
        return Err(format!("Profile '{}' not found", name));
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Read failed: {}", e))?;
    let profile: Profile =
        serde_json::from_str(&content).map_err(|e| format!("Parse failed: {}", e))?;
    Ok(profile)
}

pub fn list_profiles() -> Result<Vec<String>, String> {
    let dir = profiles_dir()?;
    let mut names = Vec::new();

    let entries = fs::read_dir(&dir).map_err(|e| format!("Read dir failed: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("{}", e))?;
        let path = entry.path();
        if path.extension().map(|e| e == "json").unwrap_or(false) {
            if let Some(stem) = path.file_stem() {
                names.push(stem.to_string_lossy().to_string());
            }
        }
    }

    names.sort();
    Ok(names)
}

pub fn delete_profile(name: &str) -> Result<(), String> {
    let path = profile_path(name)?;
    if !path.exists() {
        return Err(format!("Profile '{}' not found", name));
    }
    fs::remove_file(&path).map_err(|e| format!("Delete failed: {}", e))?;
    Ok(())
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
