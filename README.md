# QChat Mini App Studio

Một IDE kiểu Android Studio (giao diện Darcula) để code Mini App cho [QChat-3](https://github.com/nguyenphuquyet/QChat-3).
Viết bằng **TypeScript** (React + Vite + TailwindCSS + Lucide icons + JetBrains Mono font), build bằng **Tauri v2** (Rust backend).

## Tính năng

- **Màn hình Welcome** kiểu Android Studio: New Project / Open / Recent Projects.
- **Tạo dự án**: scaffold sẵn template React + Vite, có sẵn `@qchat/miniapp-sdk` được vendored trong `src/sdk/` (không phụ thuộc monorepo), `qchat.manifest.json` đúng chuẩn QChat (schemaVersion, appId `mp_…`, version semver, requestedPermissions). Thư mục mặc định là `Documents\QChat Mini App Studio Project` (tự tạo nếu chưa có) và dự án luôn được tạo ở tầng thứ nhất trong thư mục đã chọn — `<thư mục>\<tên dự án>`, không thêm thư mục trung gian.
- **Mở dự án**: import project mini app có sẵn (tự nhận diện `qchat.manifest.json`).
- **Giao diện y hệt Android Studio**: title bar + menu bar (File/Edit/View/Navigate/Code/Analyze/Refactor/Build/Run/Tools/VCS/Window/Help) + toolbar (Run xanh, Debug, Build, device selector "QChat Mini App Preview", SDK selector, Search Everywhere) + Project tool window trái + editor tabs + breadcrumb + gutter line numbers + syntax highlighting Darcula (CodeMirror 6) + bottom tool window (Build/Run/Preview/Terminal) + status bar (git branch, UTF-8, LF, line:col…).
- **Editor**: CodeMirror 6 với theme Darcula, highlight TS/TSX/JS/JSON/HTML/CSS, autocomplete, bracket matching, Ctrl+S save, tab dirty marker.
- **Build một chạm**: `npm install` → `vite build` → `scripts/package.mjs` tạo ZIP trong `release/`, log stream realtime vào tab Build.
- **Live Preview**: chạy mini app trong WebView mô phỏng (khung điện thoại 390×844), có inject sẵn **mock `QChatNative` bridge** nên `QChat.showToast`, `getAppInfo`, `getSystemInfo`, `getUserInfo`, `storage`, `chooseImage`, `share`, `request` hoạt động đúng như trên thiết bị.
- **Manifest panel** bên phải: chỉnh tên/appId/version/permissions và ghi thẳng vào `qchat.manifest.json`.
- **File tree**: new file / new directory / delete (context menu chuột phải), tự bỏ qua `node_modules`, `dist`, `release`, `.git`.

## Chạy (dev)

```bash
npm install
npm run tauri dev
```

## Build bản release

```bash
npm run tauri build
```

Output: `src-tauri/target/release/qchat-miniapp-studio` (Linux) / `.exe` / `.msi` (Windows) / `.dmg` (macOS), kèm installer (deb/AppImage/msi/dmg).

> Chỉ cần frontend (không cần Rust): `npm run build` → thư mục `dist/`.

## Cấu trúc

```
src/                     # TypeScript frontend (React)
  components/            # TopBar, ProjectTree, EditorArea, BottomPanel, StatusBar, WelcomeScreen, NewProjectDialog, ManifestPanel, CodeEditor
  lib/                   # api.ts (invoke wrappers), store.tsx (React context state)
src-tauri/
  src/
    commands/            # project.rs (tạo/mở dự án), fs.rs (đọc/ghi file), build.rs (npm build + preview server)
    templates.rs         # template nhúng + mock bridge JS
    templates/           # file template mini app (React + Vite + SDK vendored)
  icons/                 # icon ứng dụng
```

## GitHub Actions (build đa nền tảng)

Đã kèm sẵn 2 workflow trong `.github/workflows/`:

- `ci.yml` — chạy trên mỗi push/PR: typecheck + build frontend + `cargo check` (Linux).
- `release.yml` — khi push tag `v*` (ví dụ `git tag v1.0.0 && git push --tags`): build song song **Windows (.msi/.exe), macOS (.dmg), Linux (.AppImage/.deb)** bằng `tauri-apps/tauri-action` và tạo draft release kèm artifact.

```bash
git init && git add . && git commit -m "QChat Mini App Studio"
git tag v1.0.0 && git push origin main --tags
```

## Lưu ý

- File ZIP sau build nằm trong `<dự án>/release/<appId>-<version>.zip`, upload lên QChat Developer Center hoặc qua API `POST /api/miniapps/developer/apps/:appId/builds` với `X-QChat-Key`.
- `appId` phải khớp với app đã tạo trong Developer Center (định dạng `mp_<12-24 ký tự hex>`).
