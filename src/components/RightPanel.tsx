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

/** Secondary side bar: Manifest + Preview tabs. */
export default function RightPanel({ onClose }: { onClose: () => void }) {
  const s = useStudio();
  const { t } = useI18n();

  const select = (id: RightTab) => {
    s.setRightTab(id);
    if (id === "preview" && !s.previewUrl) void s.runPreview();
  };

  return (
    <div className="flex h-full flex-col border-l border-ide-border bg-ide-sidebar">
      <div className="flex h-9 shrink-0 items-center border-b border-ide-border px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => select(tab.id)}
            className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-2xs uppercase tracking-wide ${
              s.rightTab === tab.id
                ? "border-ide-accent text-ide-text"
                : "border-transparent text-ide-dim hover:text-ide-text"
            }`}
          >
            <tab.icon size={13} />
            {t(tab.labelKey)}
          </button>
        ))}
        <div className="flex-1" />
        <button className="grid h-6 w-6 place-items-center rounded-sm hover:bg-ide-hover" onClick={onClose} title={t("common.hide")}>
          <X size={14} className="text-ide-dim" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {s.rightTab === "manifest" ? <ManifestPanel /> : <PreviewPanel />}
      </div>
    </div>
  );
}
