import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('@claim:sample-sandbox @claim:free-first-release starts a realistic sample race without changing real browser data or asking for payment', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((name) => name.startsWith('pocket-pitlane:')))).toEqual([]);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('pocket-pitlane:settings', JSON.stringify({ sound: false, assist: true })));
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Sample racers' }).getByRole('listitem')).toHaveCount(4);
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  const storage = await page.evaluate(() => ({ real: localStorage.getItem('pocket-pitlane:settings'), demo: localStorage.getItem('demo:pocket-pitlane:settings') }));
  expect(storage.real).toBe(JSON.stringify({ sound: false, assist: true }));
  expect(storage.demo).toBeNull();
});

test('@claim:race-reaches-end runs a deterministic race through its results screen', async ({ page }) => {
  await page.goto('/demo?test-run=1');
  await expect(page.getByRole('heading', { name: 'Race results' })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('90-second race complete.', { exact: false })).toBeVisible();
  await expect(page.locator('.results-panel li')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Race again' })).toBeVisible();
});

test('@claim:restart-resets-race starts a fresh completed run', async ({ page }) => {
  await page.goto('/demo?test-run=1');
  await expect(page.getByRole('heading', { name: 'Race results' })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: 'Race again' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Race results' })).toBeVisible({ timeout: 8_000 });
});

test('@claim:settings-persist keeps a chosen accessibility setting after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game settings' }).click();
  const assist = page.getByRole('checkbox', { name: 'Steering assist' });
  await assist.check();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Open game settings' }).click();
  await expect(page.getByRole('checkbox', { name: 'Steering assist' })).toBeChecked();
});

test('@claim:offline-demo works offline after the first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/demo');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await context.close();
});

test('@claim:demo-private does not send sample play to another origin', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo?test-run=1');
  await expect(page.getByRole('heading', { name: 'Race results' })).toBeVisible({ timeout: 8_000 });
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
});

test('@claim:keyboard-controls accepts remapped keyboard steering during a sample race', async ({ page }) => {
  await page.goto('/demo?test-run=1');
  await page.getByRole('button', { name: 'Open game settings' }).click();
  await page.getByRole('button', { name: 'Steer left: ArrowLeft' }).click();
  await page.keyboard.press('a');
  await expect(page.getByText('Steer left uses A.')).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.keyboard.press('a');
  await expect(page.getByText('Keyboard steering is active.')).toBeVisible();
});

test('mobile controller has usable touch controls and no serious accessibility issues', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This check targets the phone controller.');
  await page.goto('/controller?room=CALM42');
  await expect(page.getByRole('button', { name: 'Join room' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Six-character room code' })).toHaveValue('CALM42');
  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('controller explains how to recover from an incomplete room code', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This check targets the phone controller.');
  await page.goto('/controller');
  await page.getByRole('textbox', { name: 'Six-character room code' }).fill('RACE');
  await page.getByRole('button', { name: 'Join room' }).click();
  await expect(page.getByText('Enter all six room characters.')).toBeVisible();
});

test('home has no serious accessibility issues', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('@claim:phone-controllers lets a phone join a room and start a shared race', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create room' }).click();
  const shareLink = page.locator('.share-link');
  await expect(shareLink).toBeVisible();
  const controllerUrl = await shareLink.getAttribute('href');
  expect(controllerUrl).toBeTruthy();
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const controller = await phone.newPage();
  await controller.goto(controllerUrl!);
  await controller.getByRole('button', { name: 'Join room' }).click();
  await expect(controller.getByRole('button', { name: 'Tap when ready' })).toBeVisible();
  await controller.getByRole('button', { name: 'Tap when ready' }).click();
  await expect(page.getByRole('button', { name: 'Start 90-second race' })).toBeEnabled();
  await page.getByRole('button', { name: 'Start 90-second race' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await controller.locator('[data-control="left"]').dispatchEvent('pointerdown');
  await phone.close();
});

test('routes set titles and render a usable 404 page', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page).toHaveTitle('Privacy — Pocket Pitlane');
  await expect(page.getByRole('main')).toBeVisible();
  await page.goto('/404.html');
  await expect(page).toHaveTitle('Page not found — Pocket Pitlane');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
