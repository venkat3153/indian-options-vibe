import Link from 'next/link';

const items = [
  { label: "Home", href: "/" },
  { label: "Live Scanner", href: "/quant/live" },
  { label: "Quant Scanner", href: "/quant/scanner" },
  { label: "Option Pricing", href: "/quant/options" },
  { label: "Quant Review", href: "/quant/review" },
  { label: "Journal Dashboard", href: "/journal" },
  { label: "Settings", href: "/settings" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-[#0b0f17] p-5 md:block">
      <div className="mb-8">
        <div className="text-xl font-bold tracking-tight">Indian Options Vibe</div>
        <div className="mt-1 text-xs text-slate-400">Research + Screener + Paper Mode</div>
      </div>
      <nav className="space-y-2">
        {items.map(([label, href]) => (
          <Link key={href} href={href} className="block rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-10 rounded-2xl border border-emerald-900/70 bg-emerald-950/20 p-4 text-xs text-emerald-200">
        Paper mode is default. NIFTY and SENSEX options stay as the primary focus. Live order modules are locked until risk gates are complete.
      </div>
    </aside>
  );
}
