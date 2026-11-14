-- Searchable public device picker for PhoneFuturist Lab.
-- Returns only sanitized device identity and evidence counts.
-- Raw intelligence tables remain private.

create or replace function public.simulation_device_search(p_query text default '')
returns table (
  slug text,
  brand text,
  name text,
  category text,
  lifecycle text,
  evidence_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select
      d.slug,
      d.brand,
      d.name,
      d.category,
      d.lifecycle,
      count(c.id) filter (
        where c.status = 'active'
          and (c.valid_until is null or c.valid_until >= now())
      ) as evidence_count
    from private.devices d
    left join private.device_claims c on c.device_id = d.id
    where
      length(trim(coalesce(p_query, ''))) = 0
      or d.name ilike '%' || trim(p_query) || '%'
      or d.brand ilike '%' || trim(p_query) || '%'
      or d.slug ilike '%' || replace(lower(trim(p_query)), ' ', '-') || '%'
      or (d.brand || ' ' || d.name) ilike '%' || trim(p_query) || '%'
    group by d.id, d.slug, d.brand, d.name, d.category, d.lifecycle
  )
  select slug, brand, name, category, lifecycle, evidence_count
  from candidates
  where evidence_count > 0
  order by
    case
      when lower(brand || ' ' || name) = lower(trim(coalesce(p_query, ''))) then 0
      when lower(name) = lower(trim(coalesce(p_query, ''))) then 1
      else 2
    end,
    evidence_count desc,
    brand asc,
    name asc
  limit 20;
$$;

revoke all on function public.simulation_device_search(text)
from public, anon, authenticated;

grant execute on function public.simulation_device_search(text)
to anon, authenticated;
