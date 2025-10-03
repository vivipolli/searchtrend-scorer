import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Trendom Logo" 
                className="h-12 w-12 rounded-lg"
              />
              <div>
                <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
                  Trendom
                </h1>
                <p className="text-sm text-blue-400">
                  AI-Powered Domain Valuation
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <p className="text-sm text-slate-400">
              DOMA + Google Trends Analytics Dashboard
            </p>
            <p className="text-xs text-slate-500">
              Insights about real domain demand connecting Web2 and Web3 signals
            </p>
          </div>
          <a
            href="https://github.com"
            className="inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20 hover:text-blue-100"
          >
            View Documentation
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">{children}</div>
      </main>
      <footer className="border-t border-slate-800 bg-slate-900/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Trendom</span>
          <span>DOMA Hackathon • Track 4</span>
        </div>
      </footer>
    </div>
  );
};


