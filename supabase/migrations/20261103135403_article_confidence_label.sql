-- Optional revision-owned confidence metadata only. No table, RLS, role or authentication changes.
-- Accepted 2026-09-24: optional editorial metadata, direct publication, non-Admin Studio roles at AAL1.
create or replace function private.validate_article(p jsonb, submitting boolean)
returns void
language plpgsql
set search_path=''
as $$
declare
  b jsonb;
  s jsonb;
  block_type text;
  item jsonb;
  field text;
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
    or (p ? 'confidence' and p->'confidence' <> 'null'::jsonb and
      (jsonb_typeof(p->'confidence') <> 'string' or p->>'confidence' not in ('confirmed','reported','rumor')))
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

    if b ? 'inline' then perform private.validate_inline(b->'inline'); end if;
    if b ? 'items' then
      if jsonb_typeof(b->'items') <> 'array' or jsonb_array_length(b->'items')>500 then raise exception 'STUDIO_INVALID: Invalid list items.'; end if;
      for item in select value from jsonb_array_elements(b->'items') loop perform private.validate_inline(item); end loop;
    end if;
    if b ? 'level' and b->>'level' not in ('2','3') then raise exception 'STUDIO_INVALID: Invalid heading level.'; end if;
    if b ? 'ordered' and jsonb_typeof(b->'ordered')<>'boolean' then raise exception 'STUDIO_INVALID: Invalid list style.'; end if;
    if block_type = 'image' then
      foreach field in array array['alt','caption','credit','sourceName','sourceUrl','rightsNote','ownership'] loop
        if b ? field and (jsonb_typeof(b->field)<>'string' or length(b->>field)>2048) then raise exception 'STUDIO_INVALID: Invalid image metadata.'; end if;
      end loop;
      if coalesce(b->>'sourceUrl','')<>'' and not private.editorial_https(b->>'sourceUrl') then raise exception 'STUDIO_INVALID: Image source needs an HTTPS URL.'; end if;
      if coalesce(b->>'ownership','') not in ('','external','phonefuturist') then raise exception 'STUDIO_INVALID: Invalid image ownership designation.'; end if;
      if not private.editorial_https(b->>'url')
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
      or not private.editorial_https(s->>'url')
      or length(s->>'url') > 2048
      or coalesce(length(s->>'note'), 0) > 1000
    then
      raise exception 'STUDIO_INVALID: Sources need a label and HTTPS URL.';
    end if;
  end loop;

  if submitting
    and (
      jsonb_array_length(p->'blocks') = 0
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
    raise exception 'STUDIO_INVALID: Add article content before publishing.';
  end if;

end;
$$;

revoke all on function private.validate_article(jsonb,boolean) from public,anon,authenticated;

-- Preserve preview images without exposing full article bodies in listing responses.
create or replace function private.public_articles(p_path text default null,p_offset integer default 0,p_section text default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row),'[]'::jsonb) from (
  select a.id,a.canonical_path,a.published_at,r.created_at as updated_at,a.withdrawn,a.withdrawal_note,
    r.payload->>'title' as title,r.payload->>'byline' as byline,r.payload->>'section' as section,
    case when a.withdrawn then null when r.payload->>'confidence' in ('confirmed','reported','rumor') then r.payload->>'confidence' else null end as confidence,
    case when a.withdrawn then null else (
      select jsonb_build_object('url',image->>'url','alt',image->>'alt')
      from jsonb_array_elements(r.payload->'blocks') with ordinality as images(image,position)
      where image->>'type'='image' and private.editorial_https(image->>'url') order by position limit 1
    ) end as card_image,
    case when a.withdrawn then '' else r.payload->>'summary' end as summary,
    case when a.withdrawn or p_path is null then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('type',b->>'type','text',b->>'text','url',b->>'url','alt',b->>'alt','caption',b->>'caption','credit',b->>'credit','sourceName',b->>'sourceName','sourceUrl',b->>'sourceUrl','rightsNote',b->>'rightsNote','ownership',b->>'ownership','inline',private.public_inline(b->'inline'),'items',case when jsonb_typeof(b->'items')='array' then (select jsonb_agg(private.public_inline(item)) from jsonb_array_elements(b->'items') item where jsonb_typeof(item)='array') end,'level',b->'level','ordered',b->'ordered')),'[]'::jsonb) from jsonb_array_elements(r.payload->'blocks') b) end as blocks,
    case when a.withdrawn or p_path is null then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('label',s->>'label','url',s->>'url','note',s->>'note')),'[]'::jsonb) from jsonb_array_elements(r.payload->'sources') s) end as sources,
    case when a.withdrawn then '' else r.payload->>'correctionNote' end as correction_note,
    case when a.withdrawn or p_path is null then '[]'::jsonb else (
      select coalesce(jsonb_agg(note order by note.recorded_at),'[]'::jsonb) from (
        select distinct e.revision,e.recorded_at,nr.payload->>'correctionNote' as message
        from private.article_events e join private.article_revisions nr on nr.article_id=e.article_id and nr.revision=e.revision
        where e.article_id=a.id and e.action in ('publish','override_publish') and length(trim(coalesce(nr.payload->>'correctionNote','')))>0
      ) note
    ) end as public_notes
   from private.articles a join private.article_revisions r on r.article_id=a.id and r.revision=a.public_revision
   where a.published_at is not null and (p_path is null or a.canonical_path=p_path) and (p_section is null or r.payload->>'section'=p_section)
   order by a.published_at desc,a.id limit 30 offset greatest(0,least(coalesce(p_offset,0),100000))
 ) row;
$$;
revoke all on function private.public_articles(text,integer,text) from public,anon,authenticated;
grant usage on schema private to anon;
grant execute on function private.public_articles(text,integer,text) to anon,authenticated;
create or replace function public.public_articles(p_path text default null,p_offset integer default 0,p_section text default null) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.public_articles(p_path,p_offset,p_section); $$;
revoke all on function public.public_articles(text,integer,text) from public,anon,authenticated;
grant execute on function public.public_articles(text,integer,text) to anon,authenticated;
