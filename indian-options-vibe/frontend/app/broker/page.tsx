import { SystemStatusPanel } from '@/components/SystemStatusPanel';

type Broker = {
  name: string;
  envPrefix: string;
  priority: string;
  status: 'Ready for adapter' | 'Planned';
  readOnly: string[];
  notes: string;
};

const brokers: Broker[] = [
  {
    name: 'Dhan',
    envPrefix: 'DHAN',
    priority: 'First broker to connect',
    status: 'Ready for adapter',
    readOnly: ['Profile', 'Funds', 'Positions', 'Orders'],
    notes: 'Good first choice for your single-user MVP. We will test read-only APIs before enabling any execution module.',
  },
  {
    name: 'Angel One SmartAPI',
    envPrefix: 'ANGEL',
    priority: 'Second broker',
    status: 'Planned',
    readOnly: ['Profile', 'Funds', 'Holdings', 'Orders'],
    notes: 'Add after Dhan adapter pattern is stable. Needs careful token/session handling.',
  },
  {
    name: 'Upstox',
    envPrefix: 'UPSTOX',
    priority: 'Third broker',
    status: 'Planned',
    readOnly: ['Profile', 'Funds', 'Positions', 'Orders'],
    notes: 'Useful after the core broker interface is stable.',
  },
  {
    name: 'Zerodha Kite',
    envPrefix: 'ZERODHA',
    priority: 'Later broker',
    status: 'Planned',
    readOnly: ['Profile', 'Margins', 'Positions', 'Orders'],
    notes: 'Strong ecosystem, but add later after the first adapter is tested.',
  },
];

const riskRules = [
  'Live order buttons stay locked until read-only broker checks pass.',
  'No fully automatic live trades in this phase.',
  'Manual approval will be required before any future order placement.',
  'Daily loss guard, max trades/day, and no-trade-after-time rules must pass first.',
];

export default function BrokerPage() {
  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Broker Connect</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Single-User Broker Control Panel</h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              Built for your own broker accounts first. We will connect read-only APIs before any live execution. Paper mode remains the default.
            </p>
          </div>
          <div className="rounded-2xl border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            Live orders locked
          </div>
        </div>

        <div className="mt-8">
          <SystemStatusPanel />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Mode" value="Single User" hint="Your broker accounts only" />
          <SummaryCard label="Execution" value="Locked" hint="No live orders yet" tone="loss" />
          <SummaryCard label="First Adapter" value="Dhan" hint="Read-only first" />
          <SummaryCard label="Storage" value="Supabase" hint="Runs already permanent" />
        </div>

        <div className="mt-8 rounded-3xl border border-emerald-900/60 bg-emerald-950/10 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">Next Build Stage</div>
              <h2 className="mt-2 text-2xl font-bold text-white">Broker read-only connection first</h2>
              <p className="mt-2 max-w-4xl text-sm text-slate-300">
                We will add backend broker adapters for profile, funds, positions, and order book checks. Live order placement remains disabled until the discipline guard and manual approval flow are stable.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              First target: <span className="font-semibold text-emerald-300">Dhan read-only adapter</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {brokers.map((broker) => (
            <BrokerCard key={broker.name} broker={broker} />
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-xl font-bold text-white">Required backend .env keys later</h2>
            <p className="mt-2 text-sm text-slate-400">Keep broker keys only in backend/.env. Never put broker secrets in frontend code.</p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-black p-4 text-xs text-emerald-200">{`# Example only. Do not paste real keys in chat.
DHAN_CLIENT_ID=
DHAN_ACCESS_TOKEN=

ANGEL_CLIENT_ID=
ANGEL_API_KEY=
ANGEL_TOTP_SECRET=

UPSTOX_CLIENT_ID=
UPSTOX_ACCESS_TOKEN=

ZERODHA_API_KEY=
ZERODHA_ACCESS_TOKEN=`}</pre>
          </div>

          <div className="rounded-3xl border border-red-900/70 bg-red-950/10 p-5">
            <h2 className="text-xl font-bold text-white">Live execution safety rules</h2>
            <div className="mt-4 space-y-3">
              {riskRules.map((rule) => (
                <div key={rule} className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                  🔒 {rule}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrokerCard({ broker }: { broker: Broker }) {
  const statusClass = broker.status === 'Ready for adapter' ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300' : 'border-slate-700 bg-slate-950 text-slate-300';

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-bold text-white">{broker.name}</h3>
            <span className={`rounded-full border px-3 py-1 text-xs ${statusClass}`}>{broker.status}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">{broker.priority}</p>
        </div>
        <div className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-400">
          ENV: {broker.envPrefix}_*
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-300">{broker.notes}</p>

      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Read-only tests</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {broker.readOnly.map((item) => (
            <button key={item} disabled className="cursor-not-allowed rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-left text-sm text-slate-500">
              {item} check
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-red-900/60 bg-red-950/10 p-4 text-sm text-red-200">
        Live place/modify/cancel order APIs are intentionally locked in this phase.
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) {
  const toneClass = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}
