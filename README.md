# CIRCUITIO — Phase 1: Circuit Designer MVP

A React/Next.js + TypeScript web application for creating and analysing introductory DC circuits.

## Phase 1 scope
- Grid-based schematic canvas
- Component library: battery, resistor, switch, diode, LED
- Wire placement and terminal connectivity
- Component property editing
- DC simulation for supported linear circuits
- Voltage, current and power measurements
- Circuit JSON import/export and schematic SVG export

## Architecture
- `app/`: user interface and editor interactions
- `lib/types.ts`: canonical circuit graph schema
- `lib/solver.ts`: independent electrical solver (not coupled to the UI)
- `lib/validation.ts`: circuit validation

## Solver contract
The initial solver supports ideal DC voltage sources, positive-valued resistors and closed switches. Diode and LED symbols are part of the palette, but must not be treated as physically simulated until a nonlinear diode model is integrated. Unsupported elements must generate an explicit warning rather than fabricated readings.

## Development
Use Node.js 20.9+ and npm. Install dependencies with `npm install`; start with `npm run dev`.

## MVP acceptance criteria
1. Add, move, select and delete components on a grid canvas.
2. Connect component terminals with wires and preserve electrical topology independently of canvas coordinates.
3. Edit component values and validate them.
4. Run the DC solver on supported circuits and surface clear errors for singular or invalid circuits.
5. Display component voltage, current and power, with stated sign conventions.
6. Export/import circuit JSON and export a schematic SVG.
7. Include automated tests for simple series, parallel, KCL/KVL consistency, floating nodes and invalid component values.
