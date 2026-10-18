"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Activity, BatteryCharging, Cable, Download, FilePlus2, Lightbulb, Play, Save, Settings2, Trash2, Zap } from "lucide-react";
import type { Circuit, Part, PartType, SolveResult } from "@/lib/types";
import { solveCircuit } from "@/lib/solver";
import { validateCircuit } from "@/lib/validation";

const initial: Circuit = {
  version: 1,
  parts: [
    { id: "V1", type: "battery", x: 130, y: 205, rotation: 0, value: 10, label: "V1" },
    { id: "R1", type: "resistor", x: 330, y: 105, rotation: 0, value: 1000, label: "R1" }
  ],
  wires: [{ id: "W1", a: "V1:0", b: "R1:0" }, { id: "W2", a: "R1:1", b: "V1:1" }]
};
const palette: { type: PartType; title: string; icon: typeof Activity; description: string }[] = [
  { type: "battery", title: "Battery", icon: BatteryCharging, description: "Ideal DC voltage source" },
  { type: "resistor", title: "Resistor", icon: Activity, description: "Resistance in ohms" },
  { type: "switch", title: "Switch", icon: Cable, description: "Open / closed" },
  { type: "diode", title: "Diode", icon: Zap, description: "Visual placeholder; solver model pending" },
  { type: "led", title: "LED", icon: Lightbulb, description: "Visual placeholder; solver model pending" }
];
const id = () => Math.random().toString(36).slice(2, 9);
const ends = (p: Part) => [{ x: p.x - 48, y: p.y, side: 0 as const }, { x: p.x + 48, y: p.y, side: 1 as const }];
const fmt = (v: number) => Number.isFinite(v) ? Number(v.toFixed(6)).toString() : "—";
const componentPrefix = (t: PartType) => t === "battery" ? "V" : t === "resistor" ? "R" : t === "switch" ? "S" : "D";

export default function Home() {
  const [circuit, setCircuit] = useState<Circuit>(initial);
  const [selected, setSelected] = useState<string | null>("R1");
  const [tool, setTool] = useState<"select" | "wire">("select");
  const [wireFrom, setWireFrom] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [status, setStatus] = useState("Ready to design");
  const [name, setName] = useState("Untitled circuit");
  const [cloudProjectId, setCloudProjectId] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const active = circuit.parts.find(p => p.id === selected) ?? null;
  const validErrors = validateCircuit(circuit);

  useEffect(() => {
    const projectId = new URLSearchParams(window.location.search).get("id");
    if (!projectId || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await createClient().from("circuit_projects")
          .select("id,name,circuit_json").eq("id", projectId).single();
        if (error) throw error;
        if (!data || !Array.isArray(data.circuit_json?.parts) || !Array.isArray(data.circuit_json?.wires)) throw new Error("Saved project has an invalid circuit format.");
        if (cancelled) return;
        setCircuit(data.circuit_json as Circuit);
        setName(data.name);
        setCloudProjectId(data.id);
        setSelected(null);
        setResult(null);
        setStatus("Cloud project loaded");
      } catch (e) {
        if (!cancelled) setStatus(e instanceof Error ? e.message : "Could not load cloud project");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const patchPart = (partId: string, patch: Partial<Part>) => {
    setCircuit(c => ({ ...c, parts: c.parts.map(p => p.id === partId ? { ...p, ...patch } : p) }));
    setResult(null);
  };
  const addPart = (type: PartType) => {
    const n = circuit.parts.filter(p => p.type === type).length + 1;
    const prefix = componentPrefix(type);
    const p: Part = { id: `${prefix}${n}-${id()}`, label: `${prefix}${n}`, type, x: 250 + Math.random() * 200, y: 130 + Math.random() * 180, rotation: 0, value: type === "battery" ? 5 : type === "resistor" ? 1000 : 0, closed: type === "switch" };
    setCircuit(c => ({ ...c, parts: [...c.parts, p] }));
    setSelected(p.id); setResult(null); setStatus(`${p.label} added`);
  };
  const deletePart = () => {
    if (!selected) return;
    setCircuit(c => ({ ...c, parts: c.parts.filter(p => p.id !== selected), wires: c.wires.filter(w => !w.a.startsWith(`${selected}:`) && !w.b.startsWith(`${selected}:`)) }));
    setSelected(null); setResult(null); setStatus("Component deleted");
  };
  const point = (ref: string) => {
    const [pid, sideText] = ref.split(":");
    const p = circuit.parts.find(x => x.id === pid);
    if (!p) return { x: 0, y: 0 };
    const local = ends(p)[Number(sideText) as 0 | 1];
    const a = p.rotation * Math.PI / 180;
    const dx = local.x - p.x, dy = local.y - p.y;
    return { x: p.x + dx * Math.cos(a) - dy * Math.sin(a), y: p.y + dx * Math.sin(a) + dy * Math.cos(a) };
  };
  const addWireEnd = (ref: string) => {
    if (tool !== "wire") return;
    if (!wireFrom) { setWireFrom(ref); setStatus("Select the second terminal"); return; }
    if (wireFrom === ref) { setWireFrom(null); return; }
    const exists = circuit.wires.some(w => (w.a === wireFrom && w.b === ref) || (w.a === ref && w.b === wireFrom));
    if (!exists) setCircuit(c => ({ ...c, wires: [...c.wires, { id: `W-${id()}`, a: wireFrom, b: ref }] }));
    setWireFrom(null); setResult(null); setStatus(exists ? "Wire already exists" : "Wire connected");
  };
  const simulate = () => {
    if (validErrors.length) { setResult({ ok: false, message: "Fix circuit validation errors first.", nodeVoltages: {}, partResults: {}, warnings: validErrors }); return; }
    const r = solveCircuit(circuit); setResult(r); setStatus(r.ok ? "Simulation complete" : "Simulation needs attention");
  };
  const saveCloud = async () => {
    setCloudBusy(true);
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) throw new Error("Configure Supabase environment variables first.");
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) { window.location.href = "/login"; return; }
      const payload = { name: name.trim() || "Untitled circuit", circuit_json: circuit, updated_at: new Date().toISOString() };
      let savedId = cloudProjectId;
      if (savedId) {
        const { error } = await supabase.from("circuit_projects").update(payload).eq("id", savedId).eq("owner_id", user.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("circuit_projects").insert({ ...payload, owner_id: user.id, description: "", visibility: "private" }).select("id").single();
        if (error) throw error;
        savedId = data.id;
        setCloudProjectId(savedId);
        window.history.replaceState(null, "", `/?id=${savedId}`);
      }
      if (result) {
        const { error } = await supabase.from("circuit_simulations").insert({
          project_id: savedId, owner_id: user.id, status: result.ok ? "success" : "error",
          results_json: { message: result.message, nodeVoltages: result.nodeVoltages, partResults: result.partResults, warnings: result.warnings }
        });
        if (error) throw error;
      }
      setStatus(result ? "Cloud project and simulation saved" : "Cloud project saved");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not save cloud project");
    } finally {
      setCloudBusy(false);
    }
  };
  const saveJson = () => {
    const blob = new Blob([JSON.stringify({ name, circuit }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "circuit"}.json`; a.click(); URL.revokeObjectURL(url); setStatus("Circuit JSON exported");
  };
  const loadJson = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const c = parsed.circuit ?? parsed;
        if (!Array.isArray(c.parts) || !Array.isArray(c.wires)) throw new Error("not a circuit file");
        setCircuit(c); setName(parsed.name ?? file.name.replace(/\.json$/i, "")); setSelected(null); setResult(null); setStatus("Circuit loaded");
      } catch { setStatus("Could not load invalid JSON circuit file"); }
    };
    reader.readAsText(file);
  };
  const saveSvg = () => {
    if (!svg.current) return;
    const clone = svg.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "circuitio-schematic.svg"; a.click(); URL.revokeObjectURL(url); setStatus("SVG exported");
  };
  const movePart = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag || tool !== "select") return;
    const r = e.currentTarget.getBoundingClientRect();
    setCircuit(c => ({ ...c, parts: c.parts.map(p => p.id === drag.id ? { ...p, x: Math.max(30, Math.min(770, (e.clientX - r.left) * 800 / r.width - drag.dx)), y: Math.max(30, Math.min(430, (e.clientY - r.top) * 460 / r.height - drag.dy)) } : p) }));
    setResult(null);
  };

  return <main className="shell">
    <header className="topbar">
      <div className="brand-mark"><Activity size={23}/></div><div className="brand"><strong>CIRCUITIO</strong><small>Visual Circuit Designer · Phase 1</small></div>
      <div className="project"><span className="live-dot"/><input aria-label="Project name" value={name} onChange={e => setName(e.target.value)}/></div>
      <div className="actions"><a className="btn secondary" href="/dashboard">Projects</a><button className="btn secondary" onClick={() => void saveCloud()} disabled={cloudBusy}><Save size={15}/>{cloudBusy ? "Saving…" : "Save to cloud"}</button><label className="btn secondary">Open JSON<input hidden type="file" accept=".json,application/json" onChange={e => loadJson(e.target.files?.[0])}/></label><button className="btn secondary" onClick={saveJson}><Save size={15}/> Save JSON</button><button className="btn secondary" onClick={saveSvg}><Download size={15}/> Export SVG</button></div>
    </header>
    <div className="layout">
      <aside className="panel library">
        <div className="eyebrow">COMPONENT LIBRARY</div><h2>Components</h2><p className="muted">Select to add to the canvas.</p>
        {palette.map(it => <button className="component" key={it.type} onClick={() => addPart(it.type)}><span className={`part-icon ${it.type}`}><it.icon size={19}/></span><span className="component-text"><b>{it.title}</b><small>{it.description}</small></span><span className="plus">+</span></button>)}
        <hr/><div className="eyebrow">EDITOR TOOLS</div><button className={`tool ${tool === "select" ? "on" : ""}`} onClick={() => { setTool("select"); setWireFrom(null); }}><Settings2 size={16}/> Select / move</button><button className={`tool ${tool === "wire" ? "on" : ""}`} onClick={() => { setTool("wire"); setWireFrom(null); }}><Cable size={16}/> Connect terminals</button>
        {tool === "wire" && <div className="hint">Click one terminal, then click another terminal.</div>}
        <button className="tool" onClick={() => { setCircuit({ version: 1, parts: [], wires: [] }); setSelected(null); setResult(null); setName("Untitled circuit"); setStatus("New circuit"); }}><FilePlus2 size={16}/> New circuit</button>
      </aside>
      <section className="editor">
        <div className="canvas-heading"><div><div className="eyebrow">SCHEMATIC EDITOR</div><strong>Design canvas</strong></div><span className="canvas-meta">{circuit.parts.length} components · {circuit.wires.length} wires</span></div>
        <div className="canvas">
          <svg ref={svg} viewBox="0 0 800 460" className="schematic" aria-label="Schematic editing canvas" onPointerMove={movePart} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
            <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#d9e1ec"/></pattern></defs><rect width="800" height="460" fill="url(#grid)"/>
            {circuit.wires.map(w => { const a = point(w.a), b = point(w.b); return <g key={w.id}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={result?.ok ? "wire energized" : "wire"}/>{result?.ok && <circle r="3" className="flow-dot"><animateMotion dur="2s" repeatCount="indefinite" path={`M${a.x},${a.y} L${b.x},${b.y}`}/></circle>}</g>; })}
            {circuit.parts.map(p => <g key={p.id} transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`} className="part" onPointerDown={e => { if (tool !== "select") return; e.stopPropagation(); const r = svg.current!.getBoundingClientRect(); setDrag({ id: p.id, dx: (e.clientX-r.left)*800/r.width-p.x, dy:(e.clientY-r.top)*460/r.height-p.y }); setSelected(p.id); }} onClick={() => setSelected(p.id)}>
              <line x1="-48" y1="0" x2="-25" y2="0" className="pin-wire"/><line x1="25" y1="0" x2="48" y2="0" className="pin-wire"/>
              {p.type === "resistor" && <><path d="M-25 0 L-20 -10 L-10 10 L0 -10 L10 10 L20 -10 L25 0" className="symbol"/><text x="0" y="-23" textAnchor="middle" className="label">{p.label}</text><text x="0" y="28" textAnchor="middle" className="value">{p.value >= 1000 ? `${p.value/1000} kΩ` : `${p.value} Ω`}</text></>}
              {p.type === "battery" && <><line x1="-7" y1="-17" x2="-7" y2="17" className="symbol"/><line x1="7" y1="-10" x2="7" y2="10" className="symbol"/><text x="-17" y="-19" className="value">+</text><text x="0" y="-27" textAnchor="middle" className="label">{p.label}</text><text x="0" y="30" textAnchor="middle" className="value">{p.value} V</text></>}
              {p.type === "diode" && <><path d="M-20 -13 L10 0 L-20 13 Z" className="symbol"/><line x1="12" y1="-15" x2="12" y2="15" className="symbol"/><text x="0" y="-24" textAnchor="middle" className="label">{p.label} · diode</text></>}
              {p.type === "led" && <><path d="M-20 -13 L10 0 L-20 13 Z" className="symbol"/><line x1="12" y1="-15" x2="12" y2="15" className="symbol"/><path d="M0 -18 l8 -8 m-4 0 h4 v4 M8 -10 l8 -8 m-4 0 h4 v4" className="symbol"/><text x="0" y="-28" textAnchor="middle" className="label">{p.label} · LED</text></>}
              {p.type === "switch" && <><circle cx="-20" cy="0" r="2.5" className="pin"/><circle cx="20" cy="0" r="2.5" className="pin"/><line x1="-20" y1="0" x2={p.closed ? 20 : 12} y2={p.closed ? 0 : -12} className="symbol"/><text x="0" y="-24" textAnchor="middle" className="label">{p.label}</text><text x="0" y="28" textAnchor="middle" className="value">{p.closed ? "CLOSED" : "OPEN"}</text></>}
              {ends(p).map(t => <circle key={t.side} cx={t.x-p.x} cy="0" r={wireFrom === `${p.id}:${t.side}` ? 7 : 4} className={`terminal ${wireFrom === `${p.id}:${t.side}` ? "terminal-selected" : ""}`} onPointerDown={e => { e.stopPropagation(); addWireEnd(`${p.id}:${t.side}`); }} onClick={e => { e.stopPropagation(); addWireEnd(`${p.id}:${t.side}`); }}/>)}
              {selected === p.id && <rect x="-54" y="-38" width="108" height="76" rx="8" className="selection"/>}
              {result?.ok && result.partResults[p.id] && <text x="0" y="49" textAnchor="middle" className="measure">{fmt(result.partResults[p.id].voltage)} V · {fmt(result.partResults[p.id].current*1000)} mA</text>}
            </g>)}
            {!circuit.parts.length && <><text x="400" y="215" textAnchor="middle" className="empty">Your circuit starts here</text><text x="400" y="242" textAnchor="middle" className="muted-svg">Add a component from the library to begin.</text></>}
          </svg>
        </div>
        <div className="editor-footer"><span><span className="live-dot"/>{status}</span><span>20 px grid</span></div>
        <div className="sim-row"><div><Zap size={19}/><div><b>DC operating-point analysis</b><small>Linear DC solver · MNA</small></div></div><button className="btn primary" onClick={simulate}><Play size={15} fill="currentColor"/> Run simulation</button></div>
        {result && <div className={`feedback ${result.ok ? "good" : "bad"}`}><b>{result.ok ? "Simulation complete" : "Simulation needs attention"}</b><span>{result.message}</span>{[...validErrors, ...result.warnings].map((w, i) => <span key={i}>• {w}</span>)}</div>}
      </section>
      <aside className="panel inspector">
        <div className="eyebrow">INSPECTOR</div><h2>Properties</h2>
        {!active ? <p className="muted">Select a component on the canvas to edit its settings.</p> : <>
          <div className="selected-part"><span className={`part-icon ${active.type}`}>{active.type === "battery" ? <BatteryCharging size={20}/> : active.type === "resistor" ? <Activity size={20}/> : active.type === "led" ? <Lightbulb size={20}/> : <Zap size={20}/>}</span><div><b>{active.label}</b><small>{active.type}</small></div></div>
          <label className="field">Reference label<input value={active.label} onChange={e => patchPart(active.id, { label: e.target.value })}/></label>
          {(active.type === "resistor" || active.type === "battery") && <label className="field">{active.type === "resistor" ? "Resistance (Ω)" : "Voltage (V)"}<input type="number" step="any" value={active.value} onChange={e => patchPart(active.id, { value: Number(e.target.value) })}/></label>}
          {active.type === "switch" && <div className="field"><span>Switch state</span><button className={`state ${active.closed ? "closed" : ""}`} onClick={() => patchPart(active.id, { closed: !active.closed })}>{active.closed ? "Closed" : "Open"}</button></div>}
          <label className="field">Rotation<select value={active.rotation} onChange={e => patchPart(active.id, { rotation: Number(e.target.value) as Part["rotation"] })}><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label>
          <button className="btn delete" onClick={deletePart}><Trash2 size={15}/> Delete component</button>
          {result?.ok && result.partResults[active.id] && <div className="readings"><div className="eyebrow">SIMULATION READINGS</div><p><span>Voltage</span><b>{fmt(result.partResults[active.id].voltage)} V</b></p><p><span>Current</span><b>{fmt(result.partResults[active.id].current*1000)} mA</b></p><p><span>Power</span><b>{fmt(result.partResults[active.id].power*1000)} mW</b></p></div>}
          {(active.type === "diode" || active.type === "led") && <div className="warning">Diode/LED visual component only: a nonlinear semiconductor model is not implemented yet.</div>}
        </>}
        <hr/><div className="eyebrow">DC RESULTS</div>
        {!result ? <p className="muted">Run simulation to calculate voltage, current and power.</p> : result.ok ? <div className="result-list">{Object.entries(result.partResults).map(([pid, r]) => <div className="result" key={pid}><b>{circuit.parts.find(p => p.id === pid)?.label ?? pid}</b><span>{fmt(r.voltage)} V</span><span>{fmt(r.current*1000)} mA</span></div>)}<small className="muted">Current is positive from terminal 0 to terminal 1. Power uses the passive sign convention.</small></div> : <p className="muted">{result.message}</p>}
        <div className="tip"><b>Design note</b><p>Wires define the electrical nodes; component position is only visual. Results are produced by the solver module, not inferred from the drawing.</p></div>
      </aside>
    </div>
    <footer className="footer"><span>CIRCUITIO · Phase 1 MVP</span><span>Local JSON import/export · Solver separated from editor</span></footer>
  </main>;
}
