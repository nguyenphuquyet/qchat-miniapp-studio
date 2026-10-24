import { Braces, Smartphone, X } from "lucide-react";
import { useStudio } from "../lib/store";
import type { RightTab } from "../lib/store";
import { useI18n, type I18nKey } from "../lib/i18n";
import ManifestPanel from "./ManifestPanel";
import PreviewPanel from "./PreviewPanel";

const TABS: { id: RightTab; labelKey: I18nKey; icon: any }[] = [
  { id: "manifest", labelKey: "right.tab.manifest", icon: Braces },
  { id: "preview", labelKey: "bottom.tab.preview", icon: Smartphone },
];

/** Right-hand tool window: Manifest + Preview tabs. */
export default function RightPanel({ onClose }: { onClose: () => void }) {
  const s = useStudio();
  const { t } = useI18n();

  const select = (id: RightTab) => {
    s.setRightTab(id);
    if (id === "preview" && !s.previewUrl) void s.runPreview();
  };

  return (
    <div className="h-full flex flex-col bg-darcula-editor border-l border-black/40">
      <div className="flex items-center h-7 px-1 border-b border-black/40 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => select(tab.id)}
            className={`flex items-center gap-1.5 px-3 h-7 text-2xs border-b-2 ${
              s.rightTab === tab.id
                ? "text-white border-darcula-modified"
                : "text-darcula-dim border-transparent hover:text-darcula-text"
            }`}
          >
            <tab.icon size={12} />
            {t(tab.labelKey)}
          </button>
        ))}
        <div className="flex-1" />
        <button className="p-1 hover:bg-white/10 rounded" onClick={onClose} title={t("common.hide")}>
          <X size={12} className="text-darcula-dim" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {s.rightTab === "manifest" ? <ManifestPanel /> : <PreviewPanel />}
      </div>
    </div>
  );
}
