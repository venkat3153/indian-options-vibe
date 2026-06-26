'use client';

import { useEffect, useMemo, useState } from 'react';
import { SystemStatusPanel } from '@/components/SystemStatusPanel';

type Broker = {
  id: string;
  name: string;
  envPrefix: string;
  priority: string;
  staticStatus: 'Ready for adapter' | 'Planned';
  readOnly: string[];
  notes: string;
};

type BrokerApiStatus = {
  id: string;
  name: string;
  priority: string;
  configured: boolean;
  mode: string;
  live_orders_enabled: boolean;
  live_orders_reason: string;
  read_only_tests: string[];
  env: Array<{ name: string; configured: boolean; masked: string | null }>;
};

type BrokerStatusResponse = {
  mode: string;
  paper_default: boolean;
  live_orders_enabled: boolean;
  first_adapter: string;
  brokers: BrokerApiStatus[];
};

type MarketStatus = {
  market: string;
  timezone: string;
  now_ist: string;
  status: 'open' | 'closed';
  is_open: boolean;
  is_weekend: boolean;
  regular_session: string;
  reason: string;
  next_allowed: string;
  live_orders_enabled: boolean;
  live_orders_reason: string;
  order_actions: {
    place_order: boolean;
    modify_order: boolean;
    cancel_order: boolean;
    auto_trade: boolean;
  };
};

type CheckResult = {
  brokerId: string;
  brokerName: string;
  action: string;
  loading: boolean;
  error?: string | null;
  response?: any;
};

const brokers: Broker[] = [
  {
    id: 'dhan',
    name: 'Dhan',
    envPrefix: 'DHAN',
    priority: 'First broker to connect',
    staticStatus: 'Ready for adapter',
    readOnly: ['profile', 'funds', 'positions', 'orders'],
    notes: 'Good first choice for your single-user MVP. We will test read-only APIs before enabling any execution module.',
  },
  {
    id: 'angel',
    name: 'Angel One SmartAPI',
    envPrefix: 'ANGEL',
    priority: 'Second broker',
    staticStatus: 'Planned',
    readOnly: ['profile', 'funds', 'positions', 'orders'],
    notes: 'Add after Dhan adapter pattern is stable. Needs careful token/session handling.',
  },
  {
    id: 'upstox',
    name: 'Upstox',
    envPrefix: 'UPSTOX',
    priority: 'Third broker',
    staticStatus: 'Planned',
    readOnly: ['profile', 'funds', 'positions', 'orders'],
    notes: 'Useful after the core broker interface is stable.',
  },
  {
    id: 'zerodha',
    name: 'Zerodha Kite',
    envPrefix: 'ZERODHA',
    priority: 'Later broker',
    staticStatus: 'Planned',
    readOnly: ['profile', 'funds', 'positions', 'orders'],
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
  const [brokerStatus, setBrokerStatus] = useState<BrokerStatusResponse | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  async function loadBrokerStatus() {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/brokers/status');
      if (!response.ok) throw new Error(`Broker status API returned ${response.status}`);
      const data = (await response.json()) as BrokerStatusResponse;
      setBrokerStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach broker status API');
      setBrokerStatus(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadMarketStatus() {
    try {
      setMarketLoading(true);
      const response = await fetch('http://localhost:8000/api/market/status');
      if (!response.ok) throw new Error(`Market status API returned ${response.status}`);
      const data = (await response.json()) as MarketStatus;
      setMarketStatus(data);
      setMarketError(null);
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : 'Could not reach market status API');
      setMarketStatus(null);
    } finally {
      setMarketLoading(false);
    }
  }

  async function refreshAllStatus() {
    await Promise.all([loadBrokerStatus(), loadMarketStatus()]);
  }

  async function runReadOnlyCheck(broker: Broker, action: string) {
    setCheckResult({ brokerId: broker.id, brokerName: broker.name, action, loading: true });
    try {
      const response = await fetch(`http://localhost:8000/api/brokers/${broker.id}/${action}`);
      if (!response.ok) throw new Error(`Broker ${action} check returned ${response.status}`);
      const data = await response.json();
      setCheckResult({ brokerId: broker.id, brokerName: broker.name, action, loading: false, response: data });
    } catch (err) {
      setCheckResult({
        brokerId: broker.id,
        brokerName: broker.name,
        action,
        loading: false,
        error: err instanceof Error ? err.message : 'Read-only check failed',
      });
    }
  }

  useEffect(() => {
    refreshAllStatus();
  }, []);

  const brokerMap = useMemo(() => {
    const map = new Map<string, BrokerApiStatus>();
    brokerStatus?.brokers.forEach((broker) => map.set(broker.id, broker));
    return map;
  }, [brokerStatus]);

  const configuredCount = brokerStatus?.brokers.filter((broker) => broker.configured).length || 0;
  const marketClosed = marketStatus ? !marketStatus.is_open : true;

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

        {error ? <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-200">Broker API fallback active: {error}</div> : null}
        {marketError ? <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-200">Market API fallback active: {marketError}</div> : null}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Mode" value={brokerStatus?.mode === 'single_user' ? 'Single User' : loading ? 'Checking' : 'Offline'} hint="Your broker accounts only" />
          <SummaryCard label="Execution" value={brokerStatus?.live_orders_enabled ? 'Unlocked' : 'Locked'} hint="No live orders yet" tone="loss" />
          <SummaryCard label="First Adapter" value={(brokerStatus?.first_adapter || 'dhan').toUpperCase()} hint="Read-only first" />
          <SummaryCard label="Configured" value={`${configuredCount}/${brokers.length}`} hint="Broker env keys detected" tone={configuredCount > 0 ? 'win' : undefined} />
        </div>

        <MarketSafetyPanel status={marketStatus} loading={marketLoading} onRefresh={refreshAllStatus} />

        <div className="mt-8 rounded-3xl border border-emerald-900/60 bg-emerald-950/10 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">Next Build Stage</div>
              <h2 className="mt-2 text-2xl font-bold text-white">Broker read-only connection first</h2>
              <p className="mt-2 max-w-4xl text-sm text-slate-300">
                We will add backend broker adapters for profile, funds, positions, and order book checks. Live order placement remains disabled until the discipline guard and manual approval flow are stable.
              </p>
            </div>
            <a
  href="/broker/dhan-readiness"
  className="rounded-xl border border-orange-800 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-300 hover:bg-orange-500/20"
>
  Dhan Readiness
</a>

<button onClick={refreshAllStatus} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300 hover:border-emerald-800 hover:text-emerald-300">
              {loading || marketLoading ? 'Checking status...' : 'Refresh all status'}
            </button>
          </div>
        </div>

        {checkResult ? <BrokerResultPanel result={checkResult} onClear={() => setCheckResult(null)} /> : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {brokers.map((broker) => (
            <BrokerCard key={broker.id} broker={broker} apiStatus={brokerMap.get(broker.id)} onRunCheck={runReadOnlyCheck} activeCheck={checkResult} marketClosed={marketClosed} />
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

function MarketSafetyPanel({ status, loading, onRefresh }: { status: MarketStatus | null; loading: boolean; onRefresh: () => void }) {
  const isOpen = Boolean(status?.is_open);
  const statusText = loading ? 'Checking' : isOpen ? 'Open' : 'Closed';
  const statusTone = isOpen ? 'border-yellow-800 bg-yellow-950/30 text-yellow-300' : 'border-red-900 bg-red-950/30 text-red-300';

  return (
    <div className="mt-8 rounded-3xl border border-red-900/70 bg-red-950/10 p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-red-300">Market Safety Lock</div>
          <h2 className="mt-2 text-2xl font-bold text-white">NSE market status: {statusText}</h2>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            {status?.reason || 'Checking NSE market window using IST. Live orders remain locked by default.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-2 text-xs ${statusTone}`}>{statusText}</span>
          <button onClick={onRefresh} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-emerald-800 hover:text-emerald-300">Refresh</button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Session" value={status?.regular_session || '09:15-15:30 IST'} hint="NSE regular session" />
        <SummaryCard label="Now" value={status?.now_ist?.replace(' IST', '') || 'Checking'} hint="Indian time" />
        <SummaryCard label="Next Allowed" value={status?.next_allowed || 'After safety checks'} hint="Earliest market window" />
        <SummaryCard label="Live Orders" value="Locked" hint={status?.live_orders_reason || 'Manual approval required'} tone="loss" />
      </div>

      <div className="mt-5 rounded-2xl border border-red-900/60 bg-black/30 p-4 text-sm text-red-200">
        🔒 Place, modify, cancel, and auto-trade actions are blocked. Today we only use read-only checks and UI building.
      </div>
    </div>
  );
}

function BrokerCard({
  broker,
  apiStatus,
  onRunCheck,
  activeCheck,
  marketClosed,
}: {
  broker: Broker;
  apiStatus?: BrokerApiStatus;
  onRunCheck: (broker: Broker, action: string) => void;
  activeCheck: CheckResult | null;
  marketClosed: boolean;
}) {
  const configured = Boolean(apiStatus?.configured);
  const statusLabel = apiStatus ? (configured ? 'Configured' : 'Not configured') : broker.staticStatus;
  const statusClass = configured ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300' : 'border-yellow-800 bg-yellow-950/30 text-yellow-300';
  const tests = apiStatus?.read_only_tests || broker.readOnly;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-bold text-white">{broker.name}</h3>
            <span className={`rounded-full border px-3 py-1 text-xs ${statusClass}`}>{statusLabel}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">{broker.priority}</p>
        </div>
        <div className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-400">
          ENV: {broker.envPrefix}_*
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-300">{broker.notes}</p>

      {apiStatus ? (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Backend key status</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {apiStatus.env.map((item) => (
              <div key={item.name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
                <div className="text-slate-400">{item.name}</div>
                <div className={item.configured ? 'mt-1 text-emerald-300' : 'mt-1 text-red-300'}>{item.configured ? `Detected (${item.masked})` : 'Missing'}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Read-only tests</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {tests.map((item) => {
            const isActive = activeCheck?.brokerId === broker.id && activeCheck?.action === item && activeCheck?.loading;
            return (
              <button
                key={item}
                onClick={() => onRunCheck(broker, item)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-left text-sm text-slate-300 hover:border-emerald-800 hover:text-emerald-300 disabled:cursor-wait disabled:opacity-60"
                disabled={isActive}
              >
                {isActive ? 'Checking...' : `${labelCase(item)} check →`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-red-900/60 bg-red-950/10 p-4 text-sm text-red-200">
        {marketClosed ? 'Market is closed or outside allowed time. ' : ''}{apiStatus?.live_orders_reason || 'Live place/modify/cancel order APIs are intentionally locked in this phase.'}
      </div>
    </div>
  );
}

function BrokerResultPanel({ result, onClear }: { result: CheckResult; onClear: () => void }) {
  const payload = result.response;
  const statusOk = payload?.configured === true && !payload?.error && !result.error;
  const data = payload?.data;
  const summary = summarizeBrokerData(result.action, data);

  return (
    <div className="mt-8 rounded-3xl border border-emerald-900/60 bg-slate-900/80 p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">Read-only result</div>
          <h2 className="mt-2 text-2xl font-bold text-white">{result.brokerName} {labelCase(result.action)} Check</h2>
          <p className="mt-1 text-sm text-slate-400">Live orders remain locked. This panel only displays broker read-only data.</p>
        </div>
        <div className="flex gap-2">
          <span className={`rounded-full border px-3 py-2 text-xs ${statusOk ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300' : 'border-yellow-800 bg-yellow-950/30 text-yellow-300'}`}>
            {result.loading ? 'Checking' : statusOk ? 'Connected' : 'Needs attention'}
          </span>
          <button onClick={onClear} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-red-800 hover:text-red-300">Clear</button>
        </div>
      </div>

      {result.loading ? <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">Fetching read-only data from backend...</div> : null}
      {result.error ? <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">{result.error}</div> : null}

      {!result.loading && !result.error ? (
        <>
          {summary.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {summary.map((item) => (
                <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} tone={item.tone} />
              ))}
            </div>
          ) : null}

          <BrokerDataTable action={result.action} data={data} />

          <div className="mt-5 rounded-2xl border border-slate-800 bg-black p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Raw response</div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{JSON.stringify(payload, null, 2)}</pre>
          </div>
        </>
      ) : null}
    </div>
  );
}

function BrokerDataTable({ action, data }: { action: string; data: any }) {
  if (action !== 'positions' && action !== 'orders') return null;

  const rows = Array.isArray(data) ? data : [];
  const title = action === 'positions' ? 'Positions Table' : 'Orders Table';
  const emptyText = action === 'positions' ? 'No open positions returned by broker.' : 'No orders returned by broker for today.';

  if (rows.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
        <div className="mt-3 rounded-xl border border-slate-800 bg-black/30 p-4 text-sm text-slate-300">{emptyText}</div>
      </div>
    );
  }

  if (action === 'positions') {
    return (
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <div className="border-b border-slate-800 p-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-black/40 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Net Qty</th>
                <th className="px-4 py-3">Buy Avg</th>
                <th className="px-4 py-3">Sell Avg</th>
                <th className="px-4 py-3">P&L / MTM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row, index) => {
                const pnl = Number(pick(row, ['realizedProfit', 'unrealizedProfit', 'mtm', 'pnl', 'profitAndLoss']) || 0);
                return (
                  <tr key={index} className="text-slate-300">
                    <td className="px-4 py-3 font-semibold text-white">{pick(row, ['tradingSymbol', 'symbol', 'securityId', 'drvOptionType'])}</td>
                    <td className="px-4 py-3">{pick(row, ['productType', 'product', 'exchangeSegment'])}</td>
                    <td className="px-4 py-3">{pick(row, ['positionType', 'transactionType', 'side'])}</td>
                    <td className="px-4 py-3">{pick(row, ['netQty', 'netQuantity', 'quantity', 'qty'])}</td>
                    <td className="px-4 py-3">{numberText(pick(row, ['buyAvg', 'buyAvgPrice', 'averageBuyPrice']))}</td>
                    <td className="px-4 py-3">{numberText(pick(row, ['sellAvg', 'sellAvgPrice', 'averageSellPrice']))}</td>
                    <td className={`px-4 py-3 font-semibold ${pnl > 0 ? 'text-emerald-300' : pnl < 0 ? 'text-red-300' : 'text-slate-300'}`}>{money(pnl)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row, index) => (
              <tr key={index} className="text-slate-300">
                <td className="px-4 py-3">{pick(row, ['orderTime', 'exchangeTime', 'createTime', 'orderDateTime'])}</td>
                <td className="px-4 py-3 font-semibold text-white">{pick(row, ['tradingSymbol', 'symbol', 'securityId'])}</td>
                <td className="px-4 py-3">{pick(row, ['transactionType', 'side', 'orderSide'])}</td>
                <td className="px-4 py-3">{pick(row, ['quantity', 'qty', 'filledQty', 'remainingQuantity'])}</td>
                <td className="px-4 py-3">{numberText(pick(row, ['price', 'averageTradedPrice', 'triggerPrice']))}</td>
                <td className="px-4 py-3">{pick(row, ['orderType', 'productType', 'validity'])}</td>
                <td className="px-4 py-3"><span className="rounded-full border border-slate-700 px-2 py-1 text-xs">{pick(row, ['orderStatus', 'status', 'omsErrorDescription'])}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function summarizeBrokerData(action: string, data: any): Array<{ label: string; value: string; hint: string; tone?: 'win' | 'loss' }> {
  if (!data) return [];

  if (action === 'profile') {
    return [
      { label: 'Token Validity', value: String(data.tokenValidity || 'Active'), hint: 'Dhan token status', tone: 'win' },
      { label: 'Data Plan', value: String(data.dataPlan || 'Unknown'), hint: `Data validity: ${data.dataValidity || 'N/A'}` },
      { label: 'MTF', value: String(data.mtf || 'Unknown'), hint: `DDPI: ${data.ddpi || 'N/A'}` },
    ];
  }

  if (action === 'funds') {
    return [
      { label: 'Available', value: money(data.availableBalance), hint: 'Available balance', tone: Number(data.availableBalance || 0) > 0 ? 'win' : undefined },
      { label: 'Withdrawable', value: money(data.withdrawableBalance), hint: 'Withdrawable balance' },
      { label: 'Utilized', value: money(data.utilizedAmount), hint: 'Used margin' },
    ];
  }

  if (action === 'positions') {
    return [
      { label: 'Open Positions', value: Array.isArray(data) ? String(data.length) : '0', hint: 'Read-only position count' },
    ];
  }

  if (action === 'orders') {
    return [
      { label: 'Today Orders', value: Array.isArray(data) ? String(data.length) : '0', hint: 'Read-only order count' },
    ];
  }

  return [];
}

function pick(row: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') return String(row[key]);
  }
  return '-';
}

function numberText(value: unknown) {
  if (value === '-' || value === undefined || value === null || value === '') return '-';
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);
  return numberValue.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function money(value: unknown) {
  const numberValue = Number(value || 0);
  return `₹${numberValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
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

function labelCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
