"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [snippets, setSnippets] = useState<{ html: string; react: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'html' | 'react'>('react');
  const [error, setError] = useState<string | null>(null);
  const [domainId, setDomainId] = useState<number | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [domainStatus, setDomainStatus] = useState<{
    verified: boolean;
    pagesIndexed?: number;
    lastCrawledAt?: string | null;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSnippets(null);
    try {
      const res = await fetch("/api/v1/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: domain.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setSnippets(data.snippets);
      setDomainId(data.id || null);
      setSiteKey(data.siteKeyPublic || null);
      // Fetch actual verification status instead of assuming false
      try {
        const statusRes = await fetch(`/api/v1/status/${encodeURIComponent(domain.trim().toLowerCase())}`);
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (typeof status?.verified === "boolean") setVerified(!!status.verified);
        }
      } catch {}
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // Debounced status check while typing
  useEffect(() => {
    const d = domain.trim().toLowerCase();
    if (!d) {
      setDomainStatus(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setCheckingStatus(true);
      try {
        const res = await fetch(`/api/v1/status/${encodeURIComponent(d)}`, { signal: ctrl.signal });
        if (res.ok) {
          const j = await res.json();
          if (typeof j?.verified === "boolean") {
            setDomainStatus({ verified: !!j.verified, pagesIndexed: j.pagesIndexed, lastCrawledAt: j.lastCrawledAt });
          } else {
            setDomainStatus(null);
          }
        } else {
          setDomainStatus(null);
        }
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setDomainStatus(null);
      } finally {
        setCheckingStatus(false);
      }
    }, 500);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [domain]);

  return (
    <main style={{ padding: 16, maxWidth: 800, margin: "20px auto", color: "#e8e8e8", borderRadius: 8 }}>
      <h1>Better404</h1>
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
      {domain && (
        <p style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
          {checkingStatus ? "Checking status..." : domainStatus ? (domainStatus.verified ? "Known domain: Verified ✓" : "Known domain: Not verified yet") : ""}
        </p>
      )}
      {error && <p style={{ color: "#ff6b6b", marginTop: 12 }}>{error}</p>}
      {snippets && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Paste this into your 404 page</h3>
            <button
              type="button"
              onClick={async () => {
                try {
                  const textToCopy = activeTab === 'html' ? snippets.html : snippets.react;
                  await navigator.clipboard.writeText(textToCopy);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
              disabled={!snippets}
              style={{ padding: "6px 10px", fontSize: 14 }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          
          {/* Tab buttons */}
          <div style={{ display: "flex", gap: 0, marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
            <button
              type="button"
              onClick={() => setActiveTab('react')}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                background: activeTab === 'react' ? "rgba(255,255,255,0.1)" : "transparent",
                border: "none",
                color: activeTab === 'react' ? "#fff" : "rgba(255,255,255,0.7)",
                cursor: "pointer",
                borderBottom: activeTab === 'react' ? "2px solid #fff" : "2px solid transparent",
                transition: "all 0.2s ease"
              }}
            >
              React
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('html')}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                background: activeTab === 'html' ? "rgba(255,255,255,0.1)" : "transparent",
                border: "none",
                color: activeTab === 'html' ? "#fff" : "rgba(255,255,255,0.7)",
                cursor: "pointer",
                borderBottom: activeTab === 'html' ? "2px solid #fff" : "2px solid transparent",
                transition: "all 0.2s ease"
              }}
            >
              HTML
            </button>
          </div>
          
          <p style={{ margin: "0 0 12px 0", fontSize: 13, opacity: 0.8 }}>
            {activeTab === 'html' 
              ? "HTML snippet: Copy and paste directly into your 404 page HTML" 
              : "React component: Import and use in your React 404 page"
            }
          </p>
          
          <textarea 
            readOnly 
            value={activeTab === 'html' ? snippets.html : snippets.react} 
            style={{ 
              background: "#ffffff", 
              color: "#111111", 
              width: "100%", 
              height: 300, 
              fontFamily: "monospace", 
              fontSize: 12, 
              borderRadius: 6, 
              padding: 12,
              border: "1px solid #ddd",
              resize: "vertical"
            }} 
          />
          {siteKey && domain && (
            <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12 }}>
              <h3 style={{ margin: "8px 0" }}>Verify your domain</h3>
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                <li>Add a DNS TXT record:</li>
              </ol>
              <pre style={{ background: "#f7f7f7", color: "#111111", padding: 12, borderRadius: 6, overflowX: "auto" }}>
{`Name:    _better404.${domain}
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
                    } catch {
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
