'use client';

import { useEffect, useMemo, useState } from 'react';

type PaperTrade = Record<string, any>;

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 })
      : '-';
  }

  return String(value);
}

function getStatusText(trade: PaperTrade) {
  return String(trade.result || trade.status || '').toLowerCase();
}

export default function PaperAnalyticsPage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
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
    const total = trades.length;

    const open = trades.filter((trade) =>
      ['entered', 'planned', 'open'].includes(String(trade.status || '').toLowerCase())
    ).length;

    const rrPlans = trades.filter((trade) =>
      trade.source === 'stock_detail_rr_plan' || trade.rrStatus || trade.marketSnapshot?.rrStatus
    ).length;

    const targetHit = trades.filter((trade) => getStatusText(trade).includes('target')).length;
    const slHit = trades.filter((trade) => getStatusText(trade).includes('sl')).length;
    const cancelled = trades.filter((trade) => getStatusText(trade).includes('cancel')).length;

    const completed = targetHit + slHit;
    const winRate = completed > 0 ? Math.round((targetHit / completed) * 100) : 0;

    const avgRisk =
      rrPlans > 0
        ? trades
            .filter((trade) => trade.risk || trade.marketSnapshot?.risk)
            .reduce((sum, trade) => sum + Number(trade.risk || trade.marketSnapshot?.risk || 0), 0) /
          trades.filter((trade) => trade.risk || trade.marketSnapshot?.risk).length
        : 0;

    const emotionCounts = trades.reduce((acc: Record<string, number>, trade) => {
      const key = String(trade.emotion || 'Not logged');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const mistakeCounts = trades.reduce((acc: Record<string, number>, trade) => {
      const key = String(trade.mistake || 'Not logged');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    const topMistake = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    return {
      total,
      open,
      rrPlans,
      targetHit,
      slHit,
      cancelled,
      completed,
      winRate,
      avgRisk,
      emotionCounts,
      mistakeCounts,
      topEmotion,
      topMistake,
    };
  }, [trades]);

  const latestPlans = trades.slice(0, 8);

  const copyAnalyticsSummary = async () => {
    const lines = [
      'Paper Trading Analytics Summary',
      `Total Plans: ${stats.total}`,
      `Open Plans: ${stats.open}`,
      `RR Plans: ${stats.rrPlans}`,
      `Target Hit: ${stats.targetHit}`,
      `SL Hit: ${stats.slHit}`,
      `Cancelled: ${stats.cancelled}`,
      `Completed: ${stats.completed}`,
      `Win Rate: ${stats.winRate}%`,
      `Average Risk: ${stats.avgRisk ? formatValue(stats.avgRisk) : '-'}`,
      '',
      'Latest Plans:',
      ...latestPlans.map((trade) =>
        `${trade.symbol || '-'} | ${trade.status || '-'} | Entry ${formatValue(trade.entryPlan ?? trade.entry)} | Stop ${formatValue(trade.stopLoss ?? trade.stop)} | Target ${formatValue(trade.target ?? trade.target2R)} | RR ${trade.rrStatus || trade.marketSnapshot?.rrStatus || '-'} | Emotion ${trade.emotion || '-'} | Mistake ${trade.mistake || '-'} | Note ${trade.reviewNote || '-'}`
      ),
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setMessage('Analytics summary copied ✅');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Paper Trading Analytics
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Plan Performance Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Local analytics for saved paper plans. This reads browser localStorage only.
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
              href="/paper/weekly"
              className="rounded-2xl border border-orange-800 bg-orange-500/10 px-5 py-3 text-sm font-bold text-orange-300 hover:bg-orange-500/20"
            >
              Weekly Review
            </a>
            <a
              href="/paper/export"
              className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20"
            >
              Export / Backup
            </a>
            <a
              href="/stocks"
              className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Stocks Research
            </a>
            <button
              onClick={copyAnalyticsSummary}
              className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
            >
              Copy Summary
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="Total Plans" value={stats.total} />
          <Stat label="Open Plans" value={stats.open} />
          <Stat label="RR Plans" value={stats.rrPlans} />
          <Stat label="Win Rate" value={`${stats.winRate}%`} />
          <Stat label="Target Hit" value={stats.targetHit} tone="win" />
          <Stat label="SL Hit" value={stats.slHit} tone="loss" />
          <Stat label="Cancelled" value={stats.cancelled} tone="warn" />
          <Stat label="Avg Risk" value={stats.avgRisk ? formatValue(stats.avgRisk) : '-'} />
          <Stat label="Top Emotion" value={stats.topEmotion} />
          <Stat label="Top Mistake" value={stats.topMistake} tone={stats.topMistake === 'No mistake' ? 'win' : 'warn'} />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Teacher Read</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Insight
              title="Discipline Check"
              text={
                stats.open > 5
                  ? 'Too many open paper plans. Reduce watchlist size and focus only on A+ setups.'
                  : 'Open plan count is controlled. Good for focused tracking.'
              }
            />
            <Insight
              title="RR Focus"
              text={
                stats.rrPlans === stats.total && stats.total > 0
                  ? 'Most saved plans are coming from the RR calculator. Good process consistency.'
                  : 'Try saving plans only after entry, stop, risk, and 2R are clear.'
              }
            />
            <Insight
              title="Result Tracking"
              text={
                stats.completed === 0
                  ? 'Start marking outcomes as Target Hit or SL Hit. That will make analytics useful.'
                  : `You have ${stats.completed} completed plans. Keep tracking without editing the truth.`
              }
            />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <BreakdownCard title="Emotion Breakdown" items={stats.emotionCounts} />
          <BreakdownCard title="Mistake Breakdown" items={stats.mistakeCounts} />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Latest Plans</h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Symbol</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Entry</th>
                  <th className="px-3 py-3">Stop</th>
                  <th className="px-3 py-3">Target</th>
                  <th className="px-3 py-3">Risk</th>
                  <th className="px-3 py-3">RR Status</th>
                  <th className="px-3 py-3">Emotion</th>
                  <th className="px-3 py-3">Mistake</th>
                  <th className="px-3 py-3">Review Note</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {latestPlans.map((trade) => (
                  <tr key={trade.id || trade.trade_id || `${trade.symbol}-${trade.createdAt}`} className="border-t border-slate-800">
                    <td className="px-3 py-4 font-bold text-white">{trade.symbol || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{trade.status || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{formatValue(trade.entryPlan ?? trade.entry)}</td>
                    <td className="px-3 py-4 text-red-300">{formatValue(trade.stopLoss ?? trade.stop)}</td>
                    <td className="px-3 py-4 text-emerald-300">{formatValue(trade.target ?? trade.target2R)}</td>
                    <td className="px-3 py-4 text-yellow-300">{formatValue(trade.risk)}</td>
                    <td className="px-3 py-4 text-slate-300">{trade.rrStatus || trade.marketSnapshot?.rrStatus || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{trade.emotion || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{trade.mistake || '-'}</td>
                    <td className="px-3 py-4 text-slate-400">{trade.reviewNote || '-'}</td>
                    <td className="px-3 py-4">
                      {trade.symbol ? (
                        <a className="text-emerald-300 hover:underline" href={`/stocks/${trade.symbol}`}>
                          Open Stock
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}

                {latestPlans.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                      No paper plans yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'win' | 'loss' | 'warn' }) {
  const color =
    tone === 'win'
      ? 'text-emerald-300'
      : tone === 'loss'
        ? 'text-red-300'
        : tone === 'warn'
          ? 'text-yellow-300'
          : 'text-white';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-sm font-bold text-white">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function BreakdownCard({ title, items }: { title: string; items: Record<string, number> }) {
  const rows = Object.entries(items).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-2xl font-bold text-white">{title}</h2>

      <div className="mt-5 space-y-3">
        {rows.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="font-bold text-slate-200">{label}</div>
            <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-black text-white">
              {count}
            </div>
          </div>
        ))}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
            No data yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
