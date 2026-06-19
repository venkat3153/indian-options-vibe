'use client';

import { useState } from 'react';

const examples = [
  'Backtest NIFTY ATM CE buying above VWAP with RSI > 60, SL 20%, target 40%, last 90 days.',
  'Backtest BANKNIFTY opening range breakout option buying with max daily loss ₹2000.',
  'Scan NIFTY options for OI buildup and paper-trade only low-risk signals.',
];

export function PromptBox() {
  const [prompt, setPrompt] = useState(examples[0]);
  const [steps, setSteps] = useState<string[]>([]);

  function runDemo() {
    setSteps([]);
    const demoSteps = ['Parsing strategy', 'Fetching dummy NSE candles', 'Selecting ATM option', 'Running backtest', 'Calculating charges/slippage', 'Generating risk report'];
    demoSteps.forEach((step, i) => setTimeout(() => setSteps((s) => [...s, step]), 450 * (i + 1)));
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0b0f17] p-5">
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-32 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm outline-none focus:border-emerald-500" />
      <div className="mt-4 flex flex-wrap gap-2">
        {examples.map((ex) => <button key={ex} onClick={() => setPrompt(ex)} className="rounded-full bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">{ex.slice(0, 42)}...</button>)}
      </div>
      <button onClick={runDemo} className="mt-4 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400">Run Paper Backtest</button>
      {steps.length > 0 && <div className="mt-5 space-y-2">{steps.map((s, i) => <div key={s} className="rounded-xl bg-slate-900 p-3 text-sm text-slate-300">Step {i + 1}: {s}</div>)}</div>}
    </div>
  );
}
