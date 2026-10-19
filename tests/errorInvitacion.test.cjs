const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const exportsModule={};
new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/errorInvitacion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exportsModule);
const mensaje=exportsModule.mensajeErrorInvitacion;
const http=(status,body)=>({context:new Response(JSON.stringify(body),{status})});
test('explica el 404 real del gateway cuando la función no está desplegada',async()=>{
  assert.match(await mensaje(http(404,{code:'NOT_FOUND',message:'Requested function was not found'})),/no encontró la función invitar-empleado/);
});
test('conserva errores controlados sin perder el cuerpo de la respuesta',async()=>{
  const error=http(409,{error:'Ese correo ya tiene una cuenta.'});
  assert.equal(await mensaje(error),'Ese correo ya tiene una cuenta.');
  assert.equal((await error.context.json()).error,'Ese correo ya tiene una cuenta.');
});
test('distingue autorización, errores sin JSON y fallos de conectividad',async()=>{
  assert.match(await mensaje(http(401,{message:'Invalid JWT'})),/autorización/);
  assert.match(await mensaje({context:new Response('Unavailable',{status:503})}),/HTTP 503/);
  assert.match(await mensaje(new Error('Failed to fetch')),/APP_URL/);
});
