create extension if not exists pgcrypto;

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  wiki_title text unique,
  wiki_url text,
  image_url text,
  description text,
  status text,
  canon boolean default true,
  gender text,
  race text,
  bounty text,
  affiliations text[] default '{}',
  devil_fruit_user boolean default false,
  devil_fruit_name text,
  haki_user boolean default false,
  haki_types text[] default '{}',
  swordsman boolean default false,
  tags text[] default '{}',
  active boolean default true,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid default auth.uid(),
  winner_character_id uuid not null references public.characters(id),
  loser_character_id uuid not null references public.characters(id),
  created_at timestamptz default now(),
  check (winner_character_id <> loser_character_id)
);

create table if not exists public.ratings (
  character_id uuid primary key references public.characters(id) on delete cascade,
  elo_rating numeric not null default 1500,
  wins integer not null default 0,
  losses integer not null default 0,
  comparisons integer not null default 0,
  updated_at timestamptz default now()
);

create or replace view public.character_rankings as
select c.*, coalesce(r.elo_rating,1500) as elo_rating, coalesce(r.wins,0) as wins, coalesce(r.losses,0) as losses, coalesce(r.comparisons,0) as comparisons
from public.characters c
left join public.ratings r on r.character_id = c.id
where c.active = true;

create or replace function public.ensure_rating(character_uuid uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.ratings(character_id) values(character_uuid)
  on conflict (character_id) do nothing;
end; $$;

create or replace function public.submit_vote(winner_id uuid, loser_id uuid)
returns void language plpgsql security definer as $$
declare
  k numeric := 32;
  rw numeric;
  rl numeric;
  ew numeric;
  el numeric;
begin
  if winner_id = loser_id then raise exception 'Winner and loser cannot be the same'; end if;
  perform public.ensure_rating(winner_id);
  perform public.ensure_rating(loser_id);
  select elo_rating into rw from public.ratings where character_id = winner_id;
  select elo_rating into rl from public.ratings where character_id = loser_id;
  ew := 1 / (1 + power(10, (rl - rw) / 400));
  el := 1 / (1 + power(10, (rw - rl) / 400));
  insert into public.votes(winner_character_id, loser_character_id) values(winner_id, loser_id);
  update public.ratings set elo_rating = rw + k * (1 - ew), wins = wins + 1, comparisons = comparisons + 1, updated_at = now() where character_id = winner_id;
  update public.ratings set elo_rating = rl + k * (0 - el), losses = losses + 1, comparisons = comparisons + 1, updated_at = now() where character_id = loser_id;
end; $$;

create or replace function public.get_random_pair()
returns table(left_character jsonb, right_character jsonb)
language sql
stable
as $$
  with ranked as (
    select
      c.*,
      coalesce(r.elo_rating, 1500) as elo_rating,
      coalesce(r.wins, 0) as wins,
      coalesce(r.losses, 0) as losses,
      coalesce(r.comparisons, 0) as comparisons
    from public.characters c
    left join public.ratings r on r.character_id = c.id
    where c.active = true
  ),

  first_pick as (
    select *
    from ranked
    order by
      comparisons asc,
      random()
    limit 1
  ),

  second_pick as (
    select r.*
    from ranked r
    cross join first_pick f
    where r.id <> f.id
    order by
      abs(r.elo_rating - f.elo_rating) asc,
      r.comparisons asc,
      random()
    limit 1
  )

  select
    (select to_jsonb(first_pick.*) from first_pick) as left_character,
    (select to_jsonb(second_pick.*) from second_pick) as right_character;
$$;

alter table public.characters enable row level security;
alter table public.votes enable row level security;
alter table public.ratings enable row level security;

create policy "Read characters" on public.characters for select using (true);
create policy "Read votes" on public.votes for select using (true);
create policy "Insert votes" on public.votes for insert with check (true);
create policy "Read ratings" on public.ratings for select using (true);
