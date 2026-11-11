import { defineConfig, devices } from '@playwright/test';
try { process.loadEnvFile('.env.local'); } catch { /* Controlled checks use intercepted HTTP requests. */ }
const port=Number(process.env.E2E_MOBILE_PORT||8081);
const testConnection = process.env.E2E_MOBILE_LIVE_READONLY === '1' ? {} : {
  EXPO_PUBLIC_SUPABASE_URL: 'https://mobile-test.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mobile_test_only'
};

export default defineConfig({
  outputDir: process.env.E2E_MOBILE_LIVE_READONLY === '1' ? '../.cache/mobile-live-readonly-results' : './test-results',
  testDir: './tests/e2e', workers: 1, timeout: 45000,
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure', ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : process.env.CI ? {} : { channel: 'chrome' }) },
  webServer: { command: `npm run web -- --port ${port} --max-workers 2`, url: `http://localhost:${port}`, reuseExistingServer: !process.env.CI, timeout: 120000, env: { BROWSER: 'none', EXPO_NO_TELEMETRY: '1', ...testConnection } },
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'] } }]
});
