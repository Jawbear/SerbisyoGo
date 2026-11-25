import {defineConfig,devices} from '@playwright/test';
try {process.loadEnvFile('.env.local');} catch { /* Public tests can run without a backend. */ }
// Live sign-in failures can leave credentials in Playwright's automatic page snapshot.
if (process.env.E2E_DEVELOPMENT_READONLY === '1') process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:60000,
 use:{baseURL:process.env.E2E_BASE_URL||'http://localhost:3000',trace:'retain-on-failure',...(process.env.E2E_BROWSER_CHANNEL?{channel:process.env.E2E_BROWSER_CHANNEL}: {})},
 webServer:process.env.E2E_BASE_URL?undefined:{command:process.env.TEST_SUPABASE_URL?'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1':'npm run dev',url:'http://localhost:3000',reuseExistingServer:!process.env.CI},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}]
});
