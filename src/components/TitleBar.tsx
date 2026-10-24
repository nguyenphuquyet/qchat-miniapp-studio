import { useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { Minus, X, Square, ZoomIn, ZoomOut } from "lucide-react";
import { useStudio } from "../lib/store";
import { isInteractive, warmWindow, winAction } from "../lib/window";
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

  return (
    <div
      className="drag-region flex items-center h-9 px-2 shrink-0 bg-darcula-bg border-b border-black/40 select-none text-2xs text-darcula-dim"
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="no-drag flex items-center gap-2 w-48">
        <img src={logo} alt="QChat Mini App Studio" className="w-5 h-5 rounded-md object-cover" />
        <span className="text-darcula-text font-medium">QChat Mini App Studio</span>
      </div>

      <div className="flex-1 text-center truncate px-4">{title ?? "QChat Mini App Studio"}</div>

      <div className="no-drag flex items-center gap-1">
        <button
          onClick={s.zoomOut}
          disabled={s.uiScale <= 0.85}
          title="Thu nhỏ giao diện (Ctrl+-)"
          className="p-1 rounded hover:bg-white/10 disabled:opacity-40"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={s.resetZoom}
          title="Cỡ giao diện mặc định (Ctrl+0)"
          className="w-9 text-[0.625rem] tabular-nums hover:text-white"
        >
          {Math.round(s.uiScale * 100)}%
        </button>
        <button
          onClick={s.zoomIn}
          disabled={s.uiScale >= 1.8}
          title="Phóng to giao diện (Ctrl+=)"
          className="p-1 rounded hover:bg-white/10 disabled:opacity-40"
        >
          <ZoomIn size={13} />
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <button
          onClick={() => winAction("minimize")}
          title="Thu nhỏ"
          className="p-1.5 hover:bg-white/10 rounded"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => winAction("toggleMaximize")}
          title="Phóng to / khôi phục"
          className="p-1.5 hover:bg-white/10 rounded"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => winAction("close")}
          title="Đóng"
          className="p-1.5 hover:bg-red-500/80 hover:text-white rounded"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
