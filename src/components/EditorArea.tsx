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
  return <FileCode2 size={13} className={name.endsWith(".json") ? "shrink-0 text-ide-yellow" : "shrink-0 text-ide-blue"} />;
}

export default function EditorArea() {
  const s = useStudio();
  const ctx = useContextMenu();
  const { t } = useI18n();
  const active = s.openFiles.find((f) => f.path === s.activePath);

  const breadcrumb = active ? active.path.replace(/\\/g, "/").split("/").slice(-3) : [];

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
    <div className="flex h-full min-w-0 flex-col bg-ide-editor">
      {/* Tabs */}
      <div className="flex h-9 shrink-0 items-stretch overflow-x-auto bg-ide-tabs">
        {s.openFiles.map((f) => {
          const isActive = f.path === s.activePath;
          return (
            <div
              key={f.path}
              onClick={() => s.setActive(f.path)}
              onAuxClick={(e) => { if (e.button === 1) s.closeTab(f.path); }}
              onContextMenu={(e) => onTabContextMenu(e, f.path, f.dirty)}
              className={`group relative flex h-full min-w-[130px] max-w-[220px] cursor-pointer items-center gap-1.5 border-r border-ide-border px-3 text-xs ${
                isActive
                  ? "bg-ide-editor text-ide-text"
                  : "bg-ide-tabs text-ide-dim hover:bg-ide-tab hover:text-ide-text"
              }`}
            >
              {isActive && <span className="absolute inset-x-0 top-0 h-px bg-ide-accent" />}
              {tabIcon(f.name)}
              <span className="flex-1 truncate">{f.name}</span>
              {f.dirty ? (
                <span
                  className="h-2 w-2 cursor-pointer rounded-full bg-ide-modified group-hover:hidden"
                  onClick={(e) => { e.stopPropagation(); void s.saveFile(f.path); }}
                  title={t("editor.unsaved")}
                />
              ) : null}
              <button
                className={`grid h-5 w-5 place-items-center rounded-sm hover:bg-ide-hover ${f.dirty ? "hidden group-hover:grid" : ""}`}
                onClick={(e) => { e.stopPropagation(); s.closeTab(f.path); }}
                title={t("common.close")}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
        {s.openFiles.length === 0 && (
          <div className="flex h-full items-center px-3 text-xs text-ide-dim">{t("editor.noTabs")}</div>
        )}
      </div>

      {/* Breadcrumb */}
      {active && (
        <div className="flex h-6 shrink-0 items-center gap-1 overflow-hidden bg-ide-editor px-3 text-2xs text-ide-dim">
          {breadcrumb.map((p, i) => (
            <span key={i} className="flex items-center gap-1 truncate">
              {i > 0 && <ChevronRight size={11} className="shrink-0 text-ide-dim" />}
              <span className={i === breadcrumb.length - 1 ? "text-ide-text" : ""}>{p}</span>
            </span>
          ))}
          <span className="ml-1 flex items-center gap-1 text-ide-dim">
            <ChevronRight size={11} className="shrink-0" />
            <span>{active.language === "tsx" ? "App" : ""}</span>
          </span>
        </div>
      )}

      {/* Editor */}
      <div className="relative min-h-0 flex-1" onContextMenu={onEditorContextMenu}>
        {active ? (
          <CodeEditor
            key={active.path}
            content={active.content}
            language={fileLanguage(active.path)}
            theme={s.theme}
            onChange={(v) => s.updateContent(active.path, v)}
            onCursor={(line, col) => s.setCursor(line, col)}
            onSave={() => s.saveFile(active.path)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div className="text-ide-dim">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-md bg-ide-hover">
                <FileCode2 size={32} className="text-ide-dim" />
              </div>
              <p className="mb-1 text-sm text-ide-text">{t("app.title")}</p>
              <p className="text-2xs">{t("editor.emptyHint")}</p>
              <p className="mt-3 text-2xs text-ide-dim">{t("editor.tip")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
