import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Restore the user's saved Soft Store appearance before the first render.
const savedTheme = localStorage.getItem("xgpt_setting_darkMode") || "dark";
const savedAccent = localStorage.getItem("xgpt_setting_accent") || "#22c55e";
document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";
document.documentElement.style.setProperty("--store-accent", savedAccent);
createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);