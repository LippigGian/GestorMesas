// Ejecutar con Vite iniciado. Todas las llamadas a Supabase se simulan.
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const assert = require('node:assert/strict');
const fs = require('node:fs');
const env = fs.readFileSync('.env', 'utf8');
const project = new URL(env.match(/^VITE_SUPABASE_URL=(.*)$/m)[1].trim().replace(/^['"]|['"]$/g, '')).hostname.split('.')[0];
const baseURL = process.env.TEST_BASE_URL ?? 'http://localhost:5173';
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'prueba@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const token = ['header', { sub: user.id, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }, 'fixture'].map(x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url')).join('.');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage();
    const requests = [];
    let signupResponse = { status: 200, json: { ...user, identities: [{ provider: 'email' }] } };
    await page.route('https://*.supabase.co/**', async route => {
      const request = route.request();
      requests.push({ url: request.url(), method: request.method(), body: request.postDataJSON() });
      if (request.url().includes('/auth/v1/signup')) return route.fulfill(signupResponse);
      if (request.url().includes('/auth/v1/user')) return route.fulfill({ json: user });
      return route.fulfill({ json: null });
    });
    await page.goto(`${baseURL}/login`);
    await page.getByRole('button', { name: 'Crear cuenta nueva' }).click();
    await page.getByLabel('Nombre del negocio').fill('Cafetería de prueba');
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.locator('input[autocomplete="new-password"]').first().fill('Abcdef');
    await page.getByLabel('Repetir contrasena', { exact: true }).fill('Abcdef');
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'confirmar la cuenta' }).waitFor();
    const signup = requests.find(request => request.url.includes('/auth/v1/signup'));
    assert.equal(signup.body.data.nombre_local, 'Cafetería de prueba');
    assert.equal(signup.body.data.rol, undefined);
    assert.equal(signup.body.data.local_id, undefined);
    assert.equal(requests.filter(request => request.url.includes('/rest/v1/')).length, 0, 'El registro no busca ni escribe locales o membresías desde el navegador');

    for (const response of [
      { status: 200, json: { ...user, identities: [] } },
      { status: 422, json: { code: 'user_already_exists', msg: 'User already registered' } },
    ]) {
      signupResponse = response;
      await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'correo ya está registrado' }).waitFor();
      assert.equal(await page.getByRole('status').count(), 0, 'El duplicado no muestra un mensaje de alta exitosa');
    }

    const session = { access_token: token, refresh_token: 'fixture', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user };
    await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: `sb-${project}-auth-token`, session });
    requests.length = 0;
    await page.goto(`${baseURL}/productos`);
    await page.getByRole('heading', { name: 'No se pudo acceder a tu cafetería' }).waitFor();
    assert.equal(await page.locator('header').count(), 0);
    assert.equal(requests.filter(request => /\/rest\/v1\/(productos|categorias|mesas|pedidos)/.test(request.url)).length, 0, 'Una cuenta sin local no consulta datos operativos');
    assert(!new URL(requests.find(request => request.url.includes('/usuarios_locales')).url).searchParams.has('limit'), 'No se elige arbitrariamente la primera membresía');
    console.log('OK: registro sin autoasociación, confirmación por email y bloqueo de cuenta sin cafetería. Sin cambios reales en Supabase.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
