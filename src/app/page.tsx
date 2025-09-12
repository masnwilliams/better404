"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { siGithub, siX } from "simple-icons";
import { buildSnippet } from "@/lib/kernel";

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
    
    const domainName = domain.trim().toLowerCase();
    
    try {
      // First check if domain exists and is verified
      const statusRes = await fetch(`/api/v1/status/${encodeURIComponent(domainName)}`);
      let isVerified = false;
      let existingDomainId = null;
      let existingSiteKey = null;
      
      if (statusRes.ok) {
        const status = await statusRes.json();
        isVerified = !!status.verified;
        existingDomainId = status.id;
        existingSiteKey = status.siteKeyPublic;
      }
      
      if (isVerified && existingSiteKey) {
        // Domain is verified, get snippets directly
        const snippets = buildSnippet(existingSiteKey);
        setSnippets(snippets);
        setDomainId(existingDomainId);
        setSiteKey(existingSiteKey);
        setVerified(true);
      } else {
        // Domain not verified or doesn't exist, register/update it
        const res = await fetch("/api/v1/domains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: domainName })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed");
        
        setDomainId(data.id || null);
        setSiteKey(data.siteKeyPublic || null);
        setVerified(data.verified || false);
        
        // If it's verified, get snippets
        if (data.verified && data.snippets) {
          setSnippets(data.snippets);
        }
      }
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
          {loading 
            ? "Checking..." 
            : domainStatus?.verified 
              ? "Get Snippet" 
              : domainStatus === null 
                ? "Get Started" 
                : "Verify Domain"
          }
        </button>
      </form>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
          {domain && (checkingStatus 
            ? "Checking status..." 
            : domainStatus?.verified 
              ? "✓ Domain verified - ready for snippets" 
              : domainStatus 
                ? "Domain registered - needs verification" 
                : ""
          )}
        </p>
        <a
          href="https://dashboard.onkernel.com/sign-up"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "flex-end",
            gap: 6,
            fontSize: 13,
            opacity: 0.85,
            textDecoration: "none",
            color: "inherit",
            transition: "opacity 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.85"}
        >
          <span style={{ lineHeight: 1, verticalAlign: "bottom" }}>powered by</span>
          <Image 
            src="/kernel_logo.svg" 
            alt="Kernel" 
            height={16}
            width={70}
          />
        </a>
      </div>
      {error && <p style={{ color: "#ff6b6b", marginTop: 12 }}>{error}</p>}
      {!verified && siteKey && (
        <div style={{ marginTop: 24, padding: 16, background: "rgba(255, 193, 7, 0.1)", border: "1px solid rgba(255, 193, 7, 0.3)", borderRadius: 8 }}>
          <h3 style={{ margin: "0 0 8px 0", color: "#ffc107" }}>Domain Not Verified</h3>
          <p style={{ margin: "0 0 12px 0", opacity: 0.9 }}>
            You need to verify domain ownership before getting your snippet. Add the DNS record below and click Check Verification.
          </p>
        </div>
      )}
      {siteKey && domain && !verified && (
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12 }}>
          <h3 style={{ margin: "8px 0" }}>Verify your domain</h3>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            <li>Add a DNS TXT record:</li>
          </ol>
          <pre style={{ background: "#f7f7f7", color: "#111111", padding: 12, borderRadius: 6, overflowX: "auto" }}>
{`Host:    _better404
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
            <span style={{ color: "#b00" }}>Not verified yet</span>
          </div>
        </div>
      )}
      {snippets && (
        <div style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 16, padding: 12, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 6 }}>
            <p style={{ margin: 0, color: "#22c55e", fontSize: 14 }}>
              ✓ Domain verified! Your snippet is ready to use.
            </p>
          </div>
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
          {siteKey && domain && !verified && (
            <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12 }}>
              <h3 style={{ margin: "8px 0" }}>Verify your domain</h3>
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                <li>Add a DNS TXT record:</li>
              </ol>
              <pre style={{ background: "#f7f7f7", color: "#111111", padding: 12, borderRadius: 6, overflowX: "auto" }}>
{`Host:    _better404
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
                <span style={{ color: "#b00" }}>Not verified yet</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Social links */}
      <div style={{ 
        marginTop: 40, 
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
          </a>
        </div>
      </div>
    </main>
  );
}
