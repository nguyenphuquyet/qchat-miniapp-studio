import { useEffect, useState } from "react";
import { X, FolderOpen, RefreshCw } from "lucide-react";
import { useStudio } from "../lib/store";
import { api, ALL_PERMISSIONS, generateAppId } from "../lib/api";

export default function NewProjectDialog() {
  const s = useStudio();
  const [name, setName] = useState("MyMiniApp");
  const [appId, setAppId] = useState(generateAppId());
  const [description, setDescription] = useState("A QChat Mini App");
  const [version, setVersion] = useState("1.0.0");
  const [permissions, setPermissions] = useState<string[]>(["toast", "storage"]);
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Default location: home dir
    setLocation((prev) => prev || "");
  }, []);

  if (s.dialog !== "new") return null;

  const toggle = (p: string) =>
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const create = async () => {
    if (!name.trim()) return setError("Project name is required");
    if (!location) return setError("Choose a parent directory");
    if (!/^mp_[a-z0-9]{12,24}$/.test(appId)) return setError("App ID must match mp_<12-24 hex chars>");
    try {
      await s.doCreateProject({
        parent_dir: location,
        name: name.trim(),
        app_id: appId,
        description,
        version,
        permissions,
      });
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center" onClick={() => s.setDialog(null)}>
      <div
        className="w-[560px] max-h-[90vh] overflow-auto bg-darcula-panel border border-black/60 rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center h-11 px-4 border-b border-black/40">
          <span className="text-sm text-white font-medium">New QChat Mini App Project</span>
          <div className="flex-1" />
          <button className="p-1 hover:bg-white/10 rounded" onClick={() => s.setDialog(null)}><X size={15} /></button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <Field label="App name">
            <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="App ID (from Developer Center, format mp_…) ">
            <div className="flex gap-2">
              <input className="inp flex-1 font-mono" value={appId} onChange={(e) => setAppId(e.target.value)} />
              <button className="btn" title="Regenerate" onClick={() => setAppId(generateAppId())}><RefreshCw size={13} /></button>
            </div>
          </Field>
          <Field label="Description">
            <input className="inp" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Version (semver)">
              <input className="inp" value={version} onChange={(e) => setVersion(e.target.value)} />
            </Field>
            <Field label="Location">
              <div className="flex gap-2">
                <input className="inp flex-1 text-2xs" value={location} placeholder="Choose folder…" onChange={(e) => setLocation(e.target.value)} />
                <button className="btn" onClick={async () => { const d = await api.pickDirectory(); if (d) setLocation(d); }}><FolderOpen size={13} /></button>
              </div>
            </Field>
          </div>

          <div>
            <div className="text-darcula-text mb-2">Requested permissions</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_PERMISSIONS.map((p) => (
                <label key={p.id} className="flex items-start gap-2 p-2 rounded bg-darcula-editor border border-white/5 cursor-pointer hover:border-white/20">
                  <input
                    type="checkbox"
                    checked={permissions.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div>
                    <div className="text-2xs text-white font-mono">{p.label}</div>
                    <div className="text-2xs text-darcula-dim">{p.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="text-darcula-red text-2xs">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black/40 bg-darcula-bg">
          <button className="px-4 py-1.5 rounded text-2xs text-darcula-text hover:bg-white/5" onClick={() => s.setDialog(null)}>Cancel</button>
          <button className="px-4 py-1.5 rounded bg-darcula-green hover:bg-emerald-600 text-white text-2xs font-medium" onClick={create}>Create</button>
        </div>
      </div>
      <style>{`.inp{width:100%;background:#2b2b2b;border:1px solid #4b4f52;border-radius:4px;padding:6px 10px;color:#e8eef7;font-size:12px;outline:none}.inp:focus{border-color:#4e94ce}.btn{display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;background:#3c3f41;border:1px solid #4b4f52;border-radius:4px;color:#bbbbbb;cursor:pointer}.btn:hover{background:#4b4f52}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs text-darcula-dim mb-1">{label}</div>
      {children}
    </div>
  );
}
