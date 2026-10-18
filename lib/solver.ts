import type { Circuit, Part, SolveResult } from "./types";

/**
 * DC modified-nodal analysis (MNA) solver.
 *
 * Supported: positive-valued resistors, ideal independent DC voltage sources,
 * and closed switches. Wires merge terminals into nodes. Battery terminal 0 is
 * the positive terminal relative to terminal 1. Current sign for each part is
 * positive from terminal 0 to terminal 1.
 *
 * Diodes/LEDs and open switches are explicitly marked unsupported rather than
 * returning made-up physical measurements.
 */
const term = (p: Part, side: 0 | 1) => `${p.id}:${side}`;

function gaussian(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const d = m[col][col];
    for (let c = col; c <= n; c++) m[col][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col];
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
    }
  }
  return m.map(row => row[n]);
}

function failure(message: string, warnings: string[] = []): SolveResult {
  return { ok: false, message, nodeVoltages: {}, partResults: {}, warnings };
}

export function solveCircuit(circuit: Circuit): SolveResult {
  const warnings: string[] = [];
  const unsupported = circuit.parts.filter(p =>
    p.type === "diode" || p.type === "led" || (p.type === "switch" && !p.closed)
  );
  if (circuit.parts.some(p => p.type === "diode" || p.type === "led")) {
    warnings.push("Diode and LED symbols are not simulated yet; their nonlinear models are not part of this DC solver.");
  }
  if (circuit.parts.some(p => p.type === "switch" && !p.closed)) {
    warnings.push("Open-switch branch behaviour is not simulated in this solver version.");
  }
  if (unsupported.length) {
    // Do not silently omit placed components and show misleading circuit-wide results.
    return failure("This circuit contains unsupported components. Remove or replace them before running this solver.", warnings);
  }

  const supported = circuit.parts.filter(p => p.type === "resistor" || p.type === "battery" || (p.type === "switch" && p.closed));
  for (const p of supported) {
    if (p.type === "resistor" && (!Number.isFinite(p.value) || p.value <= 0)) return failure(`${p.label}: resistance must be a positive finite value.`, warnings);
    if (p.type === "battery" && !Number.isFinite(p.value)) return failure(`${p.label}: voltage must be finite.`, warnings);
  }
  if (!supported.some(p => p.type === "battery")) return failure("Add at least one DC voltage source.", warnings);

  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    const p = parent.get(x)!;
    if (p !== x) parent.set(x, find(p));
    return parent.get(x)!;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const p of supported) { find(term(p, 0)); find(term(p, 1)); }
  for (const w of circuit.wires) {
    if (!w.a || !w.b || !parent.has(w.a) || !parent.has(w.b)) return failure("A wire refers to a missing terminal.", warnings);
    union(w.a, w.b);
  }

  const nodeOf = new Map<string, string>();
  for (const key of parent.keys()) nodeOf.set(key, find(key));
  const nodes = [...new Set([...nodeOf.values()])];
  if (nodes.length < 2) return failure("Connect components into at least two distinct electrical nodes.", warnings);

  const ground = nodes[0];
  const nonGround = nodes.filter(n => n !== ground);
  const index = new Map(nonGround.map((node, i) => [node, i]));
  const pnode = (p: Part, side: 0 | 1) => nodeOf.get(term(p, side))!;
  const resistors = supported.filter(p => p.type === "resistor" || (p.type === "switch" && p.closed));
  const sources = supported.filter(p => p.type === "battery");
  const n = nonGround.length, size = n + sources.length;
  const A = Array.from({ length: size }, () => Array(size).fill(0) as number[]);
  const z = Array(size).fill(0);

  for (const p of resistors) {
    const a = pnode(p, 0), b = pnode(p, 1);
    if (a === b) return failure(`${p.label} is shorted by a wire. Ideal shorted resistors are not supported.`, warnings);
    const g = p.type === "switch" ? 1e9 : 1 / p.value;
    const ia = index.get(a), ib = index.get(b);
    if (ia !== undefined) A[ia][ia] += g;
    if (ib !== undefined) A[ib][ib] += g;
    if (ia !== undefined && ib !== undefined) { A[ia][ib] -= g; A[ib][ia] -= g; }
  }
  sources.forEach((p, k) => {
    const a = pnode(p, 0), b = pnode(p, 1), s = n + k;
    const ia = index.get(a), ib = index.get(b);
    if (ia !== undefined) { A[ia][s] += 1; A[s][ia] += 1; }
    if (ib !== undefined) { A[ib][s] -= 1; A[s][ib] -= 1; }
    z[s] = p.value;
  });

  const x = gaussian(A, z);
  if (!x) return failure("The circuit matrix is singular. Check for floating nodes, disconnected branches or conflicting ideal voltage sources.", warnings);

  const nodeVoltages: Record<string, number> = { [ground]: 0 };
  nonGround.forEach((node, i) => { nodeVoltages[node] = x[i]; });
  const partResults: SolveResult["partResults"] = {};
  const sourcePosition = new Map(sources.map((p, i) => [p.id, i]));
  for (const p of supported) {
    const va = nodeVoltages[pnode(p, 0)] ?? 0;
    const vb = nodeVoltages[pnode(p, 1)] ?? 0;
    const voltage = va - vb;
    let current = 0;
    if (p.type === "resistor") current = voltage / p.value;
    else if (p.type === "switch") current = voltage * 1e9;
    else if (p.type === "battery") current = x[n + sourcePosition.get(p.id)!];
    partResults[p.id] = { voltage, current, power: voltage * current };
  }
  return { ok: true, message: "DC operating point calculated.", nodeVoltages, partResults, warnings };
}
