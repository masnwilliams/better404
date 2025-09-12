"use client";

import { siGithub, siX } from "simple-icons";
import { Better404 } from "./components/Better404";

export default function NotFound() {

  return (
    <main style={{ 
      padding: 16, 
      maxWidth: 800, 
      margin: "20px auto", 
      color: "#e8e8e8", 
      borderRadius: 8,
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontSize: "4rem", margin: 0, color: "#ff6b6b" }}>404</h1>
        <h2 style={{ margin: "16px 0", fontSize: "1.5rem" }}>Page Not Found</h2>
        <p style={{ opacity: 0.8, fontSize: "1.1rem" }}>
          The page you're looking for doesn't exist, but we can help you find what you need!
        </p>
      </div>

      {/* Better404 Recommendations - Paste your React snippet here */}
      <div style={{ marginBottom: 40 }}>
        <Better404 siteKey="pk_QMhdpxfXjqblP795fQ2edqYwxvDE" /> 
      </div>

      {/* Navigation */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.2)",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          }}
        >
          ← Back to Home
        </a>
      </div>

      {/* Social links */}
      <div style={{ 
        marginTop: "auto",
        paddingTop: 20, 
        borderTop: "1px solid rgba(255,255,255,0.1)", 
        textAlign: "center" 
      }}>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="https://github.com/masnwilliams/better404"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              fontSize: 14,
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
            onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ flexShrink: 0 }}
            >
              <path d={siGithub.path} />
            </svg>
            <span>GitHub</span>
          </a>
          <a
            href="https://x.com/masnwilliams"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              fontSize: 14,
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
            onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ flexShrink: 0 }}
            >
              <path d={siX.path} />
            </svg>
            <span>@masnwilliams</span>
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
