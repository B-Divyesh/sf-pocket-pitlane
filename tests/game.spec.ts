import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type HazardCenter = { x: number; y: number; pixels: number; width: number; height: number };

async function readAmberHazards(page: Page): Promise<HazardCenter[]> {
  return page.locator('#track').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('The race canvas is not available.');
    const { width, height } = canvas;
    const image = context.getImageData(0, 0, width, height);
    const seen = new Uint8Array(width * height);
    const pixelRatio = window.devicePixelRatio || 1;
    const minHazardPixels = 20 * pixelRatio ** 2;
    const maxHazardPixels = 80 * pixelRatio ** 2;
    const isHazardPixel = (offset: number) => image.data[offset] === 255 && image.data[offset + 1] === 201 && image.data[offset + 2] === 94 && image.data[offset + 3] === 255;
    const hazards: HazardCenter[] = [];
    for (let start = 0; start < width * height; start += 1) {
      if (seen[start] || !isHazardPixel(start * 4)) continue;
      const pending = [start];
      seen[start] = 1;
      let pixels = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      while (pending.length) {
        const point = pending.pop()!;
        const x = point % width;
        const y = Math.floor(point / width);
        pixels += 1;
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        for (const neighbor of [point - 1, point + 1, point - width, point + width]) {
          if (neighbor < 0 || neighbor >= width * height || seen[neighbor]) continue;
          const neighborX = neighbor % width;
          if (Math.abs(neighborX - x) > 1 || !isHazardPixel(neighbor * 4)) continue;
          seen[neighbor] = 1;
          pending.push(neighbor);
        }
      }
      if (pixels >= minHazardPixels && pixels <= maxHazardPixels) hazards.push({ x: sumX / pixels, y: sumY / pixels, pixels, width: maxX - minX + 1, height: maxY - minY + 1 });
    }
    return hazards.sort((left, right) => left.x - right.x);
  });
}

function hasChangedPosition(before: HazardCenter[], after: HazardCenter[], threshold: number): boolean {
  return before.some((hazard, index) => Math.hypot(hazard.x - after[index].x, hazard.y - after[index].y) > threshold);
}

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
  await expect(page.locator('.results-panel li').first()).toHaveText(/^[A-Za-z]+ — \d+\.\d{2} laps$/);
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

test('@claim:race-recovery restores an active shared-screen race after the host refreshes', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create room' }).click();
  const controllerUrl = await page.locator('.share-link').getAttribute('href');
  expect(controllerUrl).toBeTruthy();
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const controller = await phone.newPage();
  await controller.goto(controllerUrl!);
  await controller.getByRole('button', { name: 'Join room' }).click();
  await controller.getByRole('button', { name: 'Tap when ready' }).click();
  await expect(page.getByRole('button', { name: 'Start 90-second race' })).toBeEnabled();
  await page.getByRole('button', { name: 'Start 90-second race' }).click();
  await page.waitForTimeout(2_200);
  await page.waitForFunction(() => localStorage.getItem('pocket-pitlane:active-race') !== null);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved race' }).click();
  await expect(page.getByText('Race restored on this browser.')).toBeVisible();
  await expect(page.locator('#race-timer')).not.toHaveText('Practice track');
  await phone.close();
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

test('@claim:phone-motion-touch-fallback asks for motion only after a tap and keeps touch steering working when denied', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create room' }).click();
  const controllerUrl = await page.locator('.share-link').getAttribute('href');
  expect(controllerUrl).toBeTruthy();

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phone.addInitScript(() => {
    const probe = globalThis as typeof globalThis & { __motionPermissionCalls?: number };
    probe.__motionPermissionCalls = 0;
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      configurable: true,
      value: {
        requestPermission: async () => {
          probe.__motionPermissionCalls = (probe.__motionPermissionCalls ?? 0) + 1;
          return 'denied';
        }
      }
    });
  });
  const controller = await phone.newPage();
  const sentFrames: string[] = [];
  controller.on('websocket', (socket) => socket.on('framesent', (frame) => sentFrames.push(String(frame.payload))));
  await controller.goto(controllerUrl!);
  await controller.getByRole('button', { name: 'Join room' }).click();
  await expect(controller.getByRole('button', { name: 'Use phone tilt' })).toBeVisible();
  expect(await controller.evaluate(() => (globalThis as typeof globalThis & { __motionPermissionCalls?: number }).__motionPermissionCalls)).toBe(0);
  await controller.getByRole('button', { name: 'Use phone tilt' }).click();
  await expect(controller.getByText('Motion permission was not granted. Touch steering still works.')).toBeVisible();
  expect(await controller.evaluate(() => (globalThis as typeof globalThis & { __motionPermissionCalls?: number }).__motionPermissionCalls)).toBe(1);
  await controller.getByRole('button', { name: 'Steer left' }).click();
  await expect.poll(() => sentFrames.some((frame) => frame.includes('"type":"input"') && frame.includes('"steer":-1') && frame.includes('"throttle":true'))).toBe(true);
  await phone.close();
});

test('@claim:seeded-hazards renders four moving hazards and changes their positions for another seed', async ({ page }) => {
  await page.goto('/demo?test-seed=101&test-hazard-fixture=1');
  await page.getByRole('button', { name: 'Start sample race' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeHidden({ timeout: 3_000 });
  const firstSeed = await readAmberHazards(page);
  expect(firstSeed).toHaveLength(4);
  await page.waitForTimeout(700);
  const movedHazards = await readAmberHazards(page);
  expect(movedHazards).toHaveLength(4);
  expect(hasChangedPosition(firstSeed, movedHazards, 2)).toBe(true);

  await page.goto('/demo?test-seed=102&test-hazard-fixture=1');
  await page.getByRole('button', { name: 'Start sample race' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeHidden({ timeout: 3_000 });
  const secondSeed = await readAmberHazards(page);
  expect(secondSeed).toHaveLength(4);
  expect(hasChangedPosition(firstSeed, secondSeed, 16)).toBe(true);
});

test('@claim:real-room-request-scope makes a shared-room flow with only product assets and the owned room service', async ({ page, browser }) => {
  const origins: string[] = [];
  const observe = (candidate: Page): void => {
    candidate.context().on('request', (request) => origins.push(request.url()));
    candidate.on('websocket', (socket) => origins.push(socket.url()));
  };
  observe(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Create room' }).click();
  const controllerUrl = await page.locator('.share-link').getAttribute('href');
  expect(controllerUrl).toBeTruthy();
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const controller = await phone.newPage();
  observe(controller);
  await controller.goto(controllerUrl!);
  await controller.getByRole('button', { name: 'Join room' }).click();
  await controller.getByRole('button', { name: 'Tap when ready' }).click();
  await expect(page.getByRole('button', { name: 'Start 90-second race' })).toBeEnabled();
  const allowedOrigins = new Set(['http://127.0.0.1:4173', 'ws://127.0.0.1:8787']);
  expect(origins.length).toBeGreaterThan(0);
  expect(origins.every((url) => allowedOrigins.has(new URL(url).origin))).toBe(true);
  expect(origins.some((url) => new URL(url).origin === 'ws://127.0.0.1:8787')).toBe(true);
  await phone.close();
});

test('@claim:no-device-data-access does not call contact, camera, or location APIs on the shared screen or controller', async ({ page }) => {
  await page.addInitScript(() => {
    const probe = { camera: 0, contacts: 0, location: 0 };
    const navigatorWithProbe = navigator as Navigator & { contacts?: { select: () => Promise<unknown> } };
    Object.defineProperty(globalThis, '__deviceAccessProbe', { configurable: true, value: probe });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => { probe.camera += 1; return Promise.reject(new Error('blocked by test')); } }
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: () => { probe.location += 1; },
        watchPosition: () => { probe.location += 1; return 1; }
      }
    });
    Object.defineProperty(navigatorWithProbe, 'contacts', {
      configurable: true,
      value: { select: () => { probe.contacts += 1; return Promise.resolve([]); } }
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Race with friends on one shared screen' })).toBeVisible();
  await page.goto('/controller?room=CALM42');
  await expect(page.getByRole('heading', { name: 'Use this phone as a race controller' })).toBeVisible();
  expect(await page.evaluate(() => (globalThis as typeof globalThis & { __deviceAccessProbe: { camera: number; contacts: number; location: number } }).__deviceAccessProbe)).toEqual({ camera: 0, contacts: 0, location: 0 });
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
