import { redo, selectAll, undo } from "@codemirror/commands";
import { openSearchPanel } from "@codemirror/search";
import { copyText, readText } from "./clipboard";
import { getActiveEditor } from "./editorBridge";

/** Editor commands shared by the context menu and the menu bar. */

export function hasEditorSelection(): boolean {
  const view = getActiveEditor();
  if (!view) return false;
  const { from, to } = view.state.selection.main;
  return from !== to;
}

function selectionText(): string {
  const view = getActiveEditor();
  if (!view) return "";
  const { from, to } = view.state.selection.main;
  return view.state.sliceDoc(from, to);
}

export function editorUndo() {
  const view = getActiveEditor();
  if (view) undo(view);
}

export function editorRedo() {
  const view = getActiveEditor();
  if (view) redo(view);
}

export function editorSelectAll() {
  const view = getActiveEditor();
  if (!view) return;
  selectAll(view);
  view.focus();
}

export function editorFind() {
  const view = getActiveEditor();
  if (!view) return;
  openSearchPanel(view);
  view.focus();
}

export async function editorCopy(): Promise<boolean> {
  const text = selectionText();
  if (!text) return false;
  return copyText(text);
}

export async function editorCut(): Promise<boolean> {
  const view = getActiveEditor();
  if (!view) return false;
  const { from, to } = view.state.selection.main;
  if (from === to) return false;
  await copyText(view.state.sliceDoc(from, to));
  view.dispatch({ changes: { from, to, insert: "" } });
  view.focus();
  return true;
}

export async function editorPaste(): Promise<boolean> {
  const view = getActiveEditor();
  if (!view) return false;
  const text = await readText();
  if (!text) return false;
  view.dispatch(view.state.replaceSelection(text));
  view.focus();
  return true;
}
