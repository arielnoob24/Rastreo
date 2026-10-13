import { defineConfig } from 'vite';

// Solo para previsualizar el sitio completo construido (portada + las dos apps): npm run preview
export default defineConfig({
  build: { outDir: 'dist' },
  preview: { port: 4173, strictPort: true },
});
