/**
 * Thin wrapper around the Tauri window API.
 *
 * The studio window is created with `decorations: false`, so every window
 * control (drag, minimize, maximize, close) has to come from the webview.
 */
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export type WinAction = "minimize" | "toggleMaximize" | "close" | "startDragging";

/**
 * Cached handle to the current Tauri window.
 *
 * The module is imported lazily (so the browser-only bundle stays clean) but the
 * promise is memoised and warmed on mount, letting `startDragging()` fire during
 * the very mousedown that asked for it — otherwise the title bar feels laggy
 * while the module is still loading.
 */
let winPromise: Promise<import("@tauri-apps/api/window").Window> | null = null;

export function currentWindow() {
  if (!isTauri) return null;
  winPromise ??= import("@tauri-apps/api/window").then((m) => m.getCurrentWindow());
  return winPromise;
}

/** Resolves the window handle ahead of time (call once on mount). */
export function warmWindow() {
  void currentWindow()?.catch(() => undefined);
}

export async function winAction(action: WinAction) {
  const pending = currentWindow();
  if (!pending) return;
  try {
    const w = await pending;
    if (action === "minimize") await w.minimize();
    if (action === "toggleMaximize") await w.toggleMaximize();
    if (action === "close") await w.close();
    if (action === "startDragging") await w.startDragging();
  } catch {
    /* noop in browser */
  }
}

/** True when the event landed on (or inside) an element marked `.no-drag`. */
export function isInteractive(target: EventTarget | null) {
  return target instanceof Element && target.closest(".no-drag") !== null;
}
