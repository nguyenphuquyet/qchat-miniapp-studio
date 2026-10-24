# Bundled Node.js runtime

Everything in this folder **except this README** is generated and ignored by git.

CI stages the official Node.js Windows build here right before `tauri build`
(`.github/workflows/build-windows.yml` and `.github/workflows/release.yml`), so the
installer ships its own Node.js + npm:

```
resources/node/
  node.exe
  npm.cmd
  npx.cmd
  node_modules/npm/bin/npm-cli.js
  ...
```

At runtime `src-tauri/src/commands/build.rs` looks for this folder inside the app
resources and, when `node.exe` + `node_modules/npm/bin/npm-cli.js` are found, runs
project builds with `node npm-cli.js install` / `node npm-cli.js run build`
instead of the system-wide `npm`. If the folder is missing (macOS/Linux builds,
`npm run tauri dev`, or the plain portable `.exe`), the studio falls back to the
npm installed on the machine.

To stage the runtime locally:

```powershell
$src = Split-Path (Get-Command node).Source -Parent
New-Item -ItemType Directory -Force src-tauri/resources/node | Out-Null
Copy-Item "$src\*" src-tauri/resources/node -Recurse -Force
```
