import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfiguracionGeneral } from "@/context/ConfiguracionGeneralContext";

export function ConfiguracionGeneral() {
  const { nombreNegocio, guardarNombreNegocio } = useConfiguracionGeneral();
  const [nombre, setNombre] = useState(nombreNegocio);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  return (
    <form className="max-w-xl space-y-4" onSubmit={(event) => {
      event.preventDefault();
      setError("");
      setGuardado(false);
      try {
        guardarNombreNegocio(nombre);
        setNombre(nombre.trim().replace(/\s+/g, " "));
        setGuardado(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el nombre.");
      }
    }}>
      <div>
        <label htmlFor="nombre-negocio" className="mb-2 block text-sm font-medium">Nombre del negocio</label>
        <Input id="nombre-negocio" value={nombre} maxLength={60} required
          aria-describedby="nombre-negocio-ayuda" aria-invalid={!!error}
          onChange={(event) => { setNombre(event.target.value); setGuardado(false); setError(""); }} />
        <p id="nombre-negocio-ayuda" className="mt-2 text-sm text-muted-foreground">
          Se muestra en la barra de navegación. Máximo 60 caracteres.
        </p>
      </div>
      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">Vista previa</p>
        <p className="mt-1 break-words font-semibold">{nombre.trim() || "Nombre del negocio"}</p>
      </div>
      <p className="text-sm text-muted-foreground">Esta preferencia se guarda solo en este navegador. No se sincroniza con otras PCs y se pierde al borrar los datos del sitio.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit"><Save className="h-4 w-4" aria-hidden="true" />Guardar cambios</Button>
      <p role="status" className="text-sm text-muted-foreground">{guardado ? "Nombre guardado. La barra de navegación ya está actualizada." : ""}</p>
    </form>
  );
}
