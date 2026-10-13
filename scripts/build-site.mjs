// Completa dist/ con la portada del sitio (enlaces a las dos apps) y el service worker
// que desinstala el de la versión anterior. Las apps quedan en dist/compartir y dist/monitoreo.
import { copyFileSync, mkdirSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
mkdirSync(dist, { recursive: true });
for (const file of ['index.html', 'sw.js']) {
  copyFileSync(new URL(`../site/${file}`, import.meta.url), new URL(file, dist));
}
console.log('Portada y sw.js copiados a dist/');
