-- Preserve preview images without exposing full article bodies in listing responses.
create or replace function private.public_articles(p_path text default null,p_offset integer default 0,p_section text default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row),'[]'::jsonb) from (
  select a.id,a.canonical_path,a.published_at,r.created_at as updated_at,a.withdrawn,a.withdrawal_note,
    r.payload->>'title' as title,r.payload->>'byline' as byline,r.payload->>'section' as section,
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


