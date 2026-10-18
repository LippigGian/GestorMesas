# Gestor Mesas

## Métricas

La página `/metricas` permite analizar períodos de hasta 366 días, con fechas en
hora de Argentina y montos en ARS. No requiere nuevas migraciones SQL.

- Ventas: pedidos cerrados dentro del período, según `closed_at`. Excluye abiertos
  y cancelados. El total incluye descuentos generales; el ticket promedio divide
  ese importe por la cantidad de pedidos cerrados.
- Productos: renglones de esos pedidos, agrupados por identificador de producto.
  Los descuentos negativos no se cuentan como productos. Sus importes se muestran
  antes de descuentos generales del pedido.
- Medios de pago: cobros por `pedido_pagos.created_at`, incluidos pagos parciales
  y pagos conservados en pedidos cancelados. Pueden diferir de las ventas del período.
- Gastos: por `gastos.fecha`, agrupados por categoría. Los gastos sin categoría
  aparecen en un grupo propio.

Las consultas son de solo lectura y paginan los resultados. No se calculan
rentabilidad ni resultado de caja.

Para verificar agregaciones, fechas y paginación: `node --test tests/metricas.test.cjs`.

Aplicacion web hecha con React, TypeScript y Vite para gestionar mesas.

## Requisitos

Antes de correr el proyecto, asegurate de tener instalado:

- Node.js
- npm
- Git

Para verificarlo, podes ejecutar:

```powershell
node -v
npm -v
git --version
```

## Instalacion

Clonar el repositorio:

```powershell
git clone https://github.com/LippigGian/GestorMesas.git
```

Entrar a la carpeta del proyecto:

```powershell
cd GestorMesas
```

Si ya lo clonaste en esta carpeta:

```powershell
cd "C:\Users\GianL\OneDrive\Desktop\gestor mesas"
```

Instalar las dependencias:

```powershell
npm install
```

## Correr en desarrollo

Levantar el servidor local:

```powershell
npm run dev
```

Vite va a mostrar una URL en la terminal. Normalmente es:

```text
http://localhost:5173/
```

Abrila en el navegador para usar la aplicacion.

## Compilar para produccion

Generar la version final del proyecto:

```powershell
npm run build
```

La salida se genera en la carpeta `dist`.

## Previsualizar la build

Despues de compilar, podes previsualizar la version de produccion con:

```powershell
npm run preview
```

## Comandos disponibles

```powershell
npm run dev
```

Inicia el entorno de desarrollo.

```powershell
npm run build
```

Compila TypeScript y genera la build de Vite.

```powershell
npm run lint
```

Ejecuta ESLint para revisar el codigo.

```powershell
npm run preview
```

Sirve localmente la build generada.
