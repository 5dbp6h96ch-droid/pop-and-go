import { createClient } from "npm:@supabase/supabase-js@2.95.0";

// Native iOS and local tests. All authorization is server-side, not CORS-based.
const origins=new Set(["capacitor://localhost","http://localhost","https://5dbp6h96ch-droid.github.io"]);
const headers=(request:Request)=>({
 "access-control-allow-origin":origins.has(request.headers.get("origin")||"")?request.headers.get("origin")!:"capacitor://localhost",
 "access-control-allow-methods":"POST,OPTIONS",
 "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
 "vary":"Origin","cache-control":"no-store","content-type":"application/json"
});
Deno.serve(async request=>{
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:headers(request)});
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:headers(request)});
 if(request.method!=="POST")return respond({error:"method_not_allowed"},405);
 const token=request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return respond({error:"unauthorized"},401);
 const url=Deno.env.get("SUPABASE_URL");
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const anonKey=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!serviceKey||!anonKey)return respond({error:"unconfigured"},503);
 const auth=createClient(url,anonKey);
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user)return respond({error:"unauthorized"},401);
 let body:any;
 try{body=await request.json()}catch{return respond({error:"invalid_json"},400)}
 if(body?.confirmation!=="LÖSCHEN")return respond({error:"confirmation_required"},400);
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:profile,error:profileError}=await admin.from("profiles").select("is_admin").eq("user_id",user.id).maybeSingle();
 if(profileError)return respond({error:"profile_lookup_failed"},500);
 if(profile?.is_admin)return respond({error:"administrator_account_protected"},409);
 // Former administrators with retained private broadcasts may be blocked by
 // the database FK RESTRICT. In that case auth deletion returns an error.
 // Nullable historical references must be anonymized before auth user deletion.
 for(const [table,column] of [["suggestions","submitted_by"],["suggestions","reviewed_by"],["audit_events","actor_id"]] as const){
  const {error}=await admin.from(table).update({[column]:null}).eq(column,user.id);
  if(error)return respond({error:"anonymization_failed",table},500);
 }
 // Foreign keys ON DELETE CASCADE remove profile, favorites, collections,
 // shares, notifications and push subscriptions. Do not delete shared places.
 const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
 if(deleteError)return respond({error:"auth_deletion_failed"},500);
 return respond({deleted:true});
});
