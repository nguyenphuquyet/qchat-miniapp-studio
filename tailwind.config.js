/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // IntelliJ Darcula palette
        darcula: {
          bg: "#3C3F41",
          panel: "#313335",
          editor: "#2B2B2B",
          border: "#323232",
          lighter: "#4B4F52",
          hover: "#4B6EAF",
          select: "#214283",
          selectInactive: "#0D293E",
          text: "#BBBBBB",
          dim: "#808080",
          accent: "#4E94CE",
          green: "#59A869",
          red: "#E05555",
          orange: "#C77B3E",
          yellow: "#BBB529",
          purple: "#9876AA",
          blue: "#6897BB",
          gray: "#6A8759",
          modified: "#4E94CE",
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
