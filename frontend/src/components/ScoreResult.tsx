import type { DomainScoreResponse, AiAnalysisResponse } from '../api/client';
import { useMemo } from 'react';

interface ScoreResultProps {
  result?: DomainScoreResponse;
  aiStatus?: 'idle' | 'loading' | 'pending' | 'ready';
}

const ScoreBadge = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-semibold text-slate-100">{value.toFixed(1)}</p>
  </div>
);

const SentimentBadge = ({ sentiment }: { sentiment: AiAnalysisResponse['analysis']['sentiment'] }) => {
  const config = {
    positive: {
      label: 'Oportunidade Alta',
      className: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200 shadow-emerald-400/30',
    },
    neutral: {
      label: 'Potencial Moderado',
      className: 'border-slate-400/40 bg-slate-400/10 text-slate-200 shadow-slate-400/30',
    },
    negative: {
      label: 'Risco Elevado',
      className: 'border-rose-400/40 bg-rose-400/10 text-rose-200 shadow-rose-400/30',
    },
  } as const;

  const selected = config[sentiment] ?? config.neutral;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow ${selected.className}`}
    >
      {selected.label}
    </span>
  );
};

export const ScoreResult = ({ result, aiStatus = 'idle' }: ScoreResultProps) => {
  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-6 text-sm text-slate-500">
        Resultados aparecerão aqui após calcular o TrendScore.
      </div>
    );
  }

  const { data } = result;
  const ai = data.aiAnalysis;

  const highlights = useMemo(() => ai?.keyHighlights ?? [], [ai]);
  const recommendations = useMemo(() => ai?.recommendations ?? [], [ai]);
  const risks = useMemo(() => ai?.riskFactors ?? [], [ai]);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">TrendScore</p>
          <h2 className="text-3xl font-semibold text-slate-100">{data.domainName}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Score consolidado combinando demanda Web2, atividade Web3 e parâmetros de raridade.
          </p>
        </div>
        <div className="rounded-full border border-blue-500/40 bg-blue-500/10 px-6 py-3 text-center text-4xl font-bold text-blue-200 shadow-lg shadow-blue-500/30">
          {data.score}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreBadge label="Search Volume" value={data.breakdown.searchVolume} />
        <ScoreBadge label="Trend Direction" value={data.breakdown.trendDirection} />
        <ScoreBadge label="On-chain Activity" value={data.breakdown.onChainActivity} />
        <ScoreBadge label="Rarity" value={data.breakdown.rarity} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400 shadow-inner shadow-black/40">
        <p>
          Última atualização: {new Date(data.metadata.lastUpdated).toLocaleString()} • Confidence:{' '}
          {(data.metadata.confidence * 100).toFixed(0)}% • Data Points:{' '}
          {data.metadata.dataPoints}
        </p>
        {data.metadata.source && <p className="mt-2 text-xs text-slate-500">Fonte: {data.metadata.source}</p>}
      </div>

      {aiStatus !== 'ready' && (
        <div className="rounded-xl border border-purple-500/40 bg-purple-500/5 p-4 text-sm text-purple-200/80">
          {aiStatus === 'loading' && 'Gerando análise com IA...'}
          {aiStatus === 'pending' && 'Análise em processamento...'}
          {aiStatus === 'idle' && !ai && 'Análise assistida será carregada automaticamente quando disponível.'}
        </div>
      )}

      {ai && (
        <div className="space-y-4 rounded-2xl border border-purple-500/40 bg-purple-500/5 p-6 shadow-xl shadow-purple-500/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">
                Análise Assistida por IA
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-100">Resumo estratégico</h3>
              <p className="mt-2 text-sm text-slate-300/90">{ai.summary}</p>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <SentimentBadge sentiment={ai.sentiment} />
              <p className="text-xs text-slate-400">
                Confiança: {(ai.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-inner shadow-black/30">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Highlights</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300/90">
                {highlights.length > 0 ? (
                  highlights.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500">Sem destaques significativos.</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-inner shadow-black/30">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Recomendações</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300/90">
                {recommendations.length > 0 ? (
                  recommendations.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400/70" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500">Sem recomendações no momento.</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-inner shadow-black/30">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Riscos</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300/90">
                {risks.length > 0 ? (
                  risks.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400/70" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500">Nenhum risco evidente.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 text-xs text-slate-400 shadow-inner shadow-black/40 sm:grid-cols-2 lg:grid-cols-4">
            <p>Sinal SerpApi (Trend): {(ai.dataPointsUsed.serpApiTrendStrength * 100).toFixed(1)}%</p>
            <p>Sinal SerpApi (Volume): {ai.dataPointsUsed.serpApiVolume.toFixed(0)}</p>
            <p>Score On-chain DOMA: {ai.dataPointsUsed.onChainActivityScore.toFixed(1)}</p>
            <p>Raridade DOMA: {ai.dataPointsUsed.rarityScore.toFixed(1)}</p>
          </div>
        </div>
      )}
    </div>
  );
};


