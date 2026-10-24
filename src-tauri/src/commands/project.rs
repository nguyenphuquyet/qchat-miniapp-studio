use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Deserialize;
use tauri::{AppHandle, Manager};

use super::{ProjectInfo, RecentProject};
use crate::templates::render_template;

fn recent_file(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|p| p.join("recent.json"))
}

fn read_recent(app: &AppHandle) -> Vec<RecentProject> {
    let Some(path) = recent_file(app) else { return vec![] };
    let Ok(bytes) = fs::read(&path) else { return vec![] };
    serde_json::from_slice(&bytes).unwrap_or_default()
}

fn write_recent(app: &AppHandle, list: &[RecentProject]) {
    let Some(path) = recent_file(app) else { return };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(bytes) = serde_json::to_vec_pretty(list) {
        let _ = fs::write(&path, bytes);
    }
}

fn add_recent(app: &AppHandle, path: &str, name: &str) {
    let mut list = read_recent(app);
    list.retain(|p| p.path != path);
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
    list.insert(0, RecentProject { path: path.into(), name: name.into(), opened_at: now });
    list.truncate(12);
    write_recent(app, &list);
}

fn sanitize_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

#[derive(Deserialize)]
pub struct CreateProjectArgs {
    pub parent_dir: String,
    pub name: String,
    pub app_id: String,
    pub description: String,
    pub version: String,
    pub permissions: Vec<String>,
}

#[tauri::command]
pub fn create_project(app: AppHandle, args: CreateProjectArgs) -> Result<String, String> {
    let folder = sanitize_name(&args.name);
    if folder.is_empty() {
        return Err("Invalid project name".into());
    }
    let project_dir = Path::new(&args.parent_dir).join(&folder);
    if project_dir.exists() {
        return Err(format!("Directory already exists: {}", project_dir.display()));
    }
    let files = render_template(&args.name, &args.app_id, &args.description, &args.version, &args.permissions);
    for file in &files {
        let target = project_dir.join(&file.path);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&target, &file.content).map_err(|e| e.to_string())?;
    }
    let path_str = project_dir.to_string_lossy().to_string();
    add_recent(&app, &path_str, &args.name);
    Ok(path_str)
}

#[tauri::command]
pub fn open_project(app: AppHandle, path: String) -> Result<ProjectInfo, String> {
    let manifest_path = Path::new(&path).join("qchat.manifest.json");
    if !manifest_path.exists() {
        return Err("Not a QChat Mini App project: qchat.manifest.json not found".into());
    }
    let bytes = fs::read(&manifest_path).map_err(|e| e.to_string())?;
    let manifest: serde_json::Value = serde_json::from_slice(&bytes).map_err(|e| format!("Invalid manifest: {e}"))?;
    let name = manifest.get("name").and_then(|v| v.as_str()).unwrap_or("Unnamed").to_string();
    let info = ProjectInfo {
        path: path.clone(),
        name: name.clone(),
        app_id: manifest.get("appId").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        version: manifest.get("version").and_then(|v| v.as_str()).unwrap_or("0.0.0").to_string(),
        description: manifest.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        entry: manifest.get("entry").and_then(|v| v.as_str()).unwrap_or("index.html").to_string(),
        permissions: manifest
            .get("requestedPermissions")
            .and_then(|v| v.as_array())
            .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default(),
    };
    add_recent(&app, &path, &name);
    Ok(info)
}

#[tauri::command]
pub fn recent_projects(app: AppHandle) -> Vec<RecentProject> {
    read_recent(&app)
}

#[tauri::command]
pub fn remove_recent(app: AppHandle, path: String) {
    let mut list = read_recent(&app);
    list.retain(|p| p.path != path);
    write_recent(&app, &list);
}
