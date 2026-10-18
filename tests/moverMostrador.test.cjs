const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function service(result) {
  const calls = [];
  const supabase = { rpc(name, args) { calls.push({ name, args }); return { single: async () => result }; } };
  const source = fs.readFileSync('src/services/pedidosService.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)((name) => {
    assert.equal(name, '@/lib/supabase');
    return { supabase };
  }, exports);
  return { move: exports.moverPedidoMostradorAMesa, cancel: exports.cancelarPedido, calls };
}

test('rechaza cantidades inválidas antes de escribir en Supabase', async () => {
  const { move, calls } = service({});
  for (const n of [0, -1, 1.5, NaN, Infinity, 2147483648]) await assert.rejects(move('pedido', 'mesa', n));
  assert.equal(calls.length, 0);
});
test('requiere pedido y mesa', async () => {
  const { move, calls } = service({});
  await assert.rejects(move('', 'mesa', 2));
  await assert.rejects(move('pedido', '', 2));
  assert.equal(calls.length, 0);
});
test('envía el traslado por una sola RPC y conserva el identificador y total', async () => {
  const { move, calls } = service({ data: { id: 'pedido', tipo: 'mesa', mesa_id: 'mesa', estado: 'abierto', personas: 3, cliente: 'Ana', total: '7400', created_at: '2026-10-17' }, error: null });
  const pedido = await move('pedido', 'mesa', 3);
  assert.deepEqual(calls, [{ name: 'mover_pedido_mostrador_a_mesa', args: { p_pedido_id: 'pedido', p_mesa_id: 'mesa', p_personas: 3 } }]);
  assert.equal(pedido.id, 'pedido');
  assert.equal(pedido.mesaId, 'mesa');
  assert.equal(pedido.personas, 3);
  assert.equal(pedido.total, 7400);
  assert.equal(pedido.cliente, 'Ana');
});
test('propaga el rechazo de una mesa que dejó de estar libre', async () => {
  const { move } = service({ error: { message: 'La mesa ya no está libre.' } });
  await assert.rejects(move('pedido', 'mesa', 2), /ya no está libre/);
});
test('explica cómo habilitar la función faltante', async () => {
  const { move } = service({ error: { code: 'PGRST202', message: 'function missing' } });
  await assert.rejects(move('pedido', 'mesa', 2), /supabase_mover_mostrador_a_mesa.sql/);
});

test('cancelación conserva el pedido y sus importes mediante una sola RPC', async () => {
  const { cancel, calls } = service({ data: { id: 'pedido', tipo: 'mesa', mesa_id: 'mesa', estado: 'cancelado', personas: 2, cliente: 'Ana', total: '7400', created_at: '2026-10-17' }, error: null });
  const result = await cancel('pedido');
  assert.deepEqual(calls, [{ name: 'cancelar_pedido', args: { p_pedido_id: 'pedido' } }]);
  assert.equal(result.estado, 'cancelado');
  assert.equal(result.id, 'pedido');
  assert.equal(result.total, 7400);
  assert.equal(result.mesaId, 'mesa');
});
test('cancelación rechaza identificadores vacíos sin hacer llamadas', async () => {
  const { cancel, calls } = service({});
  await assert.rejects(cancel(''), /Seleccioná un pedido/);
  assert.equal(calls.length, 0);
});
test('cancelación informa errores de estado y función faltante', async () => {
  const rejected = service({ error: { message: 'Solo se pueden cancelar pedidos en curso.' } });
  await assert.rejects(rejected.cancel('pedido'), /pedidos en curso/);
  const missing = service({ error: { code: 'PGRST202' } });
  await assert.rejects(missing.cancel('pedido'), /supabase_cancelar_pedido.sql/);
});
