import type { Circuit } from "./types";

export function validateCircuit(circuit: Circuit): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const p of circuit.parts) {
    if (ids.has(p.id)) errors.push(`Duplicate component id: ${p.id}`);
    ids.add(p.id);
    if (!p.label.trim()) errors.push(`Component ${p.id} needs a reference label.`);
    if (p.type === "resistor" && (!Number.isFinite(p.value) || p.value <= 0)) errors.push(`${p.label}: resistance must be positive.`);
    if (p.type === "battery" && !Number.isFinite(p.value)) errors.push(`${p.label}: voltage must be finite.`);
  }
  for (const w of circuit.wires) {
    const [a] = w.a.split(":");
    const [b] = w.b.split(":");
    if (!ids.has(a) || !ids.has(b)) errors.push(`Wire ${w.id} references a missing component.`);
    if (w.a === w.b) errors.push(`Wire ${w.id} connects a terminal to itself.`);
  }
  return errors;
}
