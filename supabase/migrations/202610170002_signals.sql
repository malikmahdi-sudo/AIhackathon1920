begin;
create table public.reader_signals (
  reader_id uuid not null references public.reader_preferences(reader_id) on delete cascade,
  article_id text not null,
  kind text not null check (kind in ('feedback', 'click', 'reading-time')),
  payload jsonb not null,
  primary key (reader_id, article_id, kind)
);
alter table public.reader_signals enable row level security;
revoke all on public.reader_signals from public, anon, authenticated;
grant select, insert, update on public.reader_signals to service_role;
commit;
