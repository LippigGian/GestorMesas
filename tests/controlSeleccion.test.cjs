const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsModule = {};
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/controlSeleccion.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(exportsModule);
const { crearControlSeleccion } = exportsModule;

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

test('una confirmación lenta de A no reemplaza los productos de B', async () => {
  const control = crearControlSeleccion();
  const guardadoA = deferred();
  const vigenteA = control.capturar();
  let panel = ['productos B'];
  let persisted = false;
  const respuesta = guardadoA.promise.then(() => {
    persisted = true;
    if (vigenteA()) panel = ['productos A'];
  });
  control.cambiar();
  guardadoA.resolve();
  await respuesta;
  assert.equal(persisted, true);
  assert.deepEqual(panel, ['productos B']);
});
test('cargas de mesas fuera de orden muestran solamente la última selección', async () => {
  const control = crearControlSeleccion();
  const a = deferred();
  const vigenteA = control.capturar();
  let panel;
  const cargaA = a.promise.then(() => { if (vigenteA()) panel = 'A'; });
  control.cambiar();
  const vigenteB = control.capturar();
  if (vigenteB()) panel = 'B';
  a.resolve();
  await cargaA;
  assert.equal(panel, 'B');
});
test('volver a A no reactiva respuestas de la selección anterior de A', () => {
  const control = crearControlSeleccion();
  const primeraA = control.capturar();
  control.cambiar();
  control.cambiar();
  assert.equal(primeraA(), false);
  assert.equal(control.capturar()(), true);
});
test('la respuesta de la selección actual sí se aplica', () => {
  const control = crearControlSeleccion();
  assert.equal(control.capturar()(), true);
});
