# CIRCUITIO — Phase 1: Circuit Designer MVP

A Next.js, React and TypeScript starter for an educational schematic editor.

## Included
- Grid-based SVG canvas with draggable components and wire terminals.
- Component palette: ideal DC voltage source, resistor, switch, diode and LED.
- Editable labels, resistance, source voltage, switch state and rotation.
- Separate DC modified-nodal analysis solver for resistors, ideal voltage sources and closed switches.
- Component voltage, current and power readouts.
- Animated schematic-wire styling after successful solve.
- Circuit JSON import/export and SVG export.
- Validation and initial Vitest coverage.

## Run locally
Requires Node.js 20.9+ and npm.
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Validate
```bash
npm run typecheck
npm test
npm run build
```

## Solver scope
The solver supports linear DC circuits made of positive-valued resistors, ideal independent voltage sources and closed switches. Diodes and LEDs are visual placeholders until nonlinear models are implemented; the solver rejects circuits containing them to avoid misleading measurements. Open-switch branch modelling is also not implemented. Current is positive from terminal 0 to terminal 1; component power follows the passive sign convention.

The circuit schema represents each wire as a connection between two component terminals. A dedicated junction/net model is a recommended next step to support explicit multi-way junctions and robust branch wiring. The current canvas is an editor prototype, not a PCB layout tool or production-grade SPICE simulator.

## Planned next steps
1. Introduce explicit net/junction objects and wire splitting/branch routing.
2. Improve interaction: pan/zoom, undo/redo, orthogonal routing and multi-select.
3. Implement nonlinear diode/LED models or integrate a SPICE solver.
4. Add automated tests for KCL/KVL, parallel circuits, floating nodes and conflicting sources.
5. Add Supabase project persistence with row-level security after the local editor and solver are stable.
