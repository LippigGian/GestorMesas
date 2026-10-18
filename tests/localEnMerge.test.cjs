const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function cargar(file, imports) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', code)(name => { assert(name in imports, name); return imports[name]; }, exports);
  return exports;
}

test('guardar una mesa usa el local solicitado y conserva su salón dinámico', async () => {
  let record;
  const supabase = { from(table) {
    assert.equal(table, 'mesas');
    return { upsert(input) { record = input; return { select() { return { single: async () => ({ data: input, error: null }) }; } }; } };
  } };
  const { guardarMesa } = cargar('src/services/mesasService.ts', { '@/lib/supabase': { supabase } });
  const mesa = await guardarMesa({ id: 'mesa', localId: 'cafeteria-b', numero: '1', tipo: 'redonda', sector: 'terraza-nueva', x: 2, y: 3 });
  assert.equal(record.local_id, 'cafeteria-b');
  assert.equal(mesa.localId, 'cafeteria-b');
  assert.equal(mesa.sector, 'terraza-nueva');
});

test('las cuatro consultas de métricas incluyen el local de la sesión', async () => {
  const calls = [];
  const supabase = { from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const query = {};
    for (const method of ['select', 'gte', 'lt', 'order', 'range', 'in']) query[method] = () => query;
    query.eq = (column, value) => { call.filters.push([column, value]); return query; };
    query.abortSignal = async () => ({ data: table === 'pedidos' ? [{ id: 'pedido', estado: 'cerrado', closed_at: '2026-10-18T12:00:00Z', total: 100 }] : [], error: null });
    return query;
  } };
  const metricas = cargar('src/lib/metricas.ts', {});
  const { obtenerMetricas } = cargar('src/services/metricasService.ts', { '@/lib/supabase': { supabase }, '@/lib/metricas': metricas });
  const controller = new AbortController();
  await assert.rejects(obtenerMetricas({ desde: '2026-10-18', hasta: '2026-10-18' }, controller.signal, ''), /local activo/);
  assert.equal(calls.length, 0);
  await obtenerMetricas({ desde: '2026-10-18', hasta: '2026-10-18' }, controller.signal, 'cafeteria-b');
  assert.deepEqual(calls.map(call => call.table).sort(), ['gastos', 'pedido_items', 'pedido_pagos', 'pedidos']);
  for (const call of calls) assert(call.filters.some(([column, value]) => column === 'local_id' && value === 'cafeteria-b'), call.table);
});
