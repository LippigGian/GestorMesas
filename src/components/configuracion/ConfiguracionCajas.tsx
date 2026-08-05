import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Caja } from "@/lib/types";
import {
  activarCaja,
  actualizarCaja,
  crearCaja,
  desactivarCaja,
  normalizarNombreCaja,
  obtenerCajas,
} from "@/services/cajasService";

export function ConfiguracionCajas() {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [nombreCaja, setNombreCaja] = useState("");
  const [cajaEditando, setCajaEditando] = useState<Caja | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarCajas() {
      try {
        setCargando(true);
        setError(null);
        const cajasDb = await obtenerCajas();

        if (mounted) {
          setCajas(cajasDb);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las cajas");
        }
      } finally {
        if (mounted) {
          setCargando(false);
        }
      }
    }

    cargarCajas();

    return () => {
      mounted = false;
    };
  }, []);

  const limpiarFormulario = () => {
    setCajaEditando(null);
    setNombreCaja("");
  };

  const guardarCaja = async () => {
    const nombreNormalizado = normalizarNombreCaja(nombreCaja);

    if (!nombreNormalizado) {
      setError("El nombre de la caja es obligatorio.");
      return;
    }

    const yaExiste = cajas.some(
      (caja) =>
        caja.id !== cajaEditando?.id && normalizarNombreCaja(caja.nombre) === nombreNormalizado
    );

    if (yaExiste) {
      setError("Ya existe una caja con ese nombre.");
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      const cajaGuardada = cajaEditando
        ? await actualizarCaja(cajaEditando.id, nombreCaja)
        : await crearCaja(nombreCaja);

      setCajas((prev) => {
        const existe = prev.some((caja) => caja.id === cajaGuardada.id);
        const nuevas = existe
          ? prev.map((caja) => (caja.id === cajaGuardada.id ? cajaGuardada : caja))
          : [...prev, cajaGuardada];

        return nuevas.sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
      limpiarFormulario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la caja");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoCaja = async (caja: Caja, activo: boolean) => {
    try {
      setGuardando(true);
      setError(null);

      if (activo) {
        await activarCaja(caja.id);
      } else {
        await desactivarCaja(caja.id);
      }

      setCajas((prev) =>
        prev.map((item) => (item.id === caja.id ? { ...item, activo } : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la caja");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Nombre de caja"
          value={nombreCaja}
          onChange={(event) => setNombreCaja(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              guardarCaja();
            }
          }}
        />
        <Button disabled={guardando} type="button" onClick={guardarCaja}>
          {cajaEditando ? "Guardar" : "Agregar"}
        </Button>
        {cajaEditando && (
          <Button disabled={guardando} type="button" variant="outline" onClick={limpiarFormulario}>
            Cancelar
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={3}>
                  Cargando cajas...
                </td>
              </tr>
            ) : cajas.length > 0 ? (
              cajas.map((caja) => (
                <tr key={caja.id} className="border-b">
                  <td className="p-3 font-medium">{caja.nombre}</td>
                  <td className="p-3">
                    <span className="rounded bg-muted px-2 py-1 text-xs">
                      {caja.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        disabled={guardando}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCajaEditando(caja);
                          setNombreCaja(caja.nombre);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      {caja.activo ? (
                        <Button
                          disabled={guardando}
                          size="sm"
                          type="button"
                          variant="destructive"
                          onClick={() => cambiarEstadoCaja(caja, false)}
                        >
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          disabled={guardando}
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => cambiarEstadoCaja(caja, true)}
                        >
                          Activar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={3}>
                  No hay cajas cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
