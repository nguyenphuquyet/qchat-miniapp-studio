import { useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { Minus, X, Square, ZoomIn, ZoomOut, Languages, Check } from "lucide-react";
import { useStudio } from "../lib/store";
import { isInteractive, warmWindow, winAction } from "../lib/window";
import { useContextMenu } from "./ContextMenu";
import { LANGS, useI18n } from "../lib/i18n";
import logo from "../assets/logo.png";

/**
 * Custom title bar.
 *
 * The window is created with `decorations: false`, so this bar *is* the window
 * frame: it must be mounted on every screen (welcome screen included), otherwise
 * the window cannot be dragged or closed.
 */
export default function TitleBar({ title }: { title?: string }) {
  const s = useStudio();
  const ctx = useContextMenu();
  const { t, lang, setLang } = useI18n();

  // Warm the window handle so the first title-bar drag reacts immediately.
  useEffect(() => {
    warmWindow();
  }, []);

  /**
   * Tauri ignores Electron's `-webkit-app-region: drag`, so the drag has to be
   * started from JS on mousedown. Anything marked `.no-drag` (window buttons,
   * zoom controls) keeps its normal click behaviour.
   */
  const onMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isInteractive(e.target)) return;
    e.preventDefault();
    void winAction("startDragging");
  };

  const onDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (isInteractive(e.target)) return;
    void winAction("toggleMaximize");
  };

  /** Language picker: reuses the app-wide context menu, anchored under the button. */
  const openLangMenu = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    ctx.open(
      { clientX: r.left, clientY: r.bottom + 2 },
      LANGS.map((l) => ({
        label: l.label,
        icon: lang === l.id ? <Check size={12} /> : <span className="inline-block w-3" />,
        action: () => setLang(l.id),
      })),
    );
  };

  /** Frameless window: right-clicking the frame offers the window commands. */
  const onContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    ctx.open(e, [
      { label: t("common.minimize"), icon: <Minus size={12} />, action: () => void winAction("minimize") },
      { label: t("common.maximize"), icon: <Square size={11} />, action: () => void winAction("toggleMaximize") },
      { separator: true },
      { label: t("common.zoomIn"), icon: <ZoomIn size={12} />, disabled: s.uiScale >= 1.8, action: s.zoomIn },
      { label: t("common.zoomOut"), icon: <ZoomOut size={12} />, disabled: s.uiScale <= 0.85, action: s.zoomOut },
      { label: t("common.resetZoom"), shortcut: "Ctrl+0", action: s.resetZoom },
      { separator: true },
      { label: t("common.close"), icon: <X size={12} />, danger: true, action: () => void winAction("close") },
    ]);
  };

  return (
    <div
      className="drag-region flex items-center h-9 px-2 shrink-0 bg-darcula-bg border-b border-black/40 select-none text-2xs text-darcula-dim"
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <div className="no-drag flex items-center gap-2 w-48">
        <img src={logo} alt={t("app.title")} className="w-5 h-5 rounded-md object-cover" />
        <span className="text-darcula-text font-medium">{t("app.title")}</span>
      </div>

      <div className="flex-1 text-center truncate px-4">{title ?? t("app.title")}</div>

      <div className="no-drag flex items-center gap-1">
        <button
          onClick={openLangMenu}
          title={t("common.language")}
          className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-white/10 hover:text-white"
        >
          <Languages size={13} />
          <span className="text-[0.625rem] font-medium">{LANGS.find((l) => l.id === lang)?.short}</span>
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button
          onClick={s.zoomOut}
          disabled={s.uiScale <= 0.85}
          title={`${t("common.zoomOut")} (Ctrl+-)`}
          className="p-1 rounded hover:bg-white/10 disabled:opacity-40"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={s.resetZoom}
          title={`${t("common.resetZoom")} (Ctrl+0)`}
          className="w-9 text-[0.625rem] tabular-nums hover:text-white"
        >
          {Math.round(s.uiScale * 100)}%
        </button>
        <button
          onClick={s.zoomIn}
          disabled={s.uiScale >= 1.8}
          title={`${t("common.zoomIn")} (Ctrl+=)`}
          className="p-1 rounded hover:bg-white/10 disabled:opacity-40"
        >
          <ZoomIn size={13} />
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <button
          onClick={() => winAction("minimize")}
          title={t("common.minimize")}
          className="p-1.5 hover:bg-white/10 rounded"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => winAction("toggleMaximize")}
          title={t("common.maximize")}
          className="p-1.5 hover:bg-white/10 rounded"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => winAction("close")}
          title={t("common.close")}
          className="p-1.5 hover:bg-red-500/80 hover:text-white rounded"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
