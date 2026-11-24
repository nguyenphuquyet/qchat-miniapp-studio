import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useStudio } from "../lib/store";
import { ALL_PERMISSIONS } from "../lib/api";
import { useI18n } from "../lib/i18n";

export default function ManifestPanel() {
  const s = useStudio();
  const { t } = useI18n();
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
    <div className="flex h-full flex-col bg-ide-sidebar">
      <div className="flex-1 space-y-3 overflow-auto p-3 text-2xs">
        <div>
          <div className="mb-1 text-ide-dim">{t("manifest.appName")}</div>
          <input className="ide-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="mb-1 text-ide-dim">{t("manifest.appId")}</div>
          <input className="ide-input font-mono text-ide-blue" value={appId} onChange={(e) => setAppId(e.target.value)} />
        </div>
        <div>
          <div className="mb-1 text-ide-dim">{t("manifest.version")}</div>
          <input className="ide-input font-mono" value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <div>
          <div className="mb-1 text-ide-dim">{t("manifest.description")}</div>
          <textarea className="ide-input resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <div className="mb-1.5 text-ide-dim">{t("manifest.permissions")}</div>
          <div className="space-y-1">
            {ALL_PERMISSIONS.map((perm) => (
              <label key={perm.id} className="flex cursor-pointer items-center gap-2 hover:text-ide-text">
                <input type="checkbox" checked={permissions.includes(perm.id)} onChange={() => toggle(perm.id)} />
                <span className="font-mono text-ide-text">{perm.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          disabled={!dirty}
          onClick={() => s.updateManifest({ name, app_id: appId, version, description, permissions })}
          className="ide-btn ide-btn-primary w-full py-2 font-medium"
        >
          <Save size={13} /> {t("manifest.apply")}
        </button>
        <div className="leading-relaxed text-ide-dim">{t("manifest.note")}</div>
      </div>
    </div>
  );
}
