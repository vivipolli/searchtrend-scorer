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
       </div>
    </Layout>
  );
}

export default App;
