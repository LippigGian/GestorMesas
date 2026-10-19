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

test('recuperación informa fallos vacíos, servidor, SMTP y límites sin inventar la causa',()=>{
 const mensaje=exportsModule.errorEnvioRecuperacion;
 assert.match(mensaje({message:'{}',status:500}),/HTTP 500/);
 assert.match(mensaje({message:'{}'}),/No se pudo solicitar/);
 assert.match(mensaje({message:'Error sending recovery email'}),/registros de Auth/);
 assert.match(mensaje({status:429}),/límite/);
 assert.match(mensaje({code:'email_address_not_authorized'}),/destinatario/);
 assert.equal(mensaje(new Error('Mensaje específico')),'Mensaje específico');
 assert.match(mensaje(null),/No se pudo solicitar/);
});
