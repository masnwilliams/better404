"use client";

import { useState } from "react";

export default function Home() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [snippet, setSnippet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSnippet(null);
    try {
      const res = await fetch("/api/v1/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: domain.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setSnippet(data.snippet);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1>404 Solver</h1>
      <p>Enter your domain to kick off indexing and get your 404 snippet.</p>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <input
          type="text"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", fontSize: 16 }}
          required
        />
        <button type="submit" disabled={loading} style={{ padding: "8px 14px", fontSize: 16 }}>
          {loading ? "Setting up..." : "Get Snippet"}
        </button>
      </form>
      {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}
      {snippet && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Paste this into your 404 page</h3>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(snippet);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
              disabled={!snippet}
              style={{ padding: "6px 10px", fontSize: 14 }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <textarea readOnly value={snippet} style={{ width: "100%", height: 220, fontFamily: "monospace", fontSize: 12 }} />
        </div>
      )}
    </main>
  );
}
