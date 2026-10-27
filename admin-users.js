"use strict";
const $=id=>document.getElementById(id),db=supabase.createClient("https://itaoljnqwoiifztjlfyc.supabase.co","sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV");
let members=[];
async function api(path,body){
 const {data:{session}}=await db.auth.getSession();if(!session)throw Error("Bitte anmelden.");
 const r=await fetch("https://itaoljnqwoiifztjlfyc.supabase.co/functions/v1/popgo-admin/"+path,{method:body?"POST":"GET",headers:{authorization:"Bearer "+session.access_token,apikey:"sb_publishable_9SXRrjZnf1-Od24sBr6QNA_9WUPofZV","content-type":"application/json"},body:body?JSON.stringify(body):undefined});
 const data=await r.json();if(!r.ok)throw Error(data.error||"Anfrage fehlgeschlagen");return data;
}
function el(tag,value){const n=document.createElement(tag);n.textContent=value;return n}
function render(){
 const q=$("search").value.toLocaleLowerCase("de"),f=$("filter").value;
 const hits=members.filter(m=>(!f||m.account_status===f)&&[m.display_name,m.email].join(" ").toLocaleLowerCase("de").includes(q));
 $("summary").textContent=members.length+" Mitglieder · "+members.filter(m=>m.account_status==="active").length+" aktiv · "+members.filter(m=>m.account_status==="pending").length+" offen";
 $("users").replaceChildren();
 for(const m of hits){
 const card=el("article","");card.className="user-card";
 card.append(el("h3",m.display_name||m.email||"Unbenannt"),el("p",m.email||""),el("p",(m.is_admin?"Administrator":"Mitglied")+" · "+m.account_status),el("small","Registriert: "+new Date(m.created_at).toLocaleDateString("de-DE")));
 if(!m.is_admin)for(const [status,label] of (m.account_status==="pending"?[["active","Freigeben"],["rejected","Ablehnen"]]:m.account_status==="active"?[["suspended","Sperren"]]:[["active","Aktivieren"]])){
 const b=el("button",label);b.onclick=async()=>{if(!confirm("Benutzer "+label.toLowerCase()+"?"))return;b.disabled=true;try{await api("member",{id:m.user_id,status});await load()}catch(e){$("status").textContent=e.message;b.disabled=false}};card.append(b)}
 $("users").append(card);
 }
 if(!hits.length)$("users").append(el("p","Keine Benutzer gefunden."));
}
async function load(){const data=await api("members");members=data.members||[];render()}
(async()=>{try{const {data:{user}}=await db.auth.getUser();if(!user)throw Error("Bitte zuerst in der App anmelden.");const {data:p,error}=await db.from("profiles").select("is_admin,account_status").eq("user_id",user.id).single();if(error||!p?.is_admin||p.account_status!=="active")throw Error("Nur für Administratoren.");await load();$("app").hidden=false;$("status").textContent="Benutzerverwaltung";}catch(e){$("status").textContent=e.message}})();
$("search").oninput=render;$("filter").onchange=render;
