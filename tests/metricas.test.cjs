const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function cargar(path, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', code)((name) => {
    if (!(name in imports)) throw new Error(`Import no esperado: ${name}`);
    return imports[name];
  }, exports);
  return exports;
}
const metricas = cargar('src/lib/metricas.ts');
const { resumirMetricas, validarRango, limitesRango, fechaNegocio } = metricas;
const rango = { desde: '2026-10-01', hasta: '2026-10-03' };
const vacios = () => ({ ventas: [], items: [], pagos: [], gastos: [] });
const venta = (id, fecha, total, estado = 'cerrado') => ({ id, fecha, total, estado });

test('cuenta cierres dentro del período argentino y excluye abiertas y canceladas', () => {
  const datos = vacios();
  datos.ventas = [venta('a', '2026-10-01T03:00:00Z', 100), venta('b', '2026-10-04T02:59:59Z', 200), venta('c', '2026-10-01T02:59:59Z', 900), venta('d', '2026-10-04T03:00:00Z', 900), venta('e', '2026-10-02T12:00:00Z', 900, 'cancelado'), venta('f', '2026-10-02T12:00:00Z', 900, 'abierto')];
  const r = resumirMetricas(datos, rango, 'dia');
  assert.equal(r.totalVentas, 300);
  assert.equal(r.cantidadVentas, 2);
  assert.equal(r.ticketPromedio, 150);
  assert.deepEqual(r.periodos.map(p => p.importe), [100, 0, 200]);
});
test('ranking reúne el mismo producto y excluye descuentos y pedidos no vendidos', () => {
  const datos = vacios();
  datos.ventas = [venta('a', '2026-10-01T12:00:00Z', 270)];
  datos.items = [
    { pedidoId: 'a', productoId: 'cafe', nombre: 'Café', cantidad: 2, subtotal: 200 },
    { pedidoId: 'a', productoId: 'cafe', nombre: 'Café nuevo', cantidad: 1, subtotal: 100 },
    { pedidoId: 'a', productoId: null, nombre: 'Descuento', cantidad: 1, subtotal: -30 },
    { pedidoId: 'otro', productoId: 'pan', nombre: 'Pan', cantidad: 100, subtotal: 10000 },
  ];
  const r = resumirMetricas(datos, rango, 'dia');
  assert.equal(r.productos.length, 1);
  assert.equal(r.productos[0].cantidad, 3);
  assert.equal(r.productos[0].importe, 300);
  assert.equal(r.totalVentas, 270);
});
test('no mezcla productos con igual nombre pero diferente identificador', () => {
  const datos = vacios();
  datos.ventas = [venta('a', '2026-10-01T12:00:00Z', 2)];
  datos.items = ['uno', 'dos'].map(productoId => ({ pedidoId: 'a', productoId, nombre: 'Café', cantidad: 1, subtotal: 1 }));
  assert.equal(resumirMetricas(datos, rango, 'dia').productos.length, 2);
});
test('meses sin ventas se incluyen y suman lo mismo que la agrupación diaria', () => {
  const datos = vacios();
  datos.ventas = [venta('a', '2026-10-01T12:00:00Z', 20), venta('b', '2026-12-02T12:00:00Z', 30)];
  const r = { desde: '2026-10-01', hasta: '2026-12-31' };
  const meses = resumirMetricas(datos, r, 'mes');
  assert.deepEqual(meses.periodos.map(p => p.importe), [20, 0, 30]);
  assert.equal(meses.totalVentas, resumirMetricas(datos, r, 'dia').totalVentas);
});
test('pagos son movimientos independientes de los cierres y gastos se agrupan sin categoría', () => {
  const datos = vacios();
  datos.pagos = [{ medioId: 'ef', nombre: 'Efectivo', monto: 0.1 }, { medioId: 'ef', nombre: 'Efectivo', monto: 0.2 }, { medioId: 'tar', nombre: 'Tarjeta', monto: 50 }];
  datos.gastos = [{ categoria: '', importe: 10 }, { categoria: '  ', importe: 20 }, { categoria: 'Insumos', importe: 5 }, { categoria: 'insumos', importe: 7 }];
  const r = resumirMetricas(datos, rango, 'dia');
  assert.equal(r.totalVentas, 0);
  assert.equal(r.totalCobros, 50.3);
  assert.equal(r.medios.find(m => m.id === 'ef').importe, 0.3);
  assert.equal(r.totalGastos, 42);
  assert.equal(r.categorias.find(c => c.nombre === 'Sin categoría').importe, 30);
  assert.equal(r.categorias.length, 2);
});
test('período vacío no produce promedios indefinidos', () => {
  const r = resumirMetricas(vacios(), rango, 'dia');
  assert.equal(r.ticketPromedio, 0);
  assert.equal(r.totalVentas, 0);
  assert.equal(r.periodos.length, 3);
});
test('valida fechas reales, orden y límite de 366 días', () => {
  assert.ok(validarRango({ desde: '2026-02-30', hasta: '2026-03-01' }));
  assert.ok(validarRango({ desde: '2026-10-04', hasta: '2026-10-01' }));
  assert.ok(validarRango({ desde: '2025-01-01', hasta: '2026-10-01' }));
  assert.equal(validarRango({ desde: '2024-01-01', hasta: '2024-12-31' }), null);
  assert.deepEqual(limitesRango({ desde: '2026-12-31', hasta: '2026-12-31' }), { inicio: '2026-12-31T00:00:00-03:00', fin: '2027-01-01T00:00:00-03:00' });
  assert.equal(fechaNegocio('2026-10-01T01:00:00Z'), '2026-09-30');
});
test('paginación recupera más de mil registros sin repetir ni perder filas', async () => {
  const { leerPaginas } = cargar('src/services/metricasService.ts', { '@/lib/supabase': { supabase: {} }, '@/lib/metricas': metricas });
  const todos = Array.from({ length: 1201 }, (_, id) => ({ id }));
  const calls = [];
  const result = await leerPaginas(async (desde, hasta) => { calls.push([desde, hasta]); return { data: todos.slice(desde, hasta + 1), error: null }; });
  assert.equal(result.length, 1201);
  assert.deepEqual(result, todos);
  assert.deepEqual(calls, [[0, 499], [500, 999], [1000, 1499]]);
  await assert.rejects(leerPaginas(async () => ({ data: null, error: { message: 'Sin acceso' } })), /Sin acceso/);
});
