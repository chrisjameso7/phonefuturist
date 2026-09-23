create or replace function private.validate_article(p jsonb, submitting boolean)
returns void
language plpgsql
set search_path=''
as $$
declare
  b jsonb;
  s jsonb;
  block_type text;
begin
  if p is null
    or jsonb_typeof(p) <> 'object'
    or octet_length(p::text) > 2097152
    or p->>'schemaVersion' is distinct from '1'
    or coalesce(length(trim(p->>'title')), 0) not between 1 and 180
    or coalesce(length(p->>'summary'), 0) > 500
    or coalesce(length(p->>'byline'), 0) > 160
    or coalesce(p->>'section', '') not in ('news', 'reports', 'leaks', 'analysis')
    or coalesce(p->>'slug', '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or length(p->>'slug') > 120
    or jsonb_typeof(p->'blocks') is distinct from 'array'
    or jsonb_typeof(p->'sources') is distinct from 'array'
    or coalesce(length(p->>'privateNotes'), 0) > 12000
    or coalesce(p->>'changeKind', '') not in ('initial', 'minor', 'update', 'correction')
    or coalesce(length(p->>'correctionNote'), 0) > 2000
  then
    raise exception 'STUDIO_INVALID: Check the article fields.';
  end if;

  if jsonb_array_length(p->'blocks') > 500 then
    raise exception 'STUDIO_INVALID: Article content exceeds the 500-block limit.';
  end if;

  if jsonb_array_length(p->'sources') > 30 then
    raise exception 'STUDIO_INVALID: Article exceeds the 30-source limit.';
  end if;

  for b in
    select value
    from jsonb_array_elements(p->'blocks')
  loop
    if jsonb_typeof(b) <> 'object' then
      raise exception 'STUDIO_INVALID: Invalid content block.';
    end if;

    block_type := coalesce(b->>'type', '');

    if block_type not in (
      'paragraph',
      'heading',
      'quote',
      'list',
      'link',
      'image'
    ) then
      raise exception 'STUDIO_INVALID: Unsupported content block type.';
    end if;

    if block_type = 'image' then
      if coalesce(b->>'url', '') !~ '^https\://[^[:space:]<>]+$'
        or length(b->>'url') > 2048
        or coalesce(length(b->>'alt'), 0) > 1000
        or coalesce(length(b->>'caption'), 0) > 2000
      then
        raise exception 'STUDIO_INVALID: Invalid image block.';
      end if;
    else
      if jsonb_typeof(b->'text') is distinct from 'string'
        or length(b->>'text') > 10000
      then
        raise exception 'STUDIO_INVALID: Invalid content block.';
      end if;

      if block_type = 'link'
        and (
          coalesce(b->>'url', '') !~ '^https\://[^[:space:]<>]+$'
          or length(b->>'url') > 2048
        )
      then
        raise exception 'STUDIO_INVALID: Invalid link block.';
      end if;
    end if;
  end loop;

  for s in
    select value
    from jsonb_array_elements(p->'sources')
  loop
    if jsonb_typeof(s) <> 'object'
      or coalesce(length(trim(s->>'label')), 0) not between 1 and 200
      or coalesce(s->>'url', '') !~ '^https\://[^[:space:]<>]+$'
      or length(s->>'url') > 2048
      or coalesce(length(s->>'note'), 0) > 1000
    then
      raise exception 'STUDIO_INVALID: Sources need a label and HTTPS URL.';
    end if;
  end loop;

  if submitting
    and (
      jsonb_array_length(p->'blocks') = 0
      or coalesce(length(trim(p->>'byline')), 0) = 0
      or coalesce(length(trim(p->>'summary')), 0) = 0
      or not exists (
        select 1
        from jsonb_array_elements(p->'blocks') as content_block(value)
        where
          (
            content_block.value->>'type' = 'image'
            and length(trim(coalesce(content_block.value->>'url', ''))) > 0
          )
          or length(trim(coalesce(content_block.value->>'text', ''))) > 0
      )
    )
  then
    raise exception 'STUDIO_INVALID: Submission needs a byline, summary and body.';
  end if;

  if submitting
    and p->>'changeKind' = 'correction'
    and coalesce(length(trim(p->>'correctionNote')), 0) < 10
  then
    raise exception 'STUDIO_INVALID: A material correction needs a public correction note.';
  end if;
end;
$$;

revoke all on function private.validate_article(jsonb, boolean)
from public, anon, authenticated;