import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { StudioProvider } from "./lib/store";
import { ContextMenuProvider } from "./components/ContextMenu";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StudioProvider>
      <ContextMenuProvider>
        <App />
      </ContextMenuProvider>
    </StudioProvider>
  </React.StrictMode>,
);
