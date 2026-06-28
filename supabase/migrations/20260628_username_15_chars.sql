alter table public.profiles
drop constraint if exists profiles_username_check;

alter table public.profiles
add constraint profiles_username_check
check (char_length(username) between 3 and 15)
not valid;

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
