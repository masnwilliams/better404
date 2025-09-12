"use client";

import { useState } from "react";

export default function Home() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [snippet, setSnippet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [domainId, setDomainId] = useState<number | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
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
      setDomainId(data.id || null);
      setSiteKey(data.siteKeyPublic || null);
      setVerified(false);
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
          <textarea readOnly value={snippet} style={{ color: "black", width: "100%", height: 220, fontFamily: "monospace", fontSize: 12 }} />
          {siteKey && domain && (
            <div style={{ marginTop: 16, borderTop: "1px solid #ddd", paddingTop: 12 }}>
              <h3 style={{ margin: "8px 0" }}>Verify your domain</h3>
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                <li>Add a DNS TXT record:</li>
              </ol>
              <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 6, overflowX: "auto" }}>
{`Name:    _404-verify.${domain}
Type:    TXT
Value:   ${siteKey}`}
              </pre>
              <p style={{ margin: "8px 0 0", opacity: 0.8 }}>Propagation can take a few minutes.</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (!domainId) return;
                    setVerifyLoading(true);
                    try {
                      const res = await fetch(`/api/v1/domains/${domainId}/verify`, { method: "POST" });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data?.error || data?.reason || "Verify failed");
                      setVerified(data.verified === true || data.ok === true);
                    } catch (e: unknown) {
                      setVerified(false);
                    } finally {
                      setVerifyLoading(false);
                    }
                  }}
                  disabled={verifyLoading}
                  style={{ padding: "6px 10px", fontSize: 14 }}
                >
                  {verifyLoading ? "Checking..." : "Check verification"}
                </button>
                {verified === true && <span style={{ color: "green" }}>Verified ✓</span>}
                {verified === false && <span style={{ color: "#b00" }}>Not verified yet</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
