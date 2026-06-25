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

function getIstDateKey(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function getStatusText(trade: PaperTrade) {
  return String(trade.result || trade.status || '').toLowerCase();
}

export default function TodayPaperReviewPage() {
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

  const todayKey = useMemo(() => getIstDateKey(new Date().toISOString()), []);

  const todayTrades = useMemo(() => {
    return trades.filter((trade) => {
      const stamp = trade.createdAt || trade.updatedAt || trade.marketSnapshot?.savedAt;
      return getIstDateKey(stamp) === todayKey;
    });
  }, [trades, todayKey]);

  const stats = useMemo(() => {
    const total = todayTrades.length;
    const open = todayTrades.filter((trade) =>
      ['entered', 'planned', 'open'].includes(String(trade.status || '').toLowerCase())
    ).length;
    const targetHit = todayTrades.filter((trade) => getStatusText(trade).includes('target')).length;
    const slHit = todayTrades.filter((trade) => getStatusText(trade).includes('sl')).length;
    const cancelled = todayTrades.filter((trade) => getStatusText(trade).includes('cancel')).length;
    const completed = targetHit + slHit;
    const winRate = completed > 0 ? Math.round((targetHit / completed) * 100) : 0;

    return { total, open, targetHit, slHit, cancelled, completed, winRate };
  }, [todayTrades]);

  const copyDailySummary = async () => {
    const lines = [
      `Daily Paper Review - ${todayKey} IST`,
      `Total Plans: ${stats.total}`,
      `Open: ${stats.open}`,
      `Target Hit: ${stats.targetHit}`,
      `SL Hit: ${stats.slHit}`,
      `Cancelled: ${stats.cancelled}`,
      `Win Rate: ${stats.winRate}%`,
      '',
      'Plans:',
      ...todayTrades.map((trade) =>
        `${trade.symbol || '-'} | ${trade.status || '-'} | Entry ${formatValue(trade.entryPlan ?? trade.entry)} | Stop ${formatValue(trade.stopLoss ?? trade.stop)} | Target ${formatValue(trade.target ?? trade.target2R)} | Bias ${trade.bias || trade.rrStatus || '-'} | Emotion ${trade.emotion || '-'} | Mistake ${trade.mistake || '-'} | Note ${trade.reviewNote || '-'}`
      ),
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setMessage('Today review summary copied ✅');
  };

  const badEmotionCount = todayTrades.filter((trade) =>
    ['FOMO', 'Fear', 'Revenge', 'Greedy', 'Confused'].includes(String(trade.emotion || ''))
  ).length;

  const seriousMistakeCount = todayTrades.filter((trade) =>
    ['Chased entry', 'Ignored VWAP', 'Ignored rules', 'Oversized', 'Moved stop', 'Revenge trade'].includes(String(trade.mistake || ''))
  ).length;

  const cleanTradeCount = todayTrades.filter((trade) =>
    trade.mistake === 'No mistake' || (!trade.mistake && !trade.emotion)
  ).length;

  const disciplineQualityScore = Math.max(
    0,
    Math.min(100, 100 - badEmotionCount * 15 - seriousMistakeCount * 20 + cleanTradeCount * 5)
  );

  const disciplineVerdict =
    disciplineQualityScore >= 85
      ? {
          title: 'Excellent Discipline',
          text: 'You followed process well today. Keep size normal and do not force extra trades.',
          tone: 'win',
        }
      : disciplineQualityScore >= 65
        ? {
            title: 'Acceptable, But Improve',
            text: 'You had some emotional or mistake flags. Reduce trade count and focus on cleaner entries.',
            tone: 'warn',
          }
        : {
            title: 'Discipline Broken',
            text: 'Stop new trades today. Review mistakes, protect capital, and come back fresh tomorrow.',
            tone: 'loss',
          };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Today&apos;s Paper Review
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Daily Paper Trading Review</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              IST day view for saved paper plans. Use this to review only today&apos;s research plans.
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
              href="/paper/analytics"
              className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
            >
              Analytics
            </a>
            <a
              href="/stocks"
              className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20"
            >
              Stocks Research
            </a>
            <button
              onClick={copyDailySummary}
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

        <div className="mt-8 grid gap-4 md:grid-cols-6">
          <Stat label="IST Date" value={todayKey} />
          <Stat label="Today Plans" value={stats.total} />
          <Stat label="Open" value={stats.open} />
          <Stat label="Target Hit" value={stats.targetHit} tone="win" />
          <Stat label="SL Hit" value={stats.slHit} tone="loss" />
          <Stat label="Win Rate" value={`${stats.winRate}%`} />
          <Stat
            label="Discipline Score"
            value={`${disciplineQualityScore}/100`}
            tone={disciplineQualityScore >= 80 ? 'win' : 'loss'}
          />
          <Stat label="Bad Emotion" value={badEmotionCount} tone={badEmotionCount > 0 ? 'loss' : 'win'} />
          <Stat label="Mistakes" value={seriousMistakeCount} tone={seriousMistakeCount > 0 ? 'loss' : 'win'} />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Teacher Review</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Insight
              title="Daily Focus"
              text={
                stats.total === 0
                  ? 'No plans saved today. Only save A+ research plans after entry, stop, and 2R are clear.'
                  : `You saved ${stats.total} plan(s) today. Keep the list small and review each outcome honestly.`
              }
            />
            <Insight
              title="Risk Discipline"
              text={
                stats.open > 3
                  ? 'Too many open plans today. Reduce watchlist load and wait for confirmation.'
                  : 'Open plan count is controlled. Good for disciplined paper tracking.'
              }
            />
            <Insight
              title="Outcome Habit"
              text={
                stats.completed === 0
                  ? 'Mark Target Hit or SL Hit after the setup resolves. Analytics improve only when results are tracked.'
                  : `You completed ${stats.completed} plan(s) today. Win rate is ${stats.winRate}%.`
              }
            />
          </div>
        </div>

        <div
          className={`mt-8 rounded-3xl border p-6 ${
            disciplineVerdict.tone === 'win'
              ? 'border-emerald-800 bg-emerald-500/10'
              : disciplineVerdict.tone === 'warn'
                ? 'border-yellow-800 bg-yellow-500/10'
                : 'border-red-900 bg-red-950/20'
          }`}
        >
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Discipline Verdict</div>
          <h2
            className={`mt-2 text-3xl font-black ${
              disciplineVerdict.tone === 'win'
                ? 'text-emerald-300'
                : disciplineVerdict.tone === 'warn'
                  ? 'text-yellow-300'
                  : 'text-red-300'
            }`}
          >
            {disciplineVerdict.title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{disciplineVerdict.text}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <MiniStat label="Score" value={`${disciplineQualityScore}/100`} />
            <MiniStat label="Bad Emotion" value={badEmotionCount} />
            <MiniStat label="Mistakes" value={seriousMistakeCount} />
            <MiniStat label="Clean Trades" value={cleanTradeCount} />
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Today&apos;s Plans</h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Symbol</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Bias</th>
                  <th className="px-3 py-3">Entry</th>
                  <th className="px-3 py-3">Stop</th>
                  <th className="px-3 py-3">Target</th>
                  <th className="px-3 py-3">Risk</th>
                  <th className="px-3 py-3">Emotion</th>
                  <th className="px-3 py-3">Mistake</th>
                  <th className="px-3 py-3">Review Note</th>
                  <th className="px-3 py-3">No-trade Warning</th>
                  <th className="px-3 py-3">Open</th>
                </tr>
              </thead>

              <tbody>
                {todayTrades.map((trade) => (
                  <tr
                    key={trade.id || trade.trade_id || `${trade.symbol}-${trade.createdAt}`}
                    className="border-t border-slate-800"
                  >
                    <td className="px-3 py-4 font-bold text-white">{trade.symbol || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{trade.status || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{trade.bias || trade.rrStatus || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{formatValue(trade.entryPlan ?? trade.entry)}</td>
                    <td className="px-3 py-4 text-red-300">{formatValue(trade.stopLoss ?? trade.stop)}</td>
                    <td className="px-3 py-4 text-emerald-300">{formatValue(trade.target ?? trade.target2R)}</td>
                    <td className="px-3 py-4 text-yellow-300">{formatValue(trade.risk)}</td>
                    <td className="px-3 py-4 text-slate-300">{trade.emotion || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{trade.mistake || '-'}</td>
                    <td className="px-3 py-4 text-slate-400">{trade.reviewNote || '-'}</td>
                    <td className="px-3 py-4 text-slate-400">
                      {trade.marketSnapshot?.noTradeWarning || '-'}
                    </td>
                    <td className="px-3 py-4">
                      {trade.symbol ? (
                        <a href={`/stocks/${trade.symbol}`} className="text-emerald-300 hover:underline">
                          Stock
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}

                {todayTrades.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                      No paper plans saved today.
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'win' | 'loss' }) {
  const color = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-black ${color}`}>{value}</div>
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
