-- CIRCUITIO Phase 1 schema: private cloud circuit projects and simulation history.
create extension if not exists pgcrypto;

create table public.circuit_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text not null default '',
  circuit_json jsonb not null default '{"version":1,"parts":[],"wires":[]}'::jsonb,
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint circuit_projects_json_object check (jsonb_typeof(circuit_json) = 'object')
);
create index circuit_projects_owner_updated_idx on public.circuit_projects (owner_id, updated_at desc);

create table public.circuit_simulations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.circuit_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  solver_version text not null default 'mna-dc-v1',
  status text not null check (status in ('success','error')),
  results_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  constraint circuit_simulations_results_object check (jsonb_typeof(results_json) = 'object')
);
create index circuit_simulations_project_created_idx on public.circuit_simulations (project_id, created_at desc);
create index circuit_simulations_owner_created_idx on public.circuit_simulations (owner_id, created_at desc);

alter table public.circuit_projects enable row level security;
alter table public.circuit_simulations enable row level security;

create policy "Owners can view their circuit projects"
  on public.circuit_projects for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Owners can create circuit projects"
  on public.circuit_projects for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Owners can update their circuit projects"
  on public.circuit_projects for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Owners can delete their circuit projects"
  on public.circuit_projects for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can view their simulation results"
  on public.circuit_simulations for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Owners can save simulation results for their projects"
  on public.circuit_simulations for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.circuit_projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );
create policy "Owners can delete their simulation results"
  on public.circuit_simulations for delete to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.set_circuit_project_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger set_circuit_project_updated_at
before update on public.circuit_projects
for each row execute function public.set_circuit_project_updated_at();

grant select, insert, update, delete on public.circuit_projects to authenticated;
grant select, insert, delete on public.circuit_simulations to authenticated;
revoke all on public.circuit_projects from anon;
revoke all on public.circuit_simulations from anon;
