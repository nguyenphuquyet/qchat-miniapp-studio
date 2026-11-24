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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
      <div className="w-[460px] max-w-[92vw] rounded-md border border-ide-border bg-ide-widget shadow-2xl">
        <div className="flex h-11 items-center gap-2 border-b border-ide-border px-4">
          {busy ? (
            <Loader2 size={16} className="animate-spin text-ide-blue" />
          ) : state === "failed" ? (
            <AlertTriangle size={16} className="text-ide-red" />
          ) : (
            <Download size={16} className="text-ide-blue" />
          )}
          <span className="text-sm font-medium text-ide-text">
            {state === "ask" && t("node.ask.title")}
            {state === "installing" && t("node.installing.title")}
            {state === "failed" && t("node.failed.title")}
          </span>
        </div>

        <div className="space-y-3 p-5 text-xs leading-relaxed text-ide-text">
          {state === "ask" && (
            <>
              <p>{t("node.ask.body")}</p>
              <p className="text-2xs text-ide-dim">
                {s.nodeCanAutoInstall ? t("node.ask.note") : t("node.ask.manual")}
              </p>
            </>
          )}
          {state === "installing" && <p>{t("node.installing.body")}</p>}
          {state === "failed" && (
            <>
              <p>{t("node.failed.body")}</p>
              {s.nodeError && <p className="text-2xs text-ide-red">{s.nodeError}</p>}
            </>
          )}
        </div>

        {!busy && (
          <div className="flex items-center justify-end gap-2 border-t border-ide-border bg-ide-sidebar px-5 py-3">
            {state === "ask" && (
              <>
                <button className="ide-btn" onClick={s.declineNodeInstall}>
                  {t("node.decline")}
                </button>
                {s.nodeCanAutoInstall && (
                  <button className="ide-btn ide-btn-primary" onClick={() => void s.confirmNodeInstall()}>
                    {t("node.install")}
                  </button>
                )}
              </>
            )}
            {state === "failed" && (
              <>
                <button className="ide-btn" onClick={s.closeNodeDialog}>
                  {t("common.close")}
                </button>
                <button className="ide-btn ide-btn-primary" onClick={() => void s.confirmNodeInstall()}>
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
