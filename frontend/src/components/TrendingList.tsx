import { useEffect, useState } from 'react';
import { fetchTrendingDomains } from '../api/client';
import type { TrendingDomain } from '../api/client';

export const TrendingList = () => {
  const [domains, setDomains] = useState<TrendingDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTrending = async () => {
      try {
        setLoading(true);
        const response = await fetchTrendingDomains(8);
        if (!isMounted) return;
        setDomains(response.data);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar trending domains');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    loadTrending();

    const intervalId = setInterval(loadTrending, 60000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Insights</p>
          <h2 className="text-xl font-semibold text-slate-100">Domain trending</h2>
        </div>
        <span className="text-xs text-slate-500">update automatically every 60s</span>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading domain trending...</p>}
      {error && <p className="text-sm text-red-200">{error}</p>}

      <ul className="space-y-3 text-sm">
        {domains.map((domain) => (
          <li
            key={domain.domainName}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4 shadow-inner shadow-black/30"
          >
            <div>
              <p className="text-base font-semibold text-slate-100">{domain.domainName}</p>
              <p className="text-xs text-slate-500">
                Score {domain.score || 0} • Confidence {((domain.metadata.confidence || 0) * 100).toFixed(0)}%
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Search Volume: {(domain.breakdown.searchVolume || 0).toFixed(0)}</p>
              <p>Trend Direction: {(domain.breakdown.trendDirection || 0).toFixed(0)}</p>
            </div>

          </li>
        ))}
      </ul>
    </div>
  );
};


