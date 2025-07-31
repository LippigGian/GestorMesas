// export type Mesa = {
//   id: string;
//   numero: string;
//   tipo: 'cuadrada' | 'redonda';
// };

export type Mesa = {
  id: string;
  numero: string;
  tipo: 'cuadrada' | 'redonda';
  estado?: 'libre' | 'ocupada';
  personas?: number;
  productos?: Producto[];
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

export type Categoria = {
  id: string;
  nombre: string;
};

export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  categoriaId: string;
  cantidad?: number;
};
