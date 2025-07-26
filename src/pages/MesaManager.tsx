import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Pencil, Save } from 'lucide-react';
import { MesaGrid } from '@/components/mesa/MesaGrid';

type NavbarProps = {
  modoEdicion: boolean;
};
export default function MesaManager({ modoEdicion }: NavbarProps) {
  // const [modoEdicion, setModoEdicion] = useState(true);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Gestión de Mesas</h1>
        {/* <Button onClick={() => setModoEdicion((prev) => !prev)} variant="outline">
          {modoEdicion ? (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </>
          ) : (
            <>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </>
          )}
        </Button> */}
      </div>

      <MesaGrid modoEdicion={modoEdicion} />
    </div>
  );
}
