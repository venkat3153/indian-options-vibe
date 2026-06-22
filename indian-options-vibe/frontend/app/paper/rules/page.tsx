'use client';

import { useEffect, useMemo, useState } from 'react';

type Rule = {
  id: string;
  title: string;
  text: string;
  hardBlock?: boolean;
};

const rules: Rule[] = [
  {
    id: 'market-breadth',
    title: 'Market Breadth',
    text: 'Breadth must not be weak. If breadth is weak, stock stays watch-only.',
    hardBlock: true,
  },
  {
    id: 'vwap',
    title: 'VWAP Gate',
    text: 'Price should not be below real VWAP for a fresh long plan. Wait for reclaim.',
    hardBlock: true,
  },
  {
    id: 'retest',
    title: 'Retest Quality',
    text: 'Retest must hold. If retest failed, wait until structure resets.',
    hardBlock: true,
  },
  {
    id: 'rr',
    title: '1:2 RR Room',
    text: 'Entry, stop, risk, and 2R target must be clear before saving a paper plan.',
    hardBlock: true,
  },
  {
    id: 'news',
    title: 'News Check',
    text: 'Check corporate news, result date, sector event, and broader market risk before live trading.',
  },
  {
    id: 'no-chase',
    title: 'No Chase',
    text: 'If price is extended near the top of the 20-day range, wait for pullback or retest.',
  },
  {
    id: 'limit',
    title: 'Daily Focus Limit',
    text: 'Keep today’s watchlist small. Too many open plans means quality is dropping.',
  },
  {
    id: 'execution',
    title: 'Execution Lock',
    text: 'This system is research + paper mode. No live orders until risk gates are complete.',
    hardBlock: true,
  },
];

export default function PaperRulesPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [rulesLoaded, setRulesLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('paperRulesChecklist') || '{}');
      setChecked(saved && typeof saved === 'object' ? saved : {});
    } catch {
      setChecked({});
    } finally {
      setRulesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!rulesLoaded) return;
    window.localStorage.setItem('paperRulesChecklist', JSON.stringify(checked));
  }, [checked, rulesLoaded]);

  const stats = useMemo(() => {
    const completed = rules.filter((rule) => checked[rule.id]).length;
    const hardBlocksPassed = rules.filter((rule) => rule.hardBlock).every((rule) => checked[rule.id]);
    const allPassed = completed === rules.length;

    return {
      completed,
      total: rules.length,
      hardBlocksPassed,
      allPassed,
      score: Math.round((completed / rules.length) * 100),
    };
  }, [checked]);

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const reset = () => setChecked({});

  const copyRulesSummary = async () => {
    const lines = [
      'Paper Trading Rules Checklist',
      `Completed: ${stats.completed}/${stats.total}`,
      `Score: ${stats.score}%`,
      `Hard Blocks: ${stats.hardBlocksPassed ? 'Passed' : 'Blocked'}`,
      `Trade Permission: ${stats.allPassed ? 'Paper OK' : 'Wait'}`,
      '',
      'Rules:',
      ...rules.map((rule) =>
        `${checked[rule.id] ? '✅' : '❌'} ${rule.title}${rule.hardBlock ? ' [Hard Block]' : ''} - ${rule.text}`
      ),
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    alert('Rules checklist summary copied ✅');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Paper Trading Rules
            </p>
            <h1 className="mt-2 text-4xl font-black text-white">Discipline Gate Checklist</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Use this before saving or acting on any paper trade. Hard-block rules must pass first.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/stocks"
              className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Stocks Research
            </a>
            <a
              href="/paper"
              className="rounded-2xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20"
            >
              Paper Trading
            </a>
            <a
              href="/paper/today"
              className="rounded-2xl border border-yellow-800 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-300 hover:bg-yellow-500/20"
            >
              Today Review
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="Completed" value={`${stats.completed}/${stats.total}`} />
          <Stat label="Score" value={`${stats.score}%`} />
          <Stat label="Hard Blocks" value={stats.hardBlocksPassed ? 'Passed' : 'Blocked'} tone={stats.hardBlocksPassed ? 'win' : 'loss'} />
          <Stat label="Trade Permission" value={stats.allPassed ? 'Paper OK' : 'Wait'} tone={stats.allPassed ? 'win' : 'warn'} />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Checklist</h2>
              <p className="mt-1 text-sm text-slate-400">
                Tick only what is truly confirmed. Do not tick based on hope.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={copyRulesSummary}
                className="rounded-2xl border border-purple-800 bg-purple-500/10 px-5 py-3 text-sm font-bold text-purple-300 hover:bg-purple-500/20"
              >
                Copy Summary
              </button>
              <button
                onClick={reset}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Reset Checklist
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {rules.map((rule) => (
              <button
                key={rule.id}
                onClick={() => toggle(rule.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  checked[rule.id]
                    ? 'border-emerald-800 bg-emerald-500/10'
                    : rule.hardBlock
                      ? 'border-red-900/70 bg-red-950/10 hover:bg-red-950/20'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{rule.title}</h3>
                      {rule.hardBlock ? (
                        <span className="rounded-full border border-red-900 bg-red-950/40 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">
                          Hard Block
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{rule.text}</p>
                  </div>

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                      checked[rule.id]
                        ? 'border-emerald-700 bg-emerald-500/20 text-emerald-300'
                        : 'border-slate-700 bg-slate-900 text-slate-500'
                    }`}
                  >
                    {checked[rule.id] ? '✓' : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-yellow-900/70 bg-yellow-950/10 p-6">
          <h2 className="text-2xl font-bold text-yellow-200">Teacher Rule</h2>
          <p className="mt-3 text-sm leading-7 text-yellow-100/80">
            If any hard-block rule is not confirmed, the trade is not a trade. It is only research.
            The goal is not more trades. The goal is clean trades, clean review, and clean discipline.
          </p>
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
  tone?: 'win' | 'loss' | 'warn';
}) {
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
