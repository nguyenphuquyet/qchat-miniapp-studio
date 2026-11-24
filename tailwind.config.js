/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /*
         * VS Code inspired palette. Every token is a CSS variable holding
         * space-separated RGB channels, so `bg-ide-editor/60` and friends keep
         * working while `:root[data-theme="light"]` swaps the whole theme.
         */
        ide: {
          titlebar: "rgb(var(--ide-titlebar) / <alpha-value>)",
          activity: "rgb(var(--ide-activity) / <alpha-value>)",
          sidebar: "rgb(var(--ide-sidebar) / <alpha-value>)",
          editor: "rgb(var(--ide-editor) / <alpha-value>)",
          panel: "rgb(var(--ide-panel) / <alpha-value>)",
          tabs: "rgb(var(--ide-tabs) / <alpha-value>)",
          tab: "rgb(var(--ide-tab) / <alpha-value>)",
          menu: "rgb(var(--ide-menu) / <alpha-value>)",
          widget: "rgb(var(--ide-widget) / <alpha-value>)",
          input: "rgb(var(--ide-input) / <alpha-value>)",
          border: "rgb(var(--ide-border) / <alpha-value>)",
          hover: "rgb(var(--ide-hover) / <alpha-value>)",
          select: "rgb(var(--ide-select) / <alpha-value>)",
          "select-inactive": "rgb(var(--ide-select-inactive) / <alpha-value>)",
          text: "rgb(var(--ide-text) / <alpha-value>)",
          dim: "rgb(var(--ide-dim) / <alpha-value>)",
          accent: "rgb(var(--ide-accent) / <alpha-value>)",
          button: "rgb(var(--ide-button) / <alpha-value>)",
          "button-hover": "rgb(var(--ide-button-hover) / <alpha-value>)",
          status: "rgb(var(--ide-status) / <alpha-value>)",
          "status-text": "rgb(var(--ide-status-text) / <alpha-value>)",
          blue: "rgb(var(--ide-blue) / <alpha-value>)",
          green: "rgb(var(--ide-green) / <alpha-value>)",
          red: "rgb(var(--ide-red) / <alpha-value>)",
          orange: "rgb(var(--ide-orange) / <alpha-value>)",
          yellow: "rgb(var(--ide-yellow) / <alpha-value>)",
          purple: "rgb(var(--ide-purple) / <alpha-value>)",
          gray: "rgb(var(--ide-gray) / <alpha-value>)",
          modified: "rgb(var(--ide-modified) / <alpha-value>)",
        },
      },
      fontFamily: {
        ui: ['"Inter"', '"Segoe UI"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "Consolas", "monospace"],
      },
      fontSize: {
        // rem-based so the UI zoom (--ui-scale) scales these too.
        "2xs": ["0.6875rem", "0.875rem"], // 11px / 14px at 100%
      },
    },
  },
  plugins: [],
};
