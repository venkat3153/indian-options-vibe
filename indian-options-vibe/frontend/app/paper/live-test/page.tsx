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

type LiveTestLog = {
  id: string;
  date: string;
  symbol: string;
  mode: 'stock' | 'options';
  qty: number;
  status: 'Entered' | 'Target Hit' | 'SL Hit' | 'Cancelled';
  emotion: string;
  mistake: string;
  note: string;
  createdAt: string;
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


function buildLiveTestCsv(rows: LiveTestLog[]) {
  const headers = [
    'date',
    'symbol',
    'mode',
    'qty',
    'status',
    'emotion',
    'mistake',
    'note',
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

  return [
    headers.join(','),
    ...rows.map((log) =>
      headers.map((header) => `"${clean(log[header as keyof LiveTestLog])}"`).join(',')
    ),
  ].join('\n');
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


export default function LiveTestModePage() {
  const [settings, setSettings] = useState<LiveTestSettings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState<string | null>(null);
  const [todayPlans, setTodayPlans] = useState(0);
  const [todaySlHits, setTodaySlHits] = useState(0);
  const [logs, setLogs] = useState<LiveTestLog[]>([]);
  const [symbol, setSymbol] = useState('');
  const [emotion, setEmotion] = useState('');
  const [mistake, setMistake] = useState('');
  const [logNote, setLogNote] = useState('');

  useEffect(() => {
    try {
      const savedSettings = JSON.parse(window.localStorage.getItem('liveTestSettings') || 'null');
      if (savedSettings && typeof savedSettings === 'object') {
        setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
      }

      const savedLogs = JSON.parse(window.localStorage.getItem('liveTestLogs') || '[]');
      const todayKey = getIstDateKey(new Date().toISOString());

      if (Array.isArray(savedLogs)) {
        setLogs(savedLogs);

        const todayLogs = savedLogs.filter((trade: any) => {
          const stamp = trade.createdAt || trade.updatedAt;
          return getIstDateKey(stamp) === todayKey;
        });

        setTodayPlans(todayLogs.length);
        setTodaySlHits(
          todayLogs.filter((trade: any) =>
            String(trade.status || '').toLowerCase().includes('sl')
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

  const downloadLiveTestCsv = () => {
    const csv = buildLiveTestCsv(logs);
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(`live-test-logs-${date}.csv`, csv, 'text/csv;charset=utf-8;');
    setMessage('Live Test CSV downloaded ✅');
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

  const saveLogs = (nextLogs: LiveTestLog[]) => {
    setLogs(nextLogs);
    window.localStorage.setItem('liveTestLogs', JSON.stringify(nextLogs));

    const todayKey = getIstDateKey(new Date().toISOString());
    const todayLogs = nextLogs.filter((trade) => getIstDateKey(trade.createdAt) === todayKey);

    setTodayPlans(todayLogs.length);
    setTodaySlHits(todayLogs.filter((trade) => trade.status === 'SL Hit').length);
  };

  const addLiveTestEntry = () => {
    if (!settings.enabled) {
      setMessage('Live Test Mode is OFF. Enable it first ⚠️');
      return;
    }

    if (settings.maxQty > 1) {
      setMessage('Blocked: quantity must be 1 only ⚠️');
      return;
    }

    if (todayPlans >= settings.maxTradesPerDay) {
      setMessage('Blocked: daily live-test limit reached ⚠️');
      return;
    }

    if (todaySlHits >= settings.maxSlPerDay) {
      setMessage('Blocked: daily SL limit reached ⚠️');
      return;
    }

    if (!symbol.trim()) {
      setMessage('Enter symbol before logging live test ⚠️');
      return;
    }

    if (['FOMO', 'Revenge', 'Greedy', 'Confused'].includes(emotion)) {
      setMessage('Blocked: bad emotion selected. Do not execute live ⚠️');
      return;
    }

    const now = new Date().toISOString();

    const log: LiveTestLog = {
      id: `live-${symbol.trim().toUpperCase()}-${Date.now()}`,
      date: getIstDateKey(now),
      symbol: symbol.trim().toUpperCase(),
      mode: settings.mode,
      qty: 1,
      status: 'Entered',
      emotion,
      mistake,
      note: logNote,
      createdAt: now,
      updatedAt: now,
    };

    saveLogs([log, ...logs]);
    setMessage('Live test entry logged ✅ Manual Dhan execution only.');
  };

  const updateLiveTestStatus = (id: string, status: LiveTestLog['status']) => {
    const nextLogs = logs.map((log) =>
      log.id === id ? { ...log, status, updatedAt: new Date().toISOString() } : log
    );

    saveLogs(nextLogs);
    setMessage(`Live test marked ${status} ✅`);
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
            <a href="/paper/home" className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20">
              Workflow Home
            </a>
            <a href="/paper/startup" className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">
              Daily Startup
            </a>
            <a href="/paper/close" className="rounded-2xl border border-fuchsia-800 bg-fuchsia-500/10 px-5 py-3 text-sm font-bold text-fuchsia-300 hover:bg-fuchsia-500/20">
              Daily Close
            </a>
            <a href="/stocks" className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800">
              Stocks Research
            </a>
            <a href="/paper/discipline" className="rounded-2xl border border-red-900 bg-red-950/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-950/50">
              Discipline Lock
            </a>
            <a href="/paper/no-trade" className="rounded-2xl border border-lime-800 bg-lime-500/10 px-5 py-3 text-sm font-bold text-lime-300 hover:bg-lime-500/20">
              No-Trade Day
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
                <button
                  onClick={downloadLiveTestCsv}
                  className="rounded-2xl border border-orange-800 bg-orange-500/10 px-5 py-3 text-sm font-bold text-orange-300 hover:bg-orange-500/20"
                >
                  Download Live CSV
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-800 bg-cyan-500/10 p-6">
            <h2 className="text-2xl font-bold text-cyan-200">Live Test Entry Log</h2>
            <p className="mt-2 text-sm leading-6 text-cyan-100/80">
              Use this only after you manually execute 1 lot or 1 stock quantity in Dhan.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Symbol</span>
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  placeholder="Example: BAJFINANCE"
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-700"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Emotion</span>
                <select
                  value={emotion}
                  onChange={(event) => setEmotion(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-700"
                >
                  <option value="">Select emotion</option>
                  <option value="Calm">Calm</option>
                  <option value="Confident">Confident</option>
                  <option value="Patient">Patient</option>
                  <option value="FOMO">FOMO</option>
                  <option value="Revenge">Revenge</option>
                  <option value="Greedy">Greedy</option>
                  <option value="Confused">Confused</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Mistake Risk</span>
                <select
                  value={mistake}
                  onChange={(event) => setMistake(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-700"
                >
                  <option value="">No mistake selected</option>
                  <option value="No mistake">No mistake</option>
                  <option value="Entered early">Entered early</option>
                  <option value="Chased entry">Chased entry</option>
                  <option value="Ignored VWAP">Ignored VWAP</option>
                  <option value="Ignored rules">Ignored rules</option>
                  <option value="Oversized">Oversized</option>
                  <option value="Revenge trade">Revenge trade</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Note</span>
                <input
                  value={logNote}
                  onChange={(event) => setLogNote(event.target.value)}
                  placeholder="Why was this live test valid?"
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-700"
                />
              </label>
            </div>

            <button
              onClick={addLiveTestEntry}
              className="mt-5 rounded-2xl border border-cyan-800 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20"
            >
              Mark Live Test Entry
            </button>
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
        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Live Test Logs</h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Symbol</th>
                  <th className="px-3 py-3">Mode</th>
                  <th className="px-3 py-3">Qty</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Emotion</th>
                  <th className="px-3 py-3">Mistake</th>
                  <th className="px-3 py-3">Note</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-800">
                    <td className="px-3 py-4 text-slate-300">{log.date}</td>
                    <td className="px-3 py-4 font-bold text-white">{log.symbol}</td>
                    <td className="px-3 py-4 text-slate-300">{log.mode}</td>
                    <td className="px-3 py-4 text-yellow-300">{log.qty}</td>
                    <td className="px-3 py-4 text-slate-300">{log.status}</td>
                    <td className="px-3 py-4 text-slate-300">{log.emotion || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{log.mistake || '-'}</td>
                    <td className="px-3 py-4 text-slate-400">{log.note || '-'}</td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => updateLiveTestStatus(log.id, 'Target Hit')} className="rounded-xl border border-emerald-800 px-3 py-2 text-xs font-bold text-emerald-300">Target</button>
                        <button onClick={() => updateLiveTestStatus(log.id, 'SL Hit')} className="rounded-xl border border-red-900 px-3 py-2 text-xs font-bold text-red-300">SL</button>
                        <button onClick={() => updateLiveTestStatus(log.id, 'Cancelled')} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">Cancel</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      No live test logs yet.
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
