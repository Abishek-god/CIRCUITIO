export type PartType = "resistor" | "battery" | "diode" | "led" | "switch";
export type Part = {
  id: string;
  type: PartType;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  value: number;
  label: string;
  closed?: boolean;
};
export type Wire = { id: string; a: string; b: string }; // terminals: partId:0 or partId:1
export type Circuit = { version: 1; parts: Part[]; wires: Wire[] };
export type PartResult = { voltage: number; current: number; power: number };
export type SolveResult = {
  ok: boolean;
  message: string;
  nodeVoltages: Record<string, number>;
  partResults: Record<string, PartResult>;
  warnings: string[];
};
