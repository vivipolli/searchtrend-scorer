import { useState } from 'react';
import { Layout } from './components/Layout';
import { BackendStatusCard } from './components/BackendStatusCard';
import { ScoreForm } from './components/ScoreForm';
import { ScoreResult } from './components/ScoreResult';
import { TrendingList } from './components/TrendingList';
import type { DomainScoreResponse } from './api/client';

function App() {
  const [result, setResult] = useState<DomainScoreResponse | undefined>();
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'pending' | 'ready'>('idle');

  return (
    <Layout>
      <div className="space-y-6">
        <BackendStatusCard />
        <ScoreForm
          onResult={(value) => {
            setResult(value);
            setAiStatus(value?.data.aiAnalysis ? 'ready' : 'idle');
          }}
          onAnalysisStatus={setAiStatus}
        />
        <ScoreResult result={result} aiStatus={aiStatus} />
      </div>
      <div className="space-y-6">
        <TrendingList />
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/30">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Guia rápido</p>
            <h2 className="text-xl font-semibold text-slate-100">Como demonstrar a solução</h2>
          </div>
          <ol className="space-y-3 text-sm text-slate-400">
            <li>
              1. Verifique se o backend está operacional (card de status). Execute{' '}
              <code className="font-mono text-blue-300">yarn dev</code> dentro da pasta{' '}
              <code className="font-mono text-blue-300">backend/</code>.
            </li>
            <li>
              2. Utilize domínios sugeridos (<code className="font-mono text-blue-300">crypto.eth</code>,{' '}
              <code className="font-mono text-blue-300">ai.crypto</code>,{' '}
              <code className="font-mono text-blue-300">nft.dao</code>) para mostrar o TrendScore.
            </li>
            <li>
              3. Explore o ranking de domínios mais quentes. Destaque as métricas de Search Volume,
              Trend Direction, On-chain Activity e Rarity.
            </li>
            <li>
              4. Conclua explicando como conectamos sinais Web2 (Google Trends) com Web3 (DOMA) para
              resolver assimetria de informação em DomainFi.
            </li>
          </ol>
        </div>
      </div>
    </Layout>
  );
}

export default App;
