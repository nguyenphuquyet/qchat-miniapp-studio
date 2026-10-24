import { GitBranch, Lock, Bell, MessageSquareWarning } from "lucide-react";
import { useStudio } from "../lib/store";
import { useI18n } from "../lib/i18n";

export default function StatusBar() {
  const s = useStudio();
  const { t } = useI18n();
  const active = s.openFiles.find((f) => f.path === s.activePath);
  const lang = active ? active.language.toUpperCase() : "—";
  return (
    <div className="flex items-center h-6 px-2 bg-darcula-bg text-2xs text-darcula-dim border-t border-black/40 shrink-0 select-none">
      <button className="flex items-center gap-1 px-1.5 h-full hover:bg-white/10">
        <GitBranch size={11} /> main
      </button>
      <button className="flex items-center gap-1 px-1.5 h-full hover:bg-white/10">
        <MessageSquareWarning size={11} /> 0
      </button>
      <div className="flex-1" />
      {s.buildRunning && <span className="text-darcula-accent mr-2 flex items-center gap-1">{t("status.building")}</span>}
      <span className="px-1.5">UTF-8</span>
      <span className="px-1.5">LF</span>
      <span className="px-1.5">{lang}</span>
      <span className="px-1.5">{s.cursor.line}:{s.cursor.col}</span>
      <span className="px-1.5">Mini App SDK 1.0</span>
      <button className="p-1 hover:bg-white/10 rounded"><Lock size={11} /></button>
      <button className="p-1 hover:bg-white/10 rounded relative">
        <Bell size={11} />
        {s.toast && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-darcula-accent" />}
      </button>
    </div>
  );
}
