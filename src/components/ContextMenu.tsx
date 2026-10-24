import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState,
  type ReactNode,
} from "react";
import { copyText, readText } from "../lib/clipboard";

export type ContextMenuItem =
  | { separator: true }
  | {
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
      action: () => void;
    };

type OpenInput = { clientX: number; clientY: number; nativeEvent?: Event };

type MenuApi = {
  /** Opens a custom menu at the pointer, replacing the WebView's own menu. */
  open: (e: OpenInput, items: ContextMenuItem[]) => void;
  close: () => void;
};

const Ctx = createContext<MenuApi | null>(null);

export function useContextMenu(): MenuApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useContextMenu must be used inside <ContextMenuProvider>");
  return api;
}

/** Right-clicks already claimed by a component's own `onContextMenu`. */
const claimed = new WeakSet<Event>();

/**
 * Owns the single app-wide context menu.
 *
 * Tauri's WebView2/WebKitGTK would otherwise show the browser menu ("Reload",
 * "Inspect", "Save image as"...), which makes no sense inside the studio: the
 * `contextmenu` event is always cancelled here, and a generic Cut/Copy/Paste
 * menu is shown for right-clicks that no component claimed.
 */
export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const open = useCallback((e: OpenInput, items: ContextMenuItem[]) => {
    if (e.nativeEvent) claimed.add(e.nativeEvent);
    setMenu({ x: e.clientX, y: e.clientY, items });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // never show the WebView's built-in menu
      if (claimed.has(e)) return;
      setMenu({ x: e.clientX, y: e.clientY, items: fallbackItems(e.target) });
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    const dismiss = () => setMenu(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", dismiss);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", dismiss);
      window.removeEventListener("resize", dismiss);
    };
  }, [menu]);

  // Keep the menu inside the window.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || !menu) return;
    const { width, height } = el.getBoundingClientRect();
    el.style.left = `${Math.max(6, Math.min(menu.x, window.innerWidth - width - 6))}px`;
    el.style.top = `${Math.max(6, Math.min(menu.y, window.innerHeight - height - 6))}px`;
  }, [menu]);

  return (
    <Ctx.Provider value={{ open, close }}>
      {children}
      {menu && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onMouseDown={close}
            onContextMenu={(e) => {
              e.preventDefault();
              close();
            }}
          />
          <div
            ref={menuRef}
            className="fixed z-[80] min-w-[190px] max-h-[70vh] overflow-auto bg-darcula-panel border border-black/60 rounded-sm shadow-2xl py-1 text-2xs text-darcula-text"
            style={{ left: menu.x, top: menu.y }}
          >
            {menu.items.map((item, i) =>
              "separator" in item ? (
                <div key={i} className="h-px bg-white/10 my-1" />
              ) : (
                <button
                  key={i}
                  disabled={item.disabled}
                  onClick={() => {
                    setMenu(null);
                    item.action();
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left disabled:opacity-40 ${
                    item.danger
                      ? "text-red-400 hover:bg-red-500/80 hover:text-white"
                      : "hover:bg-darcula-hover hover:text-white"
                  }`}
                >
                  {item.icon && <span className="text-darcula-dim">{item.icon}</span>}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.shortcut && <span className="text-darcula-dim/70 ml-4">{item.shortcut}</span>}
                </button>
              ),
            )}
          </div>
        </>
      )}
    </Ctx.Provider>
  );
}

/** Generic menu for right-clicks no component claimed (editors, inputs, text). */
function fallbackItems(target: EventTarget | null): ContextMenuItem[] {
  const el = target instanceof HTMLElement ? target : null;
  const editable =
    !!el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  const selection = window.getSelection?.()?.toString() ?? "";

  if (editable) {
    return [
      { label: "Cut", shortcut: "Ctrl+X", disabled: !selection, action: () => void cutFromElement(el) },
      { label: "Copy", shortcut: "Ctrl+C", disabled: !selection, action: () => void copyText(selection) },
      { label: "Paste", shortcut: "Ctrl+V", action: () => void pasteIntoElement(el) },
      { separator: true },
      {
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => {
          el?.focus();
          document.execCommand("selectAll");
        },
      },
    ];
  }

  return [
    { label: "Copy", shortcut: "Ctrl+C", disabled: !selection, action: () => void copyText(selection) },
    { label: "Select All", shortcut: "Ctrl+A", action: () => document.execCommand("selectAll") },
  ];
}

async function cutFromElement(el: HTMLElement | null) {
  const selection = window.getSelection?.()?.toString() ?? "";
  if (selection) await copyText(selection);
  el?.focus();
  document.execCommand("cut");
}

async function pasteIntoElement(el: HTMLElement | null) {
  const text = await readText();
  if (!text) return;
  el?.focus();
  if (document.execCommand("insertText", false, text)) return;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    el.setRangeText(text, start, end, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
