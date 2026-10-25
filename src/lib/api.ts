import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { documentDir } from "@tauri-apps/api/path";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

/** Folder created inside the user's Documents directory for new projects. */
export const DEFAULT_PROJECT_DIR_NAME = "QChat Mini App Studio Project";

export type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileNode[];
};

export type ProjectInfo = {
  path: string;
  name: string;
  app_id: string;
  version: string;
  description: string;
  entry: string;
  permissions: string[];
};

export type RecentProject = {
  path: string;
  name: string;
  opened_at: number;
};

export type BuildLogLine = { stream: string; line: string };
export type BuildDone = { success: boolean; message: string; zip_path: string | null };

export type CreateProjectArgs = {
  parent_dir: string;
  name: string;
  app_id: string;
  description: string;
  version: string;
  permissions: string[];
};

export const ALL_PERMISSIONS = [
  { id: "toast", label: "toast", desc: "showToast" },
  { id: "storage", label: "storage", desc: "getStorage / setStorage / removeStorage" },
  { id: "user.profile", label: "user.profile", desc: "getUserInfo, request(/users/me, /friends)" },
  { id: "media.choose", label: "media.choose", desc: "chooseImage" },
  { id: "share", label: "share", desc: "share" },
  { id: "qchat.api", label: "qchat.api", desc: "request(/conversations)" },
] as const;

export const api = {
  /**
   * `<Documents>/QChat Mini App Studio Project`, created on disk so the folder
   * picker can open it directly.
   */
  defaultProjectDir: async () => {
    const docs = (await documentDir()).replace(/[\\/]+$/, "");
    const dir = `${docs}${sep(docs)}${DEFAULT_PROJECT_DIR_NAME}`;
    await api.createDirectory(dir).catch(() => {});
    return dir;
  },
  createProject: (args: CreateProjectArgs) => invoke<string>("create_project", { args }),
  openProject: (path: string) => invoke<ProjectInfo>("open_project", { path }),
  recentProjects: () => invoke<RecentProject[]>("recent_projects"),
  removeRecent: (path: string) => invoke<void>("remove_recent", { path }),
  listTree: (path: string) => invoke<FileNode>("list_tree", { path }),
  readFile: (path: string) => invoke<string>("read_file", { path }),
  writeFile: (path: string, content: string) => invoke<void>("write_file", { path, content }),
  createFile: (path: string) => invoke<void>("create_file", { path }),
  createDirectory: (path: string) => invoke<void>("create_directory", { path }),
  deletePath: (path: string) => invoke<void>("delete_path", { path }),
  renamePath: (oldPath: string, newPath: string) =>
    invoke<void>("rename_path", { oldPath, newPath }),
  buildProject: (projectPath: string) => invoke<void>("build_project", { projectPath }),
  startPreview: (projectPath: string) => invoke<string>("start_preview", { projectPath }),
  stopPreview: () => invoke<void>("stop_preview"),
  releaseZipPath: (projectPath: string) => invoke<string | null>("release_zip_path", { projectPath }),
  pickDirectory: async (defaultPath?: string) =>
    openDialog({
      directory: true,
      multiple: false,
      ...(defaultPath ? { defaultPath } : {}),
    }) as Promise<string | null>,
};

export function onBuildLog(cb: (line: BuildLogLine) => void): Promise<UnlistenFn> {
  return listen<BuildLogLine>("build-log", (e) => cb(e.payload));
}
export function onBuildDone(cb: (r: BuildDone) => void): Promise<UnlistenFn> {
  return listen<BuildDone>("build-done", (e) => cb(e.payload));
}

export function fileLanguage(path: string): "tsx" | "ts" | "js" | "json" | "html" | "css" | "text" {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".jsx")) return "js";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".css")) return "css";
  return "text";
}

export function fileName(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

function sep(path: string): string {
  return path.includes("\\") ? "\\" : "/";
}

/**
 * Folder name used for a project. Mirrors `sanitize_name` in
 * `src-tauri/src/commands/project.rs`: only characters Windows forbids become
 * `-`, everything else (spaces, Vietnamese letters) is kept as typed.
 */
export function projectFolderName(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .trim()
    .replace(/\.+$/, "")
    .trim();
  return Array.from(cleaned).slice(0, 64).join("");
}

/**
 * Absolute path a new project will be written to: exactly one level under the
 * chosen folder (`<parent>\<project name>`), never `<parent>\<something>\<name>`.
 */
export function projectPathPreview(parentDir: string, name: string): string {
  const parent = parentDir.trim().replace(/[\\/]+$/, "");
  const folder = projectFolderName(name);
  if (!folder) return parent;
  const last = parent.split(/[\\/]/).pop() ?? "";
  // The picked folder already is the project folder: use it as is.
  if (last.toLowerCase() === folder.toLowerCase()) return parent;
  return `${parent}${sep(parent)}${folder}`;
}

export function generateAppId(): string {
  const hex = "0123456789abcdef";
  let s = "";
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 16; i++) s += hex[arr[i] % 16];
  return "mp_" + s;
}
