import { useEffect, useRef, useState } from "react";
import {
  Hammer, Play, TerminalSquare, Smartphone, ChevronUp, X, CheckCircle2,
  XCircle, Loader2, Package, ExternalLink, ClipboardCopy, Eraser, FolderOpen,
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
  { id: "preview", labelKey: "bottom.tab.preview", icon: Smartphone },
  { id: "terminal", labelKey: "bottom.tab.terminal", icon: TerminalSquare },
];

export default function BottomPanel({ onHide }: { onHide: () => void }) {
  const s = useStudio();
  const ctx = useContextMenu();
  const { t } = useI18n();
  const logRef = useRef<HTMLDivElement>(null);
  const [phoneScale, setPhoneScale] = useState(1);

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
    <div className="h-full flex flex-col bg-darcula-panel border-t border-black/40">
      <div className="flex items-center h-7 px-1 border-b border-black/30 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => s.setBottomTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 h-7 text-2xs border-b-2 ${
              s.bottomTab === tab.id
                ? "text-white border-darcula-modified"
                : "text-darcula-dim border-transparent hover:text-darcula-text"
            }`}
          >
            <tab.icon size={12} />
            {t(tab.labelKey)}
            {tab.id === "build" && s.buildRunning && <Loader2 size={11} className="animate-spin text-darcula-accent" />}
            {tab.id === "build" && !s.buildRunning && s.buildResult?.success && <CheckCircle2 size={11} className="text-darcula-green" />}
            {tab.id === "build" && !s.buildRunning && s.buildResult && !s.buildResult.success && <XCircle size={11} className="text-darcula-red" />}
          </button>
        ))}
        <div className="flex-1" />
        {s.buildResult?.zip_path && (
          <span className="flex items-center gap-1 text-2xs text-darcula-green mr-2">
            <Package size={12} />
            <span className="max-w-[240px] truncate">{t("bottom.package", { path: s.buildResult.zip_path.split(/[\\/]/).pop() ?? "" })}</span>
            <button className="p-0.5 hover:bg-white/10 rounded" title={t("bottom.openFolder")} onClick={openBuildFolder}>
              <FolderOpen size={12} />
            </button>
          </span>
        )}
        <button className="p-1 hover:bg-white/10 rounded" onClick={onHide} title={t("common.hide")}>
          <ChevronUp size={13} className="text-darcula-dim" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {s.bottomTab === "build" && (
          <div ref={logRef} className="h-full overflow-auto p-2 font-mono text-2xs leading-relaxed" onContextMenu={onLogContextMenu}>
            {s.buildLogs.length === 0 && !s.buildRunning && (
              <div className="text-darcula-dim">{t("bottom.buildHint")}</div>
            )}
            {s.buildLogs.map((l, i) => (
              <div
                key={i}
                className={
                  l.stream === "stderr" ? "text-red-400" :
                  l.stream === "error" ? "text-red-400 font-semibold" :
                  l.stream === "info" ? "text-darcula-accent font-semibold" :
                  "text-darcula-text"
                }
              >
                <span className="text-darcula-dim/50 mr-2 select-none">{String(i + 1).padStart(3, " ")}</span>
                {l.line || "\u00A0"}
              </div>
            ))}
            {s.buildRunning && (
              <div className="flex items-center gap-2 text-darcula-accent mt-1">
                <Loader2 size={12} className="animate-spin" /> {t("bottom.building")}
              </div>
            )}
            {s.buildResult && (
              <div className={`mt-2 flex items-center gap-2 font-semibold ${s.buildResult.success ? "text-darcula-green" : "text-darcula-red"}`}>
                {s.buildResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {t(s.buildResult.success ? "bottom.buildSucceeded" : "bottom.buildFailed")}
                {s.buildResult.success && (
                  <button
                    className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-normal"
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
          <div className="p-3 text-2xs text-darcula-dim font-mono">
            <div className="text-darcula-green">$ npm run dev</div>
            <div className="mt-1">{t("bottom.runHint")}</div>
          </div>
        )}

        {s.bottomTab === "terminal" && (
          <div className="p-3 text-2xs text-darcula-text font-mono" onContextMenu={onLogContextMenu}>
            <div><span className="text-darcula-green">user@qchat-studio</span>:<span className="text-darcula-accent">~/project</span>$ _</div>
            <div className="text-darcula-dim mt-2">{t("bottom.terminalHint")}</div>
          </div>
        )}

        {s.bottomTab === "preview" && (
          <div className="h-full flex items-stretch">
            <div className="flex-1 grid place-items-center p-4 bg-[#1e1f22] overflow-auto relative">
              {s.previewUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-2xs text-darcula-dim">
                    <Smartphone size={12} className="text-darcula-accent" />
                    <span>{t("bottom.previewDevice")}</span>
                    <button className="flex items-center gap-1 text-darcula-accent hover:underline" onClick={() => s.runPreview()}>
                      <ExternalLink size={11} /> {t("bottom.previewReload")}
                    </button>
                  </div>
                  <div
                    className="rounded-[28px] border-[10px] border-black bg-black shadow-2xl overflow-hidden"
                    style={{ width: 390 * phoneScale, height: 844 * phoneScale, maxHeight: "100%" }}
                  >
                    <iframe
                      key={s.previewUrl}
                      src={s.previewUrl}
                      className="w-full h-full bg-white"
                      title="Mini App Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-darcula-dim text-2xs">
                  <Smartphone size={32} className="mx-auto mb-2 opacity-40" />
                  {t("bottom.previewNone")}
                </div>
              )}
            </div>
            <div className="w-40 border-l border-black/30 p-2 flex flex-col gap-2 shrink-0">
              <div className="text-2xs font-semibold text-darcula-text">{t("bottom.previewSettings")}</div>
              <label className="text-2xs text-darcula-dim">{t("bottom.previewZoom")}</label>
              <input type="range" min={0.4} max={1} step={0.05} value={phoneScale} onChange={(e) => setPhoneScale(Number(e.target.value))} />
              <div className="text-2xs text-darcula-dim">{Math.round(phoneScale * 100)}%</div>
              <div className="h-px bg-white/10 my-1" />
              <div className="text-2xs text-darcula-dim">{t("bottom.mockBridgeNote")}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
