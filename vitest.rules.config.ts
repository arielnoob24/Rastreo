import { defineConfig } from 'vitest/config';

// Pruebas de firestore.rules contra el emulador (npm run test:rules).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['rules-test/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
