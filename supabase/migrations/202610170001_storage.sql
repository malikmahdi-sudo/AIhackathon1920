begin;

create table public.reader_preferences (
  reader_id uuid primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint preferences_identity check (payload ? 'id' and payload->>'id' = reader_id::text),
  constraint preferences_topics check (jsonb_typeof(payload->'topics') = 'array')
);

create table public.daily_editions (
  reader_id uuid not null references public.reader_preferences(reader_id) on delete cascade,
  edition_date date not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (reader_id, edition_date),
  constraint edition_identity check (payload ? 'readerId' and payload->>'readerId' = reader_id::text),
  constraint edition_day check (payload ? 'date' and (payload->>'date')::date = edition_date),
  constraint edition_articles check (jsonb_typeof(payload->'articles') = 'array')
);

alter table public.reader_preferences enable row level security;
alter table public.daily_editions enable row level security;
-- The browser never talks directly to these tables. No public RLS policies.
revoke all on public.reader_preferences, public.daily_editions from public, anon, authenticated;
grant select, insert, update on public.reader_preferences to service_role;
grant select, insert on public.daily_editions to service_role;
revoke update, delete on public.daily_editions from service_role;

commit;
