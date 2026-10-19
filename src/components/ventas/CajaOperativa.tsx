import {DistintivoRectificacion,SelectorRectificaciones} from "@/components/ventas/DistintivoRectificacion";
import {filtrarPorRectificacion,type FiltroRectificaciones} from "@/lib/filtroRectificaciones";
import {useEffect,useState} from "react";
import {ArrowRight, CalendarDays, CheckCircle2, CircleDashed, History, LockKeyhole, RefreshCw, Wallet} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {useLocal} from "@/context/LocalContext";
import {usePermisos} from "@/context/PermisosContext";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {obtenerCajas} from "@/services/cajasService";
import {obtenerTodosMediosPago} from "@/services/mediosPagoService";
import {obtenerArqueosCaja} from "@/services/arqueosCajaService";
import type {Caja,MedioPago,ArqueoCaja} from "@/lib/types";
type Operativo={id:string;caja_id:string;estado:string;opened_at:string;closed_at:string|null};
const monto=(value:string)=>{if(!/^\d+(?:[.,]\d{1,2})?$/.test(value)) throw new Error("Ingresá importes válidos con hasta dos decimales.");return Number(value.replace(",","."));};
export function CajaOperativa({onEstadoCajaActualizado}:{onEstadoCajaActualizado?:()=>void}={}){
  const {localId}=useLocal(); const {tiene}=usePermisos();
  const [filtroRectificaciones,setFiltroRectificaciones]=useState<FiltroRectificaciones>("todos");
  const puedeOperar=tiene("abrir_cerrar_caja"),puedeVer=tiene("ver_saldos_arqueo");
  const [arqueos,setArqueos]=useState<Operativo[]>([]),[saldos,setSaldos]=useState<ArqueoCaja[]>([]);
  const [cajas,setCajas]=useState<Caja[]>([]),[medios,setMedios]=useState<MedioPago[]>([]);
  const [caja,setCaja]=useState(""),[inicial,setInicial]=useState(""),[declaraciones,setDeclaraciones]=useState<Record<string,string>>({});
  const [error,setError]=useState(""),[mensaje,setMensaje]=useState(""),[cargando,setCargando]=useState(true),[guardando,setGuardando]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{let vigente=true;if(!localId)return;setCargando(true);setError("");
    Promise.all([(puedeVer ? supabase.rpc("listar_arqueos_operativos") : supabase.rpc("listar_arqueos_operativos").eq("estado","abierto")),obtenerCajas(localId),obtenerTodosMediosPago(localId),puedeVer?obtenerArqueosCaja(localId):Promise.resolve([])]).then(([r,c,m,s])=>{
      if(r.error)throw new Error(r.error.message);if(!vigente)return;
      setArqueos(r.data ?? []);setCajas(c);setMedios(m);setSaldos(s);setCaja(actual=>actual || c.find(x=>x.activo)?.id || "");
    }).catch(e=>{if(vigente)setError(e.message);}).finally(()=>{if(vigente)setCargando(false);});return()=>{vigente=false;};
  },[localId,puedeVer,revision]);
  const abierto=arqueos.find(a=>a.estado === "abierto");
  async function guardar(cerrar:boolean){if(guardando || !puedeOperar)return;
    if(cerrar && !window.confirm("¿Confirmás el cierre de caja con los importes ingresados? Revisalos antes de continuar."))return;
    setGuardando(true);setError("");setMensaje("");try{
    const result=cerrar?await supabase.rpc("cerrar_caja",{p_arqueo_id:abierto?.id,p_declaraciones:medios.map(m=>({medioPagoId:m.id,montoDeclarado:monto(declaraciones[m.id] ?? "")}))})
      :await supabase.rpc("abrir_caja",{p_caja_id:caja,p_monto_inicial:monto(inicial)});
    if(result.error)throw new Error(result.error.message);setMensaje(cerrar?"Caja cerrada correctamente.":"Caja abierta correctamente.");setDeclaraciones({});setInicial("");setRevision(n=>n+1);onEstadoCajaActualizado?.();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo completar la operación.");}finally{setGuardando(false);}}
  const historial=filtrarPorRectificacion(arqueos.map(a=>({...a,cantidadRectificaciones:saldos.find(s=>s.id===a.id)?.cantidadRectificaciones})),filtroRectificaciones);
  const cajaActual = cajas.find(c=>c.id===abierto?.caja_id);
  const moneda = (valor?:number) => valor === undefined ? "—" : new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(valor);
  const fecha = (valor?:string) => valor && !Number.isNaN(Date.parse(valor)) ? new Date(valor).toLocaleString("es-AR",{dateStyle:"short",timeStyle:"short"}) : "—";
  return <section className="mx-auto w-full max-w-6xl space-y-6" aria-busy={cargando}>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><Wallet className="h-6 w-6" aria-hidden="true"/></span>
        <div><h1 className="text-2xl font-bold">Arqueos de caja</h1><p className="mt-1 text-sm text-muted-foreground">{puedeOperar ? "Administrá la apertura y el cierre de tu caja." : "Consultá el estado y el historial de tus cajas."}</p></div>
      </div>
      <Button className="min-h-11" variant="outline" disabled={cargando || guardando} onClick={()=>setRevision(n=>n+1)}><RefreshCw aria-hidden="true" className={cargando ? "h-4 w-4 animate-spin motion-reduce:animate-none":"h-4 w-4"}/>Actualizar</Button>
    </header>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
    {mensaje && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true"/>{mensaje}</p>}
    {cargando?<div role="status" className="rounded-2xl border bg-card p-8 text-muted-foreground">Cargando caja…</div>:<>
      <div className={`grid gap-6 ${puedeOperar ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]":""}`}>
        <section aria-labelledby="caja-actual-titulo" className="self-start overflow-hidden rounded-2xl border bg-card">
          <div className="border-b bg-secondary/40 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="caja-actual-titulo" className="text-sm font-semibold">Estado actual</h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${abierto ? "bg-emerald-100 text-emerald-800":"bg-muted text-muted-foreground"}`}>
                {abierto?<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true"/>:<CircleDashed className="h-3.5 w-3.5" aria-hidden="true"/>}{abierto?"Abierta":"Cerrada"}
              </span>
            </div>
            <p className="mt-5 text-xl font-bold">{abierto ? cajaActual?.nombre ?? "Caja abierta" : "No hay una caja abierta"}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{abierto ? "Los cobros se registran en esta caja mientras permanece abierta." : puedeOperar ? "Seleccioná una caja e ingresá el monto inicial para comenzar." : "El estado se actualizará cuando se abra una caja."}</p>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            {abierto && <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"/><div><p className="text-xs text-muted-foreground">Apertura actual</p><p className="mt-1 text-sm font-medium">{fecha(abierto.opened_at)}</p></div></div>}
            <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true"/><p className="text-sm leading-relaxed text-muted-foreground">{abierto ? "Al finalizar, registrá los importes contados por medio de pago." : "La apertura y el cierre mantienen organizados los movimientos de cada jornada."}</p></div>
          </div>
        </section>
        {puedeOperar && <form aria-labelledby="operacion-caja-titulo" className="overflow-hidden rounded-2xl border bg-card" onSubmit={e=>{e.preventDefault();void guardar(!!abierto);}}>
          <div className="border-b p-5 sm:p-6"><h2 id="operacion-caja-titulo" className="text-lg font-bold">{abierto?"Cerrar caja":"Abrir caja"}</h2><p className="mt-1 text-sm text-muted-foreground">{abierto?"Ingresá los importes contados en cada medio de pago.":"Prepará tu caja antes de registrar los cobros."}</p></div>
          <div className="space-y-5 p-5 sm:p-6">
            {abierto?<div className="grid gap-4 sm:grid-cols-2">
              {medios.map(m=><div key={m.id} className="space-y-2"><label htmlFor={`cierre-medio-${m.id}`} className="block text-sm font-medium">{m.nombre}</label><div className="relative"><span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span><Input id={`cierre-medio-${m.id}`} className="min-h-11 pl-8 tabular-nums" inputMode="decimal" placeholder="0,00" required disabled={guardando} value={declaraciones[m.id] ?? ""} onChange={e=>setDeclaraciones({...declaraciones,[m.id]:e.target.value})}/></div></div>)}
            </div>:<>
              <div className="space-y-2"><label htmlFor="apertura-caja" className="block text-sm font-medium">Caja</label><select id="apertura-caja" required disabled={guardando} className="min-h-11 w-full rounded-md border bg-background px-3 text-base" value={caja} onChange={e=>setCaja(e.target.value)}>{cajas.filter(c=>c.activo).map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
              <div className="space-y-2"><label htmlFor="apertura-monto" className="block text-sm font-medium">Monto inicial</label><div className="relative"><span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span><Input id="apertura-monto" className="min-h-11 pl-8 tabular-nums" required disabled={guardando} inputMode="decimal" placeholder="0,00" aria-describedby="apertura-monto-ayuda" value={inicial} onChange={e=>setInicial(e.target.value)}/></div><p id="apertura-monto-ayuda" className="text-xs text-muted-foreground">Importe disponible al comenzar. Expresado en pesos.</p></div>
            </>}
          </div>
          <div className="flex justify-end border-t bg-secondary/20 p-5 sm:px-6"><Button className="min-h-11 w-full sm:w-auto" type="submit" disabled={guardando || (!abierto && !caja)}>{guardando?"Guardando…":abierto?"Confirmar cierre":"Abrir caja"}<ArrowRight className="h-4 w-4" aria-hidden="true"/></Button></div>
        </form>}
      </div>
      {puedeVer && <section aria-labelledby="historial-arqueos-titulo" className="overflow-hidden rounded-2xl border bg-card">
        <header className="flex flex-wrap items-center gap-3 border-b p-5 sm:p-6"><History className="h-5 w-5 text-primary" aria-hidden="true"/><div className="min-w-0 flex-1"><h2 id="historial-arqueos-titulo" className="font-bold">Historial de arqueos</h2><p className="mt-1 text-sm text-muted-foreground">Aperturas y saldos de tus cajas.</p></div><SelectorRectificaciones valor={filtroRectificaciones} onChange={setFiltroRectificaciones} disponible={arqueos.every(a=>saldos.find(s=>s.id===a.id)?.cantidadRectificaciones !== undefined)}/></header>
        <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-sm"><caption className="sr-only">Historial de arqueos y saldos</caption><thead><tr><th scope="col" className="px-5 py-4 text-left">Apertura</th><th scope="col" className="px-5 py-4 text-left">Caja</th><th scope="col" className="px-5 py-4 text-left">Estado</th><th scope="col" className="px-5 py-4 text-right">Monto inicial</th><th scope="col" className="px-5 py-4 text-right">Ventas</th><th scope="col" className="px-5 py-4 text-right">Diferencia</th></tr></thead><tbody>
          {historial.length === 0?<tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">{filtroRectificaciones === "todos" ? "Todavía no hay arqueos registrados." : "No hay arqueos que coincidan con este filtro."}</td></tr>:[...historial].sort((a,b)=>(b.opened_at ?? "").localeCompare(a.opened_at ?? "")).map(a=>{const saldo=saldos.find(s=>s.id===a.id);return <tr key={a.id} className="border-t"><td className="px-5 py-4">{fecha(a.opened_at)}</td><td className="px-5 py-4 font-medium">{cajas.find(c=>c.id===a.caja_id)?.nombre ?? "—"}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${a.estado === "abierto"?"bg-emerald-100 text-emerald-800":"bg-muted text-muted-foreground"}`}>{a.estado === "abierto"?"Abierto":a.estado === "cerrado"?"Cerrado":"Cancelado"}</span><div className="mt-1"><DistintivoRectificacion cantidad={a.cantidadRectificaciones}/></div></td><td className="px-5 py-4 text-right tabular-nums">{moneda(saldo?.montoInicial)}</td><td className="px-5 py-4 text-right tabular-nums">{moneda(saldo?.totalVentas)}</td><td className={`px-5 py-4 text-right tabular-nums ${saldo?.diferencia !== undefined && saldo.diferencia<0?"text-destructive":"text-muted-foreground"}`}>{moneda(saldo?.diferencia)}</td></tr>;})}
        </tbody></table></div>
      </section>}
    </>}
  </section>;
}
