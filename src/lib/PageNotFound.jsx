import React from "react";

export default function PageNotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#000",
      color: "#fff",
      fontFamily: "Arial, sans-serif",
      textAlign: "center",
      padding: "24px"
    }}>
      <div>
        <h1 style={{ fontSize: "64px", margin: 0 }}>404</h1>
        <p style={{ opacity: 0.7 }}>Page not found.</p>
      </div>
    </div>
  );
}
