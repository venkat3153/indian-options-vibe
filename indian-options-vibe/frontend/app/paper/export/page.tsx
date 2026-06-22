'use client';

import { useEffect, useMemo, useState } from 'react';

type PaperTrade = Record<string, any>;

function toCsvValue(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildCsv(trades: PaperTrade[]) {
  const headers = [
    'symbol',
    'name',
    'sector',
    'status',
    'source',
    'bias',
    'entryPlan',
    'stopLoss',
    'target',
    'risk',
    'target1R',
    'target2R',
    'rrStatus',
      'emotion',
      'mistake',
      'reviewNote',
    'createdAt',
    'updatedAt',
    'notes',
  ];

  const rows = trades.map((trade) =>
    headers.map((header) => toCsvValue(trade[header] ?? trade.marketSnapshot?.[header])).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

function getExportFieldValue(trade: PaperTrade, header: string) {
  if (header === 'reviewNote') {
    return trade.reviewNote || trade.notes || trade.marketSnapshot?.reviewNote || trade.marketSnapshot?.notes || '';
  }

  if (header === 'notes') {
    return trade.notes || trade.marketSnapshot?.teacherTradePlan || trade.marketSnapshot?.noTradeWarning || '';
  }

  return getExportFieldValue(trade, header);
}


function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildCleanReviewCsv(rows: PaperTrade[]) {
  const headers = [
    'symbol',
    'status',
    'source',
    'bias',
    'entryPlan',
    'stopLoss',
    'target',
    'risk',
    'rrStatus',
    'emotion',
    'mistake',
    'reviewNote',
    'createdAt',
    'updatedAt',
  ];

  const clean = (value: unknown) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replaceAll('\r', ' ')
      .replaceAll('\n', ' ')
      .replaceAll(',', ' ')
      .replaceAll('"', '""')
      .trim();
  };

  const field = (trade: PaperTrade, header: string) => {
    if (header === 'reviewNote') {
      return trade.reviewNote || trade.notes || trade.marketSnapshot?.reviewNote || trade.marketSnapshot?.notes || '';
    }

    if (header === 'rrStatus') {
      return trade.rrStatus || trade.marketSnapshot?.rrStatus || '';
    }

    return trade[header] ?? trade.marketSnapshot?.[header] ?? '';
  };

  return [
    headers.join(','),
    ...rows.map((trade) => headers.map((header) => `"${clean(field(trade, header))}"`).join(',')),
  ].join('\n');
}


export default function PaperExportPage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);

  const downloadCleanReviewCsv = () => {
    const csv = buildCleanReviewCsv(trades);
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(`paper-review-clean-${date}.csv`, csv, 'text/csv;charset=utf-8;');
    setMessage('Clean review CSV downloaded ✅');
  };


  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('paperTrades') || '[]');
      setTrades(Array.isArray(saved) ? saved : []);
    } catch {
      setTrades([]);
    }
  }, []);

  const stats = useMemo(() => {
    const open = trades.filter((trade) => ['Entered', 'Planned', 'Open'].includes(trade.status)).length;
    const wins = trades.filter((trade) => String(trade.result || trade.status).toLowerCase().includes('target')).length;
    const losses = trades.filter((trade) => String(trade.result || trade.status).toLowerCase().includes('sl')).length;
    const rrPlans = trades.filter((trade) => trade.source === 'stock_detail_rr_plan' || trade.rrStatus).length;

    return { total: trades.length, open, wins, losses, rrPlans };
  }, [trades]);

  const jsonText = JSON.stringify(trades, null, 2);

  const copyJson = async () => {
    await navigator.clipboard.writeText(jsonText);
    setMessage('Paper trades copied as JSON ✅');
  };

  const downloadJson = () => {
    downloadText(`paper-trades-${new Date().toISOString().slice(0, 10)}.json`, jsonText, 'application/json');
    setMessage('JSON backup downloaded ✅');
  };

  const downloadCsv = () => {
    downloadText(`paper-trades-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(trades), 'text/csv');
    setMessage('CSV export downloaded ✅');
  };

  const restoreFromJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '[]'));

        if (!Array.isArray(parsed)) {
          setMessage('Restore failed: JSON must be an array ❌');
          return;
        }

        window.localStorage.setItem('paperTrades', JSON.stringify(parsed));
        setTrades(parsed);
        setMessage(`Restored ${parsed.length} paper trades ✅`);
      } catch {
        setMessage('Restore failed: invalid JSON ❌');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Paper Trading Backup
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Export Paper Plans</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Backup your local paper trading plans. This exports only browser localStorage data from this device.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/paper"
              className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Open Paper Trading
            </a>
            <a
              href="/paper/discipline"
              className="rounded-2xl border border-red-900 bg-red-950/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-950/50"
            >
              Discipline Lock
            </a>
            <a
              href="/paper/rules"
              className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
            >
              Rules
            </a>
            <a
              href="/paper/today"
              className="rounded-2xl border border-yellow-800 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-300 hover:bg-yellow-500/20"
            >
              Today Review
            </a>
            <a
              href="/paper/analytics"
              className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
            >
              Analytics
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <Stat label="Total Plans" value={stats.total} />
          <Stat label="Open Plans" value={stats.open} />
          <Stat label="RR Plans" value={stats.rrPlans} />
          <Stat label="Target Hit" value={stats.wins} />
          <Stat label="SL Hit" value={stats.losses} />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Backup Actions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Use JSON for full restore/reference. Use CSV for Excel/Google Sheets review.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={copyJson}
              className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
            >
              Copy JSON
            </button>

            <button
              onClick={downloadJson}
              className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20"
            >
              Download JSON
            </button>

            <button
              onClick={downloadCsv}
              className="rounded-2xl border border-yellow-800 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-300 hover:bg-yellow-500/20"
            >
              Download CSV
            </button>
            <button
              onClick={downloadCleanReviewCsv}
              className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
            >
              Download Clean Review CSV
            </button>

            <label className="cursor-pointer rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20">
              Restore JSON
              <input type="file" accept="application/json,.json" onChange={restoreFromJson} className="hidden" />
            </label>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
              {message}
            </div>
          ) : null}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Preview</h2>
          <pre className="mt-5 max-h-[520px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-300">
            {jsonText}
          </pre>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  );
}
