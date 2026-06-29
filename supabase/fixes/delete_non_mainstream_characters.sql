with removed_characters as (
  select id
  from public.characters
  where lower(name) in (
    'shillew',
    'tokikake',
    'gion',
    'charlotte snack',
    'charlotte amande',
    'kingdew',
    'rakuyo',
    'curiel',
    'charlotte compote',
    'shakuyaku',
    'blamenco',
    'a o',
    'tamagon',
    'atmos',
    'heat',
    'ikkaku',
    'wire'
  )
  or lower(wiki_title) in (
    'shillew',
    'tokikake',
    'gion',
    'charlotte_snack',
    'charlotte_amande',
    'kingdew',
    'rakuyo',
    'curiel',
    'charlotte_compote',
    'shakuyaku',
    'blamenco',
    'a_o',
    'tamagon',
    'atmos',
    'heat',
    'ikkaku',
    'wire'
  )
),
deleted_votes as (
  delete from public.votes
  where winner_character_id in (select id from removed_characters)
     or loser_character_id in (select id from removed_characters)
),
deleted_history as (
  delete from public.rating_history
  where character_id in (select id from removed_characters)
),
deleted_ratings as (
  delete from public.ratings
  where character_id in (select id from removed_characters)
)
delete from public.characters
where id in (select id from removed_characters);
