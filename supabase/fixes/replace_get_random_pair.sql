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

