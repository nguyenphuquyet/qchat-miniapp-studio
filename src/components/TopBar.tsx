import { useState } from "react";
import {
  Play, Bug, Hammer, ChevronDown, Search, Settings,
  FolderOpen, FilePlus2, Save, SaveAll, Undo2, Redo2, FileCode2, Smartphone,
} from "lucide-react";
import { useStudio } from "../lib/store";
import TitleBar from "./TitleBar";
import { useI18n, type I18nKey } from "../lib/i18n";

type MenuItem = { key?: I18nKey; icon?: any; action?: string; sep?: boolean };

const MENUS: { id: string; key: I18nKey; items: MenuItem[] }[] = [
  {
    id: "file", key: "menu.file", items: [
      { key: "menu.file.new", icon: FilePlus2, action: "new" },
      { key: "menu.file.open", icon: FolderOpen, action: "open" },
      { sep: true },
      { key: "common.save", icon: Save, action: "save" },
      { key: "common.saveAll", icon: SaveAll, action: "saveAll" },
      { sep: true },
      { key: "menu.file.closeProject", icon: FileCode2, action: "closeProject" },
    ],
  },
  {
    id: "edit", key: "menu.edit", items: [
      { key: "common.undo", icon: Undo2, action: "undo" },
      { key: "common.redo", icon: Redo2, action: "redo" },
    ],
  },
  {
    id: "view", key: "menu.view", items: [
      { key: "menu.view.toolWindows", action: "" },
      { key: "menu.view.appearance", action: "" },
    ],
  },
  { id: "navigate", key: "menu.navigate", items: [{ key: "menu.navigate.searchEverywhere", action: "" }] },
  { id: "code", key: "menu.code", items: [{ key: "menu.code.overrideMethods", action: "" }] },
  { id: "analyze", key: "menu.analyze", items: [{ key: "menu.analyze.inspectCode", action: "" }] },
  { id: "refactor", key: "menu.refactor", items: [{ key: "menu.refactor.rename", action: "" }] },
  {
    id: "build", key: "menu.build", items: [
      { key: "menu.build.zip", icon: Hammer, action: "build" },
      { key: "menu.build.rebuild", action: "build" },
    ],
  },
  {
    id: "run", key: "menu.run", items: [
      { key: "menu.run.app", icon: Play, action: "run" },
      { key: "menu.run.preview", icon: Smartphone, action: "preview" },
    ],
  },
  { id: "tools", key: "menu.tools", items: [{ key: "menu.tools.sdkManager", action: "" }] },
  { id: "vcs", key: "menu.vcs", items: [{ key: "menu.vcs.createRepo", action: "" }] },
  { id: "window", key: "menu.window", items: [{ key: "menu.window.restoreLayout", action: "" }] },
  { id: "help", key: "menu.help", items: [{ key: "menu.help.about", action: "about" }] },
];

export default function TopBar() {
  const s = useStudio();
  const { t } = useI18n();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const runAction = (action?: string) => {
    setOpenMenu(null);
    if (!action) return;
    switch (action) {
      case "new": s.setDialog("new"); break;
      case "open": s.setDialog("open"); break;
      case "save": if (s.activePath) s.saveFile(s.activePath); break;
      case "saveAll": s.saveAll(); break;
      case "closeProject": s.closeProject(); break;
      case "build": s.runBuild(); break;
      case "run": void (async () => { await s.runBuild(); })(); break;
      case "preview": s.runPreview(); break;
      case "about": s.showToast(t("about.text")); break;
    }
  };

  const activeFile = s.openFiles.find((f) => f.path === s.activePath);

  return (
    <div className="flex flex-col bg-darcula-bg border-b border-black/40 select-none">
      {/* Custom window frame: always mounted, also on the welcome screen. */}
      <TitleBar
        title={activeFile ? `${activeFile.name} — ${s.project?.name ?? ""}` : t("app.title")}
      />

      {/* Menu bar */}
      <div className="no-drag flex items-center h-7 px-2 text-2xs relative z-30">
        {MENUS.map(({ id: m, key: mKey, items }) => (
          <div key={m} className="relative" onMouseEnter={() => openMenu && setOpenMenu(m)}>
            <button
              className={`px-2.5 py-1 rounded ${openMenu === m ? "bg-darcula-hover text-white" : "hover:bg-white/5"}`}
              onClick={() => setOpenMenu(openMenu === m ? null : m)}
            >
              {t(mKey)}
            </button>
            {openMenu === m && (
              <div className="absolute top-full left-0 mt-0.5 min-w-[220px] bg-darcula-panel border border-black/50 rounded-sm shadow-2xl py-1 text-darcula-text">
                {items.map((item, i) =>
                  item.sep ? (
                    <div key={i} className="h-px bg-white/10 my-1" />
                  ) : (
                    <button
                      key={i}
                      onClick={() => runAction(item.action)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-darcula-hover hover:text-white text-left disabled:opacity-40"
                      disabled={!item.action}
                    >
                      {item.icon && <item.icon size={13} className="text-darcula-dim" />}
                      <span className="flex-1">{item.key ? t(item.key) : ""}</span>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-darcula-dim">
          <Settings size={13} className="hover:text-white cursor-pointer" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="no-drag flex items-center h-9 px-3 gap-1 border-t border-black/30 text-darcula-text">
        <button className="p-1.5 rounded hover:bg-white/5 text-darcula-dim" title="Back"><ChevronDown size={15} className="-rotate-90" /></button>
        <button className="p-1.5 rounded hover:bg-white/5 text-darcula-dim" title="Forward"><ChevronDown size={15} className="rotate-90" /></button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button
          onClick={() => void s.runBuild()}
          disabled={!s.project || s.buildRunning}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-darcula-green/90 hover:bg-darcula-green text-white text-xs font-medium disabled:opacity-40"
          title={t("toolbar.run")}
        >
          <Play size={13} fill="currentColor" />
          <span>Run</span>
          <ChevronDown size={12} />
        </button>
        <button className="p-1.5 rounded hover:bg-white/5 text-darcula-green" title={t("toolbar.debug")}><Bug size={15} /></button>
        <button
          onClick={() => s.runBuild()}
          disabled={!s.project || s.buildRunning}
          className="p-1.5 rounded hover:bg-white/5 disabled:opacity-40"
          title={t("toolbar.buildZip")}
        >
          <Hammer size={15} />
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 text-2xs border border-white/10">
          <Smartphone size={13} className="text-darcula-accent" />
          <span>{t("toolbar.preview")}</span>
          <span className="text-darcula-dim">390 × 844</span>
          <ChevronDown size={12} className="text-darcula-dim" />
        </button>
        <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 text-2xs border border-white/10">
          <span className="text-darcula-accent">SDK</span>
          <span>{t("toolbar.sdk")}</span>
          <ChevronDown size={12} className="text-darcula-dim" />
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-darcula-editor border border-white/5 text-darcula-dim text-2xs w-64">
          <Search size={12} />
          <span className="flex-1">{t("toolbar.searchEverywhere")}</span>
          <kbd className="px-1 rounded bg-white/10 text-[0.625rem]">⇧⇧</kbd>
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center text-white text-xs font-bold ml-1">Q</div>
      </div>
    </div>
  );
}
