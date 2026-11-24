import { useEffect, useRef, useState } from "react";
import { Files, Search, GitBranch, Play, Puzzle, Settings, CircleUser } from "lucide-react";
import { useStudio } from "./lib/store";
import { api } from "./lib/api";
import { useI18n } from "./lib/i18n";
import TopBar from "./components/TopBar";
import ProjectTree from "./components/ProjectTree";
import EditorArea from "./components/EditorArea";
import BottomPanel from "./components/BottomPanel";
import StatusBar from "./components/StatusBar";
import WelcomeScreen from "./components/WelcomeScreen";
import NewProjectDialog from "./components/NewProjectDialog";
import NodeInstallDialog from "./components/NodeInstallDialog";
import RightPanel from "./components/RightPanel";

const ACTIVITY_W = 48;

export default function App() {
  const s = useStudio();
  const { t } = useI18n();
  const [leftW, setLeftW] = useState(240);
  const [rightW, setRightW] = useState(300);
  const [bottomH, setBottomH] = useState(230);
  const dragging = useRef<null | "left" | "right" | "bottom">(null);

  // Handle "Open Project" from anywhere (menu / welcome). The picker must only
  // run once: WelcomeScreen used to start a second `pickDirectory()` call, and
  // two concurrent native dialogs made "Open" look broken. Failures are shown
  // instead of being swallowed by an unhandled rejection.
  const openingRef = useRef(false);
  useEffect(() => {
    if (s.dialog !== "open") return;
    // Clear the request first so a second click can open the picker again later.
    s.setDialog(null);
    if (openingRef.current) return;
    openingRef.current = true;
    void (async () => {
      try {
        const dir = await api.pickDirectory(s.project?.path);
        if (dir) await s.doOpenProject(dir);
      } catch (e) {
        s.showToast(String(e));
      } finally {
        openingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.dialog]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      if (dragging.current === "left") setLeftW(Math.max(160, Math.min(480, e.clientX - ACTIVITY_W)));
      if (dragging.current === "right") setRightW(Math.max(240, Math.min(640, window.innerWidth - e.clientX)));
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

  // The phone preview needs more room than the manifest form.
  useEffect(() => {
    if (s.rightOpen && s.rightTab === "preview") setRightW((w) => Math.max(w, 380));
  }, [s.rightOpen, s.rightTab]);

  if (!s.project) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-ide-editor">
        {/* The window has `decorations: false`, so the title bar is the frame:
            it must stay mounted on the welcome screen too. */}
        <TopBar />
        <div className="min-h-0 flex-1">
          <WelcomeScreen />
        </div>
        <NewProjectDialog />
        {s.toast && <Toast msg={s.toast} />}
      </div>
    );
  }

  const activity = (Icon: any, active: boolean, title: string, onClick: () => void) => (
    <button
      key={title}
      title={title}
      onClick={onClick}
      className={`relative grid h-12 w-12 shrink-0 place-items-center border-l-2 transition-colors ${
        active
          ? "border-ide-accent text-ide-text"
          : "border-transparent text-ide-dim hover:text-ide-text"
      }`}
    >
      <Icon size={22} strokeWidth={1.6} />
    </button>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ide-editor text-ide-text">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <div className="flex w-12 shrink-0 flex-col items-center bg-ide-activity">
          {activity(Files, true, t("tree.title"), () => {})}
          {activity(Search, false, t("toolbar.searchEverywhere"), () => s.showToast(t("toolbar.searchEverywhere")))}
          {activity(GitBranch, false, "Source Control", () => s.showToast(t("toast.gitSoon")))}
          {activity(Play, false, "Run and Debug", () => {
            s.setBottomVisible(true);
            s.setBottomTab("build");
          })}
          {activity(Puzzle, false, "Extensions", () => s.showToast(t("toast.structureSoon")))}
          <div className="flex-1" />
          {activity(Settings, false, "Settings", () => s.showToast("Settings"))}
          {activity(CircleUser, false, "Accounts", () => s.showToast("Accounts"))}
        </div>

        {/* Explorer side bar */}
        <div style={{ width: leftW }} className="min-w-0 shrink-0">
          <ProjectTree />
        </div>
        <div
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-ide-accent/60"
          onMouseDown={() => (dragging.current = "left")}
        />

        {/* Center: editor + panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <EditorArea />
          </div>
          {s.bottomVisible && (
            <div
              className="h-1 shrink-0 cursor-row-resize bg-transparent transition-colors hover:bg-ide-accent/60"
              onMouseDown={() => (dragging.current = "bottom")}
            />
          )}
          {s.bottomVisible && (
            <div style={{ height: bottomH }} className="min-h-0 shrink-0">
              <BottomPanel onHide={() => s.setBottomVisible(false)} />
            </div>
          )}
        </div>

        {/* Secondary side bar: Manifest + Preview */}
        {s.rightOpen && (
          <>
            <div
              className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-ide-accent/60"
              onMouseDown={() => (dragging.current = "right")}
            />
            <div style={{ width: rightW }} className="min-w-0 shrink-0">
              <RightPanel onClose={() => s.setRightOpen(false)} />
            </div>
          </>
        )}
      </div>

      <StatusBar />
      <NewProjectDialog />
      <NodeInstallDialog />
      {s.toast && <Toast msg={s.toast} />}
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-10 left-1/2 z-[60] -translate-x-1/2 rounded-sm border border-ide-border bg-ide-widget px-4 py-2 text-xs text-ide-text shadow-xl">
      {msg}
    </div>
  );
}
