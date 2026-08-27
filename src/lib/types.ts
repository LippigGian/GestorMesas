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

export type Salon = {
  id: string;
  nombre: string;
  activo: boolean;
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
  comentario?: string;
};

export type MedioPago = {
  id: string;
  nombre: string;
  activo: boolean;
};

export type Proveedor = {
  id: string;
  nombre: string;
  activo: boolean;
};

export type RolUsuario = {
  id: string;
  nombre: string;
  descripcion?: string;
  permisos: string[];
  activo: boolean;
};

export type UsuarioSistema = {
  id: string;
  nombre: string;
  email: string;
  rolId?: string;
  rolNombre?: string;
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

export type ArqueoCajaMedioPago = {
  id?: string;
  arqueoCajaId: string;
  medioPagoId: string;
  medioPagoNombre?: string;
  montoSistema: number;
  montoDeclarado: number;
  diferencia: number;
};

export type Turno = {
  id: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
};

export type Gasto = {
  id: string;
  fecha: string;
  importe: number;
  proveedorId?: string;
  proveedor?: string;
  categoria?: string;
  comentario?: string;
  medioPagoId: string;
  medioPagoNombre?: string;
  arqueoCajaId: string;
  arqueoCajaEstado?: 'abierto' | 'cerrado' | 'cancelado';
  createdAt?: string;
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
