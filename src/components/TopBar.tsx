import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  Play, Bug, Hammer, ChevronDown, Search, Settings, Minus, X, Square,
  FolderOpen, FilePlus2, Save, SaveAll, Undo2, Redo2, FileCode2, Smartphone,
  ZoomIn, ZoomOut,
} from "lucide-react";
import { useStudio } from "../lib/store";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type WinAction = "minimize" | "toggleMaximize" | "close" | "startDragging";

/**
 * Cached handle to the current Tauri window.
 *
 * The window handle is imported lazily (kept out of the browser-only bundle path)
 * but the resulting promise is memoised and warmed on mount, so `startDragging()`
 * can fire during the very mousedown that asked for it — otherwise the title bar
 * feels unresponsive while the module is still loading.
 */
let winPromise: Promise<import("@tauri-apps/api/window").Window> | null = null;

function currentWindow() {
  if (!isTauri) return null;
  winPromise ??= import("@tauri-apps/api/window").then((m) => m.getCurrentWindow());
  return winPromise;
}

async function winAction(action: WinAction) {
  const pending = currentWindow();
  if (!pending) return;
  try {
    const w = await pending;
    if (action === "minimize") await w.minimize();
    if (action === "toggleMaximize") await w.toggleMaximize();
    if (action === "close") await w.close();
    if (action === "startDragging") await w.startDragging();
  } catch {
    /* noop in browser */
  }
}

/** True when the event landed on (or inside) an element marked `.no-drag`. */
function isInteractive(target: EventTarget | null) {
  return target instanceof Element && target.closest(".no-drag") !== null;
}

const MENUS: Record<string, { label: string; icon?: any; action?: string; sep?: boolean }[]> = {
  File: [
    { label: "New Mini App Project…", icon: FilePlus2, action: "new" },
    { label: "Open…", icon: FolderOpen, action: "open" },
    { sep: true, label: "" },
    { label: "Save", icon: Save, action: "save" },
    { label: "Save All", icon: SaveAll, action: "saveAll" },
    { sep: true, label: "" },
    { label: "Close Project", icon: FileCode2, action: "closeProject" },
  ],
  Edit: [
    { label: "Undo", icon: Undo2, action: "undo" },
    { label: "Redo", icon: Redo2, action: "redo" },
  ],
  View: [
    { label: "Tool Windows >", action: "" },
    { label: "Appearance >", action: "" },
  ],
  Navigate: [{ label: "Search Everywhere", action: "" }],
  Code: [{ label: "Override Methods…", action: "" }],
  Analyze: [{ label: "Inspect Code…", action: "" }],
  Refactor: [{ label: "Rename…", action: "" }],
  Build: [
    { label: "Build Mini App (ZIP)", icon: Hammer, action: "build" },
    { label: "Rebuild Project", action: "build" },
  ],
  Run: [
    { label: "Run 'app'", icon: Play, action: "run" },
    { label: "Preview in IDE", icon: Smartphone, action: "preview" },
  ],
  Tools: [{ label: "SDK Manager…", action: "" }],
  VCS: [{ label: "Create Git Repository…", action: "" }],
  Window: [{ label: "Restore Default Layout", action: "" }],
  Help: [{ label: "About QChat Mini App Studio", action: "about" }],
};

export default function TopBar() {
  const s = useStudio();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Warm the window handle so the first title-bar drag reacts immediately.
  useEffect(() => {
    void currentWindow()?.catch(() => undefined);
  }, []);

  /**
   * Window dragging. Tauri ignores Electron's `-webkit-app-region: drag`, so the
   * drag has to be started from JS on mousedown. Anything marked `.no-drag`
   * (window buttons, menu entries) keeps its normal click behaviour.
   */
  const onTitleBarMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isInteractive(e.target)) return;
    e.preventDefault();
    void winAction("startDragging");
  };

  const onTitleBarDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (isInteractive(e.target)) return;
    void winAction("toggleMaximize");
  };

  const runAction = (action?: string) => {
    setOpenMenu(null);
    if (!action) return;
    switch (action) {
      case "new": s.setDialog("new"); break;
      case "open": s.setDialog("open"); break;
      case "save": if (s.activePath) s.saveFile(s.activePath); break;
      case "saveAll": s.saveAll(); break;
      case "closeProject": s.closeProject(); break;
      case "build": s.runBuild(); break;
      case "run": void (async () => { await s.runBuild(); })(); break;
      case "preview": s.runPreview(); break;
      case "about": s.showToast("QChat Mini App Studio 1.0 — Tauri + TypeScript"); break;
    }
  };

  const activeFile = s.openFiles.find((f) => f.path === s.activePath);

  return (
    <div className="flex flex-col bg-darcula-bg border-b border-black/40 select-none">
      {/* Title bar (custom-drawn: the window is created with `decorations: false`) */}
      <div
        className="drag-region flex items-center h-9 px-2 text-2xs text-darcula-dim"
        onMouseDown={onTitleBarMouseDown}
        onDoubleClick={onTitleBarDoubleClick}
      >
        <div className="no-drag flex items-center gap-2 w-48">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-800 grid place-items-center text-white text-[0.625rem] font-bold font-mono">{"</>"}</div>
          <span className="text-darcula-text font-medium">QChat Mini App Studio</span>
        </div>
        <div className="flex-1 text-center truncate px-4">
          {activeFile ? `${activeFile.name} — ${s.project?.name ?? ""}` : "QChat Mini App Studio"}
        </div>
        <div className="no-drag flex items-center gap-1">
          <button onClick={() => winAction("minimize")} className="p-1.5 hover:bg-white/10 rounded"><Minus size={14} /></button>
          <button onClick={() => winAction("toggleMaximize")} className="p-1.5 hover:bg-white/10 rounded"><Square size={12} /></button>
          <button onClick={() => winAction("close")} className="p-1.5 hover:bg-red-500/80 hover:text-white rounded"><X size={14} /></button>
        </div>
      </div>

      {/* Menu bar */}
      <div className="no-drag flex items-center h-7 px-2 text-2xs relative z-30">
        {Object.keys(MENUS).map((m) => (
          <div key={m} className="relative" onMouseEnter={() => openMenu && setOpenMenu(m)}>
            <button
              className={`px-2.5 py-1 rounded ${openMenu === m ? "bg-darcula-hover text-white" : "hover:bg-white/5"}`}
              onClick={() => setOpenMenu(openMenu === m ? null : m)}
            >
              {m}
            </button>
            {openMenu === m && (
              <div className="absolute top-full left-0 mt-0.5 min-w-[220px] bg-darcula-panel border border-black/50 rounded-sm shadow-2xl py-1 text-darcula-text">
                {MENUS[m].map((item, i) =>
                  item.sep ? (
                    <div key={i} className="h-px bg-white/10 my-1" />
                  ) : (
                    <button
                      key={i}
                      onClick={() => runAction(item.action)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-darcula-hover hover:text-white text-left disabled:opacity-40"
                      disabled={!item.action}
                    >
                      {item.icon && <item.icon size={13} className="text-darcula-dim" />}
                      <span className="flex-1">{item.label}</span>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 text-darcula-dim">
          <button
            onClick={s.zoomOut}
            disabled={s.uiScale <= 0.85}
            title="Thu nhỏ giao diện (Ctrl+-)"
            className="p-1 rounded hover:bg-white/10 disabled:opacity-40"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={s.resetZoom}
            title="Cỡ giao diện mặc định (Ctrl+0)"
            className="w-9 text-[0.625rem] tabular-nums hover:text-white"
          >
            {Math.round(s.uiScale * 100)}%
          </button>
          <button
            onClick={s.zoomIn}
            disabled={s.uiScale >= 1.8}
            title="Phóng to giao diện (Ctrl+=)"
            className="p-1 rounded hover:bg-white/10 disabled:opacity-40"
          >
            <ZoomIn size={13} />
          </button>
          <Settings size={13} className="ml-1 hover:text-white cursor-pointer" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="no-drag flex items-center h-9 px-3 gap-1 border-t border-black/30 text-darcula-text">
        <button className="p-1.5 rounded hover:bg-white/5 text-darcula-dim" title="Back"><ChevronDown size={15} className="-rotate-90" /></button>
        <button className="p-1.5 rounded hover:bg-white/5 text-darcula-dim" title="Forward"><ChevronDown size={15} className="rotate-90" /></button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button
          onClick={() => void (async () => { await s.runBuild(); })}
          disabled={!s.project || s.buildRunning}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-darcula-green/90 hover:bg-darcula-green text-white text-xs font-medium disabled:opacity-40"
          title="Run 'app' (build + preview)"
        >
          <Play size={13} fill="currentColor" />
          <span>Run</span>
          <ChevronDown size={12} />
        </button>
        <button className="p-1.5 rounded hover:bg-white/5 text-darcula-green" title="Debug 'app' (coming soon)"><Bug size={15} /></button>
        <button
          onClick={() => s.runBuild()}
          disabled={!s.project || s.buildRunning}
          className="p-1.5 rounded hover:bg-white/5 disabled:opacity-40"
          title="Build Mini App (ZIP)"
        >
          <Hammer size={15} />
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 text-2xs border border-white/10">
          <Smartphone size={13} className="text-darcula-accent" />
          <span>QChat Mini App Preview</span>
          <span className="text-darcula-dim">390 × 844</span>
          <ChevronDown size={12} className="text-darcula-dim" />
        </button>
        <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 text-2xs border border-white/10">
          <span className="text-darcula-accent">SDK</span>
          <span>Mini App SDK 1.0.0</span>
          <ChevronDown size={12} className="text-darcula-dim" />
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-darcula-editor border border-white/5 text-darcula-dim text-2xs w-64">
          <Search size={12} />
          <span className="flex-1">Search Everywhere</span>
          <kbd className="px-1 rounded bg-white/10 text-[0.625rem]">⇧⇧</kbd>
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center text-white text-xs font-bold ml-1">Q</div>
      </div>
    </div>
  );
}
