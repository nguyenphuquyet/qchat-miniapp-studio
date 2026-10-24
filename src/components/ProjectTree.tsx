import { useState } from "react";
import {
  Folder, FolderOpen, ChevronRight, FileCode2, FileJson, FileText,
  Braces, Palette, Globe, ScrollText, FilePlus2, FolderPlus, Trash2, RefreshCw,
} from "lucide-react";
import { useStudio } from "../lib/store";
import { api, type FileNode } from "../lib/api";

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
  const [open, setOpen] = useState(depth < 2);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const isActive = s.activePath === node.path;
  const isOpenFile = s.openFiles.some((f) => f.path === node.path);

  if (node.is_dir) {
    return (
      <div>
        <div
          className={`flex items-center gap-1 px-1 py-[3px] cursor-pointer hover:bg-white/5 ${isActive ? "bg-darcula-selectInactive" : ""}`}
          style={{ paddingLeft: 4 + depth * 12 }}
          onClick={() => setOpen(!open)}
          onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
        >
          <ChevronRight size={12} className={`text-darcula-dim transition-transform ${open ? "rotate-90" : ""}`} />
          {open ? <FolderOpen size={14} className="text-darcula-accent" /> : <Folder size={14} className="text-darcula-accent" />}
          <span className="text-2xs text-darcula-text truncate">{node.name}</span>
        </div>
        {open && node.children.map((c) => <TreeNode key={c.path} node={c} depth={depth + 1} />)}
        {menu && (
          <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} dir={node.path} />
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 px-1 py-[3px] cursor-pointer hover:bg-white/5 ${isActive ? "bg-darcula-select text-white" : ""}`}
      style={{ paddingLeft: 20 + depth * 12 }}
      onClick={() => s.openFile(node.path)}
      onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
    >
      <span className="w-3" />
      {fileIcon(node.name)}
      <span className={`text-2xs truncate ${isOpenFile && !isActive ? "text-white" : "text-darcula-text"}`}>{node.name}</span>
      {s.openFiles.find((f) => f.path === node.path)?.dirty && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-darcula-modified" />
      )}
      {menu && <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} file={node.path} />}
    </div>
  );
}

function ContextMenu({ x, y, onClose, file, dir }: { x: number; y: number; onClose: () => void; file?: string; dir?: string }) {
  const s = useStudio();
  const target = file ?? dir!;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="fixed z-50 min-w-[160px] bg-darcula-panel border border-black/60 rounded-sm shadow-2xl py-1 text-2xs text-darcula-text" style={{ left: x, top: y }}>
        {dir && (
          <>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-darcula-hover hover:text-white text-left" onClick={() => { const n = prompt("File name:"); if (n) s.newFile(dir, n); onClose(); }}>
              <FilePlus2 size={12} /> New File
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-darcula-hover hover:text-white text-left" onClick={() => { const n = prompt("Directory name:"); if (n) { api.createDirectory(dir + "/" + n).then(() => s.refreshTree()); } onClose(); }}>
              <FolderPlus size={12} /> New Directory
            </button>
            <div className="h-px bg-white/10 my-1" />
          </>
        )}
        <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-darcula-hover hover:text-white text-left" onClick={() => { s.refreshTree(); onClose(); }}>
          <RefreshCw size={12} /> Reload
        </button>
        <div className="h-px bg-white/10 my-1" />
        <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/80 hover:text-white text-left text-red-400" onClick={() => { if (confirm(`Delete ${target}?`)) s.deleteFile(target); onClose(); }}>
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </>
  );
}

export default function ProjectTree() {
  const s = useStudio();
  if (!s.tree) return <div className="p-3 text-2xs text-darcula-dim">No project open</div>;
  return (
    <div className="h-full flex flex-col bg-darcula-editor">
      <div className="flex items-center h-7 px-2 border-b border-black/40 text-2xs text-darcula-text shrink-0">
        <span className="font-semibold">Project</span>
        <span className="mx-1.5 text-darcula-dim">|</span>
        <span className="text-darcula-dim">Mini App</span>
        <div className="flex-1" />
        <button className="p-1 hover:bg-white/10 rounded" title="Collapse All" onClick={() => location.reload()}>
          <ChevronRight size={12} className="text-darcula-dim" />
        </button>
        <button className="p-1 hover:bg-white/10 rounded" title="Refresh" onClick={() => s.refreshTree()}>
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
