import { useState } from "react";
import {
  Folder, FolderOpen, ChevronRight, FileCode2, FileText,
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
    return <FileCode2 size={14} className="text-darcula-blue" />;
  if (name.endsWith(".json")) return <Braces size={14} className="text-darcula-yellow" />;
  if (name.endsWith(".css")) return <Palette size={14} className="text-darcula-orange" />;
  if (name.endsWith(".html")) return <Globe size={14} className="text-darcula-orange" />;
  if (name.endsWith(".md")) return <ScrollText size={14} className="text-darcula-dim" />;
  if (name === ".gitignore") return <FileText size={14} className="text-darcula-dim" />;
  return <FileText size={14} className="text-darcula-dim" />;
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
          className={`flex items-center gap-1 px-1 py-[3px] cursor-pointer hover:bg-white/5 ${isActive ? "bg-darcula-selectInactive" : ""}`}
          style={{ paddingLeft: 4 + depth * 12 }}
          onClick={() => setOpen(!open)}
          onContextMenu={onContextMenu}
        >
          <ChevronRight size={12} className={`text-darcula-dim transition-transform ${open ? "rotate-90" : ""}`} />
          {open ? <FolderOpen size={14} className="text-darcula-accent" /> : <Folder size={14} className="text-darcula-accent" />}
          <span className="text-2xs text-darcula-text truncate">{node.name}</span>
        </div>
        {open && node.children.map((c) => <TreeNode key={c.path} node={c} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 px-1 py-[3px] cursor-pointer hover:bg-white/5 ${isActive ? "bg-darcula-select text-white" : ""}`}
      style={{ paddingLeft: 20 + depth * 12 }}
      onClick={() => s.openFile(node.path)}
      onContextMenu={onContextMenu}
    >
      <span className="w-3" />
      {fileIcon(node.name)}
      <span className={`text-2xs truncate ${isOpenFile && !isActive ? "text-white" : "text-darcula-text"}`}>{node.name}</span>
      {s.openFiles.find((f) => f.path === node.path)?.dirty && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-darcula-modified" />
      )}
    </div>
  );
}

export default function ProjectTree() {
  const s = useStudio();
  const { t } = useI18n();
  if (!s.tree) return <div className="p-3 text-2xs text-darcula-dim">{t("tree.noProject")}</div>;
  return (
    <div className="h-full flex flex-col bg-darcula-editor">
      <div className="flex items-center h-7 px-2 border-b border-black/40 text-2xs text-darcula-text shrink-0">
        <span className="font-semibold">{t("tree.title")}</span>
        <span className="mx-1.5 text-darcula-dim">|</span>
        <span className="text-darcula-dim">{t("tree.subtitle")}</span>
        <div className="flex-1" />
        <button className="p-1 hover:bg-white/10 rounded" title={t("tree.collapseAll")} onClick={() => location.reload()}>
          <ChevronRight size={12} className="text-darcula-dim" />
        </button>
        <button className="p-1 hover:bg-white/10 rounded" title={t("tree.refresh")} onClick={() => s.refreshTree()}>
          <RefreshCw size={12} className="text-darcula-dim" />
        </button>
      </div>
      <div className="flex-1 overflow-auto py-1">
        <div className="flex items-center gap-1 px-1 py-1 text-2xs font-semibold text-darcula-accent">
          <FolderOpen size={14} />
          <span className="truncate">{s.project?.name ?? s.tree.name}</span>
        </div>
        {s.tree.children.map((c) => <TreeNode key={c.path} node={c} depth={0} />)}
      </div>
    </div>
  );
}
