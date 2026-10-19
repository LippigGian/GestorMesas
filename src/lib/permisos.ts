export const permisosDisponibles = [
  { id: "editar_precios", nombre: "Editar precios" },
  { id: "ver_saldos_arqueo", nombre: "Ver arqueos y saldos" },
  { id: "abrir_cerrar_caja", nombre: "Abrir y cerrar caja" },
  { id: "aplicar_descuentos", nombre: "Aplicar descuentos" },
  { id: "editar_productos", nombre: "Crear y editar productos" },
  { id: "editar_mesas", nombre: "Administrar mesas y salones" },
  { id: "ver_ventas", nombre: "Ver ventas" },
  { id: "ver_metricas", nombre: "Ver métricas" },
  { id: "gestionar_gastos", nombre: "Gestionar gastos" },
  { id: "gestionar_usuarios", nombre: "Gestionar usuarios y roles" },
  { id: "modificar_configuracion_general", nombre: "Modificar configuración general" },
] as const;

export type Permiso = typeof permisosDisponibles[number]["id"];

export function validarPermisos(permisos: readonly string[]): Permiso[] {
  const validos = new Set<string>(permisosDisponibles.map(permiso => permiso.id));
  if (permisos.some(permiso => !validos.has(permiso))) {
    throw new Error("El rol contiene permisos que no forman parte del catálogo de la aplicación.");
  }
  return [...new Set(permisos)] as Permiso[];
}
