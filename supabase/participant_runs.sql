-- Table shape for completion-only inserts (no `completed` field).
create extension if not exists pgcrypto;

create table if not exists public.participant_runs (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  venue_name text not null,
  started_on timestamptz not null,
  completed_on timestamptz not null,
  created_at timestamptz not null default now(),
  constraint participant_name_len_chk check (char_length(trim(participant_name)) between 2 and 120),
  constraint venue_name_len_chk check (char_length(trim(venue_name)) between 2 and 120),
  constraint completed_after_started_chk check (completed_on >= started_on)
);

create index if not exists participant_runs_created_at_idx on public.participant_runs (created_at desc);
create index if not exists participant_runs_venue_name_idx on public.participant_runs (venue_name);

alter table public.participant_runs drop column if exists completed;

alter table public.participant_runs enable row level security;

grant usage on schema public to anon;
grant insert on table public.participant_runs to anon;
grant usage on schema public to authenticated;
grant insert on table public.participant_runs to authenticated;

drop policy if exists "anon_insert_participant_runs" on public.participant_runs;
drop policy if exists "client_insert_participant_runs" on public.participant_runs;
create policy "client_insert_participant_runs"
  on public.participant_runs
  for insert
  to anon, authenticated
  with check (completed_on >= started_on);
