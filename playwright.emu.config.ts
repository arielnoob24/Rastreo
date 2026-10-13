import { defineConfig, devices } from '@playwright/test';

// Flujo completo de dos personas contra los emuladores de Firebase: npm run test:flow
export default defineConfig({
  testDir: './e2e-flow',
  timeout: 60_000,
  workers: 1,
  use: { baseURL: 'http://localhost:5174', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npx vite --mode emulators --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
