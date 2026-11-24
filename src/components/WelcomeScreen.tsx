import { useEffect } from "react";
import {
  FolderOpen, FilePlus2, Clock, Trash2, Settings, Puzzle, GraduationCap,
  FolderGit2, ChevronRight,
} from "lucide-react";
import { useStudio } from "../lib/store";
import { api } from "../lib/api";
import { useI18n, type I18nKey } from "../lib/i18n";

const NAV: { id: string; key: I18nKey; icon: any }[] = [
  { id: "projects", key: "welcome.nav.projects", icon: FolderGit2 },
  { id: "customize", key: "welcome.nav.customize", icon: Settings },
  { id: "plugins", key: "welcome.nav.plugins", icon: Puzzle },
  { id: "learn", key: "welcome.nav.learn", icon: GraduationCap },
];

export default function WelcomeScreen() {
  const s = useStudio();
  const { t } = useI18n();

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
    <div className="flex h-full bg-ide-editor">
      {/* Left nav */}
      <div className="flex w-56 flex-col border-r border-ide-border bg-ide-sidebar py-5">
        <div className="mb-7 px-5">
          <div className="text-sm font-semibold text-ide-text">{t("app.title")}</div>
          <div className="mt-0.5 text-2xs text-ide-dim">{t("welcome.version")}</div>
        </div>
        {NAV.map((n, i) => (
          <button
            key={n.id}
            className={`flex items-center gap-3 border-l-2 px-5 py-2.5 text-xs ${
              i === 0
                ? "border-ide-accent bg-ide-select-inactive text-ide-text"
                : "border-transparent text-ide-dim hover:bg-ide-hover hover:text-ide-text"
            }`}
          >
            <n.icon size={16} />
            {t(n.key)}
          </button>
        ))}
        <div className="flex-1" />
        <div className="px-5 text-2xs text-ide-dim">{t("welcome.footer")}</div>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-auto p-8">
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => s.setDialog("new")}
            className="ide-btn ide-btn-primary px-4 py-2"
          >
            <FilePlus2 size={14} /> {t("welcome.newProject")}
          </button>
          <button
            onClick={() => s.setDialog("open")}
            className="ide-btn px-4 py-2"
          >
            <FolderOpen size={14} /> {t("welcome.open")}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1 text-2xs text-ide-dim">
            <Clock size={11} /> {t("welcome.recent")}
          </div>
        </div>

        <div className="overflow-hidden rounded-sm border border-ide-border bg-ide-editor">
          {s.recent.length === 0 ? (
            <div className="p-10 text-center text-xs text-ide-dim">
              {t("welcome.noRecent")}
            </div>
          ) : (
            s.recent.map((r) => (
              <div
                key={r.path}
                className="group flex cursor-pointer items-center gap-3 border-b border-ide-border px-4 py-3 last:border-0 hover:bg-ide-hover"
                onClick={() => s.doOpenProject(r.path)}
              >
                <FolderGit2 size={16} className="shrink-0 text-ide-blue" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-ide-text">{r.name}</div>
                  <div className="truncate text-2xs text-ide-dim">{r.path}</div>
                </div>
                <button
                  className="rounded-sm p-1 text-ide-dim opacity-0 hover:bg-ide-select-inactive group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); s.removeRecent(r.path); s.loadRecent(); }}
                  title={t("welcome.removeRecent")}
                >
                  <Trash2 size={12} />
                </button>
                <ChevronRight size={14} className="text-ide-dim" />
              </div>
            ))
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { title: t("welcome.card1.title"), desc: t("welcome.card1.desc") },
            { title: t("welcome.card2.title"), desc: t("welcome.card2.desc") },
            { title: t("welcome.card3.title"), desc: t("welcome.card3.desc") },
          ].map((c) => (
            <div key={c.title} className="rounded-sm border border-ide-border bg-ide-hover/40 p-4">
              <div className="mb-1 text-xs font-medium text-ide-text">{c.title}</div>
              <div className="text-2xs leading-relaxed text-ide-dim">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
