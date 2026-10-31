create table if not exists public.site_workspaces (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version bigint not null default 1 check (version > 0),
  writer_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_workspaces enable row level security;

revoke all on table public.site_workspaces from anon, authenticated;
grant select (owner_id, data, version, writer_id, updated_at)
  on table public.site_workspaces to authenticated;
grant insert (owner_id, data, writer_id)
  on table public.site_workspaces to authenticated;
grant update (data, writer_id)
  on table public.site_workspaces to authenticated;

drop policy if exists "Users can read their own SiteCore workspace" on public.site_workspaces;
create policy "Users can read their own SiteCore workspace"
  on public.site_workspaces for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create their own SiteCore workspace" on public.site_workspaces;
create policy "Users can create their own SiteCore workspace"
  on public.site_workspaces for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update their own SiteCore workspace" on public.site_workspaces;
create policy "Users can update their own SiteCore workspace"
  on public.site_workspaces for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create or replace function public.bump_site_workspace_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

revoke all on function public.bump_site_workspace_revision() from public;

drop trigger if exists site_workspaces_revision on public.site_workspaces;
create trigger site_workspaces_revision
  before update on public.site_workspaces
  for each row execute function public.bump_site_workspace_revision();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'site_workspaces'
    ) then
    alter publication supabase_realtime add table public.site_workspaces;
  end if;
end;
$$;
