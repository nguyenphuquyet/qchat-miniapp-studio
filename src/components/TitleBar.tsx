import { useEffect, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Minus, X, Square, ZoomIn, ZoomOut, Languages, Check, Sun, Moon, Search } from "lucide-react";
import { useStudio } from "../lib/store";
import { isInteractive, warmWindow, winAction } from "../lib/window";
import { useContextMenu } from "./ContextMenu";
import { LANGS, useI18n } from "../lib/i18n";
import logo from "../assets/logo.png";

/**
 * VS Code style title bar.
 *
 * The window is created with `decorations: false`, so this bar *is* the window
 * frame: it must be mounted on every screen (welcome screen included), otherwise
 * the window cannot be dragged or closed.
 *
 * Layout: brand · menus · command center · layout actions · theme/language/zoom
 * · window controls.
 */
export default function TitleBar({
  title,
  menus,
  actions,
}: {
  title?: string;
  menus?: ReactNode;
  actions?: ReactNode;
}) {
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

  const isDark = s.theme === "dark";

  return (
    <div
      className="drag-region flex h-9 shrink-0 select-none items-center border-b border-ide-border bg-ide-titlebar pl-2 text-2xs text-ide-dim"
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <div className="no-drag flex shrink-0 items-center gap-2 pr-1">
        <img src={logo} alt={t("app.title")} className="h-5 w-5 rounded-sm object-cover" />
      </div>

      {menus ? (
        <div className="no-drag flex h-full shrink-0 items-center">{menus}</div>
      ) : (
        <span className="no-drag shrink-0 px-2 font-medium text-ide-text">{t("app.title")}</span>
      )}

      {/* Command center — mirrors VS Code's centered search pill. */}
      {menus ? (
        <div className="flex min-w-0 flex-1 justify-center px-3">
          <div className="flex h-6 w-full max-w-[560px] items-center justify-center gap-2 rounded-md border border-ide-border bg-ide-input/60 px-3 text-2xs text-ide-dim">
            <Search size={12} className="shrink-0" />
            <span className="truncate">{title ?? t("app.title")}</span>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="no-drag flex h-full shrink-0 items-center">
        {actions}

        <button
          onClick={s.toggleTheme}
          title={isDark ? t("common.themeLight") : t("common.themeDark")}
          aria-label={t("common.theme")}
          className="grid h-7 w-7 place-items-center rounded-sm text-ide-dim hover:bg-ide-hover hover:text-ide-text"
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <button
          onClick={openLangMenu}
          title={t("common.language")}
          className="flex h-7 items-center gap-1 rounded-sm px-1.5 text-ide-dim hover:bg-ide-hover hover:text-ide-text"
        >
          <Languages size={13} />
          <span className="text-[0.625rem] font-medium">{LANGS.find((l) => l.id === lang)?.short}</span>
        </button>

        <div className="mx-1 h-4 w-px bg-ide-border" />

        <button
          onClick={s.zoomOut}
          disabled={s.uiScale <= 0.85}
          title={`${t("common.zoomOut")} (Ctrl+-)`}
          className="grid h-7 w-7 place-items-center rounded-sm hover:bg-ide-hover hover:text-ide-text disabled:opacity-40"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={s.resetZoom}
          title={`${t("common.resetZoom")} (Ctrl+0)`}
          className="h-7 w-9 rounded-sm text-[0.625rem] tabular-nums hover:bg-ide-hover hover:text-ide-text"
        >
          {Math.round(s.uiScale * 100)}%
        </button>
        <button
          onClick={s.zoomIn}
          disabled={s.uiScale >= 1.8}
          title={`${t("common.zoomIn")} (Ctrl+=)`}
          className="grid h-7 w-7 place-items-center rounded-sm hover:bg-ide-hover hover:text-ide-text disabled:opacity-40"
        >
          <ZoomIn size={13} />
        </button>

        <div className="mx-1 h-4 w-px bg-ide-border" />

        <button
          onClick={() => winAction("minimize")}
          title={t("common.minimize")}
          className="grid h-9 w-11 place-items-center rounded-none hover:bg-ide-hover hover:text-ide-text"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => winAction("toggleMaximize")}
          title={t("common.maximize")}
          className="grid h-9 w-11 place-items-center rounded-none hover:bg-ide-hover hover:text-ide-text"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => winAction("close")}
          title={t("common.close")}
          className="grid h-9 w-11 place-items-center rounded-none hover:bg-[#e81123] hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
