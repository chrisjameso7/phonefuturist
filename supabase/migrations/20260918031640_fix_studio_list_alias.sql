create or replace function private.studio_read(p_article uuid default null,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; a private.articles;
begin
 if not (private.editorial_can('writer') or private.editorial_can('editor') or private.editorial_can('publisher')) then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
 if p_article is null then
   select coalesce(jsonb_agg(row),'[]'::jsonb) into result from (
     select listed.id,listed.version,listed.current_revision,listed.state,listed.public_revision,listed.canonical_path,listed.withdrawn,listed.updated_at,
       r.payload->>'title' as title,r.payload->>'section' as section
     from private.articles listed join private.article_revisions r on r.article_id=listed.id and r.revision=listed.current_revision
     where listed.creator_id=auth.uid() or private.editorial_can('editor') or private.editorial_can('publisher')
     order by listed.updated_at desc,listed.id limit 30 offset greatest(0,least(coalesce(p_offset,0),100000))
   ) row;
 else
   select * into a from private.articles where id=p_article;
   if not found or not (a.creator_id=auth.uid() or private.editorial_can('editor') or private.editorial_can('publisher')) then raise exception 'STUDIO_FORBIDDEN' using errcode='42501'; end if;
   select to_jsonb(a)||jsonb_build_object('payload',r.payload,'revision_author',r.created_by,
      'events',(select coalesce(jsonb_agg(e order by e.id desc),'[]'::jsonb) from (select revision,action,message,recorded_at,id from private.article_events where article_id=a.id order by id desc limit 50) e),
      'revisions',(select coalesce(jsonb_agg(h order by h.revision desc),'[]'::jsonb) from (select revision,created_at,payload->>'title' as title from private.article_revisions where article_id=a.id order by revision desc limit 50) h))
    into result from private.article_revisions r where r.article_id=a.id and r.revision=a.current_revision;
 end if;
 return result;
end;
$$;

