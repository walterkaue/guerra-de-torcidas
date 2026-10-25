// Gera os ícones PNG do app (PWA) a partir do desenho do favicon, com o Chrome sem janela.
// Uso: node scripts/gerar-icones.mjs   (rode de novo só se o favicon mudar; os PNGs vão no commit)
// Precisa do Chrome ou do Edge instalados. Caminho diferente: CHROME=/caminho/do/chrome node scripts/gerar-icones.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DESTINO = join(RAIZ, 'public', 'icones');

const CHROMES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chrome = CHROMES.find((c) => existsSync(c));
if (!chrome) throw new Error('Chrome não encontrado. Defina CHROME=/caminho/do/chrome.');

// O desenho do favicon: gramado, bola branca, gomo preto. Só muda a moldura de cada ícone.
const favicon = readFileSync(join(RAIZ, 'public', 'favicon.svg'), 'utf8');
const miolo = favicon.match(/<circle[\s\S]*<\/svg>/)[0].replace('</svg>', '');
const COR = favicon.match(/fill="(#[0-9a-f]{6})"/i)[1];

/** canto arredondado (ícone comum) ou quadrado cheio (iPhone e "maskable", que o sistema recorta). */
const svg = ({ cantos, escala }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
  `<rect width="64" height="64" ${cantos ? 'rx="14"' : ''} fill="${COR}"/>` +
  `<g transform="translate(32 32) scale(${escala}) translate(-32 -32)">${miolo}</g></svg>`;

const ICONES = [
  { nome: 'icone-192.png', lado: 192, cantos: true, escala: 1 },
  { nome: 'icone-512.png', lado: 512, cantos: true, escala: 1 },
  // "maskable": o Android recorta em círculo ou gota; a bola fica dentro da zona segura (80% do centro).
  { nome: 'icone-maskable-512.png', lado: 512, cantos: false, escala: 0.8 },
  // iPhone: quadrado cheio, sem transparência; o sistema arredonda os cantos.
  { nome: 'apple-touch-icon.png', lado: 180, cantos: false, escala: 0.9 },
];

mkdirSync(DESTINO, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'icones-'));
try {
  for (const i of ICONES) {
    const html = join(tmp, `${i.nome}.html`);
    writeFileSync(
      html,
      `<!doctype html><html><body style="margin:0;background:transparent">` +
        `<img src="data:image/svg+xml;base64,${Buffer.from(svg(i)).toString('base64')}" width="${i.lado}" height="${i.lado}" style="display:block"></body></html>`,
    );
    execFileSync(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--default-background-color=00000000',
      `--window-size=${i.lado},${i.lado}`,
      `--screenshot=${join(DESTINO, i.nome)}`,
      `file:///${html.replace(/\\/g, '/')}`,
    ], { stdio: 'ignore' });
    console.log(`public/icones/${i.nome} (${i.lado}×${i.lado})`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
