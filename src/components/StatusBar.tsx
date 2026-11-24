import { GitBranch, Lock, Bell, MessageSquareWarning, Loader2 } from "lucide-react";
import { useStudio } from "../lib/store";
import { useI18n } from "../lib/i18n";

export default function StatusBar() {
  const s = useStudio();
  const { t } = useI18n();
  const active = s.openFiles.find((f) => f.path === s.activePath);
  const lang = active ? active.language.toUpperCase() : "—";
  return (
    <div className="flex h-[22px] shrink-0 select-none items-center bg-ide-status px-1 text-[0.6875rem] text-ide-status-text">
      <button className="flex h-full items-center gap-1 px-2 hover:bg-white/15">
        <GitBranch size={12} /> main
      </button>
      <button className="flex h-full items-center gap-1 px-2 hover:bg-white/15">
        <MessageSquareWarning size={12} /> 0
      </button>
      <div className="flex-1" />
      {s.buildRunning && (
        <span className="mr-2 flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" />
          {t("status.building")}
        </span>
      )}
      <span className="px-2">Ln {s.cursor.line}, Col {s.cursor.col}</span>
      <span className="px-2">UTF-8</span>
      <span className="px-2">LF</span>
      <span className="px-2">{lang}</span>
      <span className="px-2">Mini App SDK 1.0</span>
      <button className="grid h-full w-6 place-items-center hover:bg-white/15" title="Read-only">
        <Lock size={12} />
      </button>
      <button className="relative grid h-full w-6 place-items-center hover:bg-white/15" title={t("app.title")}>
        <Bell size={12} />
        {s.toast && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-white" />}
      </button>
    </div>
  );
}
