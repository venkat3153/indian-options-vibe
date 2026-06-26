'use client';

import { useEffect, useMemo, useState } from 'react';

type AnyRow = Record<string, any>;

function getIstDateKey(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function DailyStartupPage() {
  const [liveSettings, setLiveSettings] = useState<AnyRow | null>(null);
  const [liveLogs, setLiveLogs] = useState<AnyRow[]>([]);
  const [paperTrades, setPaperTrades] = useState<AnyRow[]>([]);
  const [noTradeLogs, setNoTradeLogs] = useState<AnyRow[]>([]);
  const [rules, setRules] = useState<AnyRow>({});
  const [dhanReadiness, setDhanReadiness] = useState<AnyRow>({});
  const [message, setMessage] = useState<string | null>(null);

  const todayKey = useMemo(() => getIstDateKey(new Date().toISOString()), []);

  useEffect(() => {
    try {
      const savedLiveSettings = JSON.parse(window.localStorage.getItem('liveTestSettings') || 'null');
      const savedLiveLogs = JSON.parse(window.localStorage.getItem('liveTestLogs') || '[]');
      const savedPaperTrades = JSON.parse(window.localStorage.getItem('paperTrades') || '[]');
      const savedNoTradeLogs = JSON.parse(window.localStorage.getItem('noTradeLogs') || '[]');
      const savedRules = JSON.parse(window.localStorage.getItem('paperRulesChecklist') || '{}');
      const savedDhanReadiness = JSON.parse(window.localStorage.getItem('dhanReadinessChecklist') || '{}');

      setLiveSettings(savedLiveSettings);
      setLiveLogs(Array.isArray(savedLiveLogs) ? savedLiveLogs : []);
      setPaperTrades(Array.isArray(savedPaperTrades) ? savedPaperTrades : []);
      setNoTradeLogs(Array.isArray(savedNoTradeLogs) ? savedNoTradeLogs : []);
      setRules(savedRules && typeof savedRules === 'object' ? savedRules : {});
      setDhanReadiness(savedDhanReadiness && typeof savedDhanReadiness === 'object' ? savedDhanReadiness : {});
    } catch {
      setLiveSettings(null);
      setLiveLogs([]);
      setPaperTrades([]);
      setNoTradeLogs([]);
      setRules({});
      setDhanReadiness({});
    }
  }, []);

  const todayLiveLogs = liveLogs.filter((log) => {
    const stamp = log.createdAt || log.updatedAt;
    return getIstDateKey(stamp) === todayKey;
  });

  const todayPaperTrades = paperTrades.filter((trade) => {
    const stamp = trade.createdAt || trade.updatedAt || trade.marketSnapshot?.savedAt;
    return getIstDateKey(stamp) === todayKey;
  });

  const todayNoTradeLogs = noTradeLogs.filter((log) => {
    const stamp = log.date || log.createdAt || log.updatedAt;
    return getIstDateKey(stamp) === todayKey || log.date === todayKey;
  });

  const todayLiveSlHits = todayLiveLogs.filter((log) =>
    String(log.status || '').toLowerCase().includes('sl')
  ).length;

  const maxLiveTrades = Number(liveSettings?.maxTradesPerDay || 1);
  const maxLiveSl = Number(liveSettings?.maxSlPerDay || 1);
  const maxQty = Number(liveSettings?.maxQty || 1);

  const hardRules: Record<string, string> = {
    'market-breadth': 'Market Breadth',
    vwap: 'VWAP Gate',
    retest: 'Retest Quality',
    rr: '1:2 RR Room',
    execution: 'Execution Lock',
  };

  const missingRules = Object.entries(hardRules)
    .filter(([id]) => !rules?.[id])
    .map(([, label]) => label);

  const dhanHardChecks: Record<string, string> = {
    'dhan-token': 'Dhan token updated',
    'backend-running': 'Backend running',
    'frontend-running': 'Frontend running',
    'dhan-feed': 'Dhan live feed connected',
    'manual-only': 'Manual execution only',
    'one-size': 'Only 1 lot / 1 quantity',
    'risk-budget': 'Daily risk budget checked',
    'final-permission': 'Final Live Permission required',
  };

  const missingDhanChecks = Object.entries(dhanHardChecks)
    .filter(([id]) => !dhanReadiness?.[id])
    .map(([, label]) => label);

  const dhanReady = missingDhanChecks.length === 0;

  const liveReady =
    Boolean(liveSettings?.enabled) &&
    maxQty === 1 &&
    todayLiveLogs.length < maxLiveTrades &&
    todayLiveSlHits < maxLiveSl;

  const rulesReady = missingRules.length === 0;

  const startupReady = liveReady && rulesReady && dhanReady;

  const copyStartupPlan = async () => {
    const lines = [
      `DAILY STARTUP CHECK - ${todayKey} IST`,
      ``,
      `LIVE TEST MODE`,
      `Enabled: ${liveSettings?.enabled ? 'YES' : 'NO'}`,
      `Max Qty/Lot: ${maxQty}`,
      `Today Live Tests: ${todayLiveLogs.length}/${maxLiveTrades}`,
      `Today Live SL Hits: ${todayLiveSlHits}/${maxLiveSl}`,
      `Live Ready: ${liveReady ? 'YES' : 'NO'}`,
      ``,
      `RULES GATE`,
      `Rules Ready: ${rulesReady ? 'YES' : 'NO'}`,
      `Missing Rules: ${missingRules.length > 0 ? missingRules.join(', ') : 'None'}`,
      ``,
      `TODAY LOGS`,
      `Paper Plans: ${todayPaperTrades.length}`,
      `Live Tests: ${todayLiveLogs.length}`,
      `No-Trade Logs: ${todayNoTradeLogs.length}`,
      ``,
      `FINAL STARTUP VERDICT`,
      `${startupReady ? 'READY FOR CONTROLLED 1 LOT / 1 QTY LIVE TEST' : 'NOT READY - FIX BLOCKERS FIRST'}`,
      ``,
      `Rule: No auto order. Manual Dhan execution only.`,
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setMessage('Daily startup summary copied ✅');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Daily Startup
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Pre-Market Control Room</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Open this page first before any live test. It checks whether you are ready for controlled 1 lot / 1 quantity testing.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="/paper/home" className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20">
              Workflow Home
            </a>
            <a href="/broker/dhan-readiness" className="rounded-2xl border border-orange-800 bg-orange-500/10 px-5 py-3 text-sm font-bold text-orange-300 hover:bg-orange-500/20">
              Dhan Readiness
            </a>
            <a href="/stocks" className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800">
              Stocks Research
            </a>
            <a href="/paper/close" className="rounded-2xl border border-fuchsia-800 bg-fuchsia-500/10 px-5 py-3 text-sm font-bold text-fuchsia-300 hover:bg-fuchsia-500/20">
              Daily Close
            </a>
            <a href="/paper/live-test" className="rounded-2xl border border-cyan-800 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20">
              Live Test
            </a>
            <a href="/paper/rules" className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20">
              Rules
            </a>
            <a href="/paper/today" className="rounded-2xl border border-yellow-800 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-300 hover:bg-yellow-500/20">
              Today Review
            </a>
            <button
              onClick={copyStartupPlan}
              className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
            >
              Copy Startup Summary
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
            startupReady
              ? 'border-emerald-800 bg-emerald-500/10'
              : 'border-red-900 bg-red-950/20'
          }`}
        >
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Startup Verdict</div>
          <h2 className={`mt-2 text-3xl font-black ${startupReady ? 'text-emerald-300' : 'text-red-300'}`}>
            {startupReady ? 'READY FOR CONTROLLED LIVE TEST' : 'NOT READY'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {startupReady
              ? 'You may only consider one controlled live test after stock detail Final Live Permission also allows it.'
              : 'Fix Live Test settings, Rules Gate, or daily limits before any live execution.'}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="IST Date" value={todayKey} />
          <Stat label="Live Tests Today" value={`${todayLiveLogs.length}/${maxLiveTrades}`} tone={todayLiveLogs.length >= maxLiveTrades ? 'loss' : 'win'} />
          <Stat label="Live SL Today" value={`${todayLiveSlHits}/${maxLiveSl}`} tone={todayLiveSlHits >= maxLiveSl ? 'loss' : 'win'} />
          <Stat label="Max Qty/Lot" value={maxQty} tone={maxQty === 1 ? 'win' : 'loss'} />
          <Stat label="Live Mode" value={liveSettings?.enabled ? 'ON' : 'OFF'} tone={liveSettings?.enabled ? 'win' : 'loss'} />
          <Stat label="Rules Missing" value={missingRules.length} tone={missingRules.length === 0 ? 'win' : 'loss'} />
          <Stat label="Dhan Ready" value={dhanReady ? 'YES' : 'NO'} tone={dhanReady ? 'win' : 'loss'} />
          <Stat label="Dhan Missing" value={missingDhanChecks.length} tone={dhanReady ? 'win' : 'loss'} />
          <Stat label="Paper Plans" value={todayPaperTrades.length} />
          <Stat label="No-Trade Logs" value={todayNoTradeLogs.length} tone={todayNoTradeLogs.length > 0 ? 'win' : undefined} />
        </div>

        <DailyRiskBudgetCard liveLogs={liveLogs} />

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-cyan-800 bg-cyan-500/10 p-6">
            <h2 className="text-2xl font-bold text-cyan-200">Live Test Readiness</h2>

            <div className="mt-5 space-y-3 text-sm leading-7 text-cyan-100/80">
              <Check ok={Boolean(liveSettings?.enabled)} text="Live Test Mode enabled" />
              <Check ok={maxQty === 1} text="Max quantity / lot is exactly 1" />
              <Check ok={todayLiveLogs.length < maxLiveTrades} text="Daily live-test entry limit not reached" />
              <Check ok={todayLiveSlHits < maxLiveSl} text="Daily live-test SL limit not reached" />
              <Check ok={rulesReady} text="Hard-block Rules Gate complete" />
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-900/70 bg-yellow-950/10 p-6">
            <h2 className="text-2xl font-bold text-yellow-200">Today&apos;s Rule</h2>

            <div className="mt-5 space-y-3 text-sm leading-7 text-yellow-100/80">
              <p>1. Open this page before scanning.</p>
              <p>2. Fix Rules Gate before any live test.</p>
              <p>3. Trade only if stock detail Final Live Permission says ALLOWED.</p>
              <p>4. Execute manually in Dhan only.</p>
              <p>5. After one live test, stop. Review the result.</p>
              <p>6. If no A+ setup, log a No-Trade Day.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Startup Blockers</h2>

          <div className="mt-5 space-y-3">
            {!liveSettings?.enabled ? <Blocker text="Live Test Mode is OFF." href="/paper/live-test" label="Open Live Test" /> : null}
            {maxQty !== 1 ? <Blocker text="Max quantity must be exactly 1." href="/paper/live-test" label="Fix Live Test" /> : null}
            {todayLiveLogs.length >= maxLiveTrades ? <Blocker text={`Daily live-test limit reached: ${todayLiveLogs.length}/${maxLiveTrades}.`} href="/paper/today" label="Today Review" /> : null}
            {todayLiveSlHits >= maxLiveSl ? <Blocker text={`Daily SL limit reached: ${todayLiveSlHits}/${maxLiveSl}.`} href="/paper/today" label="Today Review" /> : null}
            {missingRules.length > 0 ? <Blocker text={`Rules missing: ${missingRules.join(', ')}.`} href="/paper/rules" label="Open Rules" /> : null}
            {missingDhanChecks.length > 0 ? <Blocker text={`Dhan readiness missing: ${missingDhanChecks.join(', ')}.`} href="/broker/dhan-readiness" label="Dhan Readiness" /> : null}

            {startupReady ? (
              <div className="rounded-2xl border border-emerald-800 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
                No startup blockers. Continue to Stocks Research.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}


function DailyRiskBudgetCard({ liveLogs }: { liveLogs: Record<string, any>[] }) {
  const [maxDailyLoss, setMaxDailyLoss] = useState(500);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem('liveTestMaxDailyLoss') || 500);
      setMaxDailyLoss(Number.isFinite(saved) && saved > 0 ? saved : 500);
    } catch {
      setMaxDailyLoss(500);
    }
  }, []);

  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const todayLogs = liveLogs.filter((log) => {
    const stamp = log.createdAt || log.updatedAt;
    const date = stamp ? new Date(String(stamp)) : new Date();
    if (Number.isNaN(date.getTime())) return false;
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === todayKey;
  });

  const livePnl = todayLogs.reduce((sum, log) => {
    const value = Number(log.pnl);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  const remainingRisk = maxDailyLoss + livePnl;
  const stopped = livePnl <= -maxDailyLoss;

  return (
    <div
      className={`mt-8 rounded-3xl border p-6 ${
        stopped ? 'border-red-900 bg-red-950/20' : 'border-emerald-800 bg-emerald-500/10'
      }`}
    >
      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Daily Risk Budget</div>
      <h2 className={`mt-2 text-3xl font-black ${stopped ? 'text-red-300' : 'text-emerald-300'}`}>
        {stopped ? 'STOP FOR TODAY' : 'RISK OK'}
      </h2>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Today Live P&L</div>
          <div className={`mt-2 text-xl font-black ${livePnl < 0 ? 'text-red-300' : livePnl > 0 ? 'text-emerald-300' : 'text-white'}`}>
            ₹{livePnl.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Max Daily Loss</div>
          <div className="mt-2 text-xl font-black text-red-300">₹{maxDailyLoss.toLocaleString('en-IN')}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Remaining Risk</div>
          <div className={`mt-2 text-xl font-black ${remainingRisk <= 0 ? 'text-red-300' : 'text-yellow-300'}`}>
            ₹{remainingRisk.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Rule</div>
          <div className="mt-2 text-xl font-black text-white">1 trade / day</div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">
        If today&apos;s live P&L reaches -₹{maxDailyLoss.toLocaleString('en-IN')}, no more live tests. Log review and close the day.
      </p>
    </div>
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

function Blocker({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-red-900 bg-red-950/20 p-4 md:flex-row md:items-center">
      <div className="text-sm font-bold text-red-300">⚠️ {text}</div>
      <a href={href} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-900">
        {label}
      </a>
    </div>
  );
}
