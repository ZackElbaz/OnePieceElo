create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
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
  requested_username := nullif(trim(new.raw_user_meta_data->>'username'), '');

  insert into public.profiles(id, username)
  values(
    new.id,
    coalesce(requested_username, 'user_' || replace(new.id::text, '-', '')::text)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Read profiles'
  ) then
    create policy "Read profiles" on public.profiles for select using (true);
  end if;
end;
$$;
