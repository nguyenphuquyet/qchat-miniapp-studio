import { useEffect, useState } from "react";
import { X, FolderOpen, RefreshCw } from "lucide-react";
import { useStudio } from "../lib/store";
import { api, ALL_PERMISSIONS, generateAppId, projectPathPreview } from "../lib/api";
import { useI18n } from "../lib/i18n";

export default function NewProjectDialog() {
  const s = useStudio();
  const { t } = useI18n();
  const [name, setName] = useState("MyMiniApp");
  const [appId, setAppId] = useState(generateAppId());
  const [description, setDescription] = useState("A QChat Mini App");
  const [version, setVersion] = useState("1.0.0");
  const [permissions, setPermissions] = useState<string[]>(["toast", "storage"]);
  const [location, setLocation] = useState("");
  const [defaultDir, setDefaultDir] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Default location: <Documents>/QChat Mini App Studio Project (created on disk).
    let alive = true;
    api
      .defaultProjectDir()
      .then((dir) => {
        if (!alive) return;
        setDefaultDir(dir);
        setLocation((prev) => prev || dir);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (s.dialog !== "new") return null;

  const toggle = (p: string) =>
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const create = async () => {
    if (!name.trim()) return setError(t("newProject.errName"));
    if (!location) return setError(t("newProject.errLocation"));
    if (!/^mp_[a-z0-9]{12,24}$/.test(appId)) return setError(t("newProject.errAppId"));
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onClick={() => s.setDialog(null)}>
      <div
        className="max-h-[90vh] w-[560px] overflow-auto rounded-md border border-ide-border bg-ide-widget shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-11 items-center border-b border-ide-border px-4">
          <span className="text-sm font-medium text-ide-text">{t("newProject.title")}</span>
          <div className="flex-1" />
          <button className="grid h-6 w-6 place-items-center rounded-sm hover:bg-ide-hover" onClick={() => s.setDialog(null)}>
            <X size={15} />
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs">
          <Field label={t("newProject.appName")}>
            <input className="ide-input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("newProject.appId")}>
            <div className="flex gap-2">
              <input className="ide-input flex-1 font-mono" value={appId} onChange={(e) => setAppId(e.target.value)} />
              <button className="ide-btn px-2.5" title={t("newProject.regenerate")} onClick={() => setAppId(generateAppId())}>
                <RefreshCw size={13} />
              </button>
            </div>
          </Field>
          <Field label={t("newProject.description")}>
            <input className="ide-input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("newProject.version")}>
              <input className="ide-input" value={version} onChange={(e) => setVersion(e.target.value)} />
            </Field>
            <Field label={t("newProject.location")}>
              <div className="flex gap-2">
                <input className="ide-input flex-1 text-2xs" value={location} placeholder={t("newProject.locationPlaceholder")} onChange={(e) => setLocation(e.target.value)} />
                <button className="ide-btn px-2.5" onClick={async () => { const d = await api.pickDirectory(location || defaultDir); if (d) setLocation(d); }}>
                  <FolderOpen size={13} />
                </button>
              </div>
            </Field>
          </div>

          <div>
            <div className="mb-1 text-2xs text-ide-dim">{t("newProject.pathPreview")}</div>
            <div className="break-all rounded-sm border border-ide-border bg-ide-input px-2 py-1.5 font-mono text-2xs text-ide-text">
              {projectPathPreview(location, name) || "—"}
            </div>
            <div className="mt-1 text-2xs text-ide-dim">{t("newProject.locationHint")}</div>
          </div>

          <div>
            <div className="mb-2 text-ide-text">{t("newProject.permissions")}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_PERMISSIONS.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-start gap-2 rounded-sm border border-ide-border bg-ide-editor p-2 hover:border-ide-accent">
                  <input
                    type="checkbox"
                    checked={permissions.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-mono text-2xs text-ide-text">{p.label}</div>
                    <div className="text-2xs text-ide-dim">{p.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="text-2xs text-ide-red">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-ide-border bg-ide-sidebar px-5 py-3">
          <button className="ide-btn" onClick={() => s.setDialog(null)}>{t("common.cancel")}</button>
          <button className="ide-btn ide-btn-primary" onClick={create}>{t("common.create")}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-2xs text-ide-dim">{label}</div>
      {children}
    </div>
  );
}
