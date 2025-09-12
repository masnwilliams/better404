export function normalizeDomain(hostname: string): string {
  const lower = hostname.toLowerCase();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}

export function extractDomainAndPath(inputUrl: string): { domain: string; path: string; normalizedPath: string } {
  const u = new URL(inputUrl);
  const domain = normalizeDomain(u.hostname);
  const path = u.pathname;
  const normalizedPath = path.replace(/\/+/g, "/").replace(/\/$/, "");
  return { domain, path, normalizedPath: normalizedPath || "/" };
}

export function buildQueryTextFromUrl(inputUrl: string): string {
  const { pathname } = new URL(inputUrl);
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => s.replace(/[-_]/g, " "));
  return segments.join(" ") || "not found";
}


