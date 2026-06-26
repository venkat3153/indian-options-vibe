'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, any>;

function getIstDateKey(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function DailyClosePage() {
  const [paperTrades, setPaperTrades] = useState<Row[]>([]);
  const [liveLogs, setLiveLogs] = useState<Row[]>([]);
  const [noTradeLogs, setNoTradeLogs] = useState<Row[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const todayKey = useMemo(() => getIstDateKey(new Date().toISOString()), []);

  useEffect(() => {
    try {
      const savedPaper = JSON.parse(window.localStorage.getItem('paperTrades') || '[]');
      const savedLive = JSON.parse(window.localStorage.getItem('liveTestLogs') || '[]');
      const savedNoTrade = JSON.parse(window.localStorage.getItem('noTradeLogs') || '[]');

      setPaperTrades(Array.isArray(savedPaper) ? savedPaper : []);
      setLiveLogs(Array.isArray(savedLive) ? savedLive : []);
      setNoTradeLogs(Array.isArray(savedNoTrade) ? savedNoTrade : []);
    } catch {
      setPaperTrades([]);
      setLiveLogs([]);
      setNoTradeLogs([]);
    }
  }, []);

  const todayPaper = paperTrades.filter((trade) => {
    const stamp = trade.createdAt || trade.updatedAt || trade.marketSnapshot?.savedAt;
    return getIstDateKey(stamp) === todayKey;
  });

  const todayLive = liveLogs.filter((log) => {
    const stamp = log.createdAt || log.updatedAt;
    return getIstDateKey(stamp) === todayKey;
  });

  const todayNoTrade = noTradeLogs.filter((log) => {
    const stamp = log.date || log.createdAt || log.updatedAt;
    return getIstDateKey(stamp) === todayKey || log.date === todayKey;
  });

  const liveOpen = todayLive.filter((log) => log.status === 'Entered').length;
  const liveTarget = todayLive.filter((log) => log.status === 'Target Hit').length;
  const liveSl = todayLive.filter((log) => log.status === 'SL Hit').length;
  const liveCancelled = todayLive.filter((log) => log.status === 'Cancelled').length;

  const badEmotion = [...todayLive, ...todayPaper].filter((row) =>
    ['FOMO', 'Fear', 'Revenge', 'Greedy', 'Confused'].includes(String(row.emotion || ''))
  ).length;

  const mistakes = [...todayLive, ...todayPaper].filter((row) =>
    ['Chased entry', 'Ignored VWAP', 'Ignored rules', 'Oversized', 'Moved stop', 'Revenge trade'].includes(String(row.mistake || ''))
  ).length;

  const closeReady =
    liveOpen === 0 &&
    (todayLive.length > 0 || todayNoTrade.length > 0 || todayPaper.length > 0);

  const copyCloseSummary = async () => {
    const lines = [
      `DAILY CLOSE REVIEW - ${todayKey} IST`,
      '',
      'LIVE TEST',
      `Live Tests: ${todayLive.length}`,
      `Open: ${liveOpen}`,
      `Target Hit: ${liveTarget}`,
      `SL Hit: ${liveSl}`,
      `Cancelled: ${liveCancelled}`,
      '',
      'DISCIPLINE',
      `Bad Emotion Count: ${badEmotion}`,
      `Mistake Count: ${mistakes}`,
      `No-Trade Logs: ${todayNoTrade.length}`,
      `Paper Plans: ${todayPaper.length}`,
      '',
      'FINAL CLOSE STATUS',
      closeReady ? 'DAY CAN BE CLOSED ✅' : 'DAY NOT CLEANLY CLOSED ⚠️',
      '',
      'Rule: Do not sleep with open/unreviewed live-test status.',
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setMessage('Daily close summary copied ✅');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Daily Close
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">End-of-Day Discipline Review</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Use this after market close. Do not end the day until live-test result, emotion, mistake, and review are complete.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="/paper/startup" className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">
              Daily Startup
            </a>
            <a href="/paper/live-test" className="rounded-2xl border border-cyan-800 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20">
              Live Test
            </a>
            <a href="/paper/today" className="rounded-2xl border border-yellow-800 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-300 hover:bg-yellow-500/20">
              Today Review
            </a>
            <a href="/paper/export" className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20">
              Export
            </a>
            <button
              onClick={copyCloseSummary}
              className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
            >
              Copy Close Summary
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {message}
          </div>
        ) : null}

        <div
          className={`mt-8 rounded-3xl border p-6 ${
            closeReady
              ? 'border-emerald-800 bg-emerald-500/10'
              : 'border-red-900 bg-red-950/20'
          }`}
        >
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Close Verdict</div>
          <h2 className={`mt-2 text-3xl font-black ${closeReady ? 'text-emerald-300' : 'text-red-300'}`}>
            {closeReady ? 'DAY CAN BE CLOSED' : 'DAY NOT CLEANLY CLOSED'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {closeReady
              ? 'Your day has a logged activity and no open live-test result pending.'
              : 'Fix open live-test results or add a no-trade/paper review before closing the day.'}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="IST Date" value={todayKey} />
          <Stat label="Live Tests" value={todayLive.length} />
          <Stat label="Open Live" value={liveOpen} tone={liveOpen > 0 ? 'loss' : 'win'} />
          <Stat label="Target Hit" value={liveTarget} tone="win" />
          <Stat label="SL Hit" value={liveSl} tone={liveSl > 0 ? 'loss' : undefined} />
          <Stat label="Cancelled" value={liveCancelled} />
          <Stat label="Bad Emotion" value={badEmotion} tone={badEmotion > 0 ? 'loss' : 'win'} />
          <Stat label="Mistakes" value={mistakes} tone={mistakes > 0 ? 'loss' : 'win'} />
          <Stat label="No-Trade Logs" value={todayNoTrade.length} tone={todayNoTrade.length > 0 ? 'win' : undefined} />
          <Stat label="Paper Plans" value={todayPaper.length} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-cyan-800 bg-cyan-500/10 p-6">
            <h2 className="text-2xl font-bold text-cyan-200">Live Test Close Checklist</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-cyan-100/80">
              <Check ok={todayLive.length > 0 || todayNoTrade.length > 0} text="Today has either live-test log or no-trade log" />
              <Check ok={liveOpen === 0} text="No live-test entry remains open" />
              <Check ok={badEmotion === 0} text="No dangerous emotion logged" />
              <Check ok={mistakes === 0} text="No serious mistake logged" />
              <Check ok={todayNoTrade.length > 0 || todayLive.length > 0 || todayPaper.length > 0} text="Day has something to review" />
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-900/70 bg-yellow-950/10 p-6">
            <h2 className="text-2xl font-bold text-yellow-200">Teacher Rule</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-yellow-100/80">
              <p>1. If live test is open, update it as Target / SL / Cancel.</p>
              <p>2. If you avoided bad setup, log No-Trade Day.</p>
              <p>3. If you felt FOMO, record it honestly.</p>
              <p>4. Copy close summary after review.</p>
              <p>5. Export backup at least once per week.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Today Live Tests</h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Symbol</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Mode</th>
                  <th className="px-3 py-3">Qty</th>
                  <th className="px-3 py-3">Emotion</th>
                  <th className="px-3 py-3">Mistake</th>
                  <th className="px-3 py-3">Note</th>
                </tr>
              </thead>

              <tbody>
                {todayLive.map((log) => (
                  <tr key={log.id} className="border-t border-slate-800">
                    <td className="px-3 py-4 font-bold text-white">{log.symbol || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{log.status || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{log.mode || '-'}</td>
                    <td className="px-3 py-4 text-yellow-300">{log.qty || 1}</td>
                    <td className="px-3 py-4 text-slate-300">{log.emotion || '-'}</td>
                    <td className="px-3 py-4 text-slate-300">{log.mistake || '-'}</td>
                    <td className="px-3 py-4 text-slate-400">{log.note || '-'}</td>
                  </tr>
                ))}

                {todayLive.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      No live test logged today.
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
  tone?: 'win' | 'loss';
}) {
  const color = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-black ${color}`}>{value}</div>
    </div>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span>{ok ? '✅' : '⚠️'}</span>
      <span>{text}</span>
    </div>
  );
}
