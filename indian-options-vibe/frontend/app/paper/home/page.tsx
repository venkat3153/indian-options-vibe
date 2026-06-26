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

export default function TradingWorkflowHomePage() {
  const [liveSettings, setLiveSettings] = useState<Row | null>(null);
  const [liveLogs, setLiveLogs] = useState<Row[]>([]);
  const [paperTrades, setPaperTrades] = useState<Row[]>([]);
  const [noTradeLogs, setNoTradeLogs] = useState<Row[]>([]);
  const [rules, setRules] = useState<Row>({});
  const [dhanReadiness, setDhanReadiness] = useState<Row>({});
  const [dhanReadinessDate, setDhanReadinessDate] = useState('');

  const todayKey = useMemo(() => getIstDateKey(new Date().toISOString()), []);

  useEffect(() => {
    try {
      const savedLiveSettings = JSON.parse(window.localStorage.getItem('liveTestSettings') || 'null');
      const savedLiveLogs = JSON.parse(window.localStorage.getItem('liveTestLogs') || '[]');
      const savedPaperTrades = JSON.parse(window.localStorage.getItem('paperTrades') || '[]');
      const savedNoTradeLogs = JSON.parse(window.localStorage.getItem('noTradeLogs') || '[]');
      const savedRules = JSON.parse(window.localStorage.getItem('paperRulesChecklist') || '{}');
      const savedDhanReadiness = JSON.parse(window.localStorage.getItem('dhanReadinessChecklist') || '{}');
      const savedDhanReadinessDate = window.localStorage.getItem('dhanReadinessDate') || '';

      setLiveSettings(savedLiveSettings);
      setLiveLogs(Array.isArray(savedLiveLogs) ? savedLiveLogs : []);
      setPaperTrades(Array.isArray(savedPaperTrades) ? savedPaperTrades : []);
      setNoTradeLogs(Array.isArray(savedNoTradeLogs) ? savedNoTradeLogs : []);
      setRules(savedRules && typeof savedRules === 'object' ? savedRules : {});
      setDhanReadiness(savedDhanReadiness && typeof savedDhanReadiness === 'object' ? savedDhanReadiness : {});
      setDhanReadinessDate(savedDhanReadinessDate);
    } catch {
      setLiveSettings(null);
      setLiveLogs([]);
      setPaperTrades([]);
      setNoTradeLogs([]);
      setRules({});
      setDhanReadiness({});
      setDhanReadinessDate('');
    }
  }, []);

  const todayLiveLogs = liveLogs.filter((log) => getIstDateKey(log.createdAt || log.updatedAt) === todayKey);
  const todayPaperTrades = paperTrades.filter((trade) =>
    getIstDateKey(trade.createdAt || trade.updatedAt || trade.marketSnapshot?.savedAt) === todayKey
  );
  const todayNoTradeLogs = noTradeLogs.filter((log) => {
    const stamp = log.date || log.createdAt || log.updatedAt;
    return getIstDateKey(stamp) === todayKey || log.date === todayKey;
  });

  const hardRules = ['market-breadth', 'vwap', 'retest', 'rr', 'execution'];
  const missingRules = hardRules.filter((id) => !rules?.[id]).length;

  const liveSlHits = todayLiveLogs.filter((log) =>
    String(log.status || '').toLowerCase().includes('sl')
  ).length;

  const liveOpen = todayLiveLogs.filter((log) => log.status === 'Entered').length;
  const livePnl = todayLiveLogs.reduce((sum, log) => {
    const value = Number(log.pnl);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

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

  const dhanReady = missingDhanChecks.length === 0 && dhanReadinessDate === todayKey;

  const liveEnabled = Boolean(liveSettings?.enabled);
  const maxQtyOk = Number(liveSettings?.maxQty || 1) === 1;
  const liveLimitOk = todayLiveLogs.length < Number(liveSettings?.maxTradesPerDay || 1);
  const liveSlOk = liveSlHits < Number(liveSettings?.maxSlPerDay || 1);
  const rulesOk = missingRules === 0;

  const readyForScan = liveEnabled && maxQtyOk && liveLimitOk && liveSlOk && rulesOk && dhanReady;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Trading Workflow Home
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Personal Live-Test Command Center</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Use this as your main dashboard. Start here, scan only when ready, and close the day after review.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="/broker/dhan-readiness" className="rounded-2xl border border-orange-800 bg-orange-500/10 px-5 py-3 text-sm font-bold text-orange-300 hover:bg-orange-500/20">
              1. Dhan Readiness
            </a>
            <a href="/paper/startup" className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">
              2. Daily Startup
            </a>
            <a href="/stocks" className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800">
              3. Stocks Research
            </a>
            <a href="/paper/live-test" className="rounded-2xl border border-cyan-800 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20">
              4. Live Test
            </a>
            <a href="/paper/close" className="rounded-2xl border border-fuchsia-800 bg-fuchsia-500/10 px-5 py-3 text-sm font-bold text-fuchsia-300 hover:bg-fuchsia-500/20">
              5. Daily Close
            </a>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-cyan-800 bg-cyan-500/10 p-6">
          <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">July Mode Active</div>
          <h2 className="mt-2 text-3xl font-black text-white">Manual Dhan Controlled Live Test</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Execution</div>
              <div className="mt-2 text-lg font-black text-cyan-300">Manual Only</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Size</div>
              <div className="mt-2 text-lg font-black text-yellow-300">1 Lot / 1 Qty</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Auto Order</div>
              <div className="mt-2 text-lg font-black text-red-300">Disabled</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Permission</div>
              <div className="mt-2 text-lg font-black text-emerald-300">Required</div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-cyan-100/80">
            This version is for personal July testing only. The system can say ALLOWED or BLOCKED, but you still execute manually in Dhan.
          </p>
        </div>

        <div
          className={`mt-8 rounded-3xl border p-6 ${
            readyForScan ? 'border-emerald-800 bg-emerald-500/10' : 'border-red-900 bg-red-950/20'
          }`}
        >
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Main Verdict</div>
          <h2 className={`mt-2 text-3xl font-black ${readyForScan ? 'text-emerald-300' : 'text-red-300'}`}>
            {readyForScan ? 'READY TO SCAN' : 'FIX BLOCKERS FIRST'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {readyForScan
              ? 'You may open Stocks Research. Final stock-level permission still must say ALLOWED before any manual Dhan execution.'
              : 'Do not scan for live execution yet. Fix Live Test, Rules Gate, or daily limit blockers first.'}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="IST Date" value={todayKey} />
          <Stat label="Live Mode" value={liveEnabled ? 'ON' : 'OFF'} tone={liveEnabled ? 'win' : 'loss'} />
          <Stat label="Rules Missing" value={missingRules} tone={missingRules === 0 ? 'win' : 'loss'} />
          <Stat label="Dhan Ready" value={dhanReady ? 'YES' : 'NO'} tone={dhanReady ? 'win' : 'loss'} />
          <Stat label="Dhan Date" value={dhanReadinessDate || '-'} tone={dhanReadinessDate === todayKey ? 'win' : 'loss'} />
          <Stat label="Dhan Missing" value={missingDhanChecks.length} tone={dhanReady ? 'win' : 'loss'} />
          <Stat label="Max Qty" value={Number(liveSettings?.maxQty || 1)} tone={maxQtyOk ? 'win' : 'loss'} />
          <Stat label="Live Tests" value={`${todayLiveLogs.length}/${Number(liveSettings?.maxTradesPerDay || 1)}`} tone={liveLimitOk ? 'win' : 'loss'} />
          <Stat label="Live SL" value={`${liveSlHits}/${Number(liveSettings?.maxSlPerDay || 1)}`} tone={liveSlOk ? 'win' : 'loss'} />
          <Stat label="Open Live" value={liveOpen} tone={liveOpen === 0 ? 'win' : 'loss'} />
          <Stat label="Live P&L" value={livePnl ? livePnl.toLocaleString('en-IN') : '-'} tone={livePnl > 0 ? 'win' : livePnl < 0 ? 'loss' : undefined} />
          <Stat label="No-Trade Logs" value={todayNoTradeLogs.length} tone={todayNoTradeLogs.length > 0 ? 'win' : undefined} />
          <Stat label="Paper Plans" value={todayPaperTrades.length} />
        </div>

        <DailyRiskBudgetCard liveLogs={liveLogs} />

        <section className="mt-8">
          <div className="text-xs uppercase tracking-[0.22em] text-emerald-300">Primary Daily Flow</div>
          <h2 className="mt-2 text-2xl font-black text-white">Use only these during market hours</h2>

          <div className="mt-5 grid gap-6 lg:grid-cols-5">
            <WorkflowCard
              title="1. Dhan Ready"
              text="Token, backend, frontend, feed, and manual-only safety."
              href="/broker/dhan-readiness"
              label="Open"
              tone="orange"
            />
            <WorkflowCard
              title="2. Startup"
              text="Confirm day readiness before scanning."
              href="/paper/startup"
              label="Open"
              tone="green"
            />
            <WorkflowCard
              title="3. Research"
              text="Scan only after readiness is clear."
              href="/stocks"
              label="Open"
              tone="slate"
            />
            <WorkflowCard
              title="4. Live Test"
              text="Record only 1 lot or 1 quantity manual Dhan test."
              href="/paper/live-test"
              label="Open"
              tone="cyan"
            />
            <WorkflowCard
              title="5. Close"
              text="End the day only after result review is complete."
              href="/paper/close"
              label="Open"
              tone="fuchsia"
            />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Tools / Review</div>
          <h2 className="mt-2 text-2xl font-black text-white">Use only after main flow</h2>

          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/paper/rules" className="rounded-xl border border-purple-800 bg-purple-500/10 px-4 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20">Rules</a>
            <a href="/paper/discipline" className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-950/50">Discipline</a>
            <a href="/paper/no-trade" className="rounded-xl border border-lime-800 bg-lime-500/10 px-4 py-3 text-sm font-bold text-lime-300 hover:bg-lime-500/20">No-Trade</a>
            <a href="/paper/today" className="rounded-xl border border-yellow-800 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-300 hover:bg-yellow-500/20">Today Review</a>
            <a href="/paper/weekly" className="rounded-xl border border-orange-800 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-300 hover:bg-orange-500/20">Weekly Review</a>
            <a href="/paper/export" className="rounded-xl border border-blue-800 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20">Export / Backup</a>
          </div>
        </section>

        <div className="mt-8 rounded-3xl border border-yellow-900/70 bg-yellow-950/10 p-6">
          <h2 className="text-2xl font-bold text-yellow-200">Today’s Operating Rule</h2>
          <div className="mt-5 space-y-3 text-sm leading-7 text-yellow-100/80">
            <p>1. Start from Daily Startup.</p>
            <p>2. Use Stocks Research only if READY TO SCAN.</p>
            <p>3. Execute manually in Dhan only if stock detail Final Live Permission says ALLOWED.</p>
            <p>4. After one live test, stop and review.</p>
            <p>5. If setup is not A+, log No-Trade Day.</p>
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

function WorkflowCard({
  title,
  text,
  href,
  label,
  tone,
}: {
  title: string;
  text: string;
  href: string;
  label: string;
  tone: 'green' | 'purple' | 'cyan' | 'slate' | 'lime' | 'fuchsia' | 'orange';
}) {
  const color =
    tone === 'green'
      ? 'border-emerald-800 bg-emerald-500/10 text-emerald-300'
      : tone === 'purple'
        ? 'border-purple-800 bg-purple-500/10 text-purple-300'
        : tone === 'cyan'
          ? 'border-cyan-800 bg-cyan-500/10 text-cyan-300'
          : tone === 'lime'
            ? 'border-lime-800 bg-lime-500/10 text-lime-300'
            : tone === 'fuchsia'
              ? 'border-fuchsia-800 bg-fuchsia-500/10 text-fuchsia-300'
              : tone === 'orange'
                ? 'border-orange-800 bg-orange-500/10 text-orange-300'
                : 'border-slate-800 bg-slate-900/70 text-slate-200';

  return (
    <div className={`rounded-3xl border p-6 ${color}`}>
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 opacity-90">{text}</p>
      <a
        href={href}
        className="mt-5 inline-block rounded-2xl border border-slate-700 bg-slate-950/50 px-5 py-3 text-sm font-bold text-slate-100 hover:bg-slate-900"
      >
        {label}
      </a>
    </div>
  );
}
