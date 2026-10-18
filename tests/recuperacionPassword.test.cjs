const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsModule = {};
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/recuperacionPassword.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exportsModule);
const { urlRecuperacion, esEnlaceRecuperacion, enlaceRecuperacionConError, validarNuevaPassword } = exportsModule;

test('redirección usa el origen actual y una ruta específica', () => {
  assert.equal(urlRecuperacion('http://localhost:5173'), 'http://localhost:5173/restablecer-contrasena');
  assert.equal(urlRecuperacion('https://mi-aplicacion.example'), 'https://mi-aplicacion.example/restablecer-contrasena');
});
test('detecta recuperación sin interpretar otros accesos como recuperación', () => {
  assert.equal(esEnlaceRecuperacion('#type=recovery'), true);
  assert.equal(esEnlaceRecuperacion('#type=signup'), false);
  assert.equal(esEnlaceRecuperacion(''), false);
});
test('detecta errores en fragmento y query del retorno de Supabase', () => {
  assert.equal(enlaceRecuperacionConError('', '#error=access_denied&error_code=otp_expired'), true);
  assert.equal(enlaceRecuperacionConError('?error_code=otp_expired', ''), true);
  assert.equal(enlaceRecuperacionConError('', ''), false);
});
test('rechaza contraseñas cortas y confirmaciones distintas', () => {
  assert.match(validarNuevaPassword('abc', 'abc'), /6 caracteres/);
  assert.match(validarNuevaPassword('Ejemplo-nuevo', 'Otro-ejemplo'), /no coinciden/);
  assert.equal(validarNuevaPassword('Ejemplo-nuevo', 'Ejemplo-nuevo'), null);
});

test('requiere mayúscula y acepta letras como Ñ sin exigir números ni símbolos', () => {
  assert.match(validarNuevaPassword('abcdef', 'abcdef'), /mayúscula/);
  assert.match(validarNuevaPassword('123456', '123456'), /mayúscula/);
  assert.equal(validarNuevaPassword('Abcdef', 'Abcdef'), null);
  assert.equal(validarNuevaPassword('Ñabcde', 'Ñabcde'), null);
});
