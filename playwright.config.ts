import {defineConfig,devices} from '@playwright/test';
try {process.loadEnvFile('.env.local');} catch { /* Public tests can run without a backend. */ }
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:60000,
 use:{baseURL:process.env.E2E_BASE_URL||'http://localhost:3000',trace:'retain-on-failure'},
 webServer:process.env.E2E_BASE_URL?undefined:{command:'npm run dev',url:'http://localhost:3000',reuseExistingServer:!process.env.CI},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}]
});
