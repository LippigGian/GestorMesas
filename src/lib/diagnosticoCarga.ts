type Medicion = { etapa: string; inicioMs: number; duracionMs: number | null; estado: "pendiente" | "completada" | "error"; http?: number };

// Solo tiempos y nombres de etapas: nunca sesiones, cuerpos, cabeceras ni URLs con tokens.
export function crearDiagnosticoCarga(reloj = () => performance.now()) {
  const inicio = reloj();
  const registros: Medicion[] = [];
  function comenzar(etapa: string) {
    const desde = reloj();
    const registro: Medicion = { etapa, inicioMs: Math.round(desde - inicio), duracionMs: null, estado: "pendiente" };
    registros.push(registro);
    if (registros.length > 80) registros.shift();
    return (estado: "completada" | "error", http?: number) => {
      registro.duracionMs = Math.round(reloj() - desde);
      registro.estado = estado;
      if (http !== undefined) registro.http = http;
    };
  }
  async function medir<T>(etapa: string, operacion: () => PromiseLike<T>): Promise<T> {
    const terminar = comenzar(etapa);
    try { const resultado = await operacion(); terminar("completada"); return resultado; }
    catch (error) { terminar("error"); throw error; }
  }
  function fetchMedido(base: typeof fetch): typeof fetch {
    return async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      // Registrar solamente el recurso, sin identificadores ni parámetros de consulta.
      const ruta = url.pathname.split("/").slice(0, 5).map(parte => (parte === "" || /^[a-z_\-]+$/i.test(parte) || /^v\d+$/.test(parte)) ? parte : "…").join("/");
      const terminar = comenzar(`Red ${ruta}`);
      try { const response = await base(input, init); terminar(response.ok ? "completada" : "error", response.status); return response; }
      catch (error) { terminar("error"); throw error; }
    };
  }
  return { medir, fetchMedido, informe: () => registros.map(registro => ({ ...registro })) };
}

export const diagnosticoCarga = crearDiagnosticoCarga();

export function informeCargaPagina() {
  const documento = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const redondear = (valor: number | undefined) => valor === undefined ? null : Math.round(valor);
  const recursos = (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
    .filter(recurso => {
      try { return new URL(recurso.name).origin === window.location.origin; } catch { return false; }
    })
    .sort((a, b) => b.duration - a.duration).slice(0, 12)
    .map(recurso => ({ archivo: new URL(recurso.name).pathname, inicioMs: redondear(recurso.startTime), duracionMs: redondear(recurso.duration), bytesTransferidos: recurso.transferSize }));
  return {
    documento: documento ? {
      tipo: documento.type,
      inicioFetchMs: redondear(documento.fetchStart),
      resolucionDnsMs: redondear(documento.domainLookupEnd - documento.domainLookupStart),
      conexionMs: redondear(documento.connectEnd - documento.connectStart),
      envioSolicitudMs: redondear(documento.requestStart),
      esperaServidorMs: redondear(documento.responseStart - documento.requestStart),
      esperaRespuestaMs: redondear(documento.responseStart),
      finRespuestaMs: redondear(documento.responseEnd),
      domListoMs: redondear(documento.domContentLoadedEventEnd),
      cargaCompletaMs: redondear(documento.loadEventEnd),
    } : null,
    primerContenidoVisibleMs: redondear(performance.getEntriesByName("first-contentful-paint")[0]?.startTime),
    recursosLocalesMasLentos: recursos,
    etapas: diagnosticoCarga.informe(),
  };
}
