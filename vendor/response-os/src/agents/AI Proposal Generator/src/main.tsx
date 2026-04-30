import React from "react";
import ReactDOM from "react-dom/client";
import { ensureI18n } from "@nss/proposal-i18n";
import App from "./App";
import "./index.css";

ensureI18n("en");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
