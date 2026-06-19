import { PromptBox } from '@/components/PromptBox';

export default function AgentPage() {
  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Strategy Agent</h1>
        <p className="mt-2 text-slate-400">Ask for an Indian intraday/options strategy. MVP runs a dummy backtest flow.</p>
        <div className="mt-6"><PromptBox /></div>
      </div>
    </section>
  );
}
