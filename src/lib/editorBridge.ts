import type { EditorView } from "@codemirror/view";

/**
 * The CodeMirror view currently mounted in the editor.
 *
 * The context menu and the menu bar act on the editor from the outside, while
 * CodeMirror owns its instance inside `CodeEditor`, so the active view is
 * published here (same idea as the `window.__TAURI_INTERNALS__` bridge).
 */
let activeView: EditorView | null = null;

export function setActiveEditor(view: EditorView | null) {
  activeView = view;
}

export function getActiveEditor(): EditorView | null {
  return activeView;
}
