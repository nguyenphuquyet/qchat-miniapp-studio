import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { useStudio } from "../lib/store";
import { useI18n } from "../lib/i18n";

/**
 * Shown when a build is requested but Node.js is not on PATH. Nothing is
 * installed until the user presses "Install"; "No" cancels the build.
 */
export default function NodeInstallDialog() {
  const s = useStudio();
  const { t } = useI18n();
  const state = s.nodeDialog;
  if (!state) return null;

  const busy = state === "installing";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center">
      <div className="w-[460px] max-w-[92vw] bg-darcula-panel border border-black/60 rounded-lg shadow-2xl">
        <div className="flex items-center gap-2 h-11 px-4 border-b border-black/40">
          {busy ? (
            <Loader2 size={16} className="animate-spin text-darcula-accent" />
          ) : state === "failed" ? (
            <AlertTriangle size={16} className="text-darcula-red" />
          ) : (
            <Download size={16} className="text-darcula-accent" />
          )}
          <span className="text-sm text-white font-medium">
            {state === "ask" && t("node.ask.title")}
            {state === "installing" && t("node.installing.title")}
            {state === "failed" && t("node.failed.title")}
          </span>
        </div>

        <div className="p-5 text-xs text-darcula-text space-y-3 leading-relaxed">
          {state === "ask" && (
            <>
              <p>{t("node.ask.body")}</p>
              <p className="text-2xs text-darcula-dim">
                {s.nodeCanAutoInstall ? t("node.ask.note") : t("node.ask.manual")}
              </p>
            </>
          )}
          {state === "installing" && <p>{t("node.installing.body")}</p>}
          {state === "failed" && (
            <>
              <p>{t("node.failed.body")}</p>
              {s.nodeError && <p className="text-2xs text-darcula-red">{s.nodeError}</p>}
            </>
          )}
        </div>

        {!busy && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black/40 bg-darcula-bg">
            {state === "ask" && (
              <>
                <button
                  className="px-4 py-1.5 rounded text-2xs text-darcula-text hover:bg-white/5"
                  onClick={s.declineNodeInstall}
                >
                  {t("node.decline")}
                </button>
                {s.nodeCanAutoInstall && (
                  <button
                    className="px-4 py-1.5 rounded bg-darcula-green hover:bg-emerald-600 text-white text-2xs font-medium"
                    onClick={() => void s.confirmNodeInstall()}
                  >
                    {t("node.install")}
                  </button>
                )}
              </>
            )}
            {state === "failed" && (
              <>
                <button
                  className="px-4 py-1.5 rounded text-2xs text-darcula-text hover:bg-white/5"
                  onClick={s.closeNodeDialog}
                >
                  {t("common.close")}
                </button>
                <button
                  className="px-4 py-1.5 rounded bg-darcula-green hover:bg-emerald-600 text-white text-2xs font-medium"
                  onClick={() => void s.confirmNodeInstall()}
                >
                  {t("node.retry")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
