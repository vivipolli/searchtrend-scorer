import type { DomainScoreResponse, AiAnalysisResponse } from '../api/client';
import { useMemo } from 'react';

interface ScoreResultProps {
  result?: DomainScoreResponse;
  aiStatus?: 'idle' | 'loading' | 'pending' | 'ready';
}

const ScoreBadge = ({ label, value, description }: { label: string; value: number; description?: string }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-semibold text-slate-100">{value.toFixed(1)}</p>
    {description && <p className="mt-3 text-xs leading-relaxed text-slate-400">{description}</p>}
  </div>
);

const SentimentBadge = ({ sentiment }: { sentiment: AiAnalysisResponse['analysis']['sentiment'] }) => {
  const config = {
    positive: {
      label: 'High Opportunity',
      className: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200 shadow-emerald-400/30',
    },
    neutral: {
      label: 'Moderate Potential',
      className: 'border-slate-400/40 bg-slate-400/10 text-slate-200 shadow-slate-400/30',
    },
    negative: {
      label: 'High Risk',
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
        Results will appear here after calculating the TrendScore.
      </div>
    );
  }

  const { data } = result;
  const ai = data.aiAnalysis;

  const highlights = useMemo(() => ai?.keyHighlights ?? [], [ai]);
  const recommendations = useMemo(() => ai?.recommendations ?? [], [ai]);
  const risks = useMemo(() => ai?.riskFactors ?? [], [ai]);

  const volumeDescription = useMemo(() => {
    const volume = data.breakdown.searchVolume;
    const trendStrength = ai?.dataPointsUsed.serpApiTrendStrength;
    if (ai && trendStrength !== undefined) {
      const trendPercent = (trendStrength * 100).toFixed(1);
      return `Base search demand scored at ${volume.toFixed(1)} / 100. Google Trends shows ${trendPercent}% momentum versus the prior period.`;
    }
    return `Base search demand scored at ${volume.toFixed(1)} / 100 based on Google Trends volume analysis.`;
  }, [ai, data.breakdown.searchVolume]);

  const trendDescription = useMemo(() => {
    const trend = data.breakdown.trendDirection;
    if (ai?.summary) {
      const sentiment = ai.sentiment === 'positive' ? 'strong uptrend' : ai.sentiment === 'negative' ? 'declining trend' : 'stable momentum';
      return `Trend direction is ${trend.toFixed(1)} / 100 (MOST IMPORTANT), indicating ${sentiment} aligned with AI assessment.`;
    }
    return `Trend direction score (MOST IMPORTANT) represents the trajectory of search interest over the selected window.`;
  }, [ai, data.breakdown.trendDirection]);

  const onChainDescription = useMemo(() => {
    const onChain = data.breakdown.onChainActivity;
    const activityScore = ai?.dataPointsUsed.onChainActivityScore;
    if (activityScore !== undefined) {
      return `On-chain activity scored at ${onChain.toFixed(1)} / 100, with DOMA transactions contributing ${activityScore.toFixed(1)} baseline units.`;
    }
    return `On-chain activity blends transaction count, liquidity, and price velocity into a 0-100 score.`;
  }, [ai, data.breakdown.onChainActivity]);

  const rarityDescription = useMemo(() => {
    const rarity = data.breakdown.rarity;
    const raritySignal = ai?.dataPointsUsed.rarityScore;
    if (raritySignal !== undefined) {
      return `Rarity scored at ${rarity.toFixed(1)} / 100, closely mirroring DOMA rarity signal ${raritySignal.toFixed(1)}.`;
    }
    return `Rarity reflects name length, TLD scarcity, brandability, and token metadata.`;
  }, [ai, data.breakdown.rarity]);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">TrendScore</p>
          <h2 className="text-3xl font-semibold text-slate-100">{data.domainName}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Score consolidating Web2 demand, Web3 activity and rarity parameters.
          </p>
        </div>
        <div className="rounded-full border border-blue-500/40 bg-blue-500/10 px-6 py-3 text-center text-4xl font-bold text-blue-200 shadow-lg shadow-blue-500/30">
          {data.score}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreBadge label="Search Volume" value={data.breakdown.searchVolume} description={volumeDescription} />
        <ScoreBadge label="Trend Direction" value={data.breakdown.trendDirection} description={trendDescription} />
        <ScoreBadge label="On-chain Activity" value={data.breakdown.onChainActivity} description={onChainDescription} />
        <ScoreBadge label="Rarity" value={data.breakdown.rarity} description={rarityDescription} />
      </div>

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400 shadow-inner shadow-black/40">
        <p>
          Last update: {new Date(data.metadata.lastUpdated).toLocaleString()} • Confidence:{' '}
          {(data.metadata.confidence * 100).toFixed(0)}% • Data Points:{' '}
          {data.metadata.dataPoints}
        </p>
        {data.metadata.source && <p className="text-xs text-slate-500">Source: {data.metadata.source}</p>}
        {data.onChain && (
          <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
            <p>Owner: {data.onChain.owner ?? '—'}</p>
            <p>Token ID: {data.onChain.tokenId ?? '—'}</p>
            <p>Network: {data.onChain.networkId ?? '—'}</p>
            <p>Minted: {data.onChain.mintedAt ? new Date(data.onChain.mintedAt).toLocaleDateString() : '—'}</p>
            <p>
              Last activity:{' '}
              {data.onChain.lastActivityAt
                ? new Date(data.onChain.lastActivityAt).toLocaleDateString()
                : '—'}
            </p>
            <p>Token: {data.onChain.tokenAddress ?? '—'}</p>
          </div>
        )}
      </div>

      {aiStatus !== 'ready' && (
        <div className="rounded-xl border border-purple-500/40 bg-purple-500/5 p-4 text-sm text-purple-200/80">
          {aiStatus === 'loading' && 'Generating analysis with AI...'}
          {aiStatus === 'pending' && 'Analysis in progress...'}
          {aiStatus === 'idle' && !ai && 'Assisted analysis will be loaded automatically when available.'}
        </div>
      )}

      {ai && (
        <div className="space-y-4 rounded-2xl border border-purple-500/40 bg-purple-500/5 p-6 shadow-xl shadow-purple-500/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">
                Assisted analysis with AI
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-100">Strategic summary</h3>
              <p className="mt-2 text-sm text-slate-300/90">{ai.summary}</p>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <SentimentBadge sentiment={ai.sentiment} />
              <p className="text-xs text-slate-400">
                Confidence: {(ai.confidence * 100).toFixed(0)}%
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
                  <li className="text-xs text-slate-500">No significant highlights.</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-inner shadow-black/30">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Recommendations</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300/90">
                {recommendations.length > 0 ? (
                  recommendations.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400/70" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500">No recommendations at the moment.</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-inner shadow-black/30">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Risks</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300/90">
                {risks.length > 0 ? (
                  risks.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400/70" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500">No risks evident.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 text-xs text-slate-400 shadow-inner shadow-black/40 sm:grid-cols-2 lg:grid-cols-4">
            <p>Sinal SerpApi (Trend): {(ai.dataPointsUsed.serpApiTrendStrength * 100).toFixed(1)}%</p>
            <p>Sinal SerpApi (Volume): {ai.dataPointsUsed.serpApiVolume.toFixed(0)}</p>
            <p>Score On-chain DOMA: {ai.dataPointsUsed.onChainActivityScore.toFixed(1)}</p>
            <p>Rarity DOMA: {ai.dataPointsUsed.rarityScore.toFixed(1)}</p>
          </div>
        </div>
      )}
    </div>
  );
};


