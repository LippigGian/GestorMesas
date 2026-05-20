type Props = {
  numero: string;
  tipo: 'cuadrada' | 'redonda';
  estado?: 'libre' | 'ocupada';
};

export function MesaCard({ numero, tipo, estado = 'libre' }: Props) {
  const colorEstado =
    estado === 'ocupada'
      ? 'border-red-300 bg-red-100 text-red-800 hover:bg-red-200'
      : 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200';

  return (
<div
  className={`h-full w-full border text-lg font-bold shadow-sm transition ${
    tipo === 'redonda' ? 'rounded-full' : 'rounded-md'
  } ${colorEstado} flex items-center justify-center`}
>
  {numero}
</div>

  );
}
