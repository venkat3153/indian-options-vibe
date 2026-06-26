'use client';

import { useEffect, useMemo, useState } from 'react';

type NoTradeLog = {
  id: string;
  date: string;
  reason: string;
  emotion: string;
  note: string;
  createdAt: string;
};

function getIstDateKey(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function NoTradeDayPage() {
  const [logs, setLogs] = useState<NoTradeLog[]>([]);
  const [reason, setReason] = useState('');
  const [emotion, setEmotion] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const todayKey = useMemo(() => getIstDateKey(new Date().toISOString()), []);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('noTradeLogs') || '[]');
      setLogs(Array.isArray(saved) ? saved : []);
    } catch {
      setLogs([]);
    }
  }, []);

  const todayLog = logs.find((log) => log.date === todayKey);

  useEffect(() => {
    if (todayLog) {
      setReason(todayLog.reason || '');
      setEmotion(todayLog.emotion || '');
      setNote(todayLog.note || '');
    }
  }, [todayLog]);

  const saveNoTradeDay = () => {
    const log: NoTradeLog = {
      id: todayLog?.id || `no-trade-${todayKey}-${Date.now()}`,
      date: todayKey,
      reason,
      emotion,
      note,
      createdAt: todayLog?.createdAt || new Date().toISOString(),
    };

    const nextLogs = todayLog
      ? logs.map((item) => (item.date === todayKey ? log : item))
      : [log, ...logs];

    setLogs(nextLogs);
    window.localStorage.setItem('noTradeLogs', JSON.stringify(nextLogs));
    setMessage('No-trade day saved ✅');
  };

  const clearToday = () => {
    const nextLogs = logs.filter((log) => log.date !== todayKey);
    setLogs(nextLogs);
    window.localStorage.setItem('noTradeLogs', JSON.stringify(nextLogs));
    setReason('');
    setEmotion('');
    setNote('');
    setMessage('Today no-trade log cleared');
  };

  const copySummary = async () => {
    const lines = [
      `No-Trade Day Log - ${todayKey} IST`,
      `Reason: ${reason || '-'}`,
      `Emotion: ${emotion || '-'}`,
      `Note: ${note || '-'}`,
      '',
      'Teacher reminder: No trade is also a valid trading decision when conditions are not clean.',
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setMessage('No-trade summary copied ✅');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              No-Trade Day
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Log a Discipline Win</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Use this when the best trade is no trade. This helps you reward discipline instead of forcing entries.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="/paper/startup" className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">
              Daily Startup
            </a>
            <a href="/stocks" className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800">
              Stocks Research
            </a>
            <a href="/paper" className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20">
              Paper Trading
            </a>
            <a href="/paper/discipline" className="rounded-2xl border border-red-900 bg-red-950/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-950/50">
              Discipline Lock
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

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-2xl font-bold text-white">Today&apos;s No-Trade Log</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Date: <span className="font-bold text-white">{todayKey}</span>
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Reason</span>
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-700"
                >
                  <option value="">Select reason</option>
                  <option value="Market breadth weak">Market breadth weak</option>
                  <option value="No clean 1:2 RR">No clean 1:2 RR</option>
                  <option value="VWAP/retest not valid">VWAP/retest not valid</option>
                  <option value="Too emotional">Too emotional</option>
                  <option value="Daily limit hit">Daily limit hit</option>
                  <option value="Cooldown active">Cooldown active</option>
                  <option value="No A+ setup">No A+ setup</option>
                  <option value="Personal reason">Personal reason</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Emotion</span>
                <select
                  value={emotion}
                  onChange={(event) => setEmotion(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-700"
                >
                  <option value="">Select emotion</option>
                  <option value="Calm">Calm</option>
                  <option value="Patient">Patient</option>
                  <option value="FOMO controlled">FOMO controlled</option>
                  <option value="Frustrated but controlled">Frustrated but controlled</option>
                  <option value="Tired">Tired</option>
                  <option value="Distracted">Distracted</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Review Note</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Why was not trading the correct decision today?"
                  className="mt-2 min-h-32 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-700"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveNoTradeDay}
                  className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
                >
                  Save No-Trade Day
                </button>
                <button
                  onClick={copySummary}
                  className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
                >
                  Copy Summary
                </button>
                <button
                  onClick={clearToday}
                  className="rounded-2xl border border-red-900 bg-red-950/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-950/50"
                >
                  Clear Today
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-900/70 bg-yellow-950/10 p-6">
            <h2 className="text-2xl font-bold text-yellow-200">Teacher Reminder</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-yellow-100/80">
              <p>1. No trade is not a missed opportunity. It is a capital protection decision.</p>
              <p>2. If rules are blocked, saving no-trade day is better than forcing a paper plan.</p>
              <p>3. You win the day when you avoid revenge, FOMO, and low-quality entries.</p>
              <p>4. A discipline win should be recorded, not ignored.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Recent No-Trade Logs</h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Reason</th>
                  <th className="px-3 py-3">Emotion</th>
                  <th className="px-3 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="border-t border-slate-800">
                    <td className="px-3 py-4 font-bold text-white">{log.date}</td>
                    <td className="px-3 py-4 text-slate-300">{log.reason || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{log.emotion || '-'}</td>
                    <td className="px-3 py-4 text-slate-400">{log.note || '-'}</td>
                  </tr>
                ))}

                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      No no-trade logs yet.
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
