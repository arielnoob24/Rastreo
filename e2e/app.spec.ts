import { expect, test, type Page } from '@playwright/test';

const noHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth).then((o) => expect(o).toBe(false));

test('la portada enlaza a las dos aplicaciones', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /App de ubicación/ }).click();
  await expect(page).toHaveURL(/\/compartir\/$/);
  await page.goto('/');
  await page.getByRole('link', { name: /App de monitoreo/ }).click();
  await expect(page).toHaveURL(/\/monitoreo\/$/);
});

test.describe('app de ubicación', () => {
  test('muestra crear sesión, sin campo de código, y sin desbordar', async ({ page }) => {
    await page.goto('/compartir/');
    await expect(page.getByRole('heading', { name: 'Rastreo · Compartir' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear sesión' })).toBeVisible();
    await expect(page.getByLabel('Código de invitación')).toHaveCount(0);
    await noHorizontalOverflow(page);
  });

  test('explica quién ve la ubicación y que no hay rastreo garantizado en segundo plano', async ({ page }) => {
    await page.goto('/compartir/');
    await page.getByText('¿Quién ve mi ubicación').click();
    await expect(page.getByText(/solo la persona que aceptó tu invitación/i)).toBeVisible();
    await expect(page.getByText(/no garantizamos seguimiento/i)).toBeVisible();
  });
});

test.describe('app de monitoreo', () => {
  test('pide el código, sin opción de crear sesión, y sin desbordar', async ({ page }) => {
    await page.goto('/monitoreo/');
    await expect(page.getByRole('heading', { name: 'Rastreo · Monitoreo' })).toBeVisible();
    await expect(page.getByLabel('Código de invitación')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear sesión' })).toHaveCount(0);
    await noHorizontalOverflow(page);
  });

  test('el código lleva a unirse, que exige confirmar', async ({ page }) => {
    await page.goto('/monitoreo/');
    await page.getByLabel('Código de invitación').fill('abcd-efgh-jklm');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page).toHaveURL(/\/monitoreo\/#\/unirse\?codigo=abcd-efgh-jklm/);
    await expect(page.getByText('ABCD-EFGH-JKLM')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unirme' })).toBeVisible();
  });
});

for (const app of ['compartir', 'monitoreo'] as const) {
  test(`${app}: carga desde caché sin conexión`, async ({ page, context }) => {
    await page.goto(`/${app}/`);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await context.setOffline(false);
  });

  test(`${app}: tiene su propio manifiesto instalable`, async ({ request }) => {
    const res = await request.get(`/${app}/manifest.webmanifest`);
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest.display).toBe('standalone');
    expect(manifest.scope).toBe(`/${app}/`);
    expect(manifest.short_name).toBe(app === 'compartir' ? 'Compartir' : 'Monitoreo');
  });
}
