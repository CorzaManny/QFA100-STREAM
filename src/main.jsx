import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/theme.css";

// OBS's browser source exposes window.obsstudio; anywhere else, show the
// overlays on a dark backdrop instead of the browser's white page.
if (!window.obsstudio) document.body.classList.add("preview-bg");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
