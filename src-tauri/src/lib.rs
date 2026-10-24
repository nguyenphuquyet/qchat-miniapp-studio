mod commands;
mod templates;

use commands::build::PreviewState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(PreviewState(std::sync::Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            commands::project::create_project,
            commands::project::open_project,
            commands::project::recent_projects,
            commands::project::remove_recent,
            commands::fs::list_tree,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_file,
            commands::fs::create_directory,
            commands::fs::delete_path,
            commands::fs::rename_path,
            commands::build::build_project,
            commands::build::start_preview,
            commands::build::stop_preview,
            commands::build::release_zip_path,
            commands::build::check_node,
            commands::build::install_node,
            commands::build::reveal_in_folder,
        ])
        .setup(|app| {
            // Open devtools only in debug builds for convenience.
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
