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

alter table public.friend_requests enable row level security;

do $$
begin
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
