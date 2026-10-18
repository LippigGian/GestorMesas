const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const helpers = {};
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/registroCuenta.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(helpers);
const { errorRegistroCuenta } = helpers;

test('traduce los códigos de correo existente y la respuesta antigua', () => {
  for (const error of [{ code: 'user_already_exists', message: 'User already registered' }, { code: 'email_exists', message: 'Email already exists' }, { message: 'User already registered' }]) {
    assert.match(errorRegistroCuenta(error, null, false), /correo ya está registrado/);
  }
});
test('detecta una respuesta ofuscada con identidades vacías sin marcarla como éxito', () => {
  assert.match(errorRegistroCuenta(null, { identities: [] }, false), /correo ya está registrado/);
});
test('no confunde una cuenta nueva, una respuesta incompleta o una sesión válida con un duplicado', () => {
  for (const user of [null, {}, { identities: [{}] }]) assert.equal(errorRegistroCuenta(null, user, false), null);
  assert.equal(errorRegistroCuenta(null, { identities: [] }, true), null);
});
test('conserva otros errores como límites de envío o fallos del servidor', () => {
  assert.equal(errorRegistroCuenta({ code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' }, null, false), 'Email rate limit exceeded');
});
