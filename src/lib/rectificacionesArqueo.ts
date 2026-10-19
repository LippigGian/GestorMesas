export type MedioRectificacion = { medioPagoId:string; nombre:string; sistema:number; declarado:number; diferencia:number };
export type FotoRectificacion = { totalDeclarado:number|null; diferencia:number|null; montoInicial:number; totalVentas:number; apertura:string; cierre:string; medios:MedioRectificacion[] };
export type EstadoRectificacion = { arqueoId:string; revision:number; actual:FotoRectificacion; historial:{id:string;revision:number;fecha:string;autor:string;email:string;motivo:string;anterior:FotoRectificacion;posterior:FotoRectificacion}[] };

export function prepararRectificacion(medios:MedioRectificacion[],valores:Record<string,string>,motivo:string) {
 const razon=motivo.trim();
 if(!razon || razon.length>500)throw new Error("Ingresá un motivo de entre 1 y 500 caracteres.");
 if(!medios.length)throw new Error("Este arqueo no tiene importes declarados para rectificar.");
 const declaraciones=medios.map(m=>{
  const texto=(valores[m.medioPagoId] ?? "").trim();
  const importe=Number(texto.replace(",","."));
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(texto) || !Number.isFinite(importe) || !Number.isSafeInteger(Math.round(importe*100)))throw new Error(`Ingresá un importe válido para ${m.nombre}, con hasta dos decimales.`);
  return {medioPagoId:m.medioPagoId,montoDeclarado:importe};
 });
 if(declaraciones.every((d,i)=>d.montoDeclarado===Number(medios[i].declarado)))throw new Error("Modificá al menos un importe declarado para guardar una rectificación.");
 return {declaraciones,motivo:razon};
}
