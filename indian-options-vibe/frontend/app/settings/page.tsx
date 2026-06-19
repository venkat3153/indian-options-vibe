import { SystemStatusPanel } from '@/components/SystemStatusPanel';

export default function SettingsPage() {
  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Settings</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">System Settings</h1>
          <p className="mt-2 max-w-3xl text-slate-400">Check backend connection, paper mode, and live-order lock status before using the screener or agent.</p>
        </div>

        <div className="mt-8">
          <SystemStatusPanel />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-bold text-white">Risk Defaults</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <RiskCard label="Mode" value="Paper" hint="Live orders disabled" />
            <RiskCard label="Max Trades" value="3/day" hint="Discipline default" />
            <RiskCard label="Daily Loss" value="₹2,000" hint="Paper risk guard" />
            <RiskCard label="No Trade After" value="2:30 PM" hint="IST session rule" />
          </div>
        </div>
      </div>
    </section>
  );
}

function RiskCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}
