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
