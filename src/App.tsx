import { useEffect, useRef, useState } from "react";
import {
  FolderTree, Braces, GitBranch, Hammer, Smartphone, ChevronDown,
} from "lucide-react";
import { useStudio } from "./lib/store";
import { api } from "./lib/api";
import TopBar from "./components/TopBar";
import ProjectTree from "./components/ProjectTree";
import EditorArea from "./components/EditorArea";
import BottomPanel from "./components/BottomPanel";
import StatusBar from "./components/StatusBar";
import WelcomeScreen from "./components/WelcomeScreen";
import NewProjectDialog from "./components/NewProjectDialog";
import ManifestPanel from "./components/ManifestPanel";

export default function App() {
  const s = useStudio();
  const [leftW, setLeftW] = useState(240);
  const [rightW, setRightW] = useState(260);
  const [bottomH, setBottomH] = useState(230);
  const [bottomVisible, setBottomVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);
  const dragging = useRef<null | "left" | "right" | "bottom">(null);

  // Handle "Open Project" dialog from anywhere (menu / welcome).
  useEffect(() => {
    if (s.dialog === "open") {
      (async () => {
        const dir = await api.pickDirectory();
        if (dir) await s.doOpenProject(dir);
        s.setDialog(null);
      })();
    }
  }, [s.dialog]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      if (dragging.current === "left") setLeftW(Math.max(160, Math.min(480, e.clientX - 28)));
      if (dragging.current === "right") setRightW(Math.max(200, Math.min(420, window.innerWidth - e.clientX)));
      if (dragging.current === "bottom") setBottomH(Math.max(120, Math.min(500, window.innerHeight - e.clientY - 24)));
    };
    const onUp = () => (dragging.current = null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!s.project) {
    return (
      <div className="h-screen flex flex-col">
        <WelcomeScreen />
        <NewProjectDialog />
        {s.toast && <Toast msg={s.toast} />}
      </div>
    );
  }

  const stripIcon = (Icon: any, active: boolean, title: string, onClick: () => void) => (
    <button
      key={title}
      title={title}
      onClick={onClick}
      className={`w-7 h-7 grid place-items-center border-l-2 ${active ? "border-darcula-accent text-white bg-white/5" : "border-transparent text-darcula-dim hover:text-white"}`}
    >
      <Icon size={15} />
    </button>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />

      <div className="flex-1 flex min-h-0">
        {/* Left tool strip */}
        <div className="w-7 bg-darcula-panel border-r border-black/40 flex flex-col items-center py-1 gap-0.5 shrink-0">
          {stripIcon(FolderTree, true, "Project", () => {})}
          {stripIcon(Braces, false, "Structure", () => s.showToast("Structure view coming soon"))}
          {stripIcon(GitBranch, false, "Git", () => s.showToast("Git integration coming soon"))}
          <div className="flex-1" />
          {stripIcon(Hammer, bottomVisible && s.bottomTab === "build", "Build", () => { setBottomVisible(true); s.setBottomTab("build"); })}
          {stripIcon(Smartphone, bottomVisible && s.bottomTab === "preview", "Preview", () => { setBottomVisible(true); s.setBottomTab("preview"); if (!s.previewUrl) s.runPreview(); })}
          <button
            title={bottomVisible ? "Hide tool window" : "Show tool window"}
            onClick={() => setBottomVisible((v) => !v)}
            className="w-7 h-7 grid place-items-center text-darcula-dim hover:text-white"
          >
            <ChevronDown size={15} className={bottomVisible ? "" : "rotate-180"} />
          </button>
        </div>

        {/* Project tree */}
        <div style={{ width: leftW }} className="shrink-0 min-w-0">
          <ProjectTree />
        </div>
        <div
          className="w-1 cursor-col-resize bg-transparent hover:bg-darcula-accent/50 shrink-0"
          onMouseDown={() => (dragging.current = "left")}
        />

        {/* Center: editor + bottom */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <EditorArea />
          </div>
          {bottomVisible && (
            <div
              className="h-1 cursor-row-resize bg-transparent hover:bg-darcula-accent/50 shrink-0"
              onMouseDown={() => (dragging.current = "bottom")}
            />
          )}
          {bottomVisible && (
            <div style={{ height: bottomH }} className="shrink-0 min-h-0">
              <BottomPanel onHide={() => setBottomVisible(false)} />
            </div>
          )}
        </div>

        {/* Right manifest panel */}
        {rightVisible && (
          <>
            <div
              className="w-1 cursor-col-resize bg-transparent hover:bg-darcula-accent/50 shrink-0"
              onMouseDown={() => (dragging.current = "right")}
            />
            <div style={{ width: rightW }} className="shrink-0 min-w-0">
              <ManifestPanel onClose={() => setRightVisible(false)} />
            </div>
          </>
        )}
        {!rightVisible && (
          <button
            className="w-6 bg-darcula-panel border-l border-black/40 text-darcula-dim hover:text-white text-2xs [writing-mode:vertical-rl] flex items-center justify-center gap-2"
            onClick={() => setRightVisible(true)}
            title="Show Manifest"
          >
            <Braces size={12} /> Manifest
          </button>
        )}
      </div>

      <StatusBar />
      <NewProjectDialog />
      {s.toast && <Toast msg={s.toast} />}
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded bg-[#214283] text-white text-xs shadow-2xl border border-darcula-accent/40">
      {msg}
    </div>
  );
}
