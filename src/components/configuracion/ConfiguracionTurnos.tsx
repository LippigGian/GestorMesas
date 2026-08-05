import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Turno } from "@/lib/types";
import {
  activarTurno,
  actualizarTurno,
  crearTurno,
  desactivarTurno,
  normalizarNombreTurno,
  obtenerTurnos,
} from "@/services/turnosService";

export function ConfiguracionTurnos() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [turnoEditando, setTurnoEditando] = useState<Turno | null>(null);
  const [nombre, setNombre] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarTurnos() {
      try {
        setCargando(true);
        setError(null);
        const turnosDb = await obtenerTurnos();

        if (mounted) {
          setTurnos(turnosDb);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los turnos");
        }
      } finally {
        if (mounted) {
          setCargando(false);
        }
      }
    }

    cargarTurnos();

    return () => {
      mounted = false;
    };
  }, []);

  const limpiarFormulario = () => {
    setTurnoEditando(null);
    setNombre("");
    setHoraInicio("");
    setHoraFin("");
  };

  const validarFormulario = () => {
    const nombreNormalizado = normalizarNombreTurno(nombre);

    if (!nombreNormalizado) {
      return "El nombre del turno es obligatorio.";
    }

    if (!horaInicio || !horaFin) {
      return "Carga el horario de inicio y fin.";
    }

    if (horaInicio === horaFin) {
      return "El horario de inicio y fin no pueden ser iguales.";
    }

    const yaExiste = turnos.some(
      (turno) =>
        turno.id !== turnoEditando?.id && normalizarNombreTurno(turno.nombre) === nombreNormalizado
    );

    if (yaExiste) {
      return "Ya existe un turno con ese nombre.";
    }

    return null;
  };

  const guardarTurno = async () => {
    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      const turnoGuardado = turnoEditando
        ? await actualizarTurno({
            turnoId: turnoEditando.id,
            nombre,
            horaInicio,
            horaFin,
          })
        : await crearTurno({
            nombre,
            horaInicio,
            horaFin,
          });

      setTurnos((prev) => {
        const existe = prev.some((turno) => turno.id === turnoGuardado.id);
        const nuevos = existe
          ? prev.map((turno) => (turno.id === turnoGuardado.id ? turnoGuardado : turno))
          : [...prev, turnoGuardado];

        return nuevos.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      });
      limpiarFormulario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el turno");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoTurno = async (turno: Turno, activo: boolean) => {
    try {
      setGuardando(true);
      setError(null);

      if (activo) {
        await activarTurno(turno.id);
      } else {
        await desactivarTurno(turno.id);
      }

      setTurnos((prev) =>
        prev.map((item) => (item.id === turno.id ? { ...item, activo } : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el turno");
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

      <div className="grid gap-2 md:grid-cols-[1fr_10rem_10rem_auto_auto]">
        <Input
          placeholder="Nombre del turno"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
        />
        <Input
          aria-label="Inicio"
          type="time"
          value={horaInicio}
          onChange={(event) => setHoraInicio(event.target.value)}
        />
        <Input
          aria-label="Fin"
          type="time"
          value={horaFin}
          onChange={(event) => setHoraFin(event.target.value)}
        />
        <Button disabled={guardando} type="button" onClick={guardarTurno}>
          {turnoEditando ? "Guardar" : "Crear"}
        </Button>
        {turnoEditando && (
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
              <th className="p-3 text-left">Inicio</th>
              <th className="p-3 text-left">Fin</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                  Cargando turnos...
                </td>
              </tr>
            ) : turnos.length > 0 ? (
              turnos.map((turno) => (
                <tr key={turno.id} className="border-b">
                  <td className="p-3 font-medium">{turno.nombre}</td>
                  <td className="p-3 font-semibold">{turno.horaInicio}</td>
                  <td className="p-3 font-semibold">{turno.horaFin}</td>
                  <td className="p-3">
                    <span className="rounded bg-muted px-2 py-1 text-xs">
                      {turno.activo ? "Activo" : "Inactivo"}
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
                          setTurnoEditando(turno);
                          setNombre(turno.nombre);
                          setHoraInicio(turno.horaInicio);
                          setHoraFin(turno.horaFin);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      {turno.activo ? (
                        <Button
                          disabled={guardando}
                          size="sm"
                          type="button"
                          variant="destructive"
                          onClick={() => cambiarEstadoTurno(turno, false)}
                        >
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          disabled={guardando}
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => cambiarEstadoTurno(turno, true)}
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
                <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                  No hay turnos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
