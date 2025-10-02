import type { FormEvent } from 'react';
import { useState } from 'react';
import { fetchDomainAiAnalysis, fetchDomainScore } from '../api/client';

interface ScoreFormProps {
  onResult: (data: Awaited<ReturnType<typeof fetchDomainScore>>) => void;
  onAnalysisStatus?: (status: 'loading' | 'pending' | 'ready') => void;
}

export const ScoreForm = ({ onResult, onAnalysisStatus }: ScoreFormProps) => {
  const [domainName, setDomainName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!domainName.trim()) {
      setError('Informe um domínio válido.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const trimmed = domainName.trim();
      const response = await fetchDomainScore(trimmed, true);
      onResult(response);

      const existingAnalysis = response.data.aiAnalysis;
      if (existingAnalysis) {
        onAnalysisStatus?.('ready');
        return;
      }

      onAnalysisStatus?.('loading');

      const MAX_ATTEMPTS = 4;
      const DELAY_MS = 4000;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

        try {
          const analysis = await fetchDomainAiAnalysis(trimmed);

          if ('status' in analysis && analysis.status === 'pending') {
            onAnalysisStatus?.('pending');
            continue;
          }

          if ('success' in analysis && analysis.success && analysis.data) {
            onResult({
              ...response,
              data: {
                ...response.data,
                aiAnalysis: analysis.data.analysis,
              },
            });
            onAnalysisStatus?.('ready');
            return;
          }
        } catch (pollError) {
          console.error('Failed to poll AI analysis', pollError);
        }
      }

      onAnalysisStatus?.('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar score.');
      onAnalysisStatus?.('pending');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/30"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Demo</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-100">
          Calcule o TrendScore de um domínio
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Executa análise combinada utilizando DOMA Poll API, métricas on-chain e sinais do Google
          Trends. Use domínios como <code className="font-mono text-blue-300">crypto.eth</code>,{' '}
          <code className="font-mono text-blue-300">ai.crypto</code>,{' '}
          <code className="font-mono text-blue-300">nft.dao</code>.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-300" htmlFor="domainName">
          Nome do domínio
        </label>
        <input
          id="domainName"
          type="text"
          value={domainName}
          onChange={(event) => setDomainName(event.target.value)}
          placeholder="ex: crypto.eth"
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-base text-slate-100 shadow-inner shadow-black/40 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:shadow-xl hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Calculando...' : 'Calcular TrendScore'}
      </button>
    </form>
  );
};


