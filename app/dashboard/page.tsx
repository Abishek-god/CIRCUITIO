"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowDownToLine, ArrowUpRight, CircuitBoard, Copy, ExternalLink, FilePlus2, Globe2, LoaderCircle, LogOut, LockKeyhole, Plus, RefreshCw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Circuit } from "@/lib/types";

type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  circuit_json: Circuit;
  visibility: "private" | "unlisted" | "public";
  created_at: string;
  updated_at: string;
};

const starterCircuit: Circuit = {
  version: 1,
  parts: [
    { id: "V1", type: "battery", x: 130, y: 205, rotation: 0, value: 10, label: "V1" },
    { id: "R1", type: "resistor", x: 330, y: 105, rotation: 0, value: 1000, label: "R1" }
  ],
  wires: [{ id: "W1", a: "V1:0", b: "R1:0" }, { id: "W2", a: "R1:1", b: "V1:1" }]
};

function downloadProject(project: Project) {
  const blob = new Blob([JSON.stringify({ name: project.name, circuit: project.circuit_json }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "circuit"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) { router.replace("/login"); return; }
      setEmail(user.email ?? "");
      const { data, error } = await supabase.from("circuit_projects")
        .select("id,owner_id,name,description,circuit_json,visibility,created_at,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setProjects((data ?? []) as Project[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your projects.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  async function createProject() {
    setBusy(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) { router.replace("/login"); return; }
      const { data, error } = await supabase.from("circuit_projects").insert({
        owner_id: user.id,
        name: "Untitled circuit",
        description: "A new CIRCUITIO project",
        circuit_json: starterCircuit,
        visibility: "private"
      }).select("id").single();
      if (error) throw error;
      router.push(`/?id=${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the project.");
    } finally {
      setBusy(false);
    }
  }

  async function changeVisibility(project: Project) {
    setError(""); setNotice("");
    const next = project.visibility === "public" ? "private" : "public";
    const { error } = await createClient().from("circuit_projects").update({ visibility: next }).eq("id", project.id);
    if (error) { setError(error.message); return; }
    setProjects(items => items.map(p => p.id === project.id ? { ...p, visibility: next } : p));
    setNotice(next === "public" ? "Project is public. Anyone with its share URL can view it." : "Project is private again.");
  }

  async function removeProject(project: Project) {
    if (!window.confirm(`Delete "${project.name}" and its saved simulation history?`)) return;
    setError(""); setNotice("");
    const { error } = await createClient().from("circuit_projects").delete().eq("id", project.id);
    if (error) { setError(error.message); return; }
    setProjects(items => items.filter(p => p.id !== project.id));
    setNotice("Project deleted.");
  }

  async function duplicateProject(project: Project) {
    setError("");
    const { data: { user } } = await createClient().auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data, error } = await createClient().from("circuit_projects").insert({
      owner_id: user.id, name: `${project.name} copy`, description: project.description,
      circuit_json: project.circuit_json, visibility: "private"
    }).select("id").single();
    if (error) { setError(error.message); return; }
    router.push(`/?id=${data.id}`);
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <main style={{minHeight:"100vh",background:"#f3f5f9",color:"#1b2638"}}>
    <header style={{display:"flex",alignItems:"center",gap:13,padding:"16px clamp(18px,4vw,56px)",background:"white",borderBottom:"1px solid #e4e9f1",position:"sticky",top:0,zIndex:2}}>
      <span style={{width:40,height:40,borderRadius:11,background:"#edf2ff",color:"#3768e8",display:"grid",placeItems:"center"}}><Activity size={22}/></span>
      <div><b style={{fontSize:19,letterSpacing:.5}}>CIRCUITIO</b><div style={{fontSize:10,color:"#758198"}}>Project workspace</div></div>
      <div style={{flex:1}}/>
      <span style={{fontSize:12,color:"#758198"}}>{email}</span>
      <button onClick={signOut} style={{display:"flex",alignItems:"center",gap:7,border:"1px solid #e4e9f1",borderRadius:8,background:"white",padding:"9px 12px",fontSize:12,color:"#516079"}}><LogOut size={15}/> Sign out</button>
    </header>
    <section style={{maxWidth:1160,margin:"0 auto",padding:"36px 22px"}}>
      <div style={{display:"flex",alignItems:"end",gap:16,flexWrap:"wrap",marginBottom:25}}>
        <div style={{flex:1,minWidth:220}}><div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:"#3768e8"}}>YOUR WORKSPACE</div><h1 style={{fontSize:34,letterSpacing:-1.1,margin:"8px 0"}}>Circuit projects</h1><p style={{fontSize:13,color:"#758198",margin:0}}>Create, manage, and share your electronic schematics.</p></div>
        <button disabled={busy} onClick={createProject} style={{display:"flex",alignItems:"center",gap:9,border:0,borderRadius:9,background:"#3768e8",color:"white",padding:"13px 17px",fontWeight:700,fontSize:12,opacity:busy?.65:1}}><Plus size={17}/>{busy?"Creating…":"New circuit"}</button>
      </div>
      {(error || notice) && <div role={error?"alert":"status"} style={{marginBottom:18,padding:13,borderRadius:9,background:error?"#fff0ef":"#eaf8f1",color:error?"#9d3e3e":"#176c50",fontSize:12}}>{error || notice}</div>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:13}}><span style={{fontSize:12,fontWeight:700,color:"#58667b"}}>{projects.length} project{projects.length===1?"":"s"}</span><button onClick={()=>void loadProjects()} style={{display:"flex",alignItems:"center",gap:6,border:0,background:"transparent",color:"#627087",fontSize:11}}><RefreshCw size={13}/> Refresh</button></div>
      {loading ? <div style={{display:"flex",alignItems:"center",gap:10,padding:30,color:"#758198"}}><LoaderCircle size={18}/> Loading projects…</div> : projects.length===0 ? <div style={{textAlign:"center",padding:"70px 24px",background:"white",border:"1px dashed #d7dfeb",borderRadius:16}}><span style={{margin:"0 auto",display:"grid",placeItems:"center",width:58,height:58,borderRadius:16,background:"#edf2ff",color:"#3768e8"}}><CircuitBoard size={27}/></span><h2 style={{margin:"17px 0 7px",fontSize:20}}>Your workspace is ready</h2><p style={{maxWidth:400,margin:"0 auto 20px",fontSize:13,color:"#758198",lineHeight:1.7}}>Create your first circuit to save it in the cloud. Your projects are private by default.</p><button onClick={createProject} style={{border:0,borderRadius:9,background:"#3768e8",color:"white",padding:"12px 16px",fontWeight:700}}>Create first circuit</button></div> : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,300px),1fr))",gap:16}}>
        {projects.map(project=><article key={project.id} style={{background:"white",border:"1px solid #e4e9f1",borderRadius:14,overflow:"hidden",boxShadow:"0 4px 18px #233b6505"}}>
          <div style={{height:116,display:"grid",placeItems:"center",background:"radial-gradient(circle at 1px 1px,#d9e1ec 1px,transparent 0)",backgroundSize:"18px 18px",borderBottom:"1px solid #e4e9f1",color:"#3768e8"}}><CircuitBoard size={36}/><span style={{fontSize:10,color:"#758198"}}>{project.circuit_json?.parts?.length ?? 0} components · {project.circuit_json?.wires?.length ?? 0} wires</span></div>
          <div style={{padding:17}}><div style={{display:"flex",alignItems:"start",gap:8}}><div style={{flex:1,minWidth:0}}><h2 style={{fontSize:16,margin:"0 0 6px",overflowWrap:"anywhere"}}>{project.name}</h2><p style={{fontSize:11,color:"#758198",lineHeight:1.5,margin:"0 0 12px"}}>{project.description || "No description"}</p></div><span title={project.visibility} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:project.visibility==="public"?"#16845d":"#758198"}}>{project.visibility==="public"?<Globe2 size={13}/>:<LockKeyhole size={13}/>} {project.visibility}</span></div>
          <div style={{fontSize:10,color:"#99a5b8",marginBottom:14}}>Updated {new Date(project.updated_at).toLocaleDateString()}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            <Link href={`/?id=${project.id}`} style={{display:"flex",alignItems:"center",gap:6,textDecoration:"none",background:"#3768e8",color:"white",padding:"9px 11px",borderRadius:7,fontSize:11,fontWeight:700}}>Open editor <ArrowUpRight size={14}/></Link>
            <button title="Download circuit JSON" onClick={()=>downloadProject(project)} style={{border:"1px solid #e4e9f1",background:"white",borderRadius:7,padding:"8px 9px",color:"#516079"}}><ArrowDownToLine size={15}/></button>
            <button title="Duplicate project" onClick={()=>void duplicateProject(project)} style={{border:"1px solid #e4e9f1",background:"white",borderRadius:7,padding:"8px 9px",color:"#516079"}}><Copy size={15}/></button>
            <button title={project.visibility==="public"?"Make private":"Make public"} onClick={()=>void changeVisibility(project)} style={{border:"1px solid #e4e9f1",background:"white",borderRadius:7,padding:"8px 9px",color:"#516079"}}>{project.visibility==="public"?<LockKeyhole size={15}/>:<Globe2 size={15}/>}</button>
            {project.visibility==="public" && <button title="Copy public share link" onClick={()=>{void navigator.clipboard.writeText(`${window.location.origin}/share/${project.id}`);setNotice("Public share link copied.");}} style={{border:"1px solid #e4e9f1",background:"white",borderRadius:7,padding:"8px 9px",color:"#516079"}}><ExternalLink size={15}/></button>}
            <button title="Delete project" onClick={()=>void removeProject(project)} style={{marginLeft:"auto",border:"1px solid #f0dada",background:"#fff7f7",borderRadius:7,padding:"8px 9px",color:"#b73e3e"}}><Trash2 size={15}/></button>
          </div>
        </div></article>)}
      </div>}
      <div style={{display:"flex",alignItems:"start",gap:10,marginTop:25,padding:14,background:"#edf2ff",borderRadius:10,color:"#4c5f8c",fontSize:11,lineHeight:1.7}}><LockKeyhole size={16} style={{flexShrink:0,marginTop:2}}/><span>Project access is enforced by Supabase Row Level Security. Public sharing is opt-in; private projects remain visible only to their owner.</span></div>
    </section>
  </main>;
}
