import React from 'react';

type Props = {
  numero: string;
  tipo: 'cuadrada' | 'redonda';
};

export function MesaCard({ numero, tipo }: Props) {
  return (
<div
  className={`text-white font-bold w-full h-full flex items-center justify-center text-lg ${
    tipo === 'redonda' ? 'rounded-full' : 'rounded'
  } bg-gray-500`}
>
  {numero}
</div>

  );
}
