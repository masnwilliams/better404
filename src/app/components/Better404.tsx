import { useEffect, useState } from 'react';

interface Recommendation {
  url: string;
  title: string | null;
  snippet: string | null;
  score: number;
}

export function Better404({ siteKey }: { siteKey: string }) {
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch('https://better404.dev/api/v1/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteKey,
            url: (() => {
              if (window.parent !== window) {
                try {
                  return window.parent.location.href;
                } catch {
                  return document.referrer || window.location.href;
                }
              }
              return window.location.href;
            })(),
            referrer: document.referrer || undefined,
            topN: 5
          })
        });
        const { results } = await response.json();
        setResults(results || []);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [siteKey]);

  if (loading) return null;
  if (!results.length) return null;

  return (
    <div className="better404-container" style={{
      margin: '2rem 0',
      padding: '1.5rem',
      borderRadius: '8px',
      background: 'inherit',
      color: 'inherit',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: 'inherit'
    }}>
      <h2 className="better404-title" style={{
        margin: '0 0 1rem 0',
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'inherit'
      }}>
        Were you looking for one of these?
      </h2>
      <ul className="better404-list" style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'grid',
        gap: '0.75rem'
      }}>
        {results.map((result, index) => (
          <li key={index} className="better404-item" style={{
            padding: '0.75rem',
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}>
            <a 
              href={result.url}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 500,
                display: 'block',
                marginBottom: '0.25rem'
              }}
            >
              {result.title || result.url}
            </a>
            {result.snippet && (
              <div className="better404-snippet" style={{
                opacity: 0.7,
                fontSize: '0.875rem',
                color: 'inherit'
              }}>
                {result.snippet}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Usage: <Better404 siteKey="pk_QMhdpxfXjqblP795fQ2edqYwxvDE" />
