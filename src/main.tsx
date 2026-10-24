import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { StudioProvider } from "./lib/store";
import { I18nProvider } from "./lib/i18n";
import { ContextMenuProvider } from "./components/ContextMenu";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <StudioProvider>
        <ContextMenuProvider>
          <App />
        </ContextMenuProvider>
      </StudioProvider>
    </I18nProvider>
  </React.StrictMode>,
);
