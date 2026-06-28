with restored_oda as (
  insert into public.characters (
    name,
    wiki_title,
    wiki_url,
    image_url,
    description,
    status,
    canon,
    gender,
    race,
    affiliations,
    active,
    needs_enrichment,
    strength_summary,
    weakness_summary,
    signature_move,
    tags,
    last_synced_at
  )
  values (
    'Eiichiro Oda',
    'Eiichiro_Oda',
    'https://onepiece.fandom.com/wiki/Eiichiro_Oda',
    'https://static.wikia.nocookie.net/shipoffools/images/3/35/Oda%27s_Avatar_SBS_Volume_62.png/revision/latest/scale-to-width-down/136?cb=20140121230022',
    'Eiichiro Oda is the creator of One Piece, represented here by his fish-head author avatar from SBS Volume 62. He enters this ranking as a special joke challenger rather than a canon fighter. Just like Oda says through One Piece, "I have friends!"; so I''d like to thank all of my friends SD, LD, SL, and FM for helping me test this project!',
    'Active',
    false,
    'Male',
    'Human',
    array['One Piece Creator'],
    true,
    false,
    'Author authority',
    'Not a canon fighter',
    'Fish-head author avatar',
    array['Special', 'Creator'],
    now()
  )
  on conflict (name) do update
  set
    wiki_title = excluded.wiki_title,
    wiki_url = excluded.wiki_url,
    image_url = excluded.image_url,
    description = excluded.description,
    status = excluded.status,
    canon = excluded.canon,
    gender = excluded.gender,
    race = excluded.race,
    affiliations = excluded.affiliations,
    active = excluded.active,
    needs_enrichment = excluded.needs_enrichment,
    strength_summary = excluded.strength_summary,
    weakness_summary = excluded.weakness_summary,
    signature_move = excluded.signature_move,
    tags = excluded.tags,
    last_synced_at = excluded.last_synced_at
  returning id
)
insert into public.ratings(character_id, elo_rating, rating_mu, rating_sigma)
select id, 1500, 1500, 350
from restored_oda
on conflict (character_id) do nothing;
