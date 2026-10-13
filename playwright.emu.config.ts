import { defineConfig, devices } from '@playwright/test';

// Flujo completo de dos personas contra los emuladores de Firebase, cada una en su app: npm run test:flow
export default defineConfig({
  testDir: './e2e-flow',
  timeout: 60_000,
  workers: 1,
  use: { ...devices['Desktop Chrome'] },
  webServer: [
    { command: 'npm run dev:emu:compartir', url: 'http://localhost:5173', reuseExistingServer: false, timeout: 60_000 },
    { command: 'npm run dev:emu:monitoreo', url: 'http://localhost:5174', reuseExistingServer: false, timeout: 60_000 },
  ],
});
