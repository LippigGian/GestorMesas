import {useId} from "react";
import {PencilLine} from "lucide-react";
import type {FiltroRectificaciones} from "@/lib/filtroRectificaciones";
export function DistintivoRectificacion({cantidad}:{cantidad?:number}){
 if(!cantidad)return null;
 return <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground" title={`${cantidad} ${cantidad === 1?"rectificación registrada":"rectificaciones registradas"}`}><PencilLine className="h-3 w-3" aria-hidden="true"/>Rectificado{cantidad>1?` (${cantidad})`:""}</span>;
}
export function SelectorRectificaciones({valor,onChange,disponible=true}:{valor:FiltroRectificaciones;onChange:(filtro:FiltroRectificaciones)=>void;disponible?:boolean}){
 const id=useId();
 return <div className="flex flex-wrap items-center gap-2"><label className="text-sm font-medium" htmlFor={id}>Rectificaciones</label><select id={id} className="min-h-11 rounded-md border bg-background px-3 text-sm" value={valor} disabled={!disponible} onChange={e=>onChange(e.target.value as FiltroRectificaciones)}><option value="todos">Todos los arqueos</option><option value="rectificados">Solo rectificados</option><option value="sin_rectificar">Sin rectificar</option></select>{!disponible && <span className="text-xs text-muted-foreground">El filtro de rectificaciones aún no está disponible.</span>}</div>;
}
