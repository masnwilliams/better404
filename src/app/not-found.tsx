"use client";

import { siGithub, siX } from "simple-icons";
// import { Better404 } from "./components/Better404";
import Link from "next/link";

export default function NotFound() {

  return (
    <main style={{ 
      padding: "40px 20px", 
      maxWidth: 600, 
      margin: "0 auto", 
      color: "#e8e8e8", 
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{ 
          fontSize: "6rem", 
          margin: 0, 
          color: "#ff6b6b",
          fontWeight: "bold",
          letterSpacing: "-0.02em"
        }}>404</h1>
        <h2 style={{ 
          margin: "24px 0 16px", 
          fontSize: "1.75rem",
          fontWeight: "600",
          color: "#ffffff"
        }}>Page Not Found</h2>
        <p style={{ 
          opacity: 0.8, 
          fontSize: "1.125rem",
          lineHeight: "1.6",
          margin: "0 0 24px",
          maxWidth: "480px"
        }}>
          {`The page you're looking for doesn't exist, but we can help you find what you need!`}
        </p>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "12px",
          padding: "16px 20px",
          margin: "0 auto",
          maxWidth: "400px"
        }}>
          <p style={{ 
            opacity: 0.7, 
            fontSize: "0.875rem",
            margin: 0,
            lineHeight: "1.5"
          }}>
            {`Better404 only has 1 page, so it's not useful here - but works great on content-rich sites!`}
          </p>
        </div>
      </div>

      {/* Better404 Recommendations - Paste your React snippet here */}
      {/* <div style={{ marginBottom: 40 }}>
        <Better404 siteKey="pk_QMhdpxfXjqblP795fQ2edqYwxvDE" /> 
      </div> */}

      {/* Navigation */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <Link
          href="/"
          passHref
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "14px 28px",
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.2)",
            transition: "all 0.2s ease",
            fontSize: "0.95rem",
            fontWeight: "500"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.15)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          ← Back to Home
        </Link>
      </div>

      {/* Social links */}
      <div style={{ 
        marginTop: "auto",
        paddingTop: "32px", 
        borderTop: "1px solid rgba(255,255,255,0.1)", 
        textAlign: "center",
        width: "100%"
      }}>
        <div style={{ 
          display: "flex", 
          gap: "32px", 
          justifyContent: "center", 
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <a
            href="https://github.com/masnwilliams/better404"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              color: "rgba(255,255,255,0.6)",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: "500",
              padding: "8px 12px",
              borderRadius: "6px",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.6)";
              e.currentTarget.style.background = "transparent";
            }}
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
              gap: "10px",
              color: "rgba(255,255,255,0.6)",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: "500",
              padding: "8px 12px",
              borderRadius: "6px",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.6)";
              e.currentTarget.style.background = "transparent";
            }}
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
