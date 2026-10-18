// Cada navegación invalida respuestas de la selección anterior, incluso A → B → A.
export function crearControlSeleccion() {
  let version = 0;
  return {
    cambiar: () => { version += 1; },
    capturar: () => {
      const origen = version;
      return () => origen === version;
    },
  };
}
