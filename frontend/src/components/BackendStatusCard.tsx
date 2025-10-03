import { useBackendStatus } from '../hooks/useBackendStatus';

export const BackendStatusCard = () => {
  const status = useBackendStatus();

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Backend</p>
          <h2 className="text-xl font-semibold text-slate-100">Integration status</h2>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            status.loading
              ? 'bg-slate-700/80 text-slate-300'
              : status.healthy
              ? 'bg-green-500/10 text-green-300'
              : 'bg-red-500/10 text-red-300'
          }`}
        >
          {status.loading ? 'Checking...' : status.healthy ? 'Operational' : 'Unavailable'}
        </span>
      </div>

      <div className="space-y-3 text-sm text-slate-400">
        {status.loading && <p>Checking backend status...</p>}
        {!status.loading && status.healthy && (
          <>
            <p>{status.message ?? 'Integration with DOMA and Google Trends available.'}</p>
            {status.uptime !== undefined && (
              <p className="text-xs text-slate-500">
                Uptime: {(status.uptime / 60).toFixed(1)} minutos
              </p>
            )}
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-400" />
                Polling DOMA Events ativo
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-400" />
                Google Trends Analysis available
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-400" />
                Local database synchronized
              </li>
            </ul>
          </>
        )}
        {!status.loading && !status.healthy && (
          <p className="text-red-200">
            Unable to connect to backend. Please check if the server is running at{' '}
            <code className="rounded bg-slate-800 px-1 py-0.5 text-xs text-blue-200">
              {import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}
            </code>
          </p>
        )}
      </div>
    </div>
  );
};


