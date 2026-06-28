-- create extension if not exists pgcrypto;

-- create table if not exists public.characters (
--   id uuid primary key default gen_random_uuid(),
--   name text not null unique,
--   wiki_title text unique,
--   wiki_url text,
--   image_url text,
--   description text,
--   status text,
--   canon boolean default true,
--   gender text,
--   race text,
--   bounty text,
--   affiliations text[] default '{}',
--   devil_fruit_user boolean default false,
--   devil_fruit_name text,
--   haki_user boolean default false,
--   haki_types text[] default '{}',
--   swordsman boolean default false,
--   tags text[] default '{}',
--   active boolean default true,
--   last_synced_at timestamptz default now(),
--   created_at timestamptz default now()
-- );

-- create table if not exists public.votes (
--   id uuid primary key default gen_random_uuid(),
--   voter_id uuid default auth.uid(),
--   winner_character_id uuid not null references public.characters(id),
--   loser_character_id uuid not null references public.characters(id),
--   created_at timestamptz default now(),
--   check (winner_character_id <> loser_character_id)
-- );

-- create table if not exists public.ratings (
--   character_id uuid primary key references public.characters(id) on delete cascade,
--   elo_rating numeric not null default 1500,
--   wins integer not null default 0,
--   losses integer not null default 0,
--   comparisons integer not null default 0,
--   updated_at timestamptz default now()
-- );

-- create or replace view public.character_rankings as
-- select c.*, coalesce(r.elo_rating,1500) as elo_rating, coalesce(r.wins,0) as wins, coalesce(r.losses,0) as losses, coalesce(r.comparisons,0) as comparisons
-- from public.characters c
-- left join public.ratings r on r.character_id = c.id
-- where c.active = true;

-- create or replace function public.ensure_rating(character_uuid uuid)
-- returns void language plpgsql security definer as $$
-- begin
--   insert into public.ratings(character_id) values(character_uuid)
--   on conflict (character_id) do nothing;
-- end; $$;

-- create or replace function public.submit_vote(winner_id uuid, loser_id uuid)
-- returns void language plpgsql security definer as $$
-- declare
--   k numeric := 32;
--   rw numeric;
--   rl numeric;
--   ew numeric;
--   el numeric;
-- begin
--   if winner_id = loser_id then raise exception 'Winner and loser cannot be the same'; end if;
--   perform public.ensure_rating(winner_id);
--   perform public.ensure_rating(loser_id);
--   select elo_rating into rw from public.ratings where character_id = winner_id;
--   select elo_rating into rl from public.ratings where character_id = loser_id;
--   ew := 1 / (1 + power(10, (rl - rw) / 400));
--   el := 1 / (1 + power(10, (rw - rl) / 400));
--   insert into public.votes(winner_character_id, loser_character_id) values(winner_id, loser_id);
--   update public.ratings set elo_rating = rw + k * (1 - ew), wins = wins + 1, comparisons = comparisons + 1, updated_at = now() where character_id = winner_id;
--   update public.ratings set elo_rating = rl + k * (0 - el), losses = losses + 1, comparisons = comparisons + 1, updated_at = now() where character_id = loser_id;
-- end; $$;

-- create or replace function public.get_random_pair()
-- returns table(left_character jsonb, right_character jsonb)
-- language sql
-- stable
-- as $$
--   with ranked as (
--     select
--       c.*,
--       coalesce(r.elo_rating, 1500) as elo_rating,
--       coalesce(r.wins, 0) as wins,
--       coalesce(r.losses, 0) as losses,
--       coalesce(r.comparisons, 0) as comparisons
--     from public.characters c
--     left join public.ratings r on r.character_id = c.id
--     where c.active = true
--   ),

--   first_pick as (
--     select *
--     from ranked
--     order by
--       comparisons asc,
--       random()
--     limit 1
--   ),

--   second_pick as (
--     select r.*
--     from ranked r
--     cross join first_pick f
--     where r.id <> f.id
--     order by
--       abs(r.elo_rating - f.elo_rating) asc,
--       r.comparisons asc,
--       random()
--     limit 1
--   )

--   select
--     (select to_jsonb(first_pick.*) from first_pick) as left_character,
--     (select to_jsonb(second_pick.*) from second_pick) as right_character;
-- $$;

-- alter table public.characters enable row level security;
-- alter table public.votes enable row level security;
-- alter table public.ratings enable row level security;

-- create policy "Read characters" on public.characters for select using (true);
-- create policy "Read votes" on public.votes for select using (true);
-- create policy "Insert votes" on public.votes for insert with check (true);
-- create policy "Read ratings" on public.ratings for select using (true);



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

alter table public.characters
  add column if not exists origin text,
  add column if not exists devil_fruit_english_name text,
  add column if not exists devil_fruit_type text,
  add column if not exists needs_enrichment boolean default true,
  add column if not exists strength_summary text,
  add column if not exists weakness_summary text,
  add column if not exists signature_move text;

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


-- Bayesian Bradley-Terry ranking upgrade, 2026-06-21

create extension if not exists pgcrypto;

alter table public.ratings
  add column if not exists rating_mu numeric not null default 1500,
  add column if not exists rating_sigma numeric not null default 350;

update public.ratings
set
  rating_mu = coalesce(rating_mu, elo_rating, 1500),
  rating_sigma = case
    when rating_sigma is not null then rating_sigma
    else greatest(70, 350 / sqrt(greatest(comparisons, 0) + 1))
  end,
  elo_rating = coalesce(elo_rating, rating_mu, 1500);

alter table public.votes
  add column if not exists voter_session_id text,
  add column if not exists selected_side text,
  add column if not exists vote_latency_ms integer,
  add column if not exists voter_reliability numeric,
  add column if not exists vote_weight numeric,
  add column if not exists winner_expected_probability numeric;

create table if not exists public.voter_reliability (
  voter_key text primary key,
  reliability numeric not null default 1.0 check (reliability >= 0.1 and reliability <= 1.0),
  votes_count integer not null default 0,
  left_count integer not null default 0,
  right_count integer not null default 0,
  quick_votes integer not null default 0,
  outlier_votes integer not null default 0,
  repeated_pair_votes integer not null default 0,
  last_vote_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.rating_history (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  rating_mu numeric not null,
  rating_sigma numeric not null,
  rating_score numeric not null,
  rank_position integer not null,
  wins integer not null,
  losses integer not null,
  comparisons integer not null,
  created_at timestamptz default now()
);

create index if not exists rating_history_character_created_idx
  on public.rating_history(character_id, created_at);

create index if not exists rating_history_character_rank_idx
  on public.rating_history(character_id, rank_position);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 15),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  requested_username text;
begin
  requested_username := left(nullif(trim(new.raw_user_meta_data->>'username'), ''), 15);

  insert into public.profiles(id, username)
  values(
    new.id,
    coalesce(requested_username, left('user_' || replace(new.id::text, '-', '')::text, 15))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index if not exists friend_requests_pair_unique
on public.friend_requests (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
)
where status in ('pending', 'accepted');

create or replace function public.ensure_rating(character_uuid uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.ratings(character_id, elo_rating, rating_mu, rating_sigma)
  values(character_uuid, 1500, 1500, 350)
  on conflict (character_id) do nothing;
end;
$$;

drop view if exists public.character_rankings;

create or replace view public.character_rankings as
select
  ranked.*,
  row_number() over (order by ranked.rating_score desc, ranked.comparisons desc, ranked.name asc)::integer as rank_position
from (
  select
    c.*,
    coalesce(r.elo_rating, 1500) as elo_rating,
    coalesce(r.rating_mu, coalesce(r.elo_rating, 1500)) as rating_mu,
    coalesce(r.rating_sigma, 350) as rating_sigma,
    coalesce(r.rating_mu, coalesce(r.elo_rating, 1500)) - (2 * coalesce(r.rating_sigma, 350)) as rating_score,
    coalesce(r.wins, 0) as wins,
    coalesce(r.losses, 0) as losses,
    coalesce(r.comparisons, 0) as comparisons
  from public.characters c
  left join public.ratings r on r.character_id = c.id
  where c.active = true
) ranked;

create or replace function public.snapshot_rating_history(character_uuid uuid)
returns void
language sql
security definer
as $$
  insert into public.rating_history(
    character_id,
    rating_mu,
    rating_sigma,
    rating_score,
    rank_position,
    wins,
    losses,
    comparisons
  )
  select
    id,
    rating_mu,
    rating_sigma,
    rating_score,
    rank_position,
    wins,
    losses,
    comparisons
  from public.character_rankings
  where id = character_uuid;
$$;

create or replace function public.submit_vote(
  winner_id uuid,
  loser_id uuid,
  voter_key text default null,
  vote_latency_ms integer default null,
  selected_side text default null
)
returns void
language plpgsql
security definer
as $$
declare
  scale numeric := 400;
  base_step numeric := 95;
  winner_mu numeric;
  loser_mu numeric;
  winner_sigma numeric;
  loser_sigma numeric;
  expected numeric;
  vote_reliability numeric := 1;
  vote_impact numeric;
  total_sigma numeric;
  winner_delta numeric;
  loser_delta numeric;
  pair_repeats integer := 0;
  is_quick boolean := false;
  is_outlier boolean := false;
  new_votes integer;
  new_left integer;
  new_right integer;
  new_quick integer;
  new_outlier integer;
  new_repeated integer;
  quick_ratio numeric;
  side_bias numeric;
  outlier_ratio numeric;
  suspicion numeric;
  recalculated_reliability numeric;
  effective_voter_key text := nullif(trim(voter_key), '');
begin
  if winner_id = loser_id then
    raise exception 'Winner and loser cannot be the same';
  end if;

  perform public.ensure_rating(winner_id);
  perform public.ensure_rating(loser_id);

  if effective_voter_key is not null then
    insert into public.voter_reliability(voter_key)
    values(effective_voter_key)
    on conflict on constraint voter_reliability_pkey do nothing;

    select reliability
    into vote_reliability
    from public.voter_reliability
    where public.voter_reliability.voter_key = effective_voter_key;
  end if;

  select rating_mu, rating_sigma
  into winner_mu, winner_sigma
  from public.ratings
  where character_id = winner_id
  for update;

  select rating_mu, rating_sigma
  into loser_mu, loser_sigma
  from public.ratings
  where character_id = loser_id
  for update;

  expected := 1 / (1 + exp((loser_mu - winner_mu) / scale));
  vote_impact := greatest(0.1, least(1.0, coalesce(vote_reliability, 1)));
  total_sigma := greatest(1, winner_sigma + loser_sigma);

  winner_delta := base_step * vote_impact * (winner_sigma / total_sigma) * (1 - expected);
  loser_delta := base_step * vote_impact * (loser_sigma / total_sigma) * expected;

  if effective_voter_key is not null then
    select count(*)
    into pair_repeats
    from public.votes
    where voter_session_id = effective_voter_key
      and created_at > now() - interval '1 day'
      and (
        (winner_character_id = winner_id and loser_character_id = loser_id)
        or (winner_character_id = loser_id and loser_character_id = winner_id)
      );
  end if;

  is_quick := coalesce(vote_latency_ms, 999999) < 1200;
  is_outlier := expected < 0.24;

  insert into public.votes(
    voter_session_id,
    winner_character_id,
    loser_character_id,
    selected_side,
    vote_latency_ms,
    voter_reliability,
    vote_weight,
    winner_expected_probability
  )
  values(
    effective_voter_key,
    winner_id,
    loser_id,
    selected_side,
    vote_latency_ms,
    vote_reliability,
    vote_impact,
    expected
  );

  update public.ratings
  set
    rating_mu = winner_mu + winner_delta,
    rating_sigma = greatest(45, winner_sigma - ((7 + (9 * (1 - expected))) * vote_impact)),
    elo_rating = winner_mu + winner_delta,
    wins = wins + 1,
    comparisons = comparisons + 1,
    updated_at = now()
  where character_id = winner_id;

  update public.ratings
  set
    rating_mu = loser_mu - loser_delta,
    rating_sigma = greatest(45, loser_sigma - ((7 + (9 * expected)) * vote_impact)),
    elo_rating = loser_mu - loser_delta,
    losses = losses + 1,
    comparisons = comparisons + 1,
    updated_at = now()
  where character_id = loser_id;

  if effective_voter_key is not null then
    update public.voter_reliability
    set
      votes_count = votes_count + 1,
      left_count = left_count + case when selected_side = 'left' then 1 else 0 end,
      right_count = right_count + case when selected_side = 'right' then 1 else 0 end,
      quick_votes = quick_votes + case when is_quick then 1 else 0 end,
      outlier_votes = outlier_votes + case when is_outlier then 1 else 0 end,
      repeated_pair_votes = repeated_pair_votes + case when pair_repeats >= 2 then 1 else 0 end,
      last_vote_at = now(),
      updated_at = now()
    where public.voter_reliability.voter_key = effective_voter_key
    returning votes_count, left_count, right_count, quick_votes, outlier_votes, repeated_pair_votes
    into new_votes, new_left, new_right, new_quick, new_outlier, new_repeated;

    quick_ratio := new_quick::numeric / greatest(new_votes, 1);
    side_bias := abs(new_left - new_right)::numeric / greatest(new_votes, 1);
    outlier_ratio := new_outlier::numeric / greatest(new_votes, 1);
    suspicion :=
      case when new_votes >= 5 then greatest(0, quick_ratio - 0.35) * 0.9 else 0 end
      + case when new_votes >= 10 then greatest(0, side_bias - 0.75) * 1.6 else 0 end
      + case when new_votes >= 8 then greatest(0, outlier_ratio - 0.35) * 1.1 else 0 end
      + least(0.35, new_repeated * 0.04);

    recalculated_reliability := greatest(0.1, least(1.0, 1.0 - suspicion));

    update public.voter_reliability
    set reliability = (reliability * 0.65) + (recalculated_reliability * 0.35)
    where public.voter_reliability.voter_key = effective_voter_key;
  end if;

  perform public.snapshot_rating_history(winner_id);
  perform public.snapshot_rating_history(loser_id);
end;
$$;

create or replace function public.get_random_pair()
returns table(left_character jsonb, right_character jsonb)
language sql
volatile
as $$
  with settings as (
    select
      random() as mode_roll,
      random() as side_roll,
      greatest(random(), 0.000001) as normal_u1,
      random() as normal_u2
  ),
  ranked as (
    select
      cr.*,
      count(*) over ()::integer as roster_size,
      (
        1
        + least(6, cr.rating_sigma / 70)
        + (9 / sqrt(cr.comparisons + 1))
        + case
            when cr.comparisons = 0 then 10
            when cr.comparisons < 3 then 6
            when cr.comparisons < 8 then 3
            when cr.comparisons < 15 then 1.5
            else 0
          end
      ) as test_weight
    from public.character_rankings cr
  ),
  first_pick as (
    select r.*
    from ranked r
    order by (-ln(greatest(random(), 0.000001)) / r.test_weight)
    limit 1
  ),
  target as (
    select
      f.*,
      s.mode_roll,
      s.side_roll,
      sqrt(-2 * ln(s.normal_u1)) * cos(2 * pi() * s.normal_u2) as normal_offset,
      greatest(f.rank_position - 1, f.roster_size - f.rank_position, 1) as rank_span
    from first_pick f
    cross join settings s
  ),
  sampled_target as (
    select
      t.*,
      case
        when t.mode_roll < 0.08 then greatest(4, t.rank_span * 0.70)
        when t.mode_roll < 0.22 then greatest(3, t.rank_span * 0.35)
        else greatest(2, t.rank_span * 0.16)
      end as rank_sigma
    from target t
  ),
  second_pick as (
    select r.*
    from ranked r
    cross join sampled_target t
    where r.id <> t.id
    order by
      abs(
        r.rank_position
        - least(
            t.roster_size,
            greatest(1, round(t.rank_position + (t.normal_offset * t.rank_sigma))::integer)
          )
      )
      - least(r.rating_sigma, 350) * 0.12
      - (42 / sqrt(r.comparisons + 1))
      - case
          when r.comparisons = 0 then 18
          when r.comparisons < 3 then 11
          when r.comparisons < 8 then 6
          when r.comparisons < 15 then 3
          else 0
        end
      + random() * case
          when t.mode_roll < 0.08 then t.rank_sigma * 0.85
          when t.mode_roll < 0.22 then t.rank_sigma * 0.35
          else t.rank_sigma * 0.16
        end
    limit 1
  )
  select
    case when (select side_roll from settings) < 0.5 then (select to_jsonb(first_pick.*) - 'roster_size' - 'test_weight' from first_pick) else (select to_jsonb(second_pick.*) - 'roster_size' - 'test_weight' from second_pick) end as left_character,
    case when (select side_roll from settings) < 0.5 then (select to_jsonb(second_pick.*) - 'roster_size' - 'test_weight' from second_pick) else (select to_jsonb(first_pick.*) - 'roster_size' - 'test_weight' from first_pick) end as right_character;
$$;

alter table public.voter_reliability enable row level security;
alter table public.rating_history enable row level security;
alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'voter_reliability' and policyname = 'Read voter reliability'
  ) then
    create policy "Read voter reliability" on public.voter_reliability for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rating_history' and policyname = 'Read rating history'
  ) then
    create policy "Read rating history" on public.rating_history for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Read profiles'
  ) then
    create policy "Read profiles" on public.profiles for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'friend_requests' and policyname = 'Read own friend requests'
  ) then
    create policy "Read own friend requests"
    on public.friend_requests
    for select
    using (auth.uid() = requester_id or auth.uid() = addressee_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'friend_requests' and policyname = 'Create own friend requests'
  ) then
    create policy "Create own friend requests"
    on public.friend_requests
    for insert
    with check (auth.uid() = requester_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'friend_requests' and policyname = 'Respond to received friend requests'
  ) then
    create policy "Respond to received friend requests"
    on public.friend_requests
    for update
    using (auth.uid() = addressee_id and status = 'pending')
    with check (auth.uid() = addressee_id and status in ('accepted', 'declined'));
  end if;
end;
$$;

