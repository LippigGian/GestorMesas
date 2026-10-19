export type FiltroRectificaciones = "todos" | "rectificados" | "sin_rectificar";
export function filtrarPorRectificacion<T extends {cantidadRectificaciones?:number}>(arqueos:T[],filtro:FiltroRectificaciones):T[]{
 if(filtro === "todos")return arqueos;
 return arqueos.filter(a=>typeof a.cantidadRectificaciones === "number" && (filtro === "rectificados" ? a.cantidadRectificaciones>0:a.cantidadRectificaciones === 0));
}
