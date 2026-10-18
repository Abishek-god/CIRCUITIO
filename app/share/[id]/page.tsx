"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, ArrowDownToLine, CircuitBoard, ExternalLink, LoaderCircle, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Circuit, Part } from "@/lib/types";

type SharedProject = { id: string; name: string; description: string; circuit_json: Circuit; visibility: string; updated_at: string };

function terminal(p: Part, side: 0 | 1) {
  const dx = side === 0 ? -48 : 48;
  const angle = p.rotation * Math.PI / 180;
  return { x: p.x + dx * Math.cos(angle), y: p.y + dx * Math.sin(angle) };
}

export default function SharedCircuitPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error } = await createClient().from("circuit_projects")
          .select("id,name,description,circuit_json,visibility,updated_at")
          .eq("id", params.id).eq("visibility", "public").maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("This circuit is private, unavailable, or its share link has been disabled.");
        if (!cancelled) setProject(data as SharedProject);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load this circuit.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [params.id]);

  function download() {
    if (!project) return;
    const blob = new Blob([JSON.stringify({ name: project.name, circuit: project.circuit_json }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${project.name.replace(/[^a-z0-9]+/gi, "-") || "circuit"}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return <main style={{minHeight:"100vh",background:"#f3f5f9",color:"#1b2638"}}>
    <header style={{display:"flex",alignItems:"center",gap:12,padding:"16px clamp(18px,4vw,56px)",background:"white",borderBottom:"1px solid #e4e9f1"}}>
      <span style={{width:40,height:40,borderRadius:11,background:"#edf2ff",color:"#3768e8",display:"grid",placeItems:"center"}}><Activity size={22}/></span><b style={{fontSize:19,letterSpacing:.5}}>CIRCUITIO</b><span style={{fontSize:11,color:"#758198"}}>Public circuit</span><span style={{flex:1}}/><Link href="/" style={{fontSize:12,color:"#3768e8",textDecoration:"none"}}>Open designer</Link>
    </header>
    <section style={{maxWidth:1050,margin:"0 auto",padding:"36px 20px"}}>
      {loading ? <div style={{display:"flex",alignItems:"center",gap:10,color:"#758198",padding:30}}><LoaderCircle size={18}/> Loading shared circuit…</div> : error ? <div style={{background:"white",border:"1px solid #e4e9f1",borderRadius:14,padding:30,maxWidth:600}}><LockKeyhole size={25} color="#758198"/><h1 style={{fontSize:24}}>Circuit unavailable</h1><p style={{fontSize:13,color:"#758198",lineHeight:1.7}}>{error}</p><Link href="/" style={{color:"#3768e8"}}>Go to CIRCUITIO</Link></div> : project && <><div style={{display:"flex",alignItems:"end",gap:16,flexWrap:"wrap",marginBottom:20}}><div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:"#3768e8"}}>SHARED SCHEMATIC</div><h1 style={{fontSize:34,letterSpacing:-1,margin:"8px 0"}}>{project.name}</h1><p style={{fontSize:13,color:"#758198",margin:0}}>{project.description || "Circuit shared with CIRCUITIO"}</p></div><button onClick={download} style={{display:"flex",alignItems:"center",gap:8,border:0,borderRadius:9,background:"#3768e8",color:"white",padding:"12px 15px",fontSize:12,fontWeight:700}}><ArrowDownToLine size={15}/> Download circuit JSON</button></div>
        <div style={{background:"white",border:"1px solid #e4e9f1",borderRadius:14,padding:16,overflow:"auto"}}>
          <svg viewBox="0 0 800 460" role="img" aria-label="Read-only shared circuit schematic" style={{width:"100%",minWidth:500,display:"block",background:"radial-gradient(circle at 1px 1px,#d9e1ec 1px,transparent 0)",backgroundSize:"20px 20px",borderRadius:10}}>
            {project.circuit_json.wires.map(w=>{const [aid,as]=w.a.split(":");const [bid,bs]=w.b.split(":");const a=project.circuit_json.parts.find(p=>p.id===aid);const b=project.circuit_json.parts.find(p=>p.id===bid);if(!a||!b)return null;const p=terminal(a,Number(as) as 0|1),q=terminal(b,Number(bs) as 0|1);return <line key={w.id} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#3768e8" strokeWidth="2.4"/>;})}
            {project.circuit_json.parts.map(p=><g key={p.id} transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`}><line x1="-48" y1="0" x2="-25" y2="0" stroke="#8c9bb1" strokeWidth="2"/><line x1="25" y1="0" x2="48" y2="0" stroke="#8c9bb1" strokeWidth="2"/>
              {p.type==="resistor"&&<path d="M-25 0 L-20 -10 L-10 10 L0 -10 L10 10 L20 -10 L25 0" fill="none" stroke="#40516d" strokeWidth="2.4"/>}
              {p.type==="battery"&&<><line x1="-7" y1="-17" x2="-7" y2="17" stroke="#40516d" strokeWidth="2.4"/><line x1="7" y1="-10" x2="7" y2="10" stroke="#40516d" strokeWidth="2.4"/></>}
              {(p.type==="diode"||p.type==="led")&&<><path d="M-20 -13 L10 0 L-20 13 Z" fill="none" stroke="#40516d" strokeWidth="2.4"/><line x1="12" y1="-15" x2="12" y2="15" stroke="#40516d" strokeWidth="2.4"/></>}
              {p.type==="switch"&&<><circle cx="-20" cy="0" r="2.5" fill="#40516d"/><circle cx="20" cy="0" r="2.5" fill="#40516d"/><line x1="-20" y1="0" x2={p.closed?20:12} y2={p.closed?0:-12} stroke="#40516d" strokeWidth="2.4"/></>}
              <text x="0" y="-24" textAnchor="middle" fill="#46546c" fontSize="11" fontWeight="700">{p.label}</text><text x="0" y="29" textAnchor="middle" fill="#78869a" fontSize="10">{p.type==="battery"?`${p.value} V`:p.type==="resistor"?`${p.value} Ω`:p.type==="switch"?(p.closed?"Closed":"Open"):p.type.toUpperCase()}</text><circle cx="-48" cy="0" r="3.5" fill="#fff" stroke="#7386a4" strokeWidth="1.8"/><circle cx="48" cy="0" r="3.5" fill="#fff" stroke="#7386a4" strokeWidth="1.8"/></g>)}
          </svg>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",padding:"14px 2px 0",fontSize:12,color:"#758198"}}><span><CircuitBoard size={14} style={{verticalAlign:"middle",marginRight:5}}/>{project.circuit_json.parts.length} components</span><span>{project.circuit_json.wires.length} wires</span><span>Read-only shared view</span></div>
        </div>
        <p style={{fontSize:11,color:"#758198",marginTop:14}}>This shared page displays the saved schematic. To modify it, download the JSON and open it in the CIRCUITIO editor.</p>
      </>}
    </section>
  </main>;
}
