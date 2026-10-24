use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::templates::MOCK_BRIDGE_JS;

#[derive(Clone, Serialize)]
struct BuildLog {
    stream: String,
    line: String,
}

#[derive(Clone, Serialize)]
struct BuildDone {
    success: bool,
    message: String,
    zip_path: Option<String>,
}

pub struct PreviewState(pub Mutex<Option<PreviewInner>>);

pub struct PreviewInner {
    stop: Arc<AtomicBool>,
    port: u16,
}

fn npm_cmd() -> &'static str {
    if cfg!(windows) { "npm.cmd" } else { "npm" }
}

fn node_exe() -> &'static str {
    if cfg!(windows) { "node.exe" } else { "node" }
}

/// `CREATE_NO_WINDOW`: run a child process without giving it a console window.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// The studio is a GUI app with no console attached, so on Windows every child
/// process would otherwise pop up its own console window. Child processes stay
/// windowless instead: their output is piped into the in-app Build panel by
/// [`stream_lines`], so the "terminal" lives inside the studio window.
#[cfg(windows)]
fn no_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn no_window(_cmd: &mut Command) {}

/// Directory of the Node.js runtime shipped inside the app, when present.
///
/// CI stages the official Node.js build into `src-tauri/resources/node` before
/// `tauri build` (see `.github/workflows/build-windows.yml`), so the studio can
/// build projects on a machine that has no Node.js installed.
fn bundled_node_dir(app: &AppHandle) -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(dir) = app.path().resource_dir() {
        // Tauri keeps the path relative to `src-tauri`, but be tolerant about it.
        candidates.push(dir.join("resources").join("node"));
        candidates.push(dir.join("node"));
    }
    // `tauri dev` / `cargo run` straight from the repository.
    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources").join("node"));
    candidates.into_iter().find(|dir| dir.join(node_exe()).is_file())
}

/// Prepends `dir` to the `PATH` of a child process so npm lifecycle scripts
/// (`node`, `node-gyp`, nested `npm`) pick up the bundled runtime.
fn prepend_path(cmd: &mut Command, dir: &Path) {
    let mut paths = vec![dir.to_path_buf()];
    if let Some(existing) = std::env::var_os("PATH") {
        paths.extend(std::env::split_paths(&existing));
    }
    if let Ok(joined) = std::env::join_paths(paths) {
        cmd.env("PATH", joined);
    }
}

/// Resolves how npm gets invoked: the Node.js runtime bundled with the app when
/// one is available, otherwise the system-wide npm. Returns the command plus a
/// label describing the runtime (surfaced in the in-app build log).
fn npm_command(app: &AppHandle) -> (Command, String) {
    if let Some(dir) = bundled_node_dir(app) {
        let npm_cli = dir.join("node_modules").join("npm").join("bin").join("npm-cli.js");
        if npm_cli.is_file() {
            let mut cmd = Command::new(dir.join(node_exe()));
            cmd.arg(&npm_cli);
            prepend_path(&mut cmd, &dir);
            return (cmd, format!("bundled Node.js · {}", dir.display()));
        }
    }
    (Command::new(npm_cmd()), format!("system {} (no bundled Node.js found)", npm_cmd()))
}

fn stream_lines<R: Read + Send + 'static>(app: AppHandle, reader: R, stream_name: &'static str) {
    let reader = BufReader::new(reader);
    thread::spawn(move || {
        for line in reader.lines().map_while(Result::ok) {
            let _ = app.emit("build-log", BuildLog { stream: stream_name.into(), line });
        }
    });
}

fn run_and_stream(app: &AppHandle, cwd: &Path, args: &[&str], label: &str) -> bool {
    let (mut cmd, runtime) = npm_command(app);
    let _ = app.emit("build-log", BuildLog { stream: "info".into(), line: format!("$ {label}  [{runtime}]") });
    no_window(&mut cmd);
    let mut child = match cmd
        .args(args)
        .current_dir(cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit("build-log", BuildLog { stream: "error".into(), line: format!("Failed to start npm: {e}") });
            return false;
        }
    };
    if let Some(stdout) = child.stdout.take() {
        stream_lines(app.clone(), stdout, "stdout");
    }
    if let Some(stderr) = child.stderr.take() {
        stream_lines(app.clone(), stderr, "stderr");
    }
    match child.wait() {
        Ok(status) => status.success(),
        Err(e) => {
            let _ = app.emit("build-log", BuildLog { stream: "error".into(), line: format!("Wait failed: {e}") });
            false
        }
    }
}

fn find_release_zip(project_path: &Path) -> Option<String> {
    let release = project_path.join("release");
    let read = fs::read_dir(&release).ok()?;
    let mut zips: Vec<PathBuf> = read
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.extension().map(|e| e == "zip").unwrap_or(false))
        .collect();
    zips.sort_by_key(|p| fs::metadata(p).and_then(|m| m.modified()).ok());
    zips.pop().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn build_project(app: AppHandle, project_path: String) -> Result<(), String> {
    let cwd = PathBuf::from(&project_path);
    if !cwd.join("package.json").exists() {
        return Err("package.json not found in project".into());
    }
    thread::spawn(move || {
        let app2 = app.clone();
        let (_, runtime) = npm_command(&app2);
        let _ = app2.emit(
            "build-log",
            BuildLog { stream: "info".into(), line: format!("Build runtime: {runtime}") },
        );
        let needs_install = !cwd.join("node_modules").exists();
        let ok_install = !needs_install || run_and_stream(&app2, &cwd, &["install"], "npm install");
        let ok_build = ok_install && run_and_stream(&app2, &cwd, &["run", "build"], "npm run build");
        let zip = if ok_build { find_release_zip(&cwd) } else { None };
        let _ = app2.emit(
            "build-done",
            BuildDone {
                success: ok_build,
                message: if ok_build {
                    format!("Build succeeded.{}", zip.as_ref().map(|z| format!(" Package: {z}")).unwrap_or_default())
                } else {
                    "Build failed. See the log above.".into()
                },
                zip_path: zip,
            },
        );
    });
    Ok(())
}

fn content_type(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("js") | Some("mjs") => "text/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("woff") => "font/woff",
        Some("woff2") => "font/woff2",
        Some("ttf") => "font/ttf",
        Some("ico") => "image/x-icon",
        Some("map") => "application/json",
        _ => "application/octet-stream",
    }
}

fn handle_client(mut stream: TcpStream, dist: PathBuf, app_info_json: String) {
    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf).unwrap_or(0);
    if n == 0 { return; }
    let req = String::from_utf8_lossy(&buf[..n]);
    let first_line = req.lines().next().unwrap_or("");
    let mut parts = first_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let raw_path = parts.next().unwrap_or("/");
    if method != "GET" {
        let _ = write!(stream, "HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n");
        return;
    }
    let path = raw_path.split('?').next().unwrap_or("/");
    let decoded = url_decode(path);
    let rel = decoded.trim_start_matches('/');
    if rel.contains("..") {
        let _ = write!(stream, "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n");
        return;
    }
    let mut file = dist.join(if rel.is_empty() { "index.html" } else { rel });
    if file.is_dir() {
        file = file.join("index.html");
    }
    let is_index = file.file_name().and_then(|s| s.to_str()) == Some("index.html");
    match fs::read(&file) {
        Ok(bytes) => {
            let body: Vec<u8> = if is_index {
                let html = String::from_utf8_lossy(&bytes).to_string();
                let inject = format!(
                    "<script>window.__QCHAT_APP__={app_info_json};</script>\n<script>{MOCK_BRIDGE_JS}</script>\n</head>"
                );
                let injected = if html.contains("</head>") {
                    html.replace("</head>", &inject)
                } else if html.contains("<body") {
                    html.replacen("<body", &format!("{inject}<body"), 1)
                } else {
                    format!("{inject}{html}")
                };
                injected.into_bytes()
            } else {
                bytes
            };
            let _ = write!(
                stream,
                "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nAccess-Control-Allow-Origin: *\r\n\r\n",
                content_type(&file),
                body.len()
            );
            let _ = stream.write_all(&body);
        }
        Err(_) => {
            let body = b"404 Not Found (preview)";
            let _ = write!(stream, "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: {}\r\n\r\n", body.len());
            let _ = stream.write_all(body);
        }
    }
    let _ = stream.flush();
}

fn url_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Ok(h), Ok(l)) = (
                u8::from_str_radix(std::str::from_utf8(&bytes[i + 1..i + 2]).unwrap_or(""), 16),
                u8::from_str_radix(std::str::from_utf8(&bytes[i + 2..i + 3]).unwrap_or(""), 16),
            ) {
                out.push((h << 4) | l);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

#[tauri::command]
pub fn start_preview(
    app: AppHandle,
    state: State<'_, PreviewState>,
    project_path: String,
) -> Result<String, String> {
    let project = PathBuf::from(&project_path);
    let dist = project.join("dist");
    if !dist.join("index.html").exists() {
        return Err("No build output found. Run Build first (dist/index.html missing).".into());
    }
    let manifest: serde_json::Value = fs::read_to_string(project.join("qchat.manifest.json"))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    let app_info_json = serde_json::json!({
        "appId": manifest.get("appId").and_then(|v| v.as_str()).unwrap_or("mp_preview"),
        "name": manifest.get("name").and_then(|v| v.as_str()).unwrap_or("Preview"),
        "version": manifest.get("version").and_then(|v| v.as_str()).unwrap_or("1.0.0"),
        "permissions": manifest.get("requestedPermissions").cloned().unwrap_or(serde_json::json!([])),
    })
    .to_string();

    // Stop any previous preview.
    if let Some(prev) = state.0.lock().unwrap().take() {
        prev.stop.store(true, Ordering::SeqCst);
    }

    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let stop = Arc::new(AtomicBool::new(false));
    let stop_clone = stop.clone();

    *state.0.lock().unwrap() = Some(PreviewInner { stop: stop.clone(), port });

    thread::spawn(move || {
        while !stop_clone.load(Ordering::SeqCst) {
            match listener.accept() {
                Ok((stream, _)) => {
                    let dist = dist.clone();
                    let info = app_info_json.clone();
                    thread::spawn(move || handle_client(stream, dist, info));
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(50));
                }
                Err(_) => break,
            }
        }
    });

    let _ = app.emit("preview-started", port);
    Ok(format!("http://127.0.0.1:{port}/index.html"))
}

#[tauri::command]
pub fn stop_preview(state: State<'_, PreviewState>) {
    if let Some(prev) = state.0.lock().unwrap().take() {
        prev.stop.store(true, Ordering::SeqCst);
    }
}

#[tauri::command]
pub fn release_zip_path(project_path: String) -> Option<String> {
    find_release_zip(Path::new(&project_path))
}
