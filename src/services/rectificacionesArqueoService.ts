import {supabase} from "@/lib/supabase";
import type {EstadoRectificacion} from "@/lib/rectificacionesArqueo";
export class ErrorRectificacion extends Error {
 codigo?:string;
 constructor(message:string,codigo?:string){super(message);this.name="ErrorRectificacion";this.codigo=codigo;}
}
function errorServidor(error:{message:string;code?:string}) {
 return new ErrorRectificacion(error.code === "PGRST202" ? "La rectificación de arqueos todavía no está habilitada en el servidor." : error.message,error.code);
}
export async function consultarRectificacion(arqueoId:string):Promise<EstadoRectificacion>{
 const {data,error}=await supabase.rpc("consultar_rectificacion_arqueo",{p_arqueo_id:arqueoId});
 if(error)throw errorServidor(error);
 if(!data?.actual || !Array.isArray(data.actual.medios) || !Array.isArray(data.historial))throw new Error("No se pudo obtener el cierre original.");
 return data;
}
export async function rectificarArqueo(input:{arqueoId:string;revision:number;motivo:string;declaraciones:{medioPagoId:string;montoDeclarado:number}[]}):Promise<EstadoRectificacion>{
 const {data,error}=await supabase.rpc("rectificar_arqueo_cerrado",{p_arqueo_id:input.arqueoId,p_revision:input.revision,p_motivo:input.motivo,p_declaraciones:input.declaraciones});
 if(error)throw errorServidor(error);
 if(!data?.actual || !Array.isArray(data.historial))throw new Error("No se pudo verificar la rectificación. Actualizá el arqueo antes de volver a intentar.");
 return data;
}
