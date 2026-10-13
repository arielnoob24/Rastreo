import { expect, test } from '@playwright/test';

test.describe('inicio', () => {
  test('muestra crear sesión y unirse sin desbordar la pantalla', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Rastreo en pareja' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear sesión' })).toBeVisible();
    await expect(page.getByLabel('Código de invitación')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('explica quién ve la ubicación y que no hay rastreo garantizado en segundo plano', async ({ page }) => {
    await page.goto('/');
    await page.getByText('¿Quién ve mi ubicación').click();
    await expect(page.getByText(/solo la persona que aceptó tu invitación/i)).toBeVisible();
    await expect(page.getByText(/no garantizamos seguimiento/i)).toBeVisible();
  });

  test('el código lleva a la pantalla de unirse, que exige confirmar', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Código de invitación').fill('ABCD-EFGH-JKLM');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page).toHaveURL(/\/unirse\?codigo=ABCD-EFGH-JKLM/);
    await expect(page.getByRole('heading', { name: 'Unirte a una sesión' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unirme' })).toBeVisible();
  });
});

test('la interfaz carga desde caché sin conexión', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Recargar para que el service worker controle la página.
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Rastreo en pareja' })).toBeVisible();
  await context.setOffline(false);
});

test('expone un manifiesto instalable', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});
