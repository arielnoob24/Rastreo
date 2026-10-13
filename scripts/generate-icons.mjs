// Genera los iconos PNG de la PWA sin dependencias: un pin de ubicación sobre fondo de marca.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const BRAND = [15, 118, 110];
const WHITE = [255, 255, 255];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** Cobertura (0..1) del pin en coordenadas normalizadas [-1, 1]. */
function pinCoverage(x, y) {
  // Cabeza circular con agujero y punta triangular hacia abajo.
  const cy = -0.2;
  const r = 0.45;
  const d = Math.hypot(x, y - cy);
  const inHead = d <= r;
  const inHole = d <= r * 0.42;
  const tipY = 0.75;
  const inTip = y > cy && y <= tipY && Math.abs(x) <= r * (1 - (y - cy) / (tipY - cy)) * 0.95;
  return (inHead || inTip) && !inHole;
}

function render(size, { maskable }) {
  const scale = maskable ? 0.62 : 0.8; // zona segura del icono maskable
  const samples = 4;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let py = 0; py < size; py++) {
    raw[py * (size * 3 + 1)] = 0; // filtro "none"
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = ((px + (sx + 0.5) / samples) / size) * 2 - 1;
          const y = ((py + (sy + 0.5) / samples) / size) * 2 - 1;
          if (pinCoverage(x / scale, y / scale)) hits++;
        }
      }
      const a = hits / (samples * samples);
      const o = py * (size * 3 + 1) + 1 + px * 3;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BRAND[c] * (1 - a) + WHITE[c] * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync(new URL('icon-192.png', OUT), render(192, { maskable: false }));
writeFileSync(new URL('icon-512.png', OUT), render(512, { maskable: false }));
writeFileSync(new URL('icon-maskable-512.png', OUT), render(512, { maskable: true }));
writeFileSync(
  new URL('favicon.svg', OUT),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f766e"/><path d="M32 12a14 14 0 0 0-14 14c0 10 14 26 14 26s14-16 14-26a14 14 0 0 0-14-14zm0 19a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" fill="#fff"/></svg>\n`,
);
console.log('Iconos generados en public/icons/');
