const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function cargar(file,imports={}){const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,name=>imports[name]);return exports;}
const {prepararRectificacion}=cargar('src/lib/rectificacionesArqueo.ts');
const medios=[{medioPagoId:'efectivo',nombre:'Efectivo',sistema:100,declarado:80,diferencia:-20}];
test('rectificación prepara solo importes declarados y motivo sin alterar el sistema',()=>{
 const original=JSON.stringify(medios);assert.deepEqual(prepararRectificacion(medios,{efectivo:' 120,50 '},' Conteo corregido '),{declaraciones:[{medioPagoId:'efectivo',montoDeclarado:120.5}],motivo:'Conteo corregido'});assert.equal(JSON.stringify(medios),original);
 assert.equal(prepararRectificacion(medios,{efectivo:'0'},'Corrección').declaraciones[0].montoDeclarado,0);
});
test('rechaza motivo vacío, montos inválidos, cierres sin medios y ausencia de cambios',()=>{
 for(const motivo of ['', '   ', 'x'.repeat(501)])assert.throws(()=>prepararRectificacion(medios,{efectivo:'100'},motivo));
 for(const valor of ['', '-1', 'Infinity', 'NaN', '1.234', '1e3', 'texto'])assert.throws(()=>prepararRectificacion(medios,{efectivo:valor},'Corrección'));
 assert.throws(()=>prepararRectificacion(medios,{efectivo:'80'},'Corrección'),/al menos/);
 assert.throws(()=>prepararRectificacion([],{efectivo:'90'},'Corrección'),/no tiene/);
});
test('envía la rectificación en una sola RPC con la revisión observada',async()=>{
 const calls=[];const data={actual:{medios:[]},historial:[],revision:1};
 const {rectificarArqueo}=cargar('src/services/rectificacionesArqueoService.ts',{'@/lib/supabase':{supabase:{rpc:async(name,args)=>{calls.push({name,args});return {data,error:null};}}}});
 assert.equal(await rectificarArqueo({arqueoId:'arqueo',revision:0,motivo:'Corrección',declaraciones:[{medioPagoId:'efectivo',montoDeclarado:100}]}),data);
 assert.deepEqual(calls,[{name:'rectificar_arqueo_cerrado',args:{p_arqueo_id:'arqueo',p_revision:0,p_motivo:'Corrección',p_declaraciones:[{medioPagoId:'efectivo',montoDeclarado:100}]}}]);
});
test('conserva el código de conflicto y explica cuando falta habilitar la función',async()=>{
 let code='40001';const {rectificarArqueo,consultarRectificacion}=cargar('src/services/rectificacionesArqueoService.ts',{'@/lib/supabase':{supabase:{rpc:async()=>({data:null,error:{code,message:'Datos desactualizados'}})}}});
 await assert.rejects(rectificarArqueo({}),e=>e.codigo==='40001');code='PGRST202';await assert.rejects(consultarRectificacion('a'),/todavía no está habilitada/);
});
