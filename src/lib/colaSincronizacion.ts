// Una sola lectura a la vez. Los avisos y escrituras invalidan lecturas anteriores.
export function crearColaSincronizacion(
  actualizar: (vigente: () => boolean) => Promise<void>,
  onError: (error: unknown) => void,
  onExito: () => void,
  demora = 300,
) {
  let version = 0;
  let operaciones = 0;
  let leyendo = false;
  let pendiente = false;
  let destruida = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function programar() {
    clearTimeout(timer);
    if (destruida || operaciones || leyendo || !pendiente) return;
    timer = setTimeout(async () => {
      if (destruida || operaciones) return;
      pendiente = false;
      leyendo = true;
      const origen = version;
      const vigente = () => !destruida && origen === version && operaciones === 0;
      try {
        await actualizar(vigente);
        if (vigente()) onExito();
      } catch (error) {
        if (vigente()) onError(error);
      } finally {
        leyendo = false;
        programar();
      }
    }, demora);
  }

  function solicitar() {
    version += 1;
    pendiente = true;
    programar();
  }

  return {
    solicitar,
    async ejecutarCambio<T>(cambio: () => Promise<T>): Promise<T> {
      operaciones += 1;
      solicitar();
      try { return await cambio(); }
      finally { operaciones -= 1; programar(); }
    },
    destruir() { destruida = true; version += 1; clearTimeout(timer); },
  };
}
