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
  id: string;
  horaInicio?: string;
  estado: 'abierto' | 'cerrado' | 'cancelado' | 'En curso' | 'Finalizado';
  cliente?: string;
  total: number;
  mesaId?: string;
  personas?: number;
  tipo?: 'mesa' | 'mostrador';
};

export type PedidoItem = {
  id: string;
  pedidoId: string;
  productoId?: string;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
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
  descripcion?: string;
  costo?: number;
  activo?: boolean;
  favorito?: boolean;
  controlaStock?: boolean;
  stock?: number;
};
