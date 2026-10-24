import { useEffect, useRef, useState } from "react";
import { Smartphone, RefreshCw } from "lucide-react";
import { useStudio } from "../lib/store";
import { useI18n } from "../lib/i18n";

const PHONE_W = 390;
const PHONE_H = 844;
const BEZEL = 10;

/** Live Mini App preview, shown as a tab of the right-hand panel. */
export default function PreviewPanel() {
  const s = useStudio();
  const { t } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  /** null = "fit to panel"; a number = manual zoom chosen with the slider. */
  const [manual, setManual] = useState<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fit = Math.max(
    0.2,
    Math.min(1, (box.w - 24) / (PHONE_W + BEZEL * 2), (box.h - 24) / (PHONE_H + BEZEL * 2)),
  );
  const scale = manual ?? fit;

  return (
    <div className="h-full flex flex-col bg-darcula-editor">
      <div className="flex items-center gap-2 h-7 px-2 border-b border-black/30 text-2xs text-darcula-dim shrink-0">
        <Smartphone size={12} className="text-darcula-accent shrink-0" />
        <span className="truncate flex-1" title={t("bottom.previewDevice")}>{t("bottom.previewDevice")}</span>
        <button
          className="flex items-center gap-1 text-darcula-accent hover:underline shrink-0"
          onClick={() => void s.runPreview()}
        >
          <RefreshCw size={11} /> {t("bottom.previewReload")}
        </button>
      </div>

      <div ref={boxRef} className="flex-1 min-h-0 overflow-auto bg-[#1e1f22] grid place-items-center p-3">
        {s.previewUrl ? (
          <div
            className="shrink-0"
            style={{ width: (PHONE_W + BEZEL * 2) * scale, height: (PHONE_H + BEZEL * 2) * scale }}
          >
            {/* The phone keeps its real 390x844 viewport and is scaled visually. */}
            <div
              className="rounded-[28px] bg-black shadow-2xl overflow-hidden origin-top-left"
              style={{
                width: PHONE_W + BEZEL * 2,
                height: PHONE_H + BEZEL * 2,
                padding: BEZEL,
                transform: `scale(${scale})`,
              }}
            >
              <iframe
                key={s.previewUrl}
                src={s.previewUrl}
                className="w-full h-full bg-white rounded-[18px]"
                title="Mini App Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              />
            </div>
          </div>
        ) : (
          <div className="text-center text-darcula-dim text-2xs px-4">
            <Smartphone size={32} className="mx-auto mb-2 opacity-40" />
            {t("bottom.previewNone")}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-black/30 px-3 py-2 text-2xs text-darcula-dim space-y-1.5">
        <div className="flex items-center gap-2">
          <span>{t("bottom.previewZoom")}</span>
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.05}
            value={scale}
            onChange={(e) => setManual(Number(e.target.value))}
            className="flex-1 min-w-0"
          />
          <button
            className="w-10 text-right tabular-nums hover:text-white"
            title="Fit"
            onClick={() => setManual(null)}
          >
            {Math.round(scale * 100)}%
          </button>
        </div>
        <div className="text-darcula-dim/70 leading-relaxed">{t("bottom.mockBridgeNote")}</div>
      </div>
    </div>
  );
}
