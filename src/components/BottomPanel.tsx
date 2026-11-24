import { useEffect, useRef } from "react";
import {
  Hammer, Play, TerminalSquare, ChevronDown, CheckCircle2,
  XCircle, Loader2, Package, ClipboardCopy, Eraser, FolderOpen,
} from "lucide-react";
import { useStudio } from "../lib/store";
import type { BottomTab } from "../lib/store";
import { useContextMenu } from "./ContextMenu";
import { copyText } from "../lib/clipboard";
import { revealInFolder } from "../lib/shell";
import { useI18n, type I18nKey } from "../lib/i18n";
import type { MouseEvent as ReactMouseEvent } from "react";

const TABS: { id: BottomTab; labelKey: I18nKey; icon: any }[] = [
  { id: "build", labelKey: "bottom.tab.build", icon: Hammer },
  { id: "run", labelKey: "bottom.tab.run", icon: Play },
  { id: "terminal", labelKey: "bottom.tab.terminal", icon: TerminalSquare },
];

export default function BottomPanel({ onHide }: { onHide: () => void }) {
  const s = useStudio();
  const ctx = useContextMenu();
  const { t } = useI18n();
  const logRef = useRef<HTMLDivElement>(null);

  /** Opens the folder with the built ZIP (falls back to the project's release/ folder). */
  const openBuildFolder = () => {
    const target = s.buildResult?.zip_path ?? (s.project ? s.project.path + "/release" : null);
    if (target) revealInFolder(target).catch((e) => s.showToast(String(e)));
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [s.buildLogs, s.bottomTab]);

  /** Right-click in the build/terminal panes: copy or clear the log. */
  const onLogContextMenu = (e: ReactMouseEvent) => {
    ctx.open(e, [
      {
        label: t("common.copyLog"),
        icon: <ClipboardCopy size={12} />,
        disabled: s.buildLogs.length === 0,
        action: () => void copyText(s.buildLogs.map((l) => l.line).join("\n")),
      },
      {
        label: t("common.clearLog"),
        icon: <Eraser size={12} />,
        disabled: s.buildLogs.length === 0 && !s.buildResult,
        action: s.clearBuildLogs,
      },
      { separator: true },
      {
        label: t("common.runBuild"),
        icon: <Hammer size={12} />,
        disabled: !s.project || s.buildRunning,
        action: () => void s.runBuild(),
      },
    ]);
  };

  return (
    <div className="flex h-full flex-col border-t border-ide-border bg-ide-panel">
      <div className="flex h-9 shrink-0 items-center border-b border-ide-border px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => s.setBottomTab(tab.id)}
            className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-2xs uppercase tracking-wide ${
              s.bottomTab === tab.id
                ? "border-ide-accent text-ide-text"
                : "border-transparent text-ide-dim hover:text-ide-text"
            }`}
          >
            <tab.icon size={13} />
            {t(tab.labelKey)}
            {tab.id === "build" && s.buildRunning && <Loader2 size={11} className="animate-spin text-ide-accent" />}
            {tab.id === "build" && !s.buildRunning && s.buildResult?.success && <CheckCircle2 size={11} className="text-ide-green" />}
            {tab.id === "build" && !s.buildRunning && s.buildResult && !s.buildResult.success && <XCircle size={11} className="text-ide-red" />}
          </button>
        ))}
        <div className="flex-1" />
        {s.buildResult?.zip_path && (
          <span className="mr-2 flex items-center gap-1 text-2xs text-ide-green">
            <Package size={12} />
            <span className="max-w-[240px] truncate">{t("bottom.package", { path: s.buildResult.zip_path.split(/[\\/]/).pop() ?? "" })}</span>
            <button className="rounded-sm p-0.5 hover:bg-ide-hover" title={t("bottom.openFolder")} onClick={openBuildFolder}>
              <FolderOpen size={12} />
            </button>
          </span>
        )}
        <button className="grid h-6 w-6 place-items-center rounded-sm hover:bg-ide-hover" onClick={onHide} title={t("common.hide")}>
          <ChevronDown size={14} className="text-ide-dim" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {s.bottomTab === "build" && (
          <div ref={logRef} className="h-full overflow-auto p-2 font-mono text-2xs leading-relaxed" onContextMenu={onLogContextMenu}>
            {s.buildLogs.length === 0 && !s.buildRunning && (
              <div className="text-ide-dim">{t("bottom.buildHint")}</div>
            )}
            {s.buildLogs.map((l, i) => (
              <div
                key={i}
                className={
                  l.stream === "stderr" ? "text-ide-red" :
                  l.stream === "error" ? "font-semibold text-ide-red" :
                  l.stream === "info" ? "font-semibold text-ide-blue" :
                  "text-ide-text"
                }
              >
                <span className="mr-2 select-none text-ide-dim/60">{String(i + 1).padStart(3, " ")}</span>
                {l.line || "\u00A0"}
              </div>
            ))}
            {s.buildRunning && (
              <div className="mt-1 flex items-center gap-2 text-ide-blue">
                <Loader2 size={12} className="animate-spin" /> {t("bottom.building")}
              </div>
            )}
            {s.buildResult && (
              <div className={`mt-2 flex items-center gap-2 font-semibold ${s.buildResult.success ? "text-ide-green" : "text-ide-red"}`}>
                {s.buildResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {t(s.buildResult.success ? "bottom.buildSucceeded" : "bottom.buildFailed")}
                {s.buildResult.success && (
                  <button
                    className="ide-btn ml-2 px-2 py-0.5 font-normal"
                    onClick={openBuildFolder}
                  >
                    <FolderOpen size={12} /> {t("bottom.openFolder")}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {s.bottomTab === "run" && (
          <div className="p-3 font-mono text-2xs text-ide-dim">
            <div className="text-ide-green">$ npm run dev</div>
            <div className="mt-1">{t("bottom.runHint")}</div>
          </div>
        )}

        {s.bottomTab === "terminal" && (
          <div className="p-3 font-mono text-2xs text-ide-text" onContextMenu={onLogContextMenu}>
            <div><span className="text-ide-green">user@qchat-studio</span>:<span className="text-ide-blue">~/project</span>$ _</div>
            <div className="mt-2 text-ide-dim">{t("bottom.terminalHint")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
