import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Pruebas unitarias del código compartido y de ambas apps.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  define: {
    __COMPARTIR_URL__: JSON.stringify('/compartir/'),
    __MONITOREO_URL__: JSON.stringify('/monitoreo/'),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./shared/test/setup.ts'],
    include: ['shared/**/*.test.{ts,tsx}', 'apps/**/*.test.{ts,tsx}'],
  },
});
