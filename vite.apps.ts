// Configuración común de las dos aplicaciones. Cada una tiene su propio build, manifiesto,
// service worker, icono y color, y se publica en su propia URL.
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type UserConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export type AppId = 'compartir' | 'monitoreo';

interface AppSpec {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  devPort: number;
}

export const APPS: Record<AppId, AppSpec> = {
  compartir: {
    name: 'Rastreo · Compartir',
    shortName: 'Compartir',
    description: 'App de ubicación: comparte tu ubicación en vivo con una persona de confianza.',
    themeColor: '#0f766e',
    devPort: 5173,
  },
  monitoreo: {
    name: 'Rastreo · Monitoreo',
    shortName: 'Monitoreo',
    description: 'App de monitoreo: mira en tiempo real la ubicación que alguien comparte contigo.',
    themeColor: '#4f46e5',
    devPort: 5174,
  },
};

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
// En GitHub Pages el sitio vive en /Rastreo/; las apps, en /Rastreo/compartir/ y /Rastreo/monitoreo/.
const pagesBase = process.env.PAGES_BASE ?? '/';

export function appConfig(app: AppId) {
  return defineConfig(({ command }): UserConfig => {
    const spec = APPS[app];
    const serving = command === 'serve';
    const base = serving ? '/' : `${pagesBase}${app}/`;
    // Dónde vive cada app, para enlazarlas entre sí (por ejemplo, el enlace de invitación).
    const urlOf = (id: AppId) => (serving ? `http://localhost:${APPS[id].devPort}/` : `${pagesBase}${id}/`);

    return {
      root: fileURLToPath(new URL(`./apps/${app}`, import.meta.url)),
      envDir: projectRoot,
      base,
      resolve: {
        alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) },
      },
      define: {
        __COMPARTIR_URL__: JSON.stringify(urlOf('compartir')),
        __MONITOREO_URL__: JSON.stringify(urlOf('monitoreo')),
      },
      server: { port: spec.devPort, strictPort: true },
      preview: { port: spec.devPort + 2000, strictPort: true },
      build: {
        outDir: fileURLToPath(new URL(`./dist/${app}`, import.meta.url)),
        emptyOutDir: true,
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icons/favicon.svg'],
          manifest: {
            id: base,
            name: spec.name,
            short_name: spec.shortName,
            description: spec.description,
            lang: 'es',
            start_url: base,
            scope: base,
            display: 'standalone',
            theme_color: spec.themeColor,
            background_color: '#f8fafc',
            icons: [
              { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
              { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            // Solo recursos estáticos del build. Ni teselas ni respuestas de Firebase se cachean.
            globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
            navigateFallback: `${base}index.html`,
            runtimeCaching: [],
          },
        }),
      ],
    };
  });
}
