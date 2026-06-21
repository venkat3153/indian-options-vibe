'use client';

export function RiskRewardRule() {
  return <section className="px-8 pb-6 md:px-12">
    <div className="mx-auto max-w-7xl rounded-3xl border border-emerald-900 bg-emerald-950/20 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Risk Reward Rule</div>
          <h2 className="mt-2 text-2xl font-bold text-white">Minimum 1:2 RR only</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            A setup is not trade-ready unless the planned target is at least 2x the stop risk. This overrides older 1:1.5 wording and keeps the system focused on clean entries, retests, and discipline.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-700 bg-emerald-500/10 px-6 py-4 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">Default RR</div>
          <div className="mt-1 text-3xl font-bold text-white">1:2</div>
          <div className="mt-1 text-xs text-slate-400">Risk 1 to make 2</div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <RuleBox title="Entry" text="Wait for retest or structure confirmation. No chase entry if RR becomes weak." />
        <RuleBox title="Stop" text="Stop/invalidation must be clear before planning the target." tone="loss" />
        <RuleBox title="Target" text="Target must be minimum 2R. If target is less than 2R, skip the trade." tone="win" />
      </div>
    </div>
  </section>;
}

function RuleBox({ title, text, tone }: { title: string; text: string; tone?: 'win' | 'loss' }) {
  const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
    <div className={`text-xs font-bold uppercase tracking-[0.16em] ${cls}`}>{title}</div>
    <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
  </div>;
}
