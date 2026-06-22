'use client';

import { useEffect, useMemo, useState } from 'react';

type PaperTrade = Record<string, any>;

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

function readNumber(key: string, fallback: number) {
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export default function DailyDisciplinePage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [maxPlans, setMaxPlans] = useState(3);
  const [maxSl, setMaxSl] = useState(1);
  const [cooldown, setCooldown] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('paperTrades') || '[]');
      setTrades(Array.isArray(saved) ? saved : []);
      setMaxPlans(readNumber('disciplineMaxPlans', 3));
      setMaxSl(readNumber('disciplineMaxSl', 1));
      setCooldown(window.localStorage.getItem('disciplineCooldown') === 'true');
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

    const planLimitHit = total >= maxPlans;
    const slLimitHit = slHit >= maxSl;
    const locked = planLimitHit || slLimitHit || cooldown;

    return {
      total,
      open,
      targetHit,
      slHit,
      cancelled,
      planLimitHit,
      slLimitHit,
      locked,
    };
  }, [todayTrades, maxPlans, maxSl, cooldown]);

  const saveSettings = () => {
    window.localStorage.setItem('disciplineMaxPlans', String(maxPlans));
    window.localStorage.setItem('disciplineMaxSl', String(maxSl));
    window.localStorage.setItem('disciplineCooldown', String(cooldown));
    setMessage('Discipline settings saved ✅');
  };

  const resetCooldown = () => {
    setCooldown(false);
    window.localStorage.setItem('disciplineCooldown', 'false');
    setMessage('Cooldown removed ✅');
  };

  const activateCooldown = () => {
    setCooldown(true);
    window.localStorage.setItem('disciplineCooldown', 'true');
    setMessage('Cooldown activated. No more new trades today ⚠️');
  };

  const copyDisciplineSummary = async () => {
    const lines = [
      `Daily Discipline Lock - ${todayKey} IST`,
      `Status: ${stats.locked ? 'LOCKED' : 'ALLOWED'}`,
      `Today Plans: ${stats.total}/${maxPlans}`,
      `Open Plans: ${stats.open}`,
      `Target Hit: ${stats.targetHit}`,
      `SL Hit: ${stats.slHit}/${maxSl}`,
      `Cancelled: ${stats.cancelled}`,
      `Cooldown: ${cooldown ? 'ON' : 'OFF'}`,
      '',
      'Rule:',
      stats.locked
        ? 'No more new plans. Review today and protect discipline.'
        : 'New paper plan allowed only if Rules Gate + RR + setup are valid.',
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setMessage('Discipline summary copied ✅');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Daily Discipline Lock
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Daily Trading Control Panel</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              This page controls your personal daily paper-trading discipline using IST day boundaries.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="/stocks" className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800">
              Stocks Research
            </a>
            <a href="/paper" className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20">
              Paper Trading
            </a>
            <a href="/paper/rules" className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20">
              Rules
            </a>
            <a href="/paper/today" className="rounded-2xl border border-yellow-800 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-300 hover:bg-yellow-500/20">
              Today Review
            </a>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {message}
          </div>
        ) : null}

        <div
          className={`mt-8 rounded-3xl border p-6 ${
            stats.locked
              ? 'border-red-900 bg-red-950/20'
              : 'border-emerald-800 bg-emerald-500/10'
          }`}
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Trade Permission</div>
              <div className={`mt-2 text-4xl font-black ${stats.locked ? 'text-red-300' : 'text-emerald-300'}`}>
                {stats.locked ? 'LOCKED' : 'ALLOWED'}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                {stats.locked
                  ? 'No more new trades/plans today. Your job is review, not revenge.'
                  : 'You may save a new paper plan only if Rules Gate, VWAP/retest, and 1:2 RR are valid.'}
              </p>
            </div>

            <button
              onClick={copyDisciplineSummary}
              className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
            >
              Copy Summary
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <Stat label="IST Date" value={todayKey} />
          <Stat label="Today Plans" value={`${stats.total}/${maxPlans}`} tone={stats.planLimitHit ? 'loss' : 'neutral'} />
          <Stat label="Open Plans" value={stats.open} />
          <Stat label="SL Hit" value={`${stats.slHit}/${maxSl}`} tone={stats.slLimitHit ? 'loss' : 'neutral'} />
          <Stat label="Cooldown" value={cooldown ? 'ON' : 'OFF'} tone={cooldown ? 'loss' : 'win'} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-2xl font-bold text-white">Daily Limits</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Keep this strict every trading day. The goal is discipline first, profit second.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Max paper plans per day</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxPlans}
                  onChange={(event) => setMaxPlans(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-700"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Max SL hits before lock</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={maxSl}
                  onChange={(event) => setMaxSl(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-700"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveSettings}
                  className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
                >
                  Save Limits
                </button>

                <button
                  onClick={activateCooldown}
                  className="rounded-2xl border border-red-900 bg-red-950/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-950/50"
                >
                  Activate Cooldown
                </button>

                <button
                  onClick={resetCooldown}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  Remove Cooldown
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-900/70 bg-yellow-950/10 p-6">
            <h2 className="text-2xl font-bold text-yellow-200">Discipline Rules</h2>

            <div className="mt-5 space-y-3 text-sm leading-7 text-yellow-100/80">
              <p>1. If daily plan limit is hit, no more new plans.</p>
              <p>2. If SL limit is hit, no more trading today.</p>
              <p>3. If cooldown is ON, only review is allowed.</p>
              <p>4. A valid plan still needs Rules Gate + RR + stock detail confirmation.</p>
              <p>5. Your goal is not more trades. Your goal is clean process.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Today&apos;s Plans</h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Symbol</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Entry</th>
                  <th className="px-3 py-3">Stop</th>
                  <th className="px-3 py-3">Target</th>
                  <th className="px-3 py-3">Open</th>
                </tr>
              </thead>

              <tbody>
                {todayTrades.map((trade) => (
                  <tr key={trade.id || trade.trade_id || `${trade.symbol}-${trade.createdAt}`} className="border-t border-slate-800">
                    <td className="px-3 py-4 font-bold text-white">{trade.symbol || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{trade.status || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{trade.entryPlan ?? trade.entry ?? '-'}</td>
                    <td className="px-3 py-4 text-red-300">{trade.stopLoss ?? trade.stop ?? '-'}</td>
                    <td className="px-3 py-4 text-emerald-300">{trade.target ?? trade.target2R ?? '-'}</td>
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
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: 'win' | 'loss' | 'neutral';
}) {
  const color =
    tone === 'win'
      ? 'text-emerald-300'
      : tone === 'loss'
        ? 'text-red-300'
        : 'text-white';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}
