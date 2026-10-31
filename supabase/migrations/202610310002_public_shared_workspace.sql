-- Public shared SiteCore demo workspace.
-- Deliberately no user identity: every visitor can read and update one fixed row.

create table if not exists public.site_shared_workspaces (
  workspace_key text primary key check (workspace_key = 'northline'),
  data jsonb not null check (
    jsonb_typeof(data) = 'object'
    and data ?& array['assets', 'zones', 'incidents', 'maintenanceTasks', 'inspections', 'events', 'settings', 'simulation']
    and jsonb_typeof(data->'assets') = 'array'
    and jsonb_typeof(data->'zones') = 'array'
    and jsonb_typeof(data->'incidents') = 'array'
    and jsonb_typeof(data->'maintenanceTasks') = 'array'
    and jsonb_typeof(data->'inspections') = 'array'
    and jsonb_typeof(data->'events') = 'array'
    and jsonb_typeof(data->'settings') = 'object'
    and jsonb_typeof(data->'simulation') = 'object'
    and octet_length(data::text) <= 1048576
  ),
  revision bigint not null default 1 check (revision > 0),
  writer_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_shared_workspaces enable row level security;
revoke all on table public.site_shared_workspaces from public, anon, authenticated;
grant select (workspace_key, data, revision, writer_id, updated_at)
  on table public.site_shared_workspaces to anon, authenticated;
grant insert (workspace_key, data, writer_id)
  on table public.site_shared_workspaces to anon, authenticated;
grant update (data, writer_id)
  on table public.site_shared_workspaces to anon, authenticated;

drop policy if exists "Anyone can read the SiteCore demo workspace" on public.site_shared_workspaces;
create policy "Anyone can read the SiteCore demo workspace"
  on public.site_shared_workspaces for select to anon, authenticated
  using (workspace_key = 'northline');

drop policy if exists "Anyone can initialize the SiteCore demo workspace" on public.site_shared_workspaces;
create policy "Anyone can initialize the SiteCore demo workspace"
  on public.site_shared_workspaces for insert to anon, authenticated
  with check (workspace_key = 'northline');

drop policy if exists "Anyone can edit the SiteCore demo workspace" on public.site_shared_workspaces;
create policy "Anyone can edit the SiteCore demo workspace"
  on public.site_shared_workspaces for update to anon, authenticated
  using (workspace_key = 'northline')
  with check (workspace_key = 'northline');

-- Keep the previous 20 versions so a public edit can be recovered manually.
create table if not exists public.site_shared_workspace_revisions (
  revision_id bigint generated always as identity primary key,
  workspace_key text not null,
  revision bigint not null,
  data jsonb not null,
  writer_id text not null,
  updated_at timestamptz not null
);

alter table public.site_shared_workspace_revisions enable row level security;
revoke all on table public.site_shared_workspace_revisions from public, anon, authenticated;

create or replace function public.bump_site_shared_workspace_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.site_shared_workspace_revisions (workspace_key, revision, data, writer_id, updated_at)
  values (old.workspace_key, old.revision, old.data, old.writer_id, old.updated_at);

  delete from public.site_shared_workspace_revisions
  where revision_id in (
    select revision_id
    from public.site_shared_workspace_revisions
    where workspace_key = old.workspace_key
    order by revision_id desc
    offset 20
  );

  new.updated_at := now();
  new.revision := old.revision + 1;
  return new;
end;
$$;

revoke all on function public.bump_site_shared_workspace_revision() from public;

drop trigger if exists site_shared_workspaces_revision on public.site_shared_workspaces;
create trigger site_shared_workspaces_revision
  before update on public.site_shared_workspaces
  for each row execute function public.bump_site_shared_workspace_revision();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'site_shared_workspaces'
    ) then
    alter publication supabase_realtime add table public.site_shared_workspaces;
  end if;
end;
$$;
