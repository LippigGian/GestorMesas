const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const moduleExports={};
const source=ts.transpileModule(fs.readFileSync('supabase/functions/invitar-empleado/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports','require','Deno',source)(moduleExports,()=>({createClient:()=>{}}),{serve:()=>{},env:{get:()=>undefined}});
const actor='10000000-0000-4000-8000-000000000001',role='70000000-0000-4000-8000-000000000001',request='90000000-0000-4000-8000-000000000001';
const input={nombre:'Empleado',email:'nuevo@example.invalid',rolId:role,solicitudId:request};
async function run(options={}){
 const calls=[];const factory=(_url,key)=>key==='public'?{auth:{getUser:async(token)=>{calls.push(['getUser',token]);return {data:{user:options.invalid?null:{id:actor}},error:null};}}}:{
  rpc:async(name,args)=>{calls.push([name,args]);if(name==='preparar_invitacion_empleado')return {data:{completada:!!options.completed,invitacion_id:'opaque-reservation'},error:options.denied?{code:'42501',message:'Sin permiso'}:null};return {data:null,error:name==='confirmar_invitacion_empleado'&&options.confirmError?{message:'No ligado'}:null};},
  auth:{admin:{inviteUserByEmail:async(email,config)=>{calls.push(['invite',email,config]);return {data:{user:options.smtp?null:{id:'employee'}},error:options.smtp?{status:429}:null};}}}
 };
 const env={APP_URL:'http://localhost:5173',SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server'};
 const handler=moduleExports.crearHandler(factory,name=>env[name]);
 const response=await handler(new Request('https://example.invalid/functions/v1/invitar-empleado',{method:'POST',headers:{Origin:options.origin??env.APP_URL,...(options.noToken?{}:{Authorization:'Bearer verified-token'}),'Content-Type':'application/json'},body:JSON.stringify(options.body??input)}));
 return {status:response.status,body:await response.json(),calls};
}
(async()=>{
 assert.equal((await run({noToken:true})).status,401);assert.equal((await run({invalid:true})).status,401);
 assert.equal((await run({origin:'https://other.invalid'})).status,403);
 assert.equal((await run({body:{...input,localId:'another-cafe'}})).status,400);
 let r=await run({denied:true});assert.equal(r.status,403);assert.equal(r.calls.some(c=>c[0]==='invite'),false);
 r=await run({completed:true});assert.equal(r.status,200);assert.equal(r.calls.some(c=>c[0]==='invite'),false);
 r=await run();assert.equal(r.status,200);assert.equal(r.calls.find(c=>c[0]==='preparar_invitacion_empleado')[1].p_actor_id,actor);
 const invitation=r.calls.find(c=>c[0]==='invite');assert.equal(invitation[2].redirectTo,'http://localhost:5173/aceptar-invitacion');assert.deepEqual(invitation[2].data,{nombre:'Empleado',empleado_invitacion_id:'opaque-reservation'});
 r=await run({smtp:true});assert.equal(r.status,429);assert(r.calls.some(c=>c[0]==='fallar_invitacion_empleado'));
 r=await run({confirmError:true});assert.equal(r.status,409);
 console.log('OK: Edge verifica sesión, origen, actor real, datos permitidos, autorización antes de enviar, redirect fijo, errores SMTP y reintentos. Sin correos reales.');
})().catch(e=>{console.error(e);process.exitCode=1;});
