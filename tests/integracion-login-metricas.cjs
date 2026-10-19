// Con Vite iniciado. Supabase simulado; no crea usuarios ni modifica la base.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const url = fs.readFileSync('.env', 'utf8').match(/^VITE_SUPABASE_URL=(.*)$/m)[1].trim().replace(/^['"]|['"]$/g, '');
const key = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
const baseURL = process.env.TEST_BASE_URL ?? 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    let current = null;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://*.supabase.co/**', route => {
      const request = route.request();
      const parsed = new URL(request.url());
      requests.push(parsed);
      if (parsed.pathname.endsWith('/logout')) return route.fulfill({ status: 204, body: '' });
      if (parsed.pathname.endsWith('/auth/v1/user')) return route.fulfill({ json: current?.user ?? null });
      if (parsed.pathname.endsWith('/usuarios_locales')) return route.fulfill({ json: current ? { local_id: current.localId, rol: 'admin', activo: true, locales: { id: current.localId, nombre: current.nombre, activo: true } } : null });
      if (parsed.pathname.endsWith('/rpc/mis_permisos')) return route.fulfill({json:{local_id:current.localId,administrador:true,rol_nombre:'Administrador',permisos:[]}});
      if (parsed.pathname.endsWith('/rpc/resumen_metricas')) return route.fulfill({json:{totalVentas:0,cantidadVentas:0,totalCobros:0,totalGastos:0,cantidadGastos:0,dias:[],productos:[],medios:[],categorias:[]}});
      if (parsed.pathname.endsWith('/salones')) return route.fulfill({ json: [{ id: 'salon', nombre: 'Salón', activo: true }] });
      return route.fulfill({ json: [] });
    });
    await page.goto(`${baseURL}/metricas`);
    await page.getByRole('heading', { name: 'Ingresar', exact: true }).waitFor();
    assert.equal(requests.filter(url => url.pathname.includes('/rest/v1/')).length, 0, 'No hay consultas operativas sin sesión');

    for (const n of [1, 2]) {
      current = { localId: `20000000-0000-4000-8000-00000000000${n}`, nombre: `Cafetería ${n}`, user: { id: `10000000-0000-4000-8000-00000000000${n}`, aud: 'authenticated', role: 'authenticated', email: `prueba${n}@example.invalid`, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };
      const access_token = ['header', { sub: current.user.id, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }, 'fixture'].map(value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')).join('.');
      await page.evaluate(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key, session: { access_token, refresh_token: 'fixture', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: current.user } });
      requests.length = 0;
      await page.goto(`${baseURL}/metricas`);
      await page.getByRole('heading', { name: 'Evolución de ventas' }).waitFor();
      assert.equal(await page.locator('.mesas-spa-brand').innerText(), current.nombre);
      assert(requests.some(url=>url.pathname.endsWith('/rpc/resumen_metricas')));
      await page.getByRole('link', { name: 'Configuración', exact: true }).click();
      await page.locator('aside').getByRole('button', { name: 'Usuarios', exact: true }).click();
      await page.getByRole('heading', { name: 'Usuarios', exact: true }).waitFor();
      await page.locator('aside').getByRole('button', { name: 'Roles de usuarios', exact: true }).click();
      await page.getByRole('heading', { name: 'Roles de usuarios', exact: true }).waitFor();
      await page.locator('aside').getByRole('button', { name: 'Configuración general', exact: true }).click();
      await page.getByLabel('Nombre del negocio', { exact: true }).fill(`Nombre local ${n}`);
      await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
      assert.equal(await page.locator('.mesas-spa-brand').innerText(), `Nombre local ${n}`);
      await page.getByRole('link', { name: 'Mesas', exact: true }).click();
      await page.getByRole('navigation', { name: 'Salones', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await page.getByRole('heading', { name: 'Ingresar', exact: true }).waitFor();
    }
    assert.deepEqual(errors, []);
    console.log('OK: login, métricas por local, salones, usuarios/roles, nombre separado por cafetería y cierre de sesión. Sin cambios reales en Supabase.');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
