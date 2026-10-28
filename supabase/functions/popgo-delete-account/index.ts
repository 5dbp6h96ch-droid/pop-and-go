import { createClient } from "npm:@supabase/supabase-js@2.95.0";
// STAGED CODE ONLY. Deploy only after confirming cascades and running deletion
// tests on disposable users. Never use an administrator account for testing.
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async request=>{
 if(request.method!=="POST")return json({error:"method_not_allowed"},405);
 const token=request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return json({error:"unauthorized"},401);
 const url=Deno.env.get("SUPABASE_URL");
 const publishable=Deno.env.get("SUPABASE_ANON_KEY");
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!publishable||!serviceKey)return json({error:"unconfigured"},503);
 const client=createClient(url,publishable,{global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:{user},error:authenticationError}=await client.auth.getUser();
 if(authenticationError||!user)return json({error:"unauthorized"},401);
 let body:any;
 try{body=await request.json()}catch{return json({error:"invalid_json"},400)}
 if(body?.confirmation!=="LÖSCHEN")return json({error:"confirmation_required"},400);
 const admin=createClient(url,serviceKey);
 const {data:profile,error:profileError}=await admin.from("profiles").select("is_admin").eq("user_id",user.id).maybeSingle();
 if(profileError)return json({error:"profile_check_failed"},500);
 if(profile?.is_admin)return json({error:"admin_account_requires_manual_transfer"},409);
 // Preserve shared suggestion records but remove the submitting user's reference.
 const steps=[
  ["push_subscriptions","user_id","delete"],
  ["notifications","user_id","delete"],
  ["favorites","user_id","delete"],
  ["collections","owner_id","delete"],
  ["suggestions","submitted_by","anonymize"],
  ["profiles","user_id","delete"]
 ] as const;
 for(const [table,column,operation] of steps){
  const result=operation==="delete"
   ? await admin.from(table).delete().eq(column,user.id)
   : await admin.from(table).update({submitted_by:null}).eq(column,user.id);
  if(result.error)return json({error:"cleanup_failed",table},500);
 }
 const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
 if(deleteError)return json({error:"auth_deletion_failed"},500);
 return json({deleted:true});
});
