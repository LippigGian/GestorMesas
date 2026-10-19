const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsModule = {};
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/permisos.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exportsModule);
const { validarPermisos, permisosDisponibles } = exportsModule;

test('acepta combinaciones del catálogo y elimina duplicados del formulario', () => {
  assert.deepEqual(validarPermisos(['editar_precios','ver_metricas','editar_precios']), ['editar_precios','ver_metricas']);
  assert.deepEqual(validarPermisos([]), []);
});
test('rechaza códigos inventados sin conceder permisos por nombre de rol', () => {
  assert.throws(() => validarPermisos(['admin']), /catálogo/);
  assert.throws(() => validarPermisos(['ver_ventas','crear_permiso']), /catálogo/);
  assert.equal(new Set(permisosDisponibles.map(p => p.id)).size, 11);
});
