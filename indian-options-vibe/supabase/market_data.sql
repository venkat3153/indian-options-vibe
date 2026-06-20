-- Market Data Warehouse v1
-- Run this in Supabase SQL Editor.
-- Choose "Run and enable RLS" when Supabase asks.

create table if not exists public.symbols (
  symbol text primary key,
  name text not null,
  sector text default 'Unknown',
  exchange text default 'NSE',
  universe text default 'NIFTY50',
  is_active boolean default true,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.daily_candles (
  id bigserial primary key,
  symbol text not null references public.symbols(symbol) on delete cascade,
  exchange text default 'NSE',
  candle_date date not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint default 0,
  source text default 'mock_seed',
  raw jsonb default '{}'::jsonb,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(symbol, candle_date)
);

create table if not exists public.research_scores (
  id bigserial primary key,
  symbol text not null references public.symbols(symbol) on delete cascade,
  score_date date not null default current_date,
  quant_score numeric default 0,
  momentum_score numeric default 0,
  volume_score numeric default 0,
  breakout_score numeric default 0,
  tag text default 'Neutral',
  ai_reason text default '',
  raw jsonb default '{}'::jsonb,
  inserted_at timestamptz default now(),
  unique(symbol, score_date)
);

create index if not exists idx_daily_candles_symbol_date on public.daily_candles(symbol, candle_date desc);
create index if not exists idx_symbols_universe on public.symbols(universe);
create index if not exists idx_research_scores_date_score on public.research_scores(score_date desc, quant_score desc);

alter table public.symbols enable row level security;
alter table public.daily_candles enable row level security;
alter table public.research_scores enable row level security;

-- Read policies for your frontend/backend research views.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'symbols' and policyname = 'symbols_select_all') then
    create policy symbols_select_all on public.symbols for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'daily_candles' and policyname = 'daily_candles_select_all') then
    create policy daily_candles_select_all on public.daily_candles for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'research_scores' and policyname = 'research_scores_select_all') then
    create policy research_scores_select_all on public.research_scores for select using (true);
  end if;
end $$;
