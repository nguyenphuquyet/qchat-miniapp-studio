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
use tauri::{AppHandle, Emitter, State};

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

/// Emits one line to the in-app Build panel.
fn log(app: &AppHandle, stream: &str, line: impl Into<String>) {
    let _ = app.emit("build-log", BuildLog { stream: stream.into(), line: line.into() });
}

/// Looks `exe` up in the directories listed in the `PATH` environment variable.
fn find_in_path(exe: &str) -> Option<PathBuf> {
    let paths = std::env::var_os("PATH")?;
    std::env::split_paths(&paths).map(|dir| dir.join(exe)).find(|p| p.is_file())
}

#[derive(Clone, Serialize)]
pub struct NodeStatus {
    pub found: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    /// True when the studio can install Node.js by itself on this OS.
    pub can_auto_install: bool,
}

#[derive(Clone, Serialize)]
pub struct NodeInstallResult {
    pub success: bool,
    pub message: String,
}

/// Re-reads the machine + user `PATH` from the Windows registry and merges it
/// into this process' `PATH`. A running app never sees a `PATH` change made after
/// it started (e.g. right after Node.js was installed), so this fixes that.
/// PowerShell output is forced to UTF-8 so non-ASCII user names survive.
#[cfg(windows)]
fn refresh_path() {
    let mut cmd = Command::new("powershell.exe");
    cmd.args([
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "[Console]::OutputEncoding=[Text.Encoding]::UTF8; [Environment]::ExpandEnvironmentVariables([Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User'))",
    ]);
    no_window(&mut cmd);
    let Ok(out) = cmd.output() else { return };
    if !out.status.success() {
        return;
    }
    let fresh = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if fresh.is_empty() {
        return;
    }
    let mut dirs: Vec<PathBuf> = std::env::split_paths(&fresh).filter(|p| !p.as_os_str().is_empty()).collect();
    if let Some(existing) = std::env::var_os("PATH") {
        for p in std::env::split_paths(&existing) {
            let dup = dirs.iter().any(|d| d.to_string_lossy().eq_ignore_ascii_case(&p.to_string_lossy()));
            if !dup && !p.as_os_str().is_empty() {
                dirs.push(p);
            }
        }
    }
    if let Ok(joined) = std::env::join_paths(dirs) {
        std::env::set_var("PATH", joined);
    }
}

#[cfg(not(windows))]
fn refresh_path() {}

/// Finds `node` and `npm` through the `PATH` environment variable (nothing is
/// bundled with the installer).
fn detect_node() -> NodeStatus {
    let mut node = find_in_path(node_exe());
    let mut npm = find_in_path(npm_cmd());
    if node.is_none() || npm.is_none() {
        // Node.js may have been installed after the studio started: re-read PATH.
        refresh_path();
        node = find_in_path(node_exe());
        npm = find_in_path(npm_cmd());
    }
    let can_auto_install = cfg!(windows);
    match (node, npm) {
        (Some(node), Some(_)) => {
            let mut cmd = Command::new(&node);
            cmd.arg("--version");
            no_window(&mut cmd);
            let version = cmd
                .output()
                .ok()
                .filter(|o| o.status.success())
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
                .unwrap_or_else(|| "unknown version".into());
            NodeStatus {
                found: true,
                version: Some(version),
                path: Some(node.to_string_lossy().to_string()),
                can_auto_install,
            }
        }
        _ => NodeStatus { found: false, version: None, path: None, can_auto_install },
    }
}

/// Logs which runtime the build uses, or explains what is missing, and returns
/// whether the build can go on.
fn check_node_runtime(app: &AppHandle) -> bool {
    let status = detect_node();
    if status.found {
        log(
            app,
            "info",
            format!(
                "Build runtime: system Node.js {} · {}",
                status.version.unwrap_or_default(),
                status.path.unwrap_or_default()
            ),
        );
        return true;
    }
    log(app, "error", "Node.js (node / npm) was not found in the PATH environment variable.");
    log(
        app,
        "error",
        "Install Node.js (https://nodejs.org), make sure node and npm are on PATH, then restart QChat Mini App Studio.",
    );
    false
}

/// Called by the UI before every build: is Node.js available?
#[tauri::command]
pub async fn check_node() -> NodeStatus {
    tauri::async_runtime::spawn_blocking(detect_node)
        .await
        .unwrap_or_else(|_| NodeStatus { found: false, version: None, path: None, can_auto_install: cfg!(windows) })
}

/// Installs Node.js LTS. Only called after the user agreed in the UI. Progress
/// streams into the Build panel through the `build-log` event.
#[tauri::command]
pub async fn install_node(app: AppHandle) -> Result<NodeInstallResult, String> {
    tauri::async_runtime::spawn_blocking(move || install_node_blocking(&app))
        .await
        .map_err(|e| e.to_string())
}

#[cfg(windows)]
const INSTALL_NODE_PS1: &str = r##"
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Write-Output 'Looking up the latest Node.js LTS on nodejs.org ...'
$index = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$version = ($index | Where-Object { $_.lts } | Select-Object -First 1).version
$url = "https://nodejs.org/dist/$version/node-$version-$arch.msi"
$out = Join-Path $env:TEMP "node-$version-$arch.msi"
Write-Output "Downloading $url"
Invoke-WebRequest $url -OutFile $out
Write-Output 'Running the installer (Windows may ask for administrator permission) ...'
$p = Start-Process msiexec.exe -ArgumentList '/i', "`"$out`"", '/passive', '/norestart' -Wait -PassThru
Remove-Item $out -ErrorAction SilentlyContinue
if ($p.ExitCode -eq 3010) { exit 0 }
exit $p.ExitCode
"##;

/// Fallback for PCs without winget: download the official MSI and run it.
#[cfg(windows)]
fn install_node_msi(app: &AppHandle) -> std::io::Result<bool> {
    let script = std::env::temp_dir().join("qchat-install-node.ps1");
    fs::write(&script, INSTALL_NODE_PS1)?;
    let mut cmd = Command::new("powershell.exe");
    cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File"]).arg(&script);
    let result = run_command_streaming(app, cmd, true);
    let _ = fs::remove_file(&script);
    result
}

#[cfg(windows)]
fn install_node_blocking(app: &AppHandle) -> NodeInstallResult {
    log(app, "info", "Installing Node.js LTS (Windows may ask for administrator permission)…");
    log(app, "info", "$ winget install OpenJS.NodeJS.LTS");
    let mut winget = Command::new("winget");
    winget.args([
        "install",
        "--id",
        "OpenJS.NodeJS.LTS",
        "--exact",
        "--source",
        "winget",
        "--silent",
        "--accept-package-agreements",
        "--accept-source-agreements",
    ]);
    match run_command_streaming(app, winget, true) {
        Ok(true) => {}
        Ok(false) => log(app, "stderr", "winget did not finish successfully."),
        Err(e) => {
            // winget is missing: download the official installer instead.
            log(app, "info", format!("winget is not available ({e}); downloading the installer from nodejs.org instead."));
            if let Err(e) = install_node_msi(app) {
                log(app, "error", format!("Could not run the installer: {e}"));
            }
        }
    }
    let status = detect_node(); // also refreshes PATH from the registry
    if status.found {
        let version = status.version.unwrap_or_default();
        log(app, "info", format!("Node.js {version} is installed."));
        NodeInstallResult { success: true, message: format!("Node.js {version} installed") }
    } else {
        let message = "Node.js installation did not complete. Install it manually from https://nodejs.org and restart the studio.";
        log(app, "error", message);
        NodeInstallResult { success: false, message: message.into() }
    }
}

#[cfg(not(windows))]
fn install_node_blocking(app: &AppHandle) -> NodeInstallResult {
    let message = "Automatic Node.js installation is only supported on Windows. Install it from https://nodejs.org and restart the studio.";
    log(app, "error", message);
    NodeInstallResult { success: false, message: message.into() }
}

/// Streams a child's output into the Build panel. Progress bars / spinners redraw
/// one line with `\r`, so only the final state of each line is kept. With
/// `compact`, one-character spinner leftovers are dropped too.
fn stream_lines<R: Read + Send + 'static>(
    app: AppHandle,
    reader: R,
    stream_name: &'static str,
    compact: bool,
) -> thread::JoinHandle<()> {
    let mut reader = BufReader::new(reader);
    thread::spawn(move || {
        let mut buf = Vec::new();
        loop {
            buf.clear();
            match reader.read_until(b'\n', &mut buf) {
                Ok(0) | Err(_) => break,
                Ok(_) => {
                    let text = String::from_utf8_lossy(&buf);
                    let text = text.trim_end_matches(|c: char| c == '\r' || c == '\n');
                    let line = text.rsplit('\r').next().unwrap_or("");
                    if compact && line.trim().chars().count() <= 1 {
                        continue;
                    }
                    let _ = app.emit("build-log", BuildLog { stream: stream_name.into(), line: line.to_string() });
                }
            }
        }
    })
}

/// Runs `cmd` without a console window, streaming stdout/stderr to the Build
/// panel. With `installer` set it also waits for the output to drain completely.
fn run_command_streaming(app: &AppHandle, mut cmd: Command, installer: bool) -> std::io::Result<bool> {
    no_window(&mut cmd);
    let mut child = cmd.stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn()?;
    let mut readers = Vec::new();
    if let Some(out) = child.stdout.take() {
        readers.push(stream_lines(app.clone(), out, "stdout", installer));
    }
    if let Some(err) = child.stderr.take() {
        readers.push(stream_lines(app.clone(), err, "stderr", installer));
    }
    let status = child.wait()?;
    if installer {
        for r in readers {
            let _ = r.join();
        }
    }
    Ok(status.success())
}

fn run_and_stream(app: &AppHandle, cwd: &Path, args: &[&str], label: &str) -> bool {
    log(app, "info", format!("$ {label}"));
    let mut cmd = Command::new(npm_cmd());
    cmd.args(args).current_dir(cwd);
    match run_command_streaming(app, cmd, false) {
        Ok(ok) => ok,
        Err(e) => {
            log(app, "error", format!("Failed to start npm: {e}"));
            false
        }
    }
}

/// Shows `path` in the system file manager: a file is selected inside its
/// folder, a folder is opened.
#[cfg(windows)]
fn reveal(path: &Path) -> std::io::Result<()> {
    use std::os::windows::process::CommandExt;
    let native = path.to_string_lossy().replace('/', "\\");
    let mut cmd = Command::new("explorer.exe");
    if path.is_dir() {
        cmd.arg(&native);
    } else {
        // explorer needs `/select,"<path>"` as ONE argument with its own quoting.
        cmd.raw_arg(format!("/select,\"{native}\""));
    }
    cmd.spawn().map(|_| ()) // explorer.exe reports exit code 1 even on success: don't wait
}

#[cfg(target_os = "macos")]
fn reveal(path: &Path) -> std::io::Result<()> {
    let mut cmd = Command::new("open");
    if path.is_dir() {
        cmd.arg(path);
    } else {
        cmd.arg("-R").arg(path);
    }
    cmd.spawn().map(|_| ())
}

#[cfg(not(any(windows, target_os = "macos")))]
fn reveal(path: &Path) -> std::io::Result<()> {
    let dir = if path.is_dir() { path } else { path.parent().unwrap_or(path) };
    Command::new("xdg-open").arg(dir).spawn().map(|_| ())
}

#[tauri::command]
pub fn reveal_in_folder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path not found: {path}"));
    }
    reveal(p).map_err(|e| e.to_string())
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
        if !check_node_runtime(&app2) {
            let _ = app2.emit(
                "build-done",
                BuildDone {
                    success: false,
                    message: "Node.js was not found in PATH. See the log above.".into(),
                    zip_path: None,
                },
            );
            return;
        }
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
