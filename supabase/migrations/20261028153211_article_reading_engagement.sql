-- Aggregate engagement only; individual reading records stay in the private schema.
create table private.article_reads (
 article_id uuid not null references private.articles(id) on delete cascade,
 reader_key text not null check(char_length(reader_key) between 10 and 80),
 read_day date not null default (now() at time zone 'UTC')::date,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 primary key(article_id,reader_key,read_day)
);
create table private.article_likes (
 article_id uuid not null references private.articles(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 liked_at timestamptz not null default now(),
 primary key(article_id,user_id)
);
create index article_likes_user on private.article_likes(user_id);
alter table private.article_reads enable row level security;
alter table private.article_likes enable row level security;
revoke all on private.article_reads,private.article_likes from public,anon,authenticated;

create function public.article_engagement(p_article uuid,p_action text default 'stats',p_reader text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_key text;v_user uuid:=auth.uid();v_ready boolean;v_day date:=(now() at time zone 'UTC')::date;
begin
 if p_action not in ('stats','start','complete','like','unlike') then raise exception 'Unknown engagement action';end if;
 if not exists(select 1 from private.articles a where a.id=p_article and a.published_at is not null and a.public_revision is not null and not a.withdrawn) then raise exception 'Article unavailable';end if;
 v_key:=case when v_user is not null then 'user:'||v_user::text when p_reader ~ '^[a-f0-9]{64}$' then p_reader else null end;
 if p_action in ('start','complete') then
  if v_key is null then raise exception 'Reader identifier required';end if;
  insert into private.article_reads(article_id,reader_key,read_day) values(p_article,v_key,v_day) on conflict do nothing;
  if p_action='complete' then update private.article_reads set completed_at=coalesce(completed_at,now()) where article_id=p_article and reader_key=v_key and read_day=v_day and started_at<=now()-interval '15 seconds';end if;
 end if;
 v_ready:=v_key is not null and exists(select 1 from private.article_reads where article_id=p_article and reader_key=v_key and completed_at is not null);
 if p_action in ('like','unlike') then
  if v_user is null or not private.lab_member() then raise exception 'Verified active account required' using errcode='42501';end if;
  if p_action='like' then
   if not v_ready then raise exception 'Finish reading before liking';end if;
   insert into private.article_likes(article_id,user_id) values(p_article,v_user) on conflict do nothing;
  else delete from private.article_likes where article_id=p_article and user_id=v_user;end if;
 end if;
 return jsonb_build_object('views',(select count(*) from private.article_reads where article_id=p_article),'likes',(select count(*) from private.article_likes where article_id=p_article),'liked',v_user is not null and exists(select 1 from private.article_likes where article_id=p_article and user_id=v_user),'readReady',v_ready);
end;
$$;
revoke all on function public.article_engagement(uuid,text,text) from public,anon,authenticated;
grant execute on function public.article_engagement(uuid,text,text) to anon,authenticated;
