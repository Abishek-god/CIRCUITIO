-- SQL privileges are separate from RLS policies; RLS still restricts rows to public projects.
grant select on public.circuit_projects to anon;
