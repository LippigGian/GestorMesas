const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function cargar(file,imports={}){const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,name=>imports[name]);return exports;}
const {filtrarPorRectificacion}=cargar('src/lib/filtroRectificaciones.ts');
test('filtra rectificados, sin rectificar y todos sin cambiar el estado del arqueo',()=>{
 const rows=[{id:'a',estado:'cerrado',cantidadRectificaciones:2},{id:'b',estado:'cerrado',cantidadRectificaciones:0},{id:'c',estado:'abierto',cantidadRectificaciones:0},{id:'d'}];
 assert.deepEqual(filtrarPorRectificacion(rows,'rectificados').map(r=>r.id),['a']);assert.deepEqual(filtrarPorRectificacion(rows,'sin_rectificar').map(r=>r.id),['b','c']);assert.equal(filtrarPorRectificacion(rows,'todos'),rows);assert.equal(rows[0].estado,'cerrado');
});
test('consulta cantidades en un único lote y marca los arqueos sin rectificaciones con cero',async()=>{
 const calls=[];const rows=['a','b'].map(id=>({id,caja_id:'caja',estado:'cerrado',monto_inicial:0,total_ventas:100,monto_final_declarado:90,diferencia:-10}));
 const q={select:()=>q,order:()=>q,eq:()=>q,then:(resolve,reject)=>Promise.resolve({data:rows,error:null}).then(resolve,reject)};
 let error=null;
 const {obtenerArqueosCaja}=cargar('src/services/arqueosCajaService.ts',{'@/lib/supabase':{supabase:{from:()=>q,rpc:async(name,args)=>{calls.push({name,args});return {data:[{arqueo_id:'a',cantidad:2}],error};}}}});
 const data=await obtenerArqueosCaja('local');assert.deepEqual(data.map(a=>a.cantidadRectificaciones),[2,0]);assert.deepEqual(calls,[{name:'resumen_rectificaciones_arqueos',args:{p_arqueos_ids:['a','b']}}]);
 error={code:'PGRST202',message:'No instalado'};assert((await obtenerArqueosCaja('local')).every(a=>a.cantidadRectificaciones === undefined));
 error={code:'XX000',message:'Error real'};await assert.rejects(obtenerArqueosCaja('local'),/Error real/);
});
