export type Mesa = {
  id: string;
  numero: string;
  tipo: 'cuadrada' | 'redonda';
};

export type Celda = {
  x: number;
  y: number;
  mesa?: Mesa;
};

export type Pedido = {
  id: number;
  horaInicio: string;
  estado: 'En curso' | 'Finalizado';
  cliente: string;
  total: number;
};

