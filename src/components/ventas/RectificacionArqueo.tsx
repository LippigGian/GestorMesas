import {useEffect,useRef,useState} from "react";
import {History, PencilLine, RefreshCw} from "lucide-react";
import {usePermisos} from "@/context/PermisosContext";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {prepararRectificacion,type EstadoRectificacion} from "@/lib/rectificacionesArqueo";
import {consultarRectificacion,rectificarArqueo,ErrorRectificacion} from "@/services/rectificacionesArqueoService";
const moneda=(valor:number|null)=>valor === null ? "—" : new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(valor);
export function RectificacionArqueo({arqueoId,onRectificado}:{arqueoId:string;onRectificado:(resultado:EstadoRectificacion)=>void}){
 const {administrador}=usePermisos();
 const [abierto,setAbierto]=useState(false),[modo,setModo]=useState<"editar"|"historial">("editar");
 const [datos,setDatos]=useState<EstadoRectificacion|null>(null),[valores,setValores]=useState<Record<string,string>>({}),[motivo,setMotivo]=useState("");
 const [cargando,setCargando]=useState(false),[guardando,setGuardando]=useState(false),[error,setError]=useState(""),[exito,setExito]=useState(""),[conflicto,setConflicto]=useState(false),[revision,setRevision]=useState(0);
 const pendiente=useRef(false);
 useEffect(()=>{let vigente=true;if(!abierto || !administrador)return;setCargando(true);setError("");setExito("");setDatos(null);
 consultarRectificacion(arqueoId).then(r=>{if(vigente){setDatos(r);setValores(Object.fromEntries(r.actual.medios.map(m=>[m.medioPagoId,String(m.declarado)])));setMotivo("");setConflicto(false);}})
 .catch(e=>{if(vigente)setError(e.message);}).finally(()=>{if(vigente)setCargando(false);});return()=>{vigente=false;};
 },[abierto,arqueoId,administrador,revision]);
 if(!administrador)return null;
 return <>
  <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{setModo("editar");setAbierto(true);}}><PencilLine className="h-4 w-4" aria-hidden="true"/>Rectificar importes</Button><Button variant="ghost" onClick={()=>{setModo("historial");setAbierto(true);}}><History className="h-4 w-4" aria-hidden="true"/>Ver rectificaciones</Button></div>
  <Dialog open={abierto} onOpenChange={valor=>{if(!pendiente.current)setAbierto(valor);}}>
   <DialogContent className="max-h-[90dvh] overflow-y-auto [&>*]:min-w-0 sm:max-w-3xl" showCloseButton={!guardando} onEscapeKeyDown={e=>{if(guardando)e.preventDefault();}} onPointerDownOutside={e=>{if(guardando)e.preventDefault();}}>
    <DialogHeader><DialogTitle>{modo === "editar"?"Rectificar arqueo cerrado":"Historial de rectificaciones"}</DialogTitle><DialogDescription>Solo se corrigen los importes declarados. Se conserva el cierre original, las ventas y los gastos.</DialogDescription></DialogHeader>
    <div className="flex flex-wrap gap-2"><Button variant={modo === "editar"?"secondary":"ghost"} aria-pressed={modo === "editar"} disabled={guardando} onClick={()=>setModo("editar")}>Importes declarados</Button><Button variant={modo === "historial"?"secondary":"ghost"} aria-pressed={modo === "historial"} disabled={guardando} onClick={()=>setModo("historial")}>Historial{datos?` (${datos.historial.length})`:""}</Button></div>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {exito && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{exito}</p>}
    {cargando?<p role="status" className="py-6 text-muted-foreground">Cargando cierre e historial…</p>:datos && modo === "editar"?<form className="min-w-0 space-y-4" onSubmit={async e=>{e.preventDefault();if(pendiente.current || !datos || conflicto)return;setError("");setExito("");
      try{const input=prepararRectificacion(datos.actual.medios,valores,motivo);pendiente.current=true;setGuardando(true);
       const r=await rectificarArqueo({arqueoId,revision:datos.revision,...input});setDatos(r);setValores(Object.fromEntries(r.actual.medios.map(m=>[m.medioPagoId,String(m.declarado)])));setMotivo("");onRectificado(r);setExito("Rectificación guardada. El cierre original y el motivo quedaron registrados.");
      }catch(err){setError(err instanceof Error?err.message:"No se pudo guardar la rectificación.");if(err instanceof ErrorRectificacion && err.codigo === "40001")setConflicto(true);}
      finally{pendiente.current=false;setGuardando(false);}
     }}>
     <div className="overflow-hidden rounded-xl border">
      <div className="hidden grid-cols-[1.2fr_1fr_1fr_1.1fr] gap-3 bg-muted/40 p-4 text-xs font-semibold sm:grid" aria-hidden="true"><span>Medio de pago</span><span className="text-right">Sistema al cierre</span><span className="text-right">Declarado actual</span><span>Nuevo declarado</span></div>
      {datos.actual.medios.map(m=><div key={m.medioPagoId} role="group" aria-label={`Importes en ${m.nombre}`} className="grid grid-cols-2 items-center gap-3 border-t p-4 first:border-t-0 sm:grid-cols-[1.2fr_1fr_1fr_1.1fr]">
       <p className="col-span-2 text-sm font-semibold sm:col-span-1">{m.nombre}</p>
       <div className="text-sm sm:text-right"><span className="mb-1 block text-xs text-muted-foreground sm:hidden">Sistema al cierre</span><span className="whitespace-nowrap tabular-nums">{moneda(m.sistema)}</span></div>
       <div className="text-sm sm:text-right"><span className="mb-1 block text-xs text-muted-foreground sm:hidden">Declarado actual</span><span className="whitespace-nowrap tabular-nums">{moneda(m.declarado)}</span></div>
       <div className="col-span-2 space-y-2 sm:col-span-1"><label htmlFor={`rectificar-${m.medioPagoId}`} className="block text-xs font-medium sm:hidden">Nuevo declarado</label><Input id={`rectificar-${m.medioPagoId}`} aria-label={`Nuevo importe declarado en ${m.nombre}`} required inputMode="decimal" className="min-h-11" disabled={guardando || conflicto} value={valores[m.medioPagoId] ?? ""} onChange={e=>{setValores({...valores,[m.medioPagoId]:e.target.value});setError("");setExito("");}}/></div>
      </div>)}
     </div>
     <label className="block space-y-2"><span className="text-sm font-medium">Motivo de la rectificación</span><textarea required maxLength={500} rows={3} disabled={guardando || conflicto} className="w-full rounded-md border bg-background p-3 text-base" placeholder="Ej.: error al contar el efectivo del cierre." value={motivo} onChange={e=>{setMotivo(e.target.value);setError("");setExito("");}}/></label>
     <p className="text-xs text-muted-foreground">Se recalcularán las diferencias sin modificar los importes del sistema ni la fecha de cierre. Tu usuario y el motivo quedarán en el historial.</p>
     <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={guardando} onClick={()=>setAbierto(false)}>Cancelar</Button><Button type="submit" className="min-h-11" disabled={guardando || conflicto || !datos.actual.medios.length}>{guardando?"Guardando…":"Guardar rectificación"}</Button></div>
    </form>:datos && modo === "historial"?<div className="space-y-3">
      {datos.historial.length === 0?<p className="rounded-xl border p-5 text-sm text-muted-foreground">Este arqueo conserva su cierre original y todavía no tiene rectificaciones.</p>:<>
       <p className="rounded-lg bg-muted/40 p-3 text-sm">Declarado en el cierre original: <strong>{moneda(datos.historial[datos.historial.length-1].anterior.totalDeclarado)}</strong>. Declarado actual: <strong>{moneda(datos.actual.totalDeclarado)}</strong>.</p>
       {datos.historial.map(r=><details key={r.id} className="rounded-xl border p-4"><summary className="cursor-pointer space-y-1 text-sm"><span className="font-semibold">Rectificación {r.revision} · {new Date(r.fecha).toLocaleString("es-AR")}</span><span className="mt-1 block text-muted-foreground">{r.autor} · {r.email}</span><span className="mt-2 block whitespace-pre-wrap break-words">{r.motivo}</span></summary><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Cambios de la rectificación {r.revision}</caption><thead><tr><th scope="col" className="p-2 text-left">Medio</th><th scope="col" className="p-2 text-right">Anterior</th><th scope="col" className="p-2 text-right">Corregido</th></tr></thead><tbody>{r.posterior.medios.map(m=><tr key={m.medioPagoId} className="border-t"><td className="p-2">{m.nombre}</td><td className="p-2 text-right tabular-nums">{moneda(r.anterior.medios.find(a=>a.medioPagoId===m.medioPagoId)?.declarado ?? null)}</td><td className="p-2 text-right tabular-nums">{moneda(m.declarado)}</td></tr>)}</tbody></table><p className="mt-3 text-sm">Diferencia total: {moneda(r.anterior.diferencia)} → {moneda(r.posterior.diferencia)}</p></div></details>)}
      </>}
     </div>:null}
    {!cargando && (error || conflicto) && <Button variant="outline" disabled={guardando} onClick={()=>setRevision(n=>n+1)}><RefreshCw className="h-4 w-4" aria-hidden="true"/>Actualizar datos</Button>}
   </DialogContent>
  </Dialog>
 </>;
}
