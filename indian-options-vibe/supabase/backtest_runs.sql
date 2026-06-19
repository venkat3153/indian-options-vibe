-- Indian Options Vibe: permanent backtest run storage
-- Run this in Supabase SQL Editor.

create table if not exists public.backtest_runs (
  id text primary key,
  title text not null,
  symbol text not null,
  timeframe text not null,
  mode text not null default 'Paper Backtest',
  status text not null default 'Completed',
  created_at_label text not null,
  net_pnl numeric not null default 0,
  win_rate numeric not null default 0,
  profit_factor numeric not null default 0,
  max_drawdown numeric not null default 0,
  total_trades integer not null default 0,
  charges numeric not null default 0,
  risk text not null default 'Medium',
  summary text not null,
  prompt text,
  trades jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backtest_runs_inserted_at_idx on public.backtest_runs (inserted_at desc);
create index if not exists backtest_runs_symbol_idx on public.backtest_runs (symbol);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_backtest_runs_updated_at on public.backtest_runs;
create trigger set_backtest_runs_updated_at
before update on public.backtest_runs
for each row
execute function public.set_updated_at();

-- MVP note:
-- Backend uses SUPABASE_SERVICE_ROLE_KEY, so it can bypass RLS from the server.
-- When user login is added, we will add user_id and RLS policies per user.
alter table public.backtest_runs enable row level security;

-- Keep direct browser access locked for now. Backend service role handles reads/writes.
