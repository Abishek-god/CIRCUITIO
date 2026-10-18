import { describe, expect, it } from "vitest";
import { solveCircuit } from "../lib/solver";
import type { Circuit } from "../lib/types";

const series: Circuit = {
  version: 1,
  parts: [
    { id: "V1", type: "battery", x: 0, y: 0, rotation: 0, value: 12, label: "V1" },
    { id: "R1", type: "resistor", x: 0, y: 0, rotation: 0, value: 2000, label: "R1" },
    { id: "R2", type: "resistor", x: 0, y: 0, rotation: 0, value: 4000, label: "R2" }
  ],
  wires: [
    { id: "w1", a: "V1:0", b: "R1:0" },
    { id: "w2", a: "R1:1", b: "R2:0" },
    { id: "w3", a: "R2:1", b: "V1:1" }
  ]
};

describe("DC solver", () => {
  it("solves a series loop with expected current and voltages", () => {
    const result = solveCircuit(series);
    expect(result.ok).toBe(true);
    expect(result.partResults.R1.current).toBeCloseTo(0.002, 8);
    expect(result.partResults.R2.current).toBeCloseTo(0.002, 8);
    expect(Math.abs(result.partResults.R1.voltage) + Math.abs(result.partResults.R2.voltage)).toBeCloseTo(12, 8);
  });

  it("models an open switch as zero current when its terminal voltages are defined", () => {
    const circuit: Circuit = {
      ...series,
      parts: [...series.parts, { id: "S1", type: "switch", x: 0, y: 0, rotation: 0, value: 0, label: "S1", closed: false }],
      wires: [
        ...series.wires,
        { id: "w4", a: "S1:0", b: "R1:0" },
        { id: "w5", a: "S1:1", b: "R1:1" }
      ]
    };
    const result = solveCircuit(circuit);
    expect(result.ok).toBe(true);
    expect(result.partResults.S1.current).toBe(0);
    expect(Math.abs(result.partResults.S1.voltage)).toBeCloseTo(4, 8);
  });

  it("rejects diode circuits until the diode model exists", () => {
    const c: Circuit = { ...series, parts: [...series.parts, { id: "D1", type: "diode", x: 0, y: 0, rotation: 0, value: 0, label: "D1" }] };
    expect(solveCircuit(c).ok).toBe(false);
    expect(solveCircuit(c).warnings[0]).toMatch(/Diode and LED/);
  });

  it("rejects a zero or negative resistor value", () => {
    const c: Circuit = { ...series, parts: series.parts.map(p => p.id === "R1" ? { ...p, value: 0 } : p) };
    expect(solveCircuit(c).ok).toBe(false);
  });
});
