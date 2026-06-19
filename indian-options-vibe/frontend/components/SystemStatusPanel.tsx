'use client';

import { useEffect, useMemo, useState } from 'react';

type CheckState = 'checking' | 'connected' | 'error' | 'locked';

type StatusItem = {
  label: string;
  value: string;
  state: CheckState;
  hint: string;
};

type HealthResponse = {
  status: string;
  mode: string;
};

type ScannerResponse = {
  rows: unknown[];
};

type BacktestResponse = {
  runId?: string;
  run_id?: string;
  status?: string;
};

export function SystemStatusPanel() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [scannerOk, setScannerOk] = useState<boolean | null>(null);
  const [backtestOk, setBacktestOk] = useState<boolean | null>(null);
  const [backendMode, setBackendMode] = useState('paper');
  const [lastChecked, setLastChecked] = useState('Not checked yet');

  async function checkSystem() {
    setBackendOk(null);
    setScannerOk(null);
    setBacktestOk(null);

    const checkedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    try {
      const health = await fetch('http://localhost:8000/health');
      if (!health.ok) throw new Error('Health check failed');
      const data = (await health.json()) as HealthResponse;
      setBackendOk(data.status === 'ok');
      setBackendMode(data.mode || 'paper');
    } catch {
      setBackendOk(false);
      setBackendMode('unknown');
    }

    try {
      const scanner = await fetch('http://localhost:8000/api/scanner/market');
      if (!scanner.ok) throw new Error('Scanner check failed');
      const data = (await scanner.json()) as ScannerResponse;
      setScannerOk(Array.isArray(data.rows));
    } catch {
      setScannerOk(false);
    }

    try {
      const backtest = await fetch('http://localhost:8000/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Health check paper backtest', symbol: 'NIFTY', timeframe: '5m' }),
      });
      if (!backtest.ok) throw new Error('Backtest check failed');
      const data = (await backtest.json()) as BacktestResponse;
      setBacktestOk(Boolean(data.runId || data.run_id || data.status));
    } catch {
      setBacktestOk(false);
    }

    setLastChecked(checkedAt);
  }

  useEffect(() => {
    checkSystem();
  }, []);

  const items = useMemo<StatusItem[]>(() => [
    {
      label: 'Backend API',
      value: backendOk === null ? 'Checking' : backendOk ? 'Connected' : 'Offline',
      state: backendOk === null ? 'checking' : backendOk ? 'connected' : 'error',
      hint: 'http://localhost:8000/health',
    },
    {
      label: 'Scanner API',
      value: scannerOk === null ? 'Checking' : scannerOk ? 'Connected' : 'Offline',
      state: scannerOk === null ? 'checking' : scannerOk ? 'connected' : 'error',
      hint: '/api/scanner/market',
    },
    {
      label: 'Backtest API',
      value: backtestOk === null ? 'Checking' : backtestOk ? 'Connected' : 'Offline',
      state: backtestOk === null ? 'checking' : backtestOk ? 'connected' : 'error',
      hint: '/api/backtest/run',
    },
    {
      label: 'Frontend Mode',
      value: backendMode === 'unknown' ? 'Unknown' : 'Paper',
      state: backendMode === 'unknown' ? 'error' : 'connected',
      hint: 'No real orders from MVP',
    },
    {
      label: 'Live Orders',
      value: 'Locked',
      state: 'locked',
      hint: 'Broker execution disabled',
    },
  ], [backendOk, scannerOk, backtestOk, backendMode]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">System Status</div>
          <h2 className="mt-2 text-2xl font-bold text-white">API + Safety Check</h2>
          <p className="mt-1 text-sm text-slate-400">Shows whether the frontend can reach backend, scanner, and backtest APIs.</p>
        </div>
        <button onClick={checkSystem} className="rounded-xl border border-emerald-800 px-4 py-3 text-sm text-emerald-300 hover:bg-emerald-950/30">
          Refresh Status
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-5">
        {items.map((item) => <StatusCard key={item.label} item={item} />)}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
        Last checked: {lastChecked} IST. If Backend API is offline, start FastAPI on port 8000. If frontend runs on 3001, backend CORS already allows it.
      </div>
    </div>
  );
}

function StatusCard({ item }: { item: StatusItem }) {
  const styles: Record<CheckState, string> = {
    checking: 'border-yellow-800 bg-yellow-950/20 text-yellow-300',
    connected: 'border-emerald-800 bg-emerald-950/20 text-emerald-300',
    error: 'border-red-800 bg-red-950/20 text-red-300',
    locked: 'border-slate-700 bg-slate-950 text-slate-300',
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-sm text-slate-400">{item.label}</div>
      <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${styles[item.state]}`}>{item.value}</div>
      <div className="mt-3 text-xs text-slate-500">{item.hint}</div>
    </div>
  );
}
