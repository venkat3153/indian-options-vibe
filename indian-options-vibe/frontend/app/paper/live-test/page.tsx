'use client';

import { useEffect, useMemo, useState } from 'react';

type LiveTestSettings = {
  enabled: boolean;
  maxTradesPerDay: number;
  maxSlPerDay: number;
  maxQty: number;
  mode: 'stock' | 'options';
  note: string;
  updatedAt?: string;
};

const DEFAULT_SETTINGS: LiveTestSettings = {
  enabled: false,
  maxTradesPerDay: 1,
  maxSlPerDay: 1,
  maxQty: 1,
  mode: 'options',
  note: 'Manual Dhan execution only. No auto orders.',
};

function getIstDateKey(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function LiveTestModePage() {
  const [settings, setSettings] = useState<LiveTestSettings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState<string | null>(null);
  const [todayPlans, setTodayPlans] = useState(0);
  const [todaySlHits, setTodaySlHits] = useState(0);

  useEffect(() => {
    try {
      const savedSettings = JSON.parse(window.localStorage.getItem('liveTestSettings') || 'null');
      if (savedSettings && typeof savedSettings === 'object') {
        setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
      }

      const paperTrades = JSON.parse(window.localStorage.getItem('paperTrades') || '[]');
      const todayKey = getIstDateKey(new Date().toISOString());

      if (Array.isArray(paperTrades)) {
        const todayTrades = paperTrades.filter((trade: any) => {
          const stamp = trade.createdAt || trade.updatedAt || trade.marketSnapshot?.savedAt;
          return getIstDateKey(stamp) === todayKey;
        });

        setTodayPlans(todayTrades.length);
        setTodaySlHits(
          todayTrades.filter((trade: any) =>
            String(trade.result || trade.status || '').toLowerCase().includes('sl')
          ).length
        );
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const status = useMemo(() => {
    if (!settings.enabled) {
      return {
        label: 'OFF',
        tone: 'warn',
        reason: 'Live Test Mode is disabled. Use paper trading only.',
      };
    }

    if (settings.maxQty > 1) {
      return {
        label: 'BLOCKED',
        tone: 'loss',
        reason: 'Max quantity must be 1 for July live testing.',
      };
    }

    if (todayPlans >= settings.maxTradesPerDay) {
      return {
        label: 'BLOCKED',
        tone: 'loss',
        reason: `Daily trade/plan limit reached: ${todayPlans}/${settings.maxTradesPerDay}.`,
      };
    }

    if (todaySlHits >= settings.maxSlPerDay) {
      return {
        label: 'BLOCKED',
        tone: 'loss',
        reason: `Daily SL limit reached: ${todaySlHits}/${settings.maxSlPerDay}.`,
      };
    }

    return {
      label: 'READY FOR CONTROLLED TEST',
      tone: 'win',
      reason: 'Allowed only after Rules Gate, Discipline Lock, and 1:2 RR are also clear.',
    };
  }, [settings, todayPlans, todaySlHits]);

  const saveSettings = () => {
    const next = {
      ...settings,
      maxQty: Math.max(1, Number(settings.maxQty || 1)),
      maxTradesPerDay: Math.max(1, Number(settings.maxTradesPerDay || 1)),
      maxSlPerDay: Math.max(1, Number(settings.maxSlPerDay || 1)),
      updatedAt: new Date().toISOString(),
    };

    setSettings(next);
    window.localStorage.setItem('liveTestSettings', JSON.stringify(next));
    setMessage('Live Test settings saved ✅');
  };

  const copySummary = async () => {
    const lines = [
      'Live Test Mode Settings',
      `Status: ${status.label}`,
      `Reason: ${status.reason}`,
      `Enabled: ${settings.enabled ? 'Yes' : 'No'}`,
      `Mode: ${settings.mode}`,
      `Max Qty/Lot: ${settings.maxQty}`,
      `Max Trades Per Day: ${settings.maxTradesPerDay}`,
      `Max SL Per Day: ${settings.maxSlPerDay}`,
      `Today Plans: ${todayPlans}`,
      `Today SL Hits: ${todaySlHits}`,
      `Note: ${settings.note}`,
      '',
      'Rule: Manual Dhan execution only. No auto orders.',
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setMessage('Live Test summary copied ✅');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Live Test Mode
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">1 Lot / 1 Quantity Safety Gate</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Use this only for controlled July testing. This page does not place orders. Execution remains manual in Dhan.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="/stocks" className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800">
              Stocks Research
            </a>
            <a href="/paper/discipline" className="rounded-2xl border border-red-900 bg-red-950/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-950/50">
              Discipline Lock
            </a>
            <a href="/paper/rules" className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20">
              Rules
            </a>
            <a href="/paper" className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20">
              Paper Trading
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
            status.tone === 'win'
              ? 'border-emerald-800 bg-emerald-500/10'
              : status.tone === 'loss'
                ? 'border-red-900 bg-red-950/20'
                : 'border-yellow-800 bg-yellow-500/10'
          }`}
        >
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Live Test Status</div>
          <h2
            className={`mt-2 text-3xl font-black ${
              status.tone === 'win'
                ? 'text-emerald-300'
                : status.tone === 'loss'
                  ? 'text-red-300'
                  : 'text-yellow-300'
            }`}
          >
            {status.label}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{status.reason}</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-2xl font-bold text-white">Settings</h2>

            <div className="mt-5 space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <span>
                  <span className="block text-sm font-bold text-white">Enable Live Test Mode</span>
                  <span className="mt-1 block text-xs text-slate-500">Still manual Dhan execution only.</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) => setSettings((prev) => ({ ...prev, enabled: event.target.checked }))}
                  className="h-5 w-5"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Mode</span>
                <select
                  value={settings.mode}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, mode: event.target.value as LiveTestSettings['mode'] }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-700"
                >
                  <option value="options">Options: 1 lot only</option>
                  <option value="stock">Stock: 1 quantity only</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Max Quantity / Lot</span>
                <input
                  type="number"
                  min={1}
                  max={1}
                  value={settings.maxQty}
                  onChange={(event) => setSettings((prev) => ({ ...prev, maxQty: Number(event.target.value) }))}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-700"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Max Trades Per Day</span>
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={settings.maxTradesPerDay}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, maxTradesPerDay: Number(event.target.value) }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-700"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Max SL Per Day</span>
                <input
                  type="number"
                  min={1}
                  max={1}
                  value={settings.maxSlPerDay}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, maxSlPerDay: Number(event.target.value) }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-700"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Note</span>
                <textarea
                  value={settings.note}
                  onChange={(event) => setSettings((prev) => ({ ...prev, note: event.target.value }))}
                  className="mt-2 min-h-24 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-700"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveSettings}
                  className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
                >
                  Save Settings
                </button>
                <button
                  onClick={copySummary}
                  className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
                >
                  Copy Summary
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-900/70 bg-yellow-950/10 p-6">
            <h2 className="text-2xl font-bold text-yellow-200">Live Test Rules</h2>

            <div className="mt-5 space-y-3 text-sm leading-7 text-yellow-100/80">
              <p>1. No auto orders. Manual Dhan execution only.</p>
              <p>2. Size must remain 1 lot or 1 quantity.</p>
              <p>3. Rules Gate must be passed.</p>
              <p>4. Discipline Lock must be ALLOWED.</p>
              <p>5. 1:2 RR must be clear before execution.</p>
              <p>6. After 1 SL hit, stop live testing for the day.</p>
              <p>7. If emotion is FOMO, Revenge, Greedy, or Confused, do not execute.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
