import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./lib/auth.js";
import { ToastProvider } from "./lib/toast.js";
import { App } from "./App.js";
import "./styles/global.css";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
);
