import { X, ChevronRight, FileCode2 } from "lucide-react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useStudio } from "../lib/store";
import { fileLanguage } from "../lib/api";
import CodeEditor from "./CodeEditor";
import { useContextMenu } from "./ContextMenu";
import { copyText } from "../lib/clipboard";
import { useI18n } from "../lib/i18n";
import { getActiveEditor } from "../lib/editorBridge";
import {
  editorCopy, editorCut, editorFind, editorPaste, editorRedo, editorSelectAll, editorUndo,
  hasEditorSelection,
} from "../lib/editorActions";

function tabIcon(name: string) {
  return <FileCode2 size={13} className={name.endsWith(".json") ? "text-darcula-yellow" : "text-darcula-blue"} />;
}

export default function EditorArea() {
  const s = useStudio();
  const ctx = useContextMenu();
  const { t } = useI18n();
  const active = s.openFiles.find((f) => f.path === s.activePath);

  const breadcrumb = active
    ? active.path.replace(/\\/g, "/").split("/").slice(-3)
    : [];

  /** Right-click inside the code editor: real CodeMirror commands. */
  const onEditorContextMenu = (e: ReactMouseEvent) => {
    const view = getActiveEditor();
    ctx.open(e, [
      { label: t("common.undo"), shortcut: "Ctrl+Z", disabled: !view, action: editorUndo },
      { label: t("common.redo"), shortcut: "Ctrl+Y", disabled: !view, action: editorRedo },
      { separator: true },
      { label: t("common.cut"), shortcut: "Ctrl+X", disabled: !hasEditorSelection(), action: () => void editorCut() },
      { label: t("common.copy"), shortcut: "Ctrl+C", disabled: !hasEditorSelection(), action: () => void editorCopy() },
      { label: t("common.paste"), shortcut: "Ctrl+V", disabled: !view, action: () => void editorPaste() },
      { separator: true },
      { label: t("common.selectAll"), shortcut: "Ctrl+A", disabled: !view, action: editorSelectAll },
      { label: t("common.find"), shortcut: "Ctrl+F", disabled: !view, action: editorFind },
      { separator: true },
      {
        label: t("common.save"),
        shortcut: "Ctrl+S",
        disabled: !active?.dirty,
        action: () => active && void s.saveFile(active.path),
      },
    ]);
  };

  /** Right-click on a tab. */
  const onTabContextMenu = (e: ReactMouseEvent, path: string, dirty: boolean) => {
    ctx.open(e, [
      { label: t("common.save"), shortcut: "Ctrl+S", disabled: !dirty, action: () => void s.saveFile(path) },
      { separator: true },
      { label: t("common.close"), action: () => s.closeTab(path) },
      {
        label: t("common.closeOthers"),
        disabled: s.openFiles.length < 2,
        action: () => s.openFiles.forEach((f) => f.path !== path && s.closeTab(f.path)),
      },
      { label: t("common.closeAll"), action: () => s.openFiles.forEach((f) => s.closeTab(f.path)) },
      { separator: true },
      { label: t("common.copyPath"), action: () => void copyText(path) },
    ]);
  };

  return (
    <div className="h-full flex flex-col bg-darcula-editor min-w-0">
      {/* Tabs */}
      <div className="flex items-end h-8 bg-darcula-panel border-b border-black/40 overflow-x-auto shrink-0">
        {s.openFiles.map((f) => {
          const isActive = f.path === s.activePath;
          return (
            <div
              key={f.path}
              onClick={() => s.setActive(f.path)}
              onAuxClick={(e) => { if (e.button === 1) s.closeTab(f.path); }}
              onContextMenu={(e) => onTabContextMenu(e, f.path, f.dirty)}
              className={`group flex items-center gap-1.5 h-8 px-3 text-2xs cursor-pointer border-r border-black/30 min-w-[120px] max-w-[200px] ${
                isActive
                  ? "bg-darcula-editor text-white border-t-2 border-t-darcula-modified -mb-px"
                  : "bg-darcula-panel text-darcula-dim hover:bg-darcula-lighter/50"
              }`}
            >
              {tabIcon(f.name)}
              <span className="truncate flex-1">{f.name}</span>
              {f.dirty ? (
                <span
                  className="w-2.5 h-2.5 rounded-full bg-darcula-modified group-hover:hidden cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); s.saveFile(f.path); }}
                  title={t("editor.unsaved")}
                />
              ) : null}
              <button
                className={`p-0.5 rounded hover:bg-white/15 ${f.dirty ? "hidden group-hover:block" : ""}`}
                onClick={(e) => { e.stopPropagation(); s.closeTab(f.path); }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
        {s.openFiles.length === 0 && (
          <div className="px-3 h-8 flex items-center text-2xs text-darcula-dim">{t("editor.noTabs")}</div>
        )}
      </div>

      {/* Breadcrumb */}
      {active && (
        <div className="flex items-center h-6 px-3 text-2xs text-darcula-dim border-b border-black/20 bg-darcula-editor shrink-0 overflow-hidden">
          {breadcrumb.map((p, i) => (
            <span key={i} className="flex items-center gap-1 truncate">
              {i > 0 && <ChevronRight size={10} className="text-darcula-dim/60" />}
              <span className={i === breadcrumb.length - 1 ? "text-darcula-text" : ""}>{p}</span>
            </span>
          ))}
          <span className="flex items-center gap-1 ml-2 text-darcula-dim/70">
            <ChevronRight size={10} />
            <span>{active.language === "tsx" ? "App" : ""}</span>
          </span>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0 relative" onContextMenu={onEditorContextMenu}>
        {active ? (
          <CodeEditor
            key={active.path}
            content={active.content}
            language={fileLanguage(active.path)}
            onChange={(v) => s.updateContent(active.path, v)}
            onCursor={(line, col) => s.setCursor(line, col)}
            onSave={() => s.saveFile(active.path)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div className="text-darcula-dim">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-emerald-800/20 grid place-items-center">
                <FileCode2 size={32} className="text-emerald-400/60" />
              </div>
              <p className="text-sm text-darcula-text mb-1">{t("app.title")}</p>
              <p className="text-2xs">{t("editor.emptyHint")}</p>
              <p className="text-2xs mt-3 text-darcula-dim/70">{t("editor.tip")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
