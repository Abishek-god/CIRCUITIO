"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace("/dashboard");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setMessage("Check your email to confirm your account, then sign in.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main style={{minHeight:"100vh",display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(320px,480px)",background:"#f3f5f9"}}>
    <section style={{padding:"clamp(28px,6vw,80px)",display:"flex",flexDirection:"column",justifyContent:"space-between",background:"linear-gradient(145deg,#12234c,#234fc1)",color:"white"}}>
      <Link href="/" style={{display:"flex",alignItems:"center",gap:12,color:"white",textDecoration:"none"}}><span style={{display:"grid",placeItems:"center",width:42,height:42,borderRadius:12,background:"#ffffff20"}}><Activity size={24}/></span><b style={{fontSize:22,letterSpacing:1}}>CIRCUITIO</b></Link>
      <div style={{maxWidth:560}}><p style={{letterSpacing:3,fontSize:11,fontWeight:700,color:"#b8caff"}}>DESIGN · SIMULATE · LEARN</p><h1 style={{fontSize:"clamp(36px,5vw,64px)",lineHeight:1.05,letterSpacing:-2,margin:"16px 0"}}>Bring your circuit ideas to life.</h1><p style={{fontSize:17,lineHeight:1.8,color:"#d4def9",maxWidth:470}}>Create schematics, calculate electrical behaviour, and keep your engineering projects organised in one workspace.</p></div>
      <p style={{fontSize:12,color:"#c5d2f5"}}>CIRCUITIO · Educational circuit design</p>
    </section>
    <section style={{display:"grid",placeItems:"center",padding:24}}>
      <form onSubmit={submit} style={{width:"100%",maxWidth:380,background:"white",padding:30,borderRadius:18,border:"1px solid #e2e8f2",boxShadow:"0 15px 55px #1b2b4b0a"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:"#3768e8"}}>{mode === "signin" ? "WELCOME BACK" : "GET STARTED"}</div>
        <h2 style={{fontSize:27,margin:"9px 0 6px",letterSpacing:-.7}}>{mode === "signin" ? "Sign in to CIRCUITIO" : "Create your account"}</h2>
        <p style={{fontSize:13,color:"#758198",lineHeight:1.6,margin:"0 0 22px"}}>{mode === "signin" ? "Continue building your circuit projects." : "Your saved circuits will be private to your account."}</p>
        <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:7}}>Email address</label>
        <div style={{display:"flex",alignItems:"center",gap:9,border:"1px solid #dfe6ef",borderRadius:9,padding:"0 12px",marginBottom:16}}><Mail size={16} color="#8592a6"/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{width:"100%",border:0,outline:0,padding:"13px 0",fontSize:13}}/></div>
        <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:7}}>Password</label>
        <div style={{display:"flex",alignItems:"center",gap:9,border:"1px solid #dfe6ef",borderRadius:9,padding:"0 12px",marginBottom:16}}><LockKeyhole size={16} color="#8592a6"/><input required minLength={8} type={showPassword?"text":"password"} autoComplete={mode==="signin"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" style={{width:"100%",border:0,outline:0,padding:"13px 0",fontSize:13}}/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(!showPassword)} style={{border:0,background:"transparent",color:"#758198",padding:3}}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div>
        {error && <p role="alert" style={{fontSize:12,color:"#b42318",background:"#fff0ef",padding:10,borderRadius:8}}>{error}</p>}
        {message && <p role="status" style={{fontSize:12,color:"#176c50",background:"#eaf8f1",padding:10,borderRadius:8}}>{message}</p>}
        {params.get("error") && <p role="alert" style={{fontSize:12,color:"#b42318"}}>The email confirmation link could not be verified. Try signing in again.</p>}
        <button disabled={busy} type="submit" style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:9,border:0,borderRadius:9,background:"#3768e8",color:"white",padding:14,fontSize:13,fontWeight:700,opacity:busy?.7:1,cursor:busy?"wait":"pointer"}}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"} <ArrowRight size={16}/></button>
        <p style={{textAlign:"center",fontSize:12,color:"#758198",margin:"20px 0 0"}}>{mode==="signin"?"New to CIRCUITIO?":"Already have an account?"} <button type="button" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setMessage("");}} style={{border:0,background:"transparent",color:"#3768e8",fontWeight:700,cursor:"pointer"}}>{mode==="signin"?"Create account":"Sign in"}</button></p>
        <p style={{textAlign:"center",fontSize:11,margin:"18px 0 0"}}><Link href="/" style={{color:"#758198"}}>Back to circuit designer</Link></p>
      </form>
    </section>
    <style>{`@media(max-width:760px){main{grid-template-columns:1fr!important}main section:first-child{display:none!important}}`}</style>
  </main>;
}
