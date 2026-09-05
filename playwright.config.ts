import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } }
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
      timeout: 30_000
    },
    {
      command: 'cd realtime && npm ci && PORT=8787 node server.mjs',
      url: 'http://127.0.0.1:8787/health',
      reuseExistingServer: true,
      timeout: 60_000
    }
  ]
});
