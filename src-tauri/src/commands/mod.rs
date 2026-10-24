pub mod build;
pub mod fs;
pub mod project;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<FileNode>,
}

#[derive(Serialize, Clone)]
pub struct ProjectInfo {
    pub path: String,
    pub name: String,
    pub app_id: String,
    pub version: String,
    pub description: String,
    pub entry: String,
    pub permissions: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RecentProject {
    pub path: String,
    pub name: String,
    pub opened_at: i64,
}
