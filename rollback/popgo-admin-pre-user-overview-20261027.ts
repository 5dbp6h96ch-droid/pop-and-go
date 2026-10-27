import {createClient} from "npm:@supabase/supabase-js@2.95.0";
const CORS={"access-control-allow-origin":"https://5dbp6h96ch-droid.github.io","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,apikey,content-type,x-client-info","vary":"origin"};
const result=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...CORS,"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
 if(!["GET","POST"].includes(req.method))return result({error:"Methode nicht zulässig"},405);
 const hdr=req.headers.get("authorization")||"";if(!hdr.startsWith("Bearer "))return result({error:"Anmeldung erforderlich"},401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:ident,error:authError}=await auth.auth.getUser(hdr.slice(7));
 if(authError||!ident.user)return result({error:"Anmeldung ungültig"},401);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await db.from("profiles").select("account_status,is_admin").eq("user_id",ident.user.id).maybeSingle();
 if(profileError)return result({error:"Berechtigung nicht prüfbar"},503);
 if(profile?.account_status!=="active"||profile?.is_admin!==true)return result({error:"Kein Administratorzugriff"},403);
 const path=new URL(req.url).pathname.split("/").pop();
 if(req.method==="GET"&&path==="pending"){
   const {data,error}=await db.from("suggestions").select("*").eq("status","pending").order("submitted_at",{ascending:true}).limit(100);
   return error?result({error:"Vorschläge nicht abrufbar"},500):result({suggestions:data||[]});
 }
 if(req.method==="GET"&&path==="members"){
   const {data,error}=await db.from("profiles").select("user_id,display_name,account_status,created_at").eq("is_admin",false).order("created_at",{ascending:false}).limit(100);
   if(error)return result({error:"Profile nicht abrufbar"},500);
   const {data:users,error:ue}=await db.auth.admin.listUsers({page:1,perPage:1000});
   if(ue)return result({error:"Konten nicht abrufbar"},500);
   const emails=new Map(users.users.map(u=>[u.id,u.email||""]));
   return result({members:(data||[]).map(p=>({...p,email:emails.get(p.user_id)||""}))});
 }
 if(req.method==="POST"){
   if(Number(req.headers.get("content-length")||0)>8000)return result({error:"Anfrage zu groß"},413);
   let body:any;try{body=await req.json()}catch{return result({error:"Ungültige Anfrage"},400)}
   const isUuid=(v:any)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
   if(path==="review"&&isUuid(body.id)&&typeof body.approve==="boolean"){
     const {data,error}=await db.rpc("admin_review_suggestion",{p_suggestion_id:body.id,p_approve:body.approve,p_actor_id:ident.user.id});
     return error?result({error:error.message},409):result({success:true,place_id:data});
   }
   if(path==="member"&&isUuid(body.id)&&["active","rejected","suspended"].includes(body.status)&&body.id!==ident.user.id){
     const {data:target,error:e}=await db.from("profiles").select("is_admin").eq("user_id",body.id).maybeSingle();
     if(e||!target||target.is_admin)return result({error:"Konto nicht änderbar"},403);
     const {error}=await db.from("profiles").update({account_status:body.status}).eq("user_id",body.id).eq("is_admin",false);
     if(error)return result({error:"Konto konnte nicht bearbeitet werden"},500);
     await db.from("audit_events").insert({actor_id:ident.user.id,action:"member_status",entity_kind:"profile",entity_id:body.id,details:{status:body.status}});
     return result({success:true});
   }
 }
 return result({error:"Nicht gefunden"},404);
});