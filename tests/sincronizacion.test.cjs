const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const archivo = path.resolve(__dirname, '../src/lib/colaSincronizacion.ts');
const compilado = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const modulo = new Module(archivo, module);
modulo._compile(compilado, archivo);
const { crearColaSincronizacion } = modulo.exports;
const pausa = (ms = 15) => new Promise(resolve => setTimeout(resolve, ms));
const diferido = () => { let resolver; const promesa = new Promise(r => { resolver = r; }); return { promesa, resolver }; };
async function esperar(condicion) {
  for (let i = 0; i < 100; i++) { if (condicion()) return; await pausa(5); }
  assert.fail('La actualización no terminó');
}

test('agrupa avisos consecutivos en una sola consulta', async () => {
  let consultas = 0;
  const cola = crearColaSincronizacion(async () => { consultas++; }, assert.fail, () => {}, 1);
  try {
    for (let i = 0; i < 20; i++) cola.solicitar();
    await esperar(() => consultas === 1);
    await pausa();
    assert.equal(consultas, 1);
  } finally { cola.destruir(); }
});

test('una escritura invalida la lectura anterior y espera antes de volver a consultar', async () => {
  let db = 1, consultas = 0;
  const mostrados = [], lectura = diferido(), escritura = diferido();
  const cola = crearColaSincronizacion(async vigente => {
    const valor = db;
    consultas++;
    if (consultas === 1) await lectura.promesa;
    if (vigente()) mostrados.push(valor);
  }, assert.fail, () => {}, 1);
  try {
    cola.solicitar();
    await esperar(() => consultas === 1);
    const cambio = cola.ejecutarCambio(async () => { await escritura.promesa; db = 2; });
    lectura.resolver();
    await pausa();
    assert.deepEqual(mostrados, []);
    assert.equal(consultas, 1);
    escritura.resolver();
    await cambio;
    await esperar(() => mostrados.length === 1);
    assert.deepEqual(mostrados, [2]);
  } finally { cola.destruir(); }
});

test('un aviso durante una lectura descarta esa respuesta y consulta nuevamente', async () => {
  let consultas = 0;
  const aplicados = [], lectura = diferido();
  const cola = crearColaSincronizacion(async vigente => {
    const numero = ++consultas;
    if (numero === 1) await lectura.promesa;
    if (vigente()) aplicados.push(numero);
  }, assert.fail, () => {}, 1);
  try {
    cola.solicitar();
    await esperar(() => consultas === 1);
    cola.solicitar(); lectura.resolver();
    await esperar(() => aplicados.length === 1);
    assert.deepEqual(aplicados, [2]);
  } finally { cola.destruir(); }
});

test('salir de la página o cambiar de local descarta lecturas pendientes', async () => {
  const lectura = diferido(); let inicio = false, aplicado = false;
  const cola = crearColaSincronizacion(async vigente => {
    inicio = true; await lectura.promesa; aplicado = vigente();
  }, assert.fail, () => {}, 1);
  cola.solicitar(); await esperar(() => inicio);
  cola.destruir(); lectura.resolver(); await pausa();
  assert.equal(aplicado, false);
});

test('un error de escritura no bloquea las actualizaciones siguientes', async () => {
  let consultas = 0;
  const cola = crearColaSincronizacion(async () => { consultas++; }, assert.fail, () => {}, 1);
  try {
    await assert.rejects(cola.ejecutarCambio(async () => { throw new Error('Sin conexión'); }));
    await esperar(() => consultas === 1);
  } finally { cola.destruir(); }
});
