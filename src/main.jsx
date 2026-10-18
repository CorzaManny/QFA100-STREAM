import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/theme.css";

// Pages are transparent by default for OBS. Add ?bg to the URL to check an
// overlay against a dark backdrop in a normal browser.
if (new URLSearchParams(window.location.search).has("bg")) document.body.classList.add("preview-bg");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}tile-sw.js`, { scope: import.meta.env.BASE_URL })
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
