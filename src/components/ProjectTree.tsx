import { useState } from "react";
import {
  Folder, FolderOpen, ChevronRight, ChevronDown, FileCode2, FileText,
  Braces, Palette, Globe, ScrollText, FilePlus2, FolderPlus, Trash2, RefreshCw,
  ClipboardCopy, FileCode,
} from "lucide-react";
import { useStudio } from "../lib/store";
import { api, type FileNode } from "../lib/api";
import { useContextMenu } from "./ContextMenu";
import { copyText } from "../lib/clipboard";
import { useI18n } from "../lib/i18n";
import type { MouseEvent as ReactMouseEvent } from "react";

function fileIcon(name: string) {
  if (name.endsWith(".tsx") || name.endsWith(".ts") || name.endsWith(".js") || name.endsWith(".mjs"))
    return <FileCode2 size={14} className="shrink-0 text-ide-blue" />;
  if (name.endsWith(".json")) return <Braces size={14} className="shrink-0 text-ide-yellow" />;
  if (name.endsWith(".css")) return <Palette size={14} className="shrink-0 text-ide-orange" />;
  if (name.endsWith(".html")) return <Globe size={14} className="shrink-0 text-ide-orange" />;
  if (name.endsWith(".md")) return <ScrollText size={14} className="shrink-0 text-ide-dim" />;
  return <FileText size={14} className="shrink-0 text-ide-dim" />;
}

function TreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const s = useStudio();
  const ctx = useContextMenu();
  const { t } = useI18n();
  const [open, setOpen] = useState(depth < 2);
  const isActive = s.activePath === node.path;
  const isOpenFile = s.openFiles.some((f) => f.path === node.path);

  /** Project-tree menu — replaces the WebView's own right-click menu. */
  const onContextMenu = (e: ReactMouseEvent) => {
    const items = node.is_dir
      ? [
          {
            label: t("common.newFile"),
            icon: <FilePlus2 size={12} />,
            action: () => {
              const n = prompt(t("tree.fileNamePrompt"));
              if (n) void s.newFile(node.path, n);
            },
          },
          {
            label: t("common.newDirectory"),
            icon: <FolderPlus size={12} />,
            action: () => {
              const n = prompt(t("tree.dirNamePrompt"));
              if (n) void api.createDirectory(node.path + "/" + n).then(() => s.refreshTree());
            },
          },
          { separator: true as const },
        ]
      : [
          { label: t("common.open"), icon: <FileCode size={12} />, action: () => void s.openFile(node.path) },
          { separator: true as const },
        ];

    ctx.open(e, [
      ...items,
      { label: t("common.copyPath"), icon: <ClipboardCopy size={12} />, action: () => void copyText(node.path) },
      { label: t("common.reload"), icon: <RefreshCw size={12} />, action: () => s.refreshTree() },
      { separator: true },
      {
        label: t("common.delete"),
        icon: <Trash2 size={12} />,
        danger: true,
        action: () => {
          if (confirm(t("tree.deleteConfirm", { path: node.path }))) void s.deleteFile(node.path);
        },
      },
    ]);
  };

  if (node.is_dir) {
    return (
      <div>
        <div
          className="flex cursor-pointer items-center gap-1 py-[3px] pr-2 text-xs hover:bg-ide-hover"
          style={{ paddingLeft: 6 + depth * 12 }}
          onClick={() => setOpen(!open)}
          onContextMenu={onContextMenu}
        >
          <ChevronRight
            size={14}
            className={`shrink-0 text-ide-dim transition-transform ${open ? "rotate-90" : ""}`}
          />
          {open ? (
            <FolderOpen size={14} className="shrink-0 text-ide-blue" />
          ) : (
            <Folder size={14} className="shrink-0 text-ide-blue" />
          )}
          <span className="truncate text-ide-text">{node.name}</span>
        </div>
        {open && node.children.map((c) => <TreeNode key={c.path} node={c} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <div
      className={`flex cursor-pointer items-center gap-1 py-[3px] pr-2 text-xs ${
        isActive ? "bg-ide-select text-white" : "text-ide-text hover:bg-ide-hover"
      }`}
      style={{ paddingLeft: 22 + depth * 12 }}
      onClick={() => s.openFile(node.path)}
      onContextMenu={onContextMenu}
    >
      {fileIcon(node.name)}
      <span className={`truncate ${isActive || isOpenFile ? "" : "text-ide-text"}`}>{node.name}</span>
      {s.openFiles.find((f) => f.path === node.path)?.dirty && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-ide-modified" />
      )}
    </div>
  );
}

export default function ProjectTree() {
  const s = useStudio();
  const { t } = useI18n();
  if (!s.tree) return <div className="p-3 text-2xs text-ide-dim">{t("tree.noProject")}</div>;
  return (
    <div className="flex h-full flex-col bg-ide-sidebar">
      <div className="group flex h-9 shrink-0 items-center px-4 text-[0.6875rem] uppercase tracking-wider text-ide-dim">
        <span className="flex-1 truncate">{t("tree.title")}</span>
        <button
          className="grid h-6 w-6 place-items-center rounded-sm opacity-0 hover:bg-ide-hover hover:text-ide-text group-hover:opacity-100"
          title={t("tree.refresh")}
          onClick={() => s.refreshTree()}
        >
          <RefreshCw size={14} />
        </button>
        <button
          className="grid h-6 w-6 place-items-center rounded-sm opacity-0 hover:bg-ide-hover hover:text-ide-text group-hover:opacity-100"
          title={t("tree.collapseAll")}
          onClick={() => location.reload()}
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-auto pb-2">
        <div className="flex items-center gap-1 px-2 py-[3px] text-2xs font-bold uppercase tracking-wide text-ide-text">
          <ChevronDown size={14} className="shrink-0 text-ide-dim" />
          <span className="truncate">{s.project?.name ?? s.tree.name}</span>
        </div>
        {s.tree.children.map((c) => <TreeNode key={c.path} node={c} depth={0} />)}
      </div>
    </div>
  );
}
