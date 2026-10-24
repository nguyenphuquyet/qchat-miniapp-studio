import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { useStudio } from "../lib/store";
import { ALL_PERMISSIONS } from "../lib/api";

export default function ManifestPanel({ onClose }: { onClose: () => void }) {
  const s = useStudio();
  const p = s.project;
  const [name, setName] = useState("");
  const [appId, setAppId] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (p) {
      setName(p.name);
      setAppId(p.app_id);
      setVersion(p.version);
      setDescription(p.description);
      setPermissions(p.permissions);
    }
  }, [p]);

  if (!p) return null;
  const toggle = (id: string) =>
    setPermissions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const dirty =
    name !== p.name || appId !== p.app_id || version !== p.version ||
    description !== p.description || JSON.stringify(permissions) !== JSON.stringify(p.permissions);

  return (
    <div className="h-full flex flex-col bg-darcula-editor border-l border-black/40">
      <div className="flex items-center h-7 px-2 border-b border-black/40 text-2xs shrink-0">
        <span className="font-semibold text-darcula-text">Mini App Manifest</span>
        <div className="flex-1" />
        <button className="p-1 hover:bg-white/10 rounded" onClick={onClose}><X size={12} className="text-darcula-dim" /></button>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3 text-2xs">
        <div>
          <div className="text-darcula-dim mb-1">App name</div>
          <input className="w-full bg-darcula-panel border border-white/10 rounded px-2 py-1.5 text-darcula-text outline-none focus:border-darcula-accent" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="text-darcula-dim mb-1">App ID</div>
          <input className="w-full bg-darcula-panel border border-white/10 rounded px-2 py-1.5 font-mono text-darcula-accent outline-none focus:border-darcula-accent" value={appId} onChange={(e) => setAppId(e.target.value)} />
        </div>
        <div>
          <div className="text-darcula-dim mb-1">Version</div>
          <input className="w-full bg-darcula-panel border border-white/10 rounded px-2 py-1.5 font-mono text-darcula-text outline-none focus:border-darcula-accent" value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <div>
          <div className="text-darcula-dim mb-1">Description</div>
          <textarea className="w-full bg-darcula-panel border border-white/10 rounded px-2 py-1.5 text-darcula-text outline-none focus:border-darcula-accent resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <div className="text-darcula-dim mb-1.5">Permissions</div>
          <div className="space-y-1">
            {ALL_PERMISSIONS.map((perm) => (
              <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input type="checkbox" checked={permissions.includes(perm.id)} onChange={() => toggle(perm.id)} className="accent-emerald-500" />
                <span className="font-mono text-darcula-text">{perm.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          disabled={!dirty}
          onClick={() => s.updateManifest({ name, app_id: appId, version, description, permissions })}
          className="w-full flex items-center justify-center gap-2 py-2 rounded bg-darcula-green hover:bg-emerald-600 disabled:opacity-30 text-white font-medium"
        >
          <Save size={13} /> Apply to qchat.manifest.json
        </button>
        <div className="text-darcula-dim/70 leading-relaxed">
          Edits are written to <span className="font-mono text-darcula-accent">qchat.manifest.json</span>. The ZIP packager validates appId and version at build time.
        </div>
      </div>
    </div>
  );
}
