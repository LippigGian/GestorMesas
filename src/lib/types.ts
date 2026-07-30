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

export type MedioPago = {
  id: string;
  nombre: string;
  activo: boolean;
};

export type Caja = {
  id: string;
  nombre: string;
  activo: boolean;
};

export type ArqueoCaja = {
  id: string;
  cajaId: string;
  cajaNombre?: string;
  estado: 'abierto' | 'cerrado' | 'cancelado';
  montoInicial: number;
  montoFinalDeclarado?: number;
  totalVentas: number;
  diferencia?: number;
  openedAt?: string;
  closedAt?: string;
};

export type Turno = {
  id: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
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
