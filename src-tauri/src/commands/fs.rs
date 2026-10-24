use std::fs;
use std::path::Path;

use super::FileNode;

fn is_ignored(name: &str) -> bool {
    matches!(name, "node_modules" | "dist" | "release" | ".git" | "target" | ".idea" | ".vscode")
}

fn walk(root: &Path, base: &Path) -> std::io::Result<FileNode> {
    let name = base.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
    let mut node = FileNode {
        name,
        path: base.to_string_lossy().to_string(),
        is_dir: base.is_dir(),
        children: vec![],
    };
    if base.is_dir() {
        let mut entries: Vec<_> = fs::read_dir(base)?
            .filter_map(|e| e.ok())
            .filter(|e| !is_ignored(&e.file_name().to_string_lossy()))
            .collect();
        entries.sort_by_key(|e| {
            let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
            (std::cmp::Reverse(is_dir), e.file_name().to_string_lossy().to_string())
        });
        for entry in entries {
            let child = entry.path();
            if let Ok(n) = walk(root, &child) {
                node.children.push(n);
            }
        }
    }
    let _ = root;
    Ok(node)
}

#[tauri::command]
pub fn list_tree(path: String) -> Result<FileNode, String> {
    walk(Path::new(&path), Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > 2 * 1024 * 1024 {
        return Err("File too large to open in editor (> 2 MB)".into());
    }
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    String::from_utf8(bytes).map_err(|_| "Binary file cannot be displayed".into())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    if Path::new(&path).exists() {
        return Err("File already exists".into());
    }
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, "").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    if Path::new(&new_path).exists() {
        return Err("Destination already exists".into());
    }
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}
