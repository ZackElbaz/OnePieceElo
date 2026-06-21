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
