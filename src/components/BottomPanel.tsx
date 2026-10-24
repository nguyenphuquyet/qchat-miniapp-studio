import { useEffect, useRef, useState } from "react";
import {
  Hammer, Play, TerminalSquare, Smartphone, ChevronUp, X, CheckCircle2,
  XCircle, Loader2, Package, ExternalLink,
} from "lucide-react";
import { useStudio } from "../lib/store";
import type { BottomTab } from "../lib/store";

const TABS: { id: BottomTab; label: string; icon: any }[] = [
  { id: "build", label: "Build", icon: Hammer },
  { id: "run", label: "Run", icon: Play },
  { id: "preview", label: "Preview", icon: Smartphone },
  { id: "terminal", label: "Terminal", icon: TerminalSquare },
];

export default function BottomPanel({ onHide }: { onHide: () => void }) {
  const s = useStudio();
  const logRef = useRef<HTMLDivElement>(null);
  const [phoneScale, setPhoneScale] = useState(1);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [s.buildLogs, s.bottomTab]);

  return (
    <div className="h-full flex flex-col bg-darcula-panel border-t border-black/40">
      <div className="flex items-center h-7 px-1 border-b border-black/30 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => s.setBottomTab(t.id)}
            className={`flex items-center gap-1.5 px-3 h-7 text-2xs border-b-2 ${
              s.bottomTab === t.id
                ? "text-white border-darcula-modified"
                : "text-darcula-dim border-transparent hover:text-darcula-text"
            }`}
          >
            <t.icon size={12} />
            {t.label}
            {t.id === "build" && s.buildRunning && <Loader2 size={11} className="animate-spin text-darcula-accent" />}
            {t.id === "build" && !s.buildRunning && s.buildResult?.success && <CheckCircle2 size={11} className="text-darcula-green" />}
            {t.id === "build" && !s.buildRunning && s.buildResult && !s.buildResult.success && <XCircle size={11} className="text-darcula-red" />}
          </button>
        ))}
        <div className="flex-1" />
        {s.buildResult?.zip_path && (
          <span className="flex items-center gap-1 text-2xs text-darcula-green mr-2">
            <Package size={12} />
            <span className="max-w-[240px] truncate">{s.buildResult.zip_path.split(/[\\/]/).pop()}</span>
          </span>
        )}
        <button className="p-1 hover:bg-white/10 rounded" onClick={onHide} title="Hide">
          <ChevronUp size={13} className="text-darcula-dim" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {s.bottomTab === "build" && (
          <div ref={logRef} className="h-full overflow-auto p-2 font-mono text-2xs leading-relaxed">
            {s.buildLogs.length === 0 && !s.buildRunning && (
              <div className="text-darcula-dim">Build output will appear here. Click <span className="text-darcula-green">Run</span> or <span className="text-darcula-accent">Build</span> to package the Mini App ZIP.</div>
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
                <Loader2 size={12} className="animate-spin" /> Building…
              </div>
            )}
            {s.buildResult && (
              <div className={`mt-2 flex items-center gap-2 font-semibold ${s.buildResult.success ? "text-darcula-green" : "text-darcula-red"}`}>
                {s.buildResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {s.buildResult.message}
              </div>
            )}
          </div>
        )}

        {s.bottomTab === "run" && (
          <div className="p-3 text-2xs text-darcula-dim font-mono">
            <div className="text-darcula-green">$ npm run dev (vite dev server — coming soon)</div>
            <div className="mt-1">Use the <span className="text-darcula-accent">Preview</span> tab to run the built Mini App inside a simulated QChat WebView.</div>
          </div>
        )}

        {s.bottomTab === "terminal" && (
          <div className="p-3 text-2xs text-darcula-text font-mono">
            <div><span className="text-darcula-green">user@qchat-studio</span>:<span className="text-darcula-accent">~/project</span>$ _</div>
            <div className="text-darcula-dim mt-2">
              Build and preview commands run <span className="text-darcula-accent">inside the app / in the background</span> —
              no external console window is opened. Everything they print streams into the{" "}
              <span className="text-darcula-accent">Build</span> tab, and the studio uses its bundled Node.js runtime
              when one is shipped with the installer.
            </div>
          </div>
        )}

        {s.bottomTab === "preview" && (
          <div className="h-full flex items-stretch">
            <div className="flex-1 grid place-items-center p-4 bg-[#1e1f22] overflow-auto relative">
              {s.previewUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-2xs text-darcula-dim">
                    <Smartphone size={12} className="text-darcula-accent" />
                    <span>QChat WebView · Android 14 · 390 × 844 · mock bridge injected</span>
                    <button className="flex items-center gap-1 text-darcula-accent hover:underline" onClick={() => s.runPreview()}>
                      <ExternalLink size={11} /> Reload
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
                  No preview. Build the project first, then click <span className="text-darcula-green">Run</span>.
                </div>
              )}
            </div>
            <div className="w-40 border-l border-black/30 p-2 flex flex-col gap-2 shrink-0">
              <div className="text-2xs font-semibold text-darcula-text">Preview Settings</div>
              <label className="text-2xs text-darcula-dim">Zoom</label>
              <input type="range" min={0.4} max={1} step={0.05} value={phoneScale} onChange={(e) => setPhoneScale(Number(e.target.value))} />
              <div className="text-2xs text-darcula-dim">{Math.round(phoneScale * 100)}%</div>
              <div className="h-px bg-white/10 my-1" />
              <div className="text-2xs text-darcula-dim">
                The mock bridge implements <code className="text-darcula-accent">getAppInfo</code>, <code className="text-darcula-accent">getSystemInfo</code>, <code className="text-darcula-accent">showToast</code>, <code className="text-darcula-accent">storage</code>, <code className="text-darcula-accent">chooseImage</code>, <code className="text-darcula-accent">share</code> and <code className="text-darcula-accent">request</code>.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
