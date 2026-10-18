-- Public projects are read-only to visitors. Private projects remain owner-only.
create policy "Anyone can view explicitly public circuit projects"
  on public.circuit_projects
  for select
  to anon, authenticated
  using (visibility = 'public');

-- SQL privileges are separate from RLS policies; RLS still restricts rows to public projects.
grant select on public.circuit_projects to anon;
