import { useEffect, useRef } from "react";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { tags as t } from "@lezer/highlight";
import { setActiveEditor, getActiveEditor } from "../lib/editorBridge";

const darculaHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#CC7832" },
  { tag: [t.controlKeyword, t.moduleKeyword], color: "#CC7832" },
  { tag: [t.string, t.special(t.string), t.attributeValue], color: "#6A8759" },
  { tag: [t.number, t.bool, t.null], color: "#6897BB" },
  { tag: t.comment, color: "#7F7F7F", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#FFC66D" },
  { tag: t.definition(t.variableName), color: "#A9B7C6" },
  { tag: [t.typeName, t.className, t.definition(t.typeName)], color: "#A9B7C6" },
  { tag: [t.propertyName, t.attributeName], color: "#A9B7C6" },
  { tag: [t.variableName], color: "#A9B7C6" },
  { tag: [t.operator, t.punctuation], color: "#A9B7C6" },
  { tag: [t.self, t.namespace], color: "#9876AA" },
  { tag: t.meta, color: "#BBB529" },
  { tag: t.tagName, color: "#E8BF6A" },
  { tag: t.atom, color: "#9876AA" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.link, color: "#6A8759", textDecoration: "underline" },
  { tag: t.invalid, color: "#BC3F3C" },
]);

const darculaTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#2B2B2B", color: "#A9B7C6", height: "100%" },
    ".cm-content": { caretColor: "#ffffff", padding: "8px 0" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#ffffff" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "#214283 !important",
    },
    ".cm-selectionMatch": { backgroundColor: "#21428355" },
    ".cm-activeLine": { backgroundColor: "#323232" },
    ".cm-gutters": {
      backgroundColor: "#313335",
      color: "#606366",
      border: "none",
      borderRight: "1px solid #323232",
      fontFamily: '"JetBrains Mono", monospace',
    },
    ".cm-activeLineGutter": { backgroundColor: "#323232", color: "#A4A3A3" },
    ".cm-foldPlaceholder": { backgroundColor: "transparent", border: "none", color: "#ddd" },
    ".cm-tooltip": { backgroundColor: "#3C3F41", border: "1px solid #4B4F52", color: "#BBBBBB" },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "#214283", color: "#fff" },
    ".cm-matchingBracket": { backgroundColor: "#3a5a3a", outline: "1px solid #59A869" },
    ".cm-panels": { backgroundColor: "#3C3F41", color: "#BBBBBB" },
    ".cm-panels.cm-panels-top": { borderBottom: "1px solid #323232" },
    ".cm-panels.cm-panels-bottom": { borderTop: "1px solid #323232" },
    ".cm-searchMatch": { backgroundColor: "#416730", outline: "1px solid #59A869" },
    ".cm-searchMatch-selected": { backgroundColor: "#59A869" },
  },
  { dark: true },
);

function languageFor(lang: string): Extension {
  switch (lang) {
    case "tsx":
      return javascript({ jsx: true, typescript: true });
    case "ts":
      return javascript({ typescript: true });
    case "js":
      return javascript();
    case "json":
      return json();
    case "html":
      return html();
    case "css":
      return css();
    default:
      return [];
  }
}

type Props = {
  content: string;
  language: string;
  onChange: (v: string) => void;
  onCursor: (line: number, col: number) => void;
  onSave: () => void;
};

export default function CodeEditor({ content, language, onChange, onCursor, onSave }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onCursorRef = useRef(onCursor);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onCursorRef.current = onCursor;
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!hostRef.current) return;
    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          onSaveRef.current();
          return true;
        },
      },
    ]);
    const updateListener = EditorView.updateListener.of((u) => {
      if (u.docChanged) {
        onChangeRef.current(u.state.doc.toString());
      }
      if (u.selectionSet) {
        const head = u.state.selection.main.head;
        const line = u.state.doc.lineAt(head);
        onCursorRef.current(line.number, head - line.from + 1);
      }
    });
    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        saveKeymap,
        syntaxHighlighting(darculaHighlight, { fallback: false }),
        darculaTheme,
        languageFor(language),
        updateListener,
        EditorView.lineWrapping,
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    setActiveEditor(view);
    // initial cursor
    const line = view.state.doc.lineAt(0);
    onCursorRef.current(1, 1);
    return () => {
      if (getActiveEditor() === view) setActiveEditor(null);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
}
