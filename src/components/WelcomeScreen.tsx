import { useEffect } from "react";
import {
  FolderOpen, FilePlus2, Clock, Trash2, Settings, Puzzle, GraduationCap,
  FolderGit2, ChevronRight,
} from "lucide-react";
import { useStudio } from "../lib/store";
import { api } from "../lib/api";

const NAV = [
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "customize", label: "Customize", icon: Settings },
  { id: "plugins", label: "Plugins", icon: Puzzle },
  { id: "learn", label: "Learn", icon: GraduationCap },
];

export default function WelcomeScreen() {
  const s = useStudio();

  useEffect(() => {
    if (s.dialog === "open") {
      (async () => {
        const dir = await api.pickDirectory();
        if (dir) await s.doOpenProject(dir);
        s.setDialog(null);
      })();
    }
  }, [s.dialog]);

  return (
    <div className="h-full flex bg-darcula-bg">
      {/* Left nav */}
      <div className="w-56 bg-[#333537] border-r border-black/40 py-6 flex flex-col">
        <div className="px-5 mb-8">
          <div className="text-white font-semibold text-sm">QChat Mini App Studio</div>
          <div className="text-2xs text-darcula-dim mt-0.5">Version 1.0.0 · Tauri + TypeScript</div>
        </div>
        {NAV.map((n, i) => (
          <button
            key={n.id}
            className={`flex items-center gap-3 px-5 py-2.5 text-xs ${i === 0 ? "bg-white/10 text-white border-l-2 border-darcula-accent" : "text-darcula-dim hover:bg-white/5 border-l-2 border-transparent"}`}
          >
            <n.icon size={15} />
            {n.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="px-5 text-2xs text-darcula-dim/70">
          Build QChat Mini Apps (React + Vite) and package them as immutable ZIPs for the QChat runtime.
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col p-8 overflow-auto">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => s.setDialog("new")}
            className="flex items-center gap-2 px-4 py-2 rounded bg-darcula-green hover:bg-emerald-600 text-white text-xs font-medium"
          >
            <FilePlus2 size={14} /> New Project
          </button>
          <button
            onClick={() => s.setDialog("open")}
            className="flex items-center gap-2 px-4 py-2 rounded bg-white/10 hover:bg-white/15 text-white text-xs"
          >
            <FolderOpen size={14} /> Open
          </button>
          <div className="flex-1" />
          <div className="text-2xs text-darcula-dim flex items-center gap-1">
            <Clock size={11} /> Recent Projects
          </div>
        </div>

        <div className="bg-darcula-editor rounded-lg border border-black/30 overflow-hidden">
          {s.recent.length === 0 ? (
            <div className="p-10 text-center text-darcula-dim text-xs">
              No recent projects. Create your first QChat Mini App.
            </div>
          ) : (
            s.recent.map((r) => (
              <div
                key={r.path}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 group"
                onClick={() => s.doOpenProject(r.path)}
              >
                <FolderGit2 size={16} className="text-darcula-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate">{r.name}</div>
                  <div className="text-2xs text-darcula-dim truncate">{r.path}</div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-darcula-dim"
                  onClick={(e) => { e.stopPropagation(); s.removeRecent(r.path); s.loadRecent(); }}
                  title="Remove from list"
                >
                  <Trash2 size={12} />
                </button>
                <ChevronRight size={14} className="text-darcula-dim" />
              </div>
            ))
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { t: "Mini App format", d: "React + Vite, vendored @qchat/miniapp-sdk, qchat.manifest.json" },
            { t: "One-click build", d: "npm install → vite build → ZIP package in release/" },
            { t: "Live preview", d: "Mock QChatNative bridge inside a simulated WebView" },
          ].map((c) => (
            <div key={c.t} className="p-4 rounded-lg bg-white/5 border border-white/5">
              <div className="text-xs text-white font-medium mb-1">{c.t}</div>
              <div className="text-2xs text-darcula-dim leading-relaxed">{c.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
