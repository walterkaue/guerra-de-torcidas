// Prints do telão do convite do desafio dos Lances (docs/auditoria/2026-11-17/telao/): três telas de celular, uma falta
// e um cara a cara, com o quadro parado (&semMovimento) e um quadro do replay andando. Precisa do `npm run dev` na 5173
// (com .env.development.local vazio, para não falar com produção). Sem som: Chromium com --mute-audio e o jogo no mudo.
//   node scripts/docs/prints-telao.mjs <pasta> [prefixo]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const pasta = process.argv[2];
const prefixo = process.argv[3] ?? '';
if (!pasta) throw new Error('uso: node scripts/docs/prints-telao.mjs <pasta> [prefixo]');
mkdirSync(pasta, { recursive: true });

const TELAS = [
  [360, 740],
  [375, 667],
  [390, 844],
];
const LANCES = [
  ['falta', 'flamengo-2001-falta-do-tri'],
  ['cara', 'flamengo-1981-toquio'],
];
const BASE = 'http://localhost:5173/?l=abcd1234&lancesFalsos&qualidade=alta';

const navegador = await chromium.launch({ args: ['--mute-audio'] });
const medidas = [];
for (const [w, h] of TELAS) {
  for (const [nome, id] of LANCES) {
    for (const modo of ['parado', 'movimento']) {
      const ctx = await navegador.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await ctx.addInitScript(() => localStorage.setItem('gdt:prefs', JSON.stringify({ mudo: true })));
      const page = await ctx.newPage();
      await page.goto(`${BASE}&x1Lance=${id}${modo === 'parado' ? '&semMovimento' : ''}`);
      await page.waitForSelector('.telao-canvas', { timeout: 20000 });
      // Parado: espera o quadro pintar; andando: o meio do 1º gol (a bola no ar).
      await page.waitForTimeout(modo === 'parado' ? 600 : 1400);
      const m = await page.evaluate(() => {
        const r = (el) => (el ? el.getBoundingClientRect() : null);
        const q = r(document.querySelector('.telao-quadro'));
        const c = r(document.querySelector('.telao-canvas'));
        const botoes = [...document.querySelectorAll('[data-acao="outro-time"], [data-acao="escolher-time"], [data-acao="encarar"], [data-acao="ir-inicio"]')];
        const ultimo = r(botoes.pop());
        return {
          quadro: q && `${Math.round(q.width)}×${Math.round(q.height)}`,
          canvas: c && `${Math.round(c.width)}×${Math.round(c.height)}`,
          ultimoBotaoAte: ultimo && Math.round(ultimo.bottom + scrollY),
          altura: innerHeight,
          rolaProLado: document.documentElement.scrollWidth > innerWidth,
        };
      });
      medidas.push({ tela: `${w}×${h}`, lance: nome, modo, ...m });
      const png = await page.screenshot();
      // WebP com metade da resolução (como as outras auditorias): o próprio Chrome converte.
      const webp = await page.evaluate(async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const cv = document.createElement('canvas');
        cv.width = img.width / 2;
        cv.height = img.height / 2;
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        return cv.toDataURL('image/webp', 0.78).split(',')[1];
      }, png.toString('base64'));
      writeFileSync(join(pasta, `${prefixo}${w}x${h}-${nome}-${modo}.webp`), Buffer.from(webp, 'base64'));
      await ctx.close();
    }
  }
}
await navegador.close();
console.table(medidas);
writeFileSync(join(pasta, `${prefixo}medidas.json`), JSON.stringify(medidas, null, 2));
