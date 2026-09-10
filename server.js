import express from "express";
import helmet from "helmet";
import cookieSession from "cookie-session";
import crypto from "crypto";
const app=express(), PORT=process.env.PORT||3000;
const BASE_URL=process.env.BASE_URL||`http://localhost:${PORT}`;
const CLIENT_ID=process.env.DERIV_CLIENT_ID||"";
app.use(helmet({contentSecurityPolicy:false})); app.use(express.json());
app.use(cookieSession({name:"session",secret:process.env.SESSION_SECRET||crypto.randomBytes(32).toString("hex"),httpOnly:true,secure:BASE_URL.startsWith("https://"),sameSite:"lax",maxAge:86400000}));
const pending=new Map();
const b64=b=>b.toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
app.get("/api/config",(q,s)=>s.json({configured:!!CLIENT_ID}));
app.get("/auth/deriv",(q,s)=>{
 if(!CLIENT_ID)return s.status(503).send("DERIV_CLIENT_ID is not configured.");
 const verifier=b64(crypto.randomBytes(32)),state=b64(crypto.randomBytes(24));
 pending.set(state,{verifier,at:Date.now()});
 const challenge=b64(crypto.createHash("sha256").update(verifier).digest());
 const p=new URLSearchParams({response_type:"code",client_id:CLIENT_ID,redirect_uri:`${BASE_URL}/auth/callback`,scope:"trade",state,code_challenge:challenge,code_challenge_method:"S256"});
 s.redirect("https://auth.deriv.com/oauth2/auth?"+p);
});
app.get("/auth/callback",async(q,s)=>{
 const {code,state,error}=q.query;if(error)return s.status(400).send(error);
 const p=pending.get(state);pending.delete(state);
 if(!p||Date.now()-p.at>600000)return s.status(400).send("Invalid or expired login.");
 try{
  const body=new URLSearchParams({grant_type:"authorization_code",client_id:CLIENT_ID,code,code_verifier:p.verifier,redirect_uri:`${BASE_URL}/auth/callback`});
  const r=await fetch("https://auth.deriv.com/oauth2/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
  const d=await r.json();if(!r.ok||!d.access_token)return s.status(400).json(d);
  q.session.token=d.access_token;q.session.exp=Date.now()+Number(d.expires_in||3600)*1000;s.redirect("/");
 }catch(e){s.status(500).send("Authentication error.");}
});
app.get("/api/me",async(q,s)=>{
 if(!q.session?.token||Date.now()>q.session.exp)return s.json({loggedIn:false});
 const r=await fetch("https://api.derivws.com/trading/v1/options/accounts",{headers:{Authorization:`Bearer ${q.session.token}`}});
 const d=await r.json();s.json({loggedIn:true,accounts:d.data||[]});
});
app.post("/api/logout",(q,s)=>{q.session=null;s.json({ok:true})});
app.use(express.static("public"));app.get("*",(q,s)=>s.sendFile(process.cwd()+"/public/index.html"));
app.listen(PORT,()=>console.log(`Running on ${BASE_URL}`));