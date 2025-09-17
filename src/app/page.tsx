"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { siGithub, siX } from "simple-icons";
import { Copy, Check } from "lucide-react";
import { buildSnippet } from "@/lib/kernel";
import styles from "./page.module.css";

export default function Home() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [snippets, setSnippets] = useState<{ html: string; react: string; api: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'html' | 'react' | 'api'>('react');
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
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect theme on client side
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
    
    checkTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    return () => mediaQuery.removeEventListener('change', checkTheme);
  }, []);

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

        // Always attempt verification right after registering/updating
        if (data?.id) {
          try {
            const vres = await fetch(`/api/v1/domains/${data.id}/verify`, { method: "POST" });
            const vdata = await vres.json();
            const verifiedNow = vres.ok && (vdata.verified === true || vdata.ok === true);
            setVerified(verifiedNow);
            if (verifiedNow && data.siteKeyPublic) {
              const snippets = buildSnippet(data.siteKeyPublic);
              setSnippets(snippets);
            }
          } catch {
            // ignore; user can retry with Check verification
          }
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
      <div style={{ width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 48, width: "100%" }}>
        <h1 style={{ 
          fontSize: "3.5rem", 
          margin: "0 0 16px 0", 
          color: "#ffffff",
          fontWeight: "bold",
          letterSpacing: "-0.02em"
        }}>Better404</h1>
        <p style={{ 
          opacity: 0.8, 
          fontSize: "1.25rem",
          lineHeight: "1.6",
          margin: "0 0 32px",
          maxWidth: "480px",
          marginLeft: "auto",
          marginRight: "auto"
        }}>
          Turn your 404 pages into helpful search results. Enter your domain to get started.
        </p>
        
        <form onSubmit={submit} className={styles.form}>
          <input
            type="text"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={styles.input}
            required
          />
          <button type="submit" disabled={loading} className={styles.button}>
            {loading 
              ? "Verifying..." 
              : domainStatus?.verified 
                ? "Get Snippet" 
                : "Verify & Get Snippet"
            }
          </button>
        </form>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginTop: "16px",
          width: "100%",
          maxWidth: "400px",
          marginLeft: "auto",
          marginRight: "auto"
        }}>
          <p style={{
            margin: 0,
            fontSize: "14px",
            opacity: 0.8,
            color: "#e8e8e8"
          }}>
            {domain && (checkingStatus 
              ? "Checking status..." 
              : domainStatus?.verified 
                ? "✓ Domain verified - ready for snippets" 
                : domainStatus 
                  ? "Domain registered - needs verification" 
                  : ""
            )}
          </p>
          <div style={{ 
            display: "flex", 
            justifyContent: "flex-end",
            width: "100%"
          }}>
            <a
              href="https://onkernel.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                opacity: 0.7,
                textDecoration: "none",
                color: "#e8e8e8",
                transition: "opacity 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
            >
              <span style={{ lineHeight: 1, verticalAlign: "bottom" }}>powered by</span>
              <Image 
                src={isDarkMode ? "/kernel_logo_light.svg" : "/kernel_logo_dark.svg"} 
                alt="Kernel" 
                height={16}
                width={70}
                style={{ flexShrink: 0 }}
              />
            </a>
          </div>
        </div>
      </div>
      {error && (
        <div style={{
          background: "rgba(255, 99, 99, 0.1)",
          border: "1px solid rgba(255, 99, 99, 0.3)",
          borderRadius: "8px",
          padding: "12px 16px",
          margin: "16px 0",
          color: "#ff6b6b",
          fontSize: "14px",
          textAlign: "center"
        }}>
          {error}
        </div>
      )}
      {!verified && siteKey && (
        <div style={{
          background: "rgba(255, 193, 7, 0.1)",
          border: "1px solid rgba(255, 193, 7, 0.3)",
          borderRadius: "8px",
          padding: "16px",
          margin: "16px 0",
          textAlign: "center"
        }}>
          <h3 style={{ 
            margin: "0 0 8px 0", 
            color: "#ffc107",
            fontSize: "16px",
            fontWeight: "600"
          }}>Domain Not Verified</h3>
          <p style={{ 
            margin: 0, 
            opacity: 0.9, 
            color: "#e8e8e8",
            fontSize: "14px"
          }}>
            You need to verify domain ownership before getting your snippet. Add the DNS record below and click Check Verification.
          </p>
        </div>
      )}
      {siteKey && domain && !verified && (
        <div style={{
          marginTop: "24px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: "20px",
          textAlign: "center"
        }}>
          <h3 style={{ 
            margin: "0 0 16px 0", 
            color: "#ffffff",
            fontSize: "18px",
            fontWeight: "600"
          }}>Check verification</h3>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 8px 0", color: "#e8e8e8" }}>Add a DNS TXT record:</p>
            <pre style={{
              background: "rgba(0,0,0,0.3)",
              color: "#ffffff",
              padding: "16px",
              borderRadius: "8px",
              overflowX: "auto",
              fontFamily: "monospace",
              fontSize: "13px",
              margin: "0 auto",
              maxWidth: "300px",
              textAlign: "left"
            }}>
{`Host:    _better404
Type:    TXT
Value:   ${siteKey}`}
            </pre>
            <p style={{ 
              margin: "8px 0 0", 
              opacity: 0.7, 
              color: "#e8e8e8",
              fontSize: "13px"
            }}>Propagation can take a few minutes.</p>
          </div>
          <div style={{ 
            display: "flex", 
            gap: "12px", 
            alignItems: "center", 
            justifyContent: "center",
            flexWrap: "wrap"
          }}>
            <button
              type="button"
              onClick={async () => {
                if (!domainId || !siteKey) return;
                setVerifyLoading(true);
                try {
                  const res = await fetch(`/api/v1/domains/${domainId}/verify`, { method: "POST" });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.error || data?.reason || "Verify failed");
                  const isVerified = data.verified === true || data.ok === true;
                  setVerified(isVerified);
                  
                  // If verification succeeded, generate and show snippets
                  if (isVerified && siteKey) {
                    const snippets = buildSnippet(siteKey);
                    setSnippets(snippets);
                  }
                } catch {
                  setVerified(false);
                } finally {
                  setVerifyLoading(false);
                }
              }}
              disabled={verifyLoading}
              style={{
                padding: "10px 20px",
                fontSize: "14px",
                background: verifyLoading ? "rgba(255,255,255,0.2)" : "#4CAF50",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: verifyLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                fontWeight: "500"
              }}
              onMouseEnter={(e) => {
                if (!verifyLoading) {
                  e.currentTarget.style.background = "#45a049";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!verifyLoading) {
                  e.currentTarget.style.background = "#4CAF50";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {verifyLoading ? "Checking..." : "Check verification"}
            </button>
            <span style={{ 
              color: verified ? "#4CAF50" : "#ff6b6b",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              {verified ? "✓ Verified!" : "Not verified yet"}
            </span>
          </div>
        </div>
      )}
      {snippets && (
        <div style={{ marginTop: 24 }}>
          <div className={styles.successCard}>
            <p className={styles.successText}>
              ✓ Domain verified! Your snippet is ready to use.
            </p>
          </div>
          <h3 className={styles.snippetTitle}>Paste this into your 404 page</h3>
          
          {/* Tab buttons */}
          <div className={styles.tabsContainer}>
            <div className={styles.tabs}>
              <button
                type="button"
                onClick={() => setActiveTab('react')}
                className={`${styles.tab} ${activeTab === 'react' ? styles.tabActive : ''}`}
              >
                React
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('html')}
                className={`${styles.tab} ${activeTab === 'html' ? styles.tabActive : ''}`}
              >
                HTML
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('api')}
                className={`${styles.tab} ${activeTab === 'api' ? styles.tabActive : ''}`}
              >
                API
              </button>
            </div>
          </div>
          
          <p className={styles.tabDescription}>
            {activeTab === 'html' 
              ? "HTML snippet: Copy and paste directly into your 404 page HTML" 
              : activeTab === 'react'
                ? "React component: Import and use in your React 404 page"
                : "API request: Make the request yourself and handle the data however you want"
            }
          </p>
          
          <div className={styles.textareaContainer}>
            <textarea 
              readOnly 
              value={activeTab === 'html' ? snippets.html : activeTab === 'react' ? snippets.react : snippets.api} 
              className={styles.textarea}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const textToCopy = activeTab === 'html' ? snippets.html : activeTab === 'react' ? snippets.react : snippets.api;
                  await navigator.clipboard.writeText(textToCopy);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
              disabled={!snippets}
              className={styles.copyIconButton}
              title={copied ? "Copied!" : "Copy to clipboard"}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
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
      
        {/* How it works section */}
        <div style={{ 
          background: "rgba(255,255,255,0.05)", 
          border: "1px solid rgba(255,255,255,0.1)", 
          borderRadius: "8px", 
          padding: "20px", 
          margin: "32px 0",
          fontSize: "14px",
          lineHeight: "1.6",
          textAlign: "left"
        }}>
          <h3 style={{ 
            margin: "0 0 16px 0", 
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: "600",
            textAlign: "center"
          }}>How it works:</h3>
          <ol style={{ 
            margin: 0, 
            paddingLeft: "20px",
            color: "#e8e8e8"
          }}>
            <li style={{ marginBottom: "8px" }}>
              <strong>Enter your domain</strong> in the form above
            </li>
            <li style={{ marginBottom: "8px" }}>
              <strong>Verify ownership</strong> with a DNS record
            </li>
            <li style={{ marginBottom: "8px" }}>
              <strong>We crawl your site</strong> to create a searchable index
            </li>
            <li style={{ marginBottom: "8px" }}>
              <strong>Paste our snippet</strong> into your 404 page
            </li>
            <li>
              <strong>Users see relevant pages</strong> instead of {`"Page Not Found"`}
            </li>
          </ol>
        </div>
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
    </main>
  );
}
