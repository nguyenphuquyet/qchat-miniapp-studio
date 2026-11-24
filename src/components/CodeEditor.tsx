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
import type { Theme } from "../lib/theme";

/*
 * VS Code syntax colors. The actual values live in index.css as `--cm-*`
 * variables, so the editor follows the app theme without rebuilding the state.
 */
const vsCodeHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "var(--cm-keyword)" },
  { tag: [t.controlKeyword, t.moduleKeyword], color: "var(--cm-control)" },
  { tag: [t.string, t.special(t.string), t.attributeValue], color: "var(--cm-string)" },
  { tag: [t.number, t.bool, t.null], color: "var(--cm-number)" },
  { tag: [t.comment, t.blockComment, t.lineComment, t.docComment], color: "var(--cm-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--cm-function)" },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: "var(--cm-variable)" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--cm-type)" },
  { tag: [t.propertyName, t.attributeName], color: "var(--cm-property)" },
  { tag: t.variableName, color: "var(--cm-variable)" },
  { tag: [t.operator, t.punctuation], color: "var(--cm-fg)" },
  { tag: [t.self, t.atom], color: "var(--cm-control)" },
  { tag: t.meta, color: "var(--cm-meta)" },
  { tag: t.tagName, color: "var(--cm-tag)" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.link, color: "var(--cm-link)", textDecoration: "underline" },
  { tag: t.invalid, color: "var(--cm-invalid)" },
]);

const editorTheme = (dark: boolean) =>
  EditorView.theme(
    {
      "&": { backgroundColor: "var(--cm-bg)", color: "var(--cm-fg)", height: "100%" },
      ".cm-content": { caretColor: "var(--cm-cursor)", padding: "6px 0" },
      ".cm-line": { padding: "0 8px" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--cm-cursor)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: "var(--cm-selection) !important",
      },
      ".cm-selectionMatch": { backgroundColor: "var(--cm-selection-match)" },
      ".cm-activeLine": { backgroundColor: "var(--cm-active-line)" },
      ".cm-gutters": {
        backgroundColor: "var(--cm-gutter-bg)",
        color: "var(--cm-gutter-fg)",
        border: "none",
        borderRight: "1px solid rgb(var(--ide-border))",
        fontFamily: '"JetBrains Mono", monospace',
      },
      ".cm-activeLineGutter": { backgroundColor: "var(--cm-active-gutter)", color: "var(--cm-active-gutter-fg)" },
      ".cm-foldPlaceholder": { backgroundColor: "transparent", border: "none", color: "var(--cm-gutter-fg)" },
      ".cm-tooltip": {
        backgroundColor: "var(--cm-tooltip-bg)",
        border: "1px solid var(--cm-tooltip-border)",
        color: "rgb(var(--ide-text))",
      },
      ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "rgb(var(--ide-select))",
        color: "#ffffff",
      },
      ".cm-matchingBracket": { backgroundColor: "var(--cm-bracket)", outline: "1px solid var(--cm-bracket-border)" },
      ".cm-panels": { backgroundColor: "rgb(var(--ide-panel))", color: "rgb(var(--ide-text))" },
      ".cm-panels.cm-panels-top": { borderBottom: "1px solid rgb(var(--ide-border))" },
      ".cm-panels.cm-panels-bottom": { borderTop: "1px solid rgb(var(--ide-border))" },
      ".cm-searchMatch": { backgroundColor: "var(--cm-search-match)" },
      ".cm-searchMatch-selected": { backgroundColor: "var(--cm-search-match-selected)" },
    },
    { dark },
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
  theme: Theme;
  onChange: (v: string) => void;
  onCursor: (line: number, col: number) => void;
  onSave: () => void;
};

export default function CodeEditor({ content, language, theme, onChange, onCursor, onSave }: Props) {
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
        syntaxHighlighting(vsCodeHighlight, { fallback: false }),
        editorTheme(theme === "dark"),
        languageFor(language),
        updateListener,
        EditorView.lineWrapping,
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    setActiveEditor(view);
    onCursorRef.current(1, 1);
    return () => {
      if (getActiveEditor() === view) setActiveEditor(null);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, theme]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
}
