# CIRCUITIO

CIRCUITIO is an educational circuit-design and simulation platform built with Next.js, React, TypeScript, and Supabase.

## Platform features

- SVG schematic editor with a component library (ideal DC source, resistor, switch, diode, LED).
- Editable component labels, values, and rotations; terminal-to-terminal wiring.
- Separate DC modified-nodal analysis solver for supported linear circuits.
- Voltage, current, and power readouts, plus explicit warnings for unsupported models.
- Circuit JSON import/export and SVG export.
- Supabase email/password authentication and session refresh.
- Private cloud projects, project duplication/deletion, and cloud save/load.
- Opt-in public, read-only circuit sharing.
- Simulation result history records saved alongside projects.
- Row Level Security (RLS) on project and simulation tables.
- Vitest solver tests and GitHub Actions CI.

## Stack

- Next.js 15, React 19, TypeScript
- Supabase Auth + PostgreSQL
- `@supabase/ssr` for browser/server auth clients
- Vitest

## Local setup

Requirements: Node.js 20.9+ and npm.

1. Copy `.env.example` to `.env.local`.
2. Fill in the Supabase project URL and publishable key from **Supabase → Project Settings → API Keys**.
3. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Supabase setup

The project migrations live in `supabase/migrations/`. Apply them to your Supabase project in order:

1. `20261018090825_circuitio_phase1_schema.sql`
2. `20261018091124_public_circuit_sharing.sql`
3. `20261018091319_grant_public_project_reads.sql`

These migrations create `circuit_projects` and `circuit_simulations`, indexes, a project timestamp trigger, grants, and RLS policies. The public read grant is paired with an RLS policy that only exposes rows whose visibility is explicitly `public`. Do not disable RLS.

In Supabase Authentication settings, configure the site URL and add the local and deployed callback URLs:
- `http://localhost:3000/auth/callback`
- `https://YOUR_DEPLOYED_DOMAIN/auth/callback`

For email/password signup, enable email confirmation if desired. New accounts may need to click the confirmation email before they can sign in.

## Routes

- `/` — circuit editor; use **Save to cloud** after signing in.
- `/login` — sign in or create an account.
- `/dashboard` — manage saved projects and public-sharing settings.
- `/share/<project-uuid>` — read-only view of a project marked public.
- `/auth/callback` — Supabase email confirmation callback.

## Validation

```bash
npm run typecheck
npm test
npm run build
```

The CI workflow runs these checks on pushes and pull requests.

## Solver limitations

The current solver supports positive-valued resistors, ideal independent DC voltage sources, and closed switches. Diode/LED symbols are not yet electrically modelled, and open-switch branch behaviour is not yet implemented. The solver intentionally rejects unsupported circuits instead of returning fabricated readings. This is an educational DC operating-point solver, not a full SPICE engine or PCB layout tool.

## Security notes

- Only the Supabase publishable key belongs in `.env.local` and browser code.
- Never expose a Supabase secret or service-role key to the browser.
- Private projects are protected by owner-scoped RLS policies.
- Public sharing is explicit and read-only; switching a project back to private disables anonymous access through the share page.
- Do not store credentials in GitHub.

## Current status

The schema and public-sharing policy have been applied to the connected Supabase project. Verify typecheck, tests, build, auth email settings, and the deployed URL before treating this branch as production-ready.
