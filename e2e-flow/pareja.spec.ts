import { expect, test } from '@playwright/test';

// Coordenadas ficticias.
const A = { latitude: 10.0, longitude: 20.0, accuracy: 12 };
const B = { latitude: 10.001, longitude: 20.002, accuracy: 9 };

test('dos personas: invitación, ubicación en vivo, detener y revocar', async ({ browser }) => {
  const ownerCtx = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: A,
    viewport: { width: 390, height: 844 },
  });
  const viewerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const strangerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  const viewer = await viewerCtx.newPage();

  // 1. La persona que comparte crea la sesión.
  await owner.goto('/');
  await owner.getByRole('button', { name: 'Crear sesión' }).click();
  await expect(owner).toHaveURL(/\/sesion\//);
  const sessionUrl = owner.url();
  await expect(owner.getByText('No estás compartiendo tu ubicación')).toBeVisible();

  // 2. Crea la invitación.
  await owner.getByRole('button', { name: 'Crear invitación' }).click();
  const codeText = (await owner.getByLabel('Código de invitación').textContent()) ?? '';
  expect(codeText).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  // 3. Un ajeno no puede abrir la sesión.
  const stranger = await strangerCtx.newPage();
  await stranger.goto(sessionUrl);
  await expect(stranger.getByText('No tienes acceso a esta sesión')).toBeVisible();

  // 4. La otra persona se une con el código.
  await viewer.goto(`/unirse?codigo=${encodeURIComponent(codeText)}`);
  await viewer.getByRole('button', { name: 'Unirme' }).click();
  await expect(viewer).toHaveURL(/\/sesion\//);
  await expect(viewer.getByText('La otra persona no está compartiendo su ubicación ahora.')).toBeVisible();

  // 5. El código ya no sirve para nadie más.
  const stranger2 = await strangerCtx.newPage();
  await stranger2.goto(`/unirse?codigo=${encodeURIComponent(codeText)}`);
  await stranger2.getByRole('button', { name: 'Unirme' }).click();
  await expect(stranger2.getByRole('alert')).toContainText('Invitación inválida o vencida');

  // 6. Iniciar: el visor ve la posición sin recargar.
  await owner.getByRole('button', { name: 'Iniciar' }).click();
  await expect(owner.getByText('Compartiendo tu ubicación')).toBeVisible();
  await expect(viewer.getByText('Ubicación actualizada')).toBeVisible({ timeout: 20_000 });
  await expect(viewer.getByText('10.000000° N')).toBeVisible();
  await expect(viewer.getByText('20.000000° E')).toBeVisible();
  await expect(viewer.getByText('No disponible').first()).toBeVisible(); // altitud ausente

  // 7. Se mueve: el visor lo recibe en vivo.
  await ownerCtx.setGeolocation(B);
  await expect(viewer.getByText('10.001000° N')).toBeVisible({ timeout: 20_000 });

  // 8. Detener: el visor deja de ver la ubicación.
  await owner.getByRole('button', { name: 'Detener' }).click();
  await expect(owner.getByText('No estás compartiendo tu ubicación')).toBeVisible();
  await expect(viewer.getByText('Todavía no hay una ubicación para mostrar.')).toBeVisible({ timeout: 20_000 });

  // 9. Revocar acceso: el visor pierde la sesión.
  await owner.getByRole('button', { name: 'Revocar acceso' }).click();
  await expect(viewer.getByText('No tienes acceso a esta sesión')).toBeVisible({ timeout: 20_000 });

  // 10. Terminar sesión.
  owner.on('dialog', (d) => d.accept());
  await owner.getByRole('button', { name: 'Terminar sesión' }).click();
  await expect(owner.getByText('Sesión terminada')).toBeVisible();

  await Promise.all([ownerCtx.close(), viewerCtx.close(), strangerCtx.close()]);
});
