import { defineConfig, devices } from '@playwright/test';
try { process.loadEnvFile('.env.local'); } catch { /* Offline demo checks need no backend. */ }

export default defineConfig({
  testDir: './tests/e2e', workers: 1, timeout: 45000,
  use: { baseURL: 'http://localhost:8081', trace: 'retain-on-failure', ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : process.env.CI ? {} : { channel: 'chrome' }) },
  webServer: { command: 'npm run web -- --port 8081 --max-workers 2', url: 'http://localhost:8081', reuseExistingServer: !process.env.CI, timeout: 120000, env: { BROWSER: 'none', EXPO_NO_TELEMETRY: '1' } },
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'] } }]
});
