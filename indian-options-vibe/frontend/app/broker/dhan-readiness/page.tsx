'use client';

import { useEffect, useMemo, useState } from 'react';

type CheckItem = {
  id: string;
  title: string;
  description: string;
  hard: boolean;
};

const CHECKS: CheckItem[] = [
  {
    id: 'dhan-token',
    title: 'Dhan token updated',
    description: 'Confirm backend .env has the latest Dhan token/key before market use.',
    hard: true,
  },
  {
    id: 'backend-running',
    title: 'Backend running',
    description: 'FastAPI backend must be running on port 8000.',
    hard: true,
  },
  {
    id: 'frontend-running',
    title: 'Frontend running',
    description: 'Next.js frontend must be running on port 3000.',
    hard: true,
  },
  {
    id: 'dhan-feed',
    title: 'Dhan live feed connected',
    description: 'Stocks Research page should show live feed connected / LTP snapshots.',
    hard: true,
  },
  {
    id: 'manual-only',
    title: 'Manual execution only',
    description: 'No auto order. App gives ALLOWED/BLOCKED. You execute manually in Dhan.',
    hard: true,
  },
  {
    id: 'one-size',
    title: 'Only 1 lot / 1 quantity',
    description: 'Live Test settings must stay max quantity = 1.',
    hard: true,
  },
  {
    id: 'risk-budget',
    title: 'Daily risk budget checked',
    description: 'Max daily loss must be set and understood before first live test.',
    hard: true,
  },
  {
    id: 'final-permission',
    title: 'Final Live Permission required',
    description: 'Stock detail page must say ALLOWED before any manual Dhan execution.',
    hard: true,
  },
];

function getIstDateKey(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function DhanReadinessPage() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  const todayKey = useMemo(() => getIstDateKey(new Date().toISOString()), []);

  useEffect(() => {
    try {
      const savedDate = window.localStorage.getItem('dhanReadinessDate');
      const today = getIstDateKey(new Date().toISOString());

      if (savedDate !== today) {
        window.localStorage.setItem('dhanReadinessChecklist', JSON.stringify({}));
    window.localStorage.setItem('dhanReadinessDate', todayKey);
        window.localStorage.setItem('dhanReadinessDate', today);
        setChecks({});
        return;
      }

      const saved = JSON.parse(window.localStorage.getItem('dhanReadinessChecklist') || '{}');
      setChecks(saved && typeof saved === 'object' ? saved : {});
    } catch {
      setChecks({});
    }
  }, []);

  const toggleCheck = (id: string) => {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    window.localStorage.setItem('dhanReadinessChecklist', JSON.stringify(next));
    window.localStorage.setItem('dhanReadinessDate', todayKey);
  };

  const resetChecks = () => {
    setChecks({});
    window.localStorage.setItem('dhanReadinessChecklist', JSON.stringify({}));
    setMessage('Dhan readiness checklist reset ✅');
  };

  const completed = CHECKS.filter((item) => checks[item.id]).length;
  const hardMissing = CHECKS.filter((item) => item.hard && !checks[item.id]);
  const score = Math.round((completed / CHECKS.length) * 100);
  const ready = hardMissing.length === 0;

  const copyReadiness = async () => {
    const lines = [
      `DHAN READINESS CHECK - ${todayKey} IST`,
      ``,
      `Status: ${ready ? 'READY FOR MANUAL LIVE TEST' : 'NOT READY'}`,
      `Score: ${score}/100`,
      `Completed: ${completed}/${CHECKS.length}`,
      ``,
      `Missing:`,
      ...(hardMissing.length > 0 ? hardMissing.map((item) => `- ${item.title}`) : ['- None']),
      ``,
      `Rule: No auto order. Manual Dhan execution only.`,
      `Rule: Only 1 lot option or 1 stock quantity.`,
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    setMessage('Dhan readiness summary copied ✅');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Broker Safety
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Dhan Readiness Checklist</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Use this before any real 1 lot / 1 quantity test. This page does not place orders.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="/paper/home" className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20">
              Workflow Home
            </a>
            <a href="/paper/startup" className="rounded-2xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">
              Daily Startup
            </a>
            <a href="/stocks" className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800">
              Stocks Research
            </a>
            <button
              onClick={copyReadiness}
              className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
            >
              Copy Summary
            </button>
            <button
              onClick={resetChecks}
              className="rounded-2xl border border-red-900 bg-red-950/30 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-950/50"
            >
              Reset
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
            ready ? 'border-emerald-800 bg-emerald-500/10' : 'border-red-900 bg-red-950/20'
          }`}
        >
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Dhan Readiness Verdict</div>
          <h2 className={`mt-2 text-3xl font-black ${ready ? 'text-emerald-300' : 'text-red-300'}`}>
            {ready ? 'READY FOR MANUAL LIVE TEST' : 'NOT READY'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {ready
              ? 'Dhan readiness checklist is complete. Still execute manually only after stock detail Final Live Permission says ALLOWED.'
              : 'Do not execute live yet. Complete all hard checks first.'}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="IST Date" value={todayKey} />
          <Stat label="Completed" value={`${completed}/${CHECKS.length}`} tone={ready ? 'win' : undefined} />
          <Stat label="Score" value={`${score}%`} tone={score === 100 ? 'win' : 'loss'} />
          <Stat label="Hard Blocks" value={hardMissing.length} tone={hardMissing.length === 0 ? 'win' : 'loss'} />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Checklist</h2>
          <p className="mt-2 text-sm text-slate-400">
            Tick only when actually confirmed. Do not tick based on hope.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {CHECKS.map((item) => {
              const ok = Boolean(checks[item.id]);

              return (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    ok
                      ? 'border-emerald-800 bg-emerald-500/10'
                      : item.hard
                        ? 'border-red-900 bg-red-950/20'
                        : 'border-slate-800 bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-white">{item.title}</h3>
                        {item.hard ? (
                          <span className="rounded-full border border-red-800 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-300">
                            Hard Block
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
                    </div>

                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                        ok
                          ? 'border-emerald-700 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-700 bg-slate-900 text-slate-500'
                      }`}
                    >
                      {ok ? '✓' : ''}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-yellow-900/70 bg-yellow-950/10 p-6">
          <h2 className="text-2xl font-bold text-yellow-200">Dhan Execution Rule</h2>
          <div className="mt-5 space-y-3 text-sm leading-7 text-yellow-100/80">
            <p>1. This app does not place orders.</p>
            <p>2. You manually execute only after Final Live Permission says ALLOWED.</p>
            <p>3. Size stays 1 lot option or 1 stock quantity.</p>
            <p>4. After one live entry, system blocks more live tests for the day.</p>
            <p>5. If token/feed is doubtful, no live test.</p>
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
