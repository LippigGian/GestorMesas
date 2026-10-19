const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const mod={};new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/diagnosticoCarga.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod);
test('mide operaciones pendientes, duración y fallo sin guardar resultados sensibles',async()=>{
 let now=0,finish;const d=mod.crearDiagnosticoCarga(()=>now);
 const p=d.medir('Sesión',()=>new Promise(r=>finish=r));now=20000;
 assert.equal(d.informe()[0].estado,'pendiente');finish({access_token:'SECRETO'});await p;
 assert.equal(d.informe()[0].duracionMs,20000);assert(!JSON.stringify(d.informe()).includes('SECRETO'));
 await assert.rejects(d.medir('Error',()=>Promise.reject(new Error('SECRETO'))));assert.equal(d.informe()[1].estado,'error');
});
test('fetch mantiene respuesta intacta y elimina parámetros, credenciales y mensajes',async()=>{
 const d=mod.crearDiagnosticoCarga();const response=new Response('{"access_token":"SECRETO"}',{status:200});let received;
 const measured=d.fetchMedido(async(url,options)=>{received=options;return response;});
 const options={headers:{Authorization:'Bearer SECRETO'}};
 assert.equal(await measured('https://project.invalid/auth/v1/token?refresh_token=SECRETO',options),response);
 assert.equal(received,options);assert.equal(d.informe()[0].etapa,'Red /auth/v1/token');assert(!JSON.stringify(d.informe()).includes('SECRETO'));assert.equal((await response.json()).access_token,'SECRETO');
});
