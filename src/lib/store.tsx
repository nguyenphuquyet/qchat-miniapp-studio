import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  api,
  fileLanguage,
  fileName,
  onBuildDone,
  onBuildLog,
  type BuildDone,
  type BuildLogLine,
  type CreateProjectArgs,
  type FileNode,
  type ProjectInfo,
  type RecentProject,
} from "./api";
import { useI18n } from "./i18n";

export type OpenFile = {
  path: string;
  name: string;
  language: ReturnType<typeof fileLanguage>;
  content: string;
  dirty: boolean;
};

export type BottomTab = "build" | "run" | "preview" | "terminal";

/**
 * UI zoom: `--ui-scale` multiplies the `html` font size, and every rem-based
 * Tailwind size (text, spacing, icon boxes) follows it. Defaults to 1.15 because
 * a 100% desktop UI reads too small on high-DPI screens.
 */
const UI_SCALE_KEY = "qchat.uiScale";
const UI_SCALE_DEFAULT = 1.15;
const UI_SCALE_MIN = 0.85;
const UI_SCALE_MAX = 1.8;
const UI_SCALE_STEP = 0.05;

function clampScale(n: number) {
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Math.round(n * 100) / 100));
}

function readStoredScale() {
  try {
    const saved = Number(window.localStorage.getItem(UI_SCALE_KEY));
    if (Number.isFinite(saved) && saved >= UI_SCALE_MIN && saved <= UI_SCALE_MAX) return clampScale(saved);
  } catch {
    /* storage unavailable */
  }
  return UI_SCALE_DEFAULT;
}

type StudioState = {
  project: ProjectInfo | null;
  tree: FileNode | null;
  recent: RecentProject[];
  openFiles: OpenFile[];
  activePath: string | null;
  buildLogs: BuildLogLine[];
  buildRunning: boolean;
  buildResult: BuildDone | null;
  previewUrl: string | null;
  bottomTab: BottomTab;
  rightOpen: boolean;
  cursor: { line: number; col: number };
  dialog: null | "new" | "open";
  toast: string | null;
  uiScale: number;
  clearBuildLogs: () => void;
  loadRecent: () => void;
  doOpenProject: (path: string) => Promise<void>;
  doCreateProject: (args: CreateProjectArgs) => Promise<void>;
  closeProject: () => void;
  refreshTree: () => void;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  saveAll: () => Promise<void>;
  runBuild: () => Promise<void>;
  runPreview: () => Promise<void>;
  setBottomTab: (t: BottomTab) => void;
  setRightOpen: (v: boolean) => void;
  setUiScale: (n: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setCursor: (line: number, col: number) => void;
  setDialog: (d: null | "new" | "open") => void;
  showToast: (msg: string) => void;
  deleteFile: (path: string) => Promise<void>;
  newFile: (dir: string, name: string) => Promise<void>;
  removeRecent: (path: string) => void;
  updateManifest: (patch: Partial<ProjectInfo> & { permissions?: string[] }) => Promise<void>;
};

const Ctx = createContext<StudioState | null>(null);

export function useStudio(): StudioState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudio outside provider");
  return v;
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [tree, setTree] = useState<FileNode | null>(null);
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [buildLogs, setBuildLogs] = useState<BuildLogLine[]>([]);
  const [buildRunning, setBuildRunning] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildDone | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("build");
  const [rightOpen, setRightOpen] = useState(true);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [dialog, setDialog] = useState<null | "new" | "open">(null);
  const [toast, setToast] = useState<string | null>(null);
  const [uiScale, setUiScale] = useState(readStoredScale);
  const toastTimer = useRef<number | null>(null);

  // `t` with a stable identity (reads the current language through a ref), so the
  // callbacks / subscriptions below are not recreated every time the language changes.
  const { t: tCurrent } = useI18n();
  const tRef = useRef(tCurrent);
  tRef.current = tCurrent;
  const t = useCallback<typeof tCurrent>((key, vars) => tRef.current(key, vars), []);

  // Apply + persist the UI zoom. `--ui-scale` is consumed by `html` in index.css.
  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(uiScale));
    try {
      window.localStorage.setItem(UI_SCALE_KEY, String(uiScale));
    } catch {
      /* storage unavailable */
    }
  }, [uiScale]);

  const zoomIn = useCallback(() => setUiScale((s) => clampScale(s + UI_SCALE_STEP)), []);
  const zoomOut = useCallback(() => setUiScale((s) => clampScale(s - UI_SCALE_STEP)), []);
  const resetZoom = useCallback(() => setUiScale(UI_SCALE_DEFAULT), []);

  // Ctrl/Cmd + `+` / `-` / `0` — the shortcuts an IDE user expects.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, resetZoom]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadRecent = useCallback(() => {
    api.recentProjects().then(setRecent).catch(() => {});
  }, []);

  useEffect(() => {
    loadRecent();
    let unlog: (() => void) | undefined;
    let undone: (() => void) | undefined;
    onBuildLog((line) => setBuildLogs((prev) => [...prev.slice(-400), line])).then((u) => (unlog = u));
    onBuildDone((r) => {
      setBuildRunning(false);
      setBuildResult(r);
      setBottomTab("build");
      showToast(t(r.success ? "toast.buildSucceeded" : "toast.buildFailed"));
    }).then((u) => (undone = u));
    return () => {
      unlog?.();
      undone?.();
    };
  }, [loadRecent, showToast, t]);

  const refreshTree = useCallback(() => {
    if (!project) return;
    api.listTree(project.path).then(setTree).catch((e) => showToast(String(e)));
  }, [project, showToast]);

  const doOpenProject = useCallback(
    async (path: string) => {
      try {
        const info = await api.openProject(path);
        setProject(info);
        setOpenFiles([]);
        setActivePath(null);
        setBuildResult(null);
        setPreviewUrl(null);
        setBuildLogs([]);
        loadRecent();
        const fileTree = await api.listTree(path);
        setTree(fileTree);
        // Auto-open manifest + App.tsx
        const manifestPath = path + "/qchat.manifest.json";
        const appPath = path + "/src/App.tsx";
        await openFilePath(manifestPath);
        await openFilePath(appPath);
        showToast(t("toast.opened", { name: info.name }));
      } catch (e) {
        showToast(String(e));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadRecent, showToast, t],
  );

  const openFilePath = useCallback(async (path: string) => {
    setOpenFiles((prev) => {
      if (prev.some((f) => f.path === path)) return prev;
      return prev;
    });
    setActivePath(path);
    try {
      const content = await api.readFile(path);
      setOpenFiles((prev) => {
        if (prev.some((f) => f.path === path)) {
          return prev.map((f) => (f.path === path ? { ...f, content } : f));
        }
        return [
          ...prev,
          { path, name: fileName(path), language: fileLanguage(path), content, dirty: false },
        ];
      });
    } catch (e) {
      showToast(String(e));
    }
  }, [showToast]);

  const doCreateProject = useCallback(
    async (args: CreateProjectArgs) => {
      const path = await api.createProject(args);
      setDialog(null);
      await doOpenProject(path);
    },
    [doOpenProject],
  );

  const closeProject = useCallback(() => {
    setProject(null);
    setTree(null);
    setOpenFiles([]);
    setActivePath(null);
    setBuildLogs([]);
    setBuildResult(null);
    setPreviewUrl(null);
    loadRecent();
  }, [loadRecent]);

  const closeTab = useCallback(
    (path: string) => {
      setOpenFiles((prev) => {
        const idx = prev.findIndex((f) => f.path === path);
        const next = prev.filter((f) => f.path !== path);
        if (activePath === path) {
          const newActive = next[Math.min(idx, next.length - 1)];
          setActivePath(newActive ? newActive.path : null);
        }
        // Auto-save on close
        const closing = prev.find((f) => f.path === path);
        if (closing?.dirty) {
          api.writeFile(path, closing.content).catch(() => {});
        }
        return next;
      });
    },
    [activePath],
  );

  const setActive = useCallback((path: string) => setActivePath(path), []);

  const updateContent = useCallback((path: string, content: string) => {
    setOpenFiles((prev) => prev.map((f) => (f.path === path ? { ...f, content, dirty: true } : f)));
  }, []);

  const saveFile = useCallback(
    async (path: string) => {
      const f = openFiles.find((x) => x.path === path);
      if (!f || !f.dirty) return;
      await api.writeFile(path, f.content);
      setOpenFiles((prev) => prev.map((x) => (x.path === path ? { ...x, dirty: false } : x)));
      if (path.endsWith("qchat.manifest.json")) {
        // reload project info
        if (project) api.openProject(project.path).then(setProject).catch(() => {});
      }
      showToast(t("toast.fileSaved"));
    },
    [openFiles, project, showToast, t],
  );

  const saveAll = useCallback(async () => {
    for (const f of openFiles) {
      if (f.dirty) await api.writeFile(f.path, f.content);
    }
    setOpenFiles((prev) => prev.map((x) => ({ ...x, dirty: false })));
    showToast(t("toast.allSaved"));
  }, [openFiles, showToast, t]);

  const clearBuildLogs = useCallback(() => {
    setBuildLogs([]);
    setBuildResult(null);
  }, []);

  const runBuild = useCallback(async () => {
    if (!project || buildRunning) return;
    await saveAll();
    setBuildLogs([]);
    setBuildResult(null);
    setBuildRunning(true);
    setBottomTab("build");
    try {
      await api.buildProject(project.path);
    } catch (e) {
      setBuildRunning(false);
      showToast(String(e));
    }
  }, [project, buildRunning, saveAll, showToast]);

  const runPreview = useCallback(async () => {
    if (!project) return;
    try {
      const url = await api.startPreview(project.path);
      setPreviewUrl(url + "?t=" + Date.now());
      setBottomTab("preview");
      showToast(t("toast.previewStarted"));
    } catch (e) {
      showToast(String(e));
    }
  }, [project, showToast, t]);

  const deleteFile = useCallback(
    async (path: string) => {
      await api.deletePath(path);
      setOpenFiles((prev) => prev.filter((f) => f.path !== path));
      refreshTree();
    },
    [refreshTree],
  );

  const newFile = useCallback(
    async (dir: string, name: string) => {
      await api.createFile(dir + "/" + name);
      refreshTree();
      openFilePath(dir + "/" + name);
    },
    [refreshTree, openFilePath],
  );

  const updateManifest = useCallback(
    async (patch: Partial<ProjectInfo> & { permissions?: string[] }) => {
      if (!project) return;
      const manifestPath = project.path + "/qchat.manifest.json";
      let manifest: any = {};
      try {
        manifest = JSON.parse(await api.readFile(manifestPath));
      } catch {
        manifest = {};
      }
      if (patch.name) manifest.name = patch.name;
      if (patch.description !== undefined) manifest.description = patch.description;
      if (patch.version) manifest.version = patch.version;
      if (patch.app_id) manifest.appId = patch.app_id;
      if (patch.permissions) manifest.requestedPermissions = patch.permissions;
      const content = JSON.stringify(manifest, null, 2) + "\n";
      await api.writeFile(manifestPath, content);
      setOpenFiles((prev) =>
        prev.map((f) => (f.path === manifestPath ? { ...f, content, dirty: false } : f)),
      );
      const info = await api.openProject(project.path);
      setProject(info);
      showToast(t("toast.manifestUpdated"));
    },
    [project, showToast, t],
  );

  const value: StudioState = {
    project, tree, recent, openFiles, activePath, buildLogs, buildRunning, buildResult,
    previewUrl, bottomTab, rightOpen, cursor, dialog, toast, uiScale,
    loadRecent, doOpenProject, doCreateProject, closeProject, refreshTree,
    openFile: openFilePath, closeTab, setActive, updateContent, saveFile, saveAll,
    runBuild, runPreview, setBottomTab, setRightOpen, clearBuildLogs,
    setUiScale: (n: number) => setUiScale(clampScale(n)),
    zoomIn, zoomOut, resetZoom,
    setCursor: (line: number, col: number) => setCursor({ line, col }),
    setDialog, showToast,
    deleteFile, newFile, updateManifest,
    removeRecent: (path: string) => { api.removeRecent(path).then(loadRecent).catch(() => {}); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
