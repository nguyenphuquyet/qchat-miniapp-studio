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
    <div className="h-full flex flex-col bg-darcula-editor">
      <div className="flex-1 overflow-auto p-3 space-y-3 text-2xs">
        <div>
          <div className="text-darcula-dim mb-1">{t("manifest.appName")}</div>
          <input className="w-full bg-darcula-panel border border-white/10 rounded px-2 py-1.5 text-darcula-text outline-none focus:border-darcula-accent" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="text-darcula-dim mb-1">{t("manifest.appId")}</div>
          <input className="w-full bg-darcula-panel border border-white/10 rounded px-2 py-1.5 font-mono text-darcula-accent outline-none focus:border-darcula-accent" value={appId} onChange={(e) => setAppId(e.target.value)} />
        </div>
        <div>
          <div className="text-darcula-dim mb-1">{t("manifest.version")}</div>
          <input className="w-full bg-darcula-panel border border-white/10 rounded px-2 py-1.5 font-mono text-darcula-text outline-none focus:border-darcula-accent" value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <div>
          <div className="text-darcula-dim mb-1">{t("manifest.description")}</div>
          <textarea className="w-full bg-darcula-panel border border-white/10 rounded px-2 py-1.5 text-darcula-text outline-none focus:border-darcula-accent resize-none" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <div className="text-darcula-dim mb-1.5">{t("manifest.permissions")}</div>
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
          <Save size={13} /> {t("manifest.apply")}
        </button>
        <div className="text-darcula-dim/70 leading-relaxed">
          {t("manifest.note")}
        </div>
      </div>
    </div>
  );
}
