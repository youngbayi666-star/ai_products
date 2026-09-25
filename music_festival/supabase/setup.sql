-- Run once in the Supabase SQL Editor. The public table contains no personal text.
create table if not exists public.festival_echoes (
  id bigint generated always as identity primary key,
  persona text not null check (persona in ('pulse', 'glow', 'roam', 'wild')),
  style text not null check (style in ('neon', 'sunset', 'silver')),
  seed bigint not null check (seed between 0 and 4294967295),
  created_at timestamptz not null default now()
);

create index if not exists festival_echoes_recent_idx on public.festival_echoes (id desc);
alter table public.festival_echoes enable row level security;
revoke all on table public.festival_echoes from public, anon, authenticated;
grant select on table public.festival_echoes to anon, authenticated;
grant insert (persona, style, seed) on table public.festival_echoes to anon, authenticated;
grant usage on sequence public.festival_echoes_id_seq to anon, authenticated;

drop policy if exists "Anyone may read anonymous echoes" on public.festival_echoes;
create policy "Anyone may read anonymous echoes"
  on public.festival_echoes for select to anon, authenticated using (true);

drop policy if exists "Anyone may add an anonymous echo" on public.festival_echoes;
create policy "Anyone may add an anonymous echo"
  on public.festival_echoes for insert to anon, authenticated
  with check (
    persona in ('pulse', 'glow', 'roam', 'wild')
    and style in ('neon', 'sunset', 'silver')
    and seed between 0 and 4294967295
  );

create or replace function public.festival_wall()
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'count', (select count(*) from public.festival_echoes),
    'echoes', coalesce(
      (select jsonb_agg(to_jsonb(recent) order by recent.id)
       from (
         select id, persona, style, seed,
                floor(extract(epoch from created_at))::bigint as "createdAt"
         from public.festival_echoes order by id desc limit 80
       ) as recent),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.festival_wall() from public, anon, authenticated;
grant execute on function public.festival_wall() to anon, authenticated;
