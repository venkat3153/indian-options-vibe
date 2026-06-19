type ScreenerRow = {
  symbol: string;
  market: 'NSE' | 'BSE';
  segment: 'Index Options' | 'Stock Options' | 'Intraday Stocks';
  spot: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral' | 'Weak';
  score: number;
  setup: string;
  signal: string;
  risk: 'Low' | 'Medium' | 'High';
  action: string;
};

const rows: ScreenerRow[] = [
  {
    symbol: 'NIFTY',
    market: 'NSE',
    segment: 'Index Options',
    spot: '23,520',
    bias: 'Bullish',
    score: 84,
    setup: 'ATM CE pullback above VWAP',
    signal: 'OI buildup + volume expansion',
    risk: 'Medium',
    action: 'Paper CE setup',
  },
  {
    symbol: 'SENSEX',
    market: 'BSE',
    segment: 'Index Options',
    spot: '77,850',
    bias: 'Neutral',
    score: 62,
    setup: 'Wait near VWAP',
    signal: 'Mixed OI, no clean direction',
    risk: 'High',
    action: 'Wait',
  },
  {
    symbol: 'BANKNIFTY',
    market: 'NSE',
    segment: 'Index Options',
    spot: '51,420',
    bias: 'Bearish',
    score: 78,
    setup: 'ATM PE breakout below VWAP',
    signal: 'Put OI + price breakdown',
    risk: 'Medium',
    action: 'Paper PE setup',
  },
  {
    symbol: 'FINNIFTY',
    market: 'NSE',
    segment: 'Index Options',
    spot: '23,870',
    bias: 'Bullish',
    score: 69,
    setup: 'CE watch above day high',
    signal: 'Sector support from private banks',
    risk: 'Medium',
    action: 'Watchlist',
  },
  {
    symbol: 'RELIANCE',
    market: 'NSE',
    segment: 'Stock Options',
    spot: '2,925',
    bias: 'Bullish',
    score: 72,
    setup: 'Stock CE watch',
    signal: 'VWAP reclaim + call volume',
    risk: 'Medium',
    action: 'Paper only',
  },
  {
    symbol: 'HDFCBANK',
    market: 'NSE',
    segment: 'Stock Options',
    spot: '1,670',
    bias: 'Weak',
    score: 43,
    setup: 'Avoid until reclaim',
    signal: 'Below VWAP, low follow-through',
    risk: 'High',
    action: 'Avoid',
  },
  {
    symbol: 'ICICIBANK',
    market: 'NSE',
    segment: 'Stock Options',
    spot: '1,115',
    bias: 'Bullish',
    score: 76,
    setup: 'CE momentum continuation',
    signal: 'Relative strength + volume',
    risk: 'Medium',
    action: 'Paper CE setup',
  },
  {
    symbol: 'TCS',
    market: 'NSE',
    segment: 'Intraday Stocks',
    spot: '3,890',
    bias: 'Neutral',
    score: 58,
    setup: 'Range breakout watch',
    signal: 'Low volatility compression',
    risk: 'Medium',
    action: 'Wait',
  },
  {
    symbol: 'SBIN',
    market: 'NSE',
    segment: 'Intraday Stocks',
    spot: '845',
    bias: 'Bearish',
    score: 71,
    setup: 'PDL breakdown short watch',
    signal: 'Below VWAP + selling volume',
    risk: 'Medium',
    action: 'Paper stock setup',
  },
];

const priorityRows = rows.filter((row) => ['NIFTY', 'SENSEX', 'BANKNIFTY'].includes(row.symbol));
const stockOptionRows = rows.filter((row) => row.segment === 'Stock Options');
const intradayRows = rows.filter((row) => row.segment === 'Intraday Stocks');

export default function ScannerPage() {
  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Market Screener MVP</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Indian Options + Intraday Screener</h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              Mock screener for NIFTY, SENSEX, BANKNIFTY, stock options, and intraday stocks. Main focus stays on index options first.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
            Paper signals only • Live orders locked
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Primary Focus" value="NIFTY + SENSEX" hint="Index options first" />
          <SummaryCard label="Market Coverage" value="NSE + BSE" hint="Mock adapters for now" />
          <SummaryCard label="Best Score" value="84" hint="NIFTY bullish CE setup" />
          <SummaryCard label="Mode" value="Paper" hint="No live execution" />
        </div>

        <ScreenerSection title="Priority Index Options" subtitle="Always scan these first for your trading workflow." rows={priorityRows} />
        <ScreenerSection title="Stock Options Watchlist" subtitle="Liquid F&O stocks only. Avoid illiquid contracts and wide spreads." rows={stockOptionRows} />
        <ScreenerSection title="Intraday Cash Stock Screener" subtitle="Used for stock momentum and sector confirmation." rows={intradayRows} />
      </div>
    </section>
  );
}

function ScreenerSection({ title, subtitle, rows }: { title: string; subtitle: string; rows: ScreenerRow[] }) {
  return (
    <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Score: trend + volume + VWAP + OI + liquidity + risk</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-slate-400">
            <tr>
              {['Symbol', 'Mkt', 'Segment', 'Spot', 'Bias', 'Score', 'Setup', 'Signal', 'Risk', 'Action'].map((header) => (
                <th key={header} className="p-3 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.symbol}-${row.segment}`} className="border-t border-slate-800 text-slate-300 hover:bg-slate-800/50">
                <td className="p-3 font-semibold text-white">{row.symbol}</td>
                <td className="p-3">{row.market}</td>
                <td className="p-3 text-slate-400">{row.segment}</td>
                <td className="p-3">{row.spot}</td>
                <td className="p-3"><BiasBadge bias={row.bias} /></td>
                <td className="p-3"><ScoreBadge score={row.score} /></td>
                <td className="p-3">{row.setup}</td>
                <td className="p-3 text-slate-400">{row.signal}</td>
                <td className="p-3"><RiskBadge risk={row.risk} /></td>
                <td className="p-3 font-medium text-emerald-300">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function BiasBadge({ bias }: { bias: ScreenerRow['bias'] }) {
  const styles = {
    Bullish: 'border-emerald-800 bg-emerald-950/40 text-emerald-300',
    Bearish: 'border-red-800 bg-red-950/40 text-red-300',
    Neutral: 'border-slate-700 bg-slate-950 text-slate-300',
    Weak: 'border-yellow-800 bg-yellow-950/30 text-yellow-300',
  };
  return <span className={`rounded-full border px-3 py-1 text-xs ${styles[bias]}`}>{bias}</span>;
}

function RiskBadge({ risk }: { risk: ScreenerRow['risk'] }) {
  const styles = {
    Low: 'text-emerald-300',
    Medium: 'text-yellow-300',
    High: 'text-red-300',
  };
  return <span className={styles[risk]}>{risk}</span>;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-300' : score >= 60 ? 'text-yellow-300' : 'text-red-300';
  return <span className={`font-bold ${color}`}>{score}</span>;
}
