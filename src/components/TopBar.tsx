import { useEffect, useRef, useState } from "react";
import {
  FilePlus2, FolderOpen, Save, SaveAll, Undo2, Redo2, FileCode2,
  Sun, Moon, Play, Smartphone, Package, RefreshCw, Info, Check,
  PanelBottom, PanelRight,
} from "lucide-react";
import { useStudio } from "../lib/store";
import TitleBar from "./TitleBar";
import { useI18n, type I18nKey } from "../lib/i18n";
import { editorRedo, editorUndo } from "../lib/editorActions";

type MenuItem = {
  key?: I18nKey;
  icon?: any;
  action?: string;
  shortcut?: string;
  checked?: boolean;
  sep?: boolean;
};

type MenuGroup = { id: string; key: I18nKey; items: MenuItem[] };

/** VS Code style menu bar. Placeholder items stay disabled instead of pretending to work. */
const MENUS: MenuGroup[] = [
  {
    id: "file", key: "menu.file", items: [
      { key: "menu.file.new", icon: FilePlus2, action: "new" },
      { key: "menu.file.open", icon: FolderOpen, action: "open" },
      { sep: true },
      { key: "common.save", icon: Save, action: "save", shortcut: "Ctrl+S" },
      { key: "common.saveAll", icon: SaveAll, action: "saveAll", shortcut: "Ctrl+Shift+S" },
      { sep: true },
      { key: "menu.file.closeProject", icon: FileCode2, action: "closeProject" },
    ],
  },
  {
    id: "edit", key: "menu.edit", items: [
      { key: "common.undo", icon: Undo2, action: "undo", shortcut: "Ctrl+Z" },
      { key: "common.redo", icon: Redo2, action: "redo", shortcut: "Ctrl+Y" },
    ],
  },
  {
    id: "view", key: "menu.view", items: [
      { key: "common.themeDark", icon: Moon, action: "themeDark" },
      { key: "common.themeLight", icon: Sun, action: "themeLight" },
      { sep: true },
      { key: "common.panel", icon: PanelBottom, action: "togglePanel" },
      { key: "bottom.tab.preview", icon: PanelRight, action: "togglePreview" },
    ],
  },
  {
    id: "run", key: "menu.run", items: [
      { key: "menu.run.app", icon: Play, action: "run" },
      { key: "menu.run.preview", icon: Smartphone, action: "preview" },
      { sep: true },
      { key: "menu.build.zip", icon: Package, action: "build" },
      { key: "menu.build.rebuild", icon: RefreshCw, action: "build" },
    ],
  },
  { id: "help", key: "menu.help", items: [{ key: "menu.help.about", icon: Info, action: "about" }] },
];

export default function TopBar() {
  const s = useStudio();
  const { t } = useI18n();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Clicking anywhere outside the menu bar dismisses the open menu.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  const runAction = (action?: string) => {
    setOpenMenu(null);
    if (!action) return;
    switch (action) {
      case "new": s.setDialog("new"); break;
      case "open": s.setDialog("open"); break;
      case "save": if (s.activePath) void s.saveFile(s.activePath); break;
      case "saveAll": void s.saveAll(); break;
      case "closeProject": s.closeProject(); break;
      case "undo": editorUndo(); break;
      case "redo": editorRedo(); break;
      case "themeDark": s.setTheme("dark"); break;
      case "themeLight": s.setTheme("light"); break;
      case "togglePanel": s.setBottomVisible(!s.bottomVisible); break;
      case "togglePreview": s.setRightOpen(!s.rightOpen); break;
      case "build": void s.runBuild(); break;
      case "run": void s.runBuild(); break;
      case "preview": void s.runPreview(); break;
      case "about": s.showToast(t("about.text")); break;
    }
  };

  const activeFile = s.openFiles.find((f) => f.path === s.activePath);
  const title = activeFile ? `${activeFile.name} — ${s.project?.name ?? ""}` : t("app.title");

  const isChecked = (item: MenuItem) => {
    if (item.action === "themeDark") return s.theme === "dark";
    if (item.action === "themeLight") return s.theme === "light";
    if (item.action === "togglePanel") return s.bottomVisible;
    if (item.action === "togglePreview") return s.rightOpen;
    return false;
  };

  const layoutActions = (
    <>
      <button
        onClick={() => s.setBottomVisible(!s.bottomVisible)}
        title={t("common.panel")}
        aria-label={t("common.panel")}
        className={`grid h-7 w-7 place-items-center rounded-sm hover:bg-ide-hover hover:text-ide-text ${
          s.bottomVisible ? "text-ide-text" : "text-ide-dim"
        }`}
      >
        <PanelBottom size={14} />
      </button>
      <button
        onClick={() => s.setRightOpen(!s.rightOpen)}
        title={t("bottom.tab.preview")}
        aria-label={t("bottom.tab.preview")}
        className={`grid h-7 w-7 place-items-center rounded-sm hover:bg-ide-hover hover:text-ide-text ${
          s.rightOpen ? "text-ide-text" : "text-ide-dim"
        }`}
      >
        <PanelRight size={14} />
      </button>
      <div className="mx-1 h-4 w-px bg-ide-border" />
    </>
  );

  const menuBar = (
    <div ref={rootRef} className="relative flex h-full items-center">
      {MENUS.map(({ id, key, items }) => (
        <div key={id} className="relative h-full" onMouseEnter={() => openMenu && setOpenMenu(id)}>
          <button
            onClick={() => setOpenMenu(openMenu === id ? null : id)}
            className={`h-full rounded-sm px-2.5 text-2xs text-ide-text hover:bg-ide-hover ${
              openMenu === id ? "bg-ide-hover" : ""
            }`}
          >
            {t(key)}
          </button>
          {openMenu === id && (
            <div className="absolute left-0 top-full z-50 min-w-[240px] rounded-sm border border-ide-border bg-ide-menu py-1 text-2xs text-ide-text shadow-xl">
              {items.map((item, i) =>
                item.sep ? (
                  <div key={i} className="my-1 h-px bg-ide-border" />
                ) : (
                  <button
                    key={i}
                    onClick={() => runAction(item.action)}
                    disabled={!item.action}
                    className="flex h-7 w-full items-center gap-2 px-3 text-left hover:bg-ide-accent hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ide-text"
                  >
                    <span className="grid w-4 shrink-0 place-items-center text-ide-dim">
                      {isChecked(item) ? <Check size={13} /> : item.icon ? <item.icon size={13} /> : null}
                    </span>
                    <span className="flex-1 truncate">{item.key ? t(item.key) : ""}</span>
                    {item.shortcut && <span className="ml-6 text-ide-dim">{item.shortcut}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return <TitleBar title={title} menus={menuBar} actions={s.project ? layoutActions : undefined} />;
}
