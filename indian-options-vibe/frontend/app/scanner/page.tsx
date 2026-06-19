export default function ScannerPage() {
  const rows = [
    ['NIFTY 23500 CE', 'OI buildup', '+18%', 'High volume', 'Watch'],
    ['BANKNIFTY 51200 PE', 'IV spike', '+11%', 'Spread wide', 'Avoid'],
    ['RELIANCE 2900 CE', 'VWAP reclaim', '+7%', 'Liquid', 'Paper signal'],
  ];
  return (
    <section className="p-8 md:p-12"><div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold">Live Scanner</h1><p className="mt-2 text-slate-400">Dummy scanner for OI, IV, VWAP, and intraday breakouts.</p>
      <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr>{['Symbol','Signal','Change','Quality','Action'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r[0]} className="border-t border-slate-800">{r.map(c=><td key={c} className="p-3">{c}</td>)}</tr>)}</tbody></table></div>
    </div></section>
  );
}
