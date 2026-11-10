// Conferências da Home nova (HOME2, docs/visual.md "Início"): o que as personas medem na ordem de cima para baixo.
// Este arquivo não tem export default, então o simulador não o carrega como persona.

/** Posições (px CSS, scroll 0) do que a regra nova pede à vista: botão, 1º card, barra de navegação, arquibancada e barra do time. */
export function medidasDaHome(p) {
  return p.evaluate(() => {
    window.scrollTo(0, 0);
    const caixa = (sel) => {
      const el = document.querySelector(sel);
      if (!el || el.getClientRects().length === 0) return null;
      const r = el.getBoundingClientRect();
      return { topo: Math.round(r.top), base: Math.round(r.bottom), esq: Math.round(r.left), dir: Math.round(r.right), larg: Math.round(r.width), alt: Math.round(r.height) };
    };
    return {
      janela: { l: innerWidth, a: innerHeight },
      botao: caixa('[data-acao="jogar-agora"]'),
      card1: caixa('.grade-jogos [data-jogo]'),
      nav: caixa('.barra-nav'),
      arquibancada: caixa('.arquibancada'),
      barra: caixa('[data-barra] .barra-time'),
      textoDaBarra: (document.querySelector('[data-barra] .barra-time')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    };
  });
}

/** O "Jogar agora" inteiro e o topo do 1º card de jogo ficam acima da barra de navegação fixa, sem rolar. */
export async function conferirDobraDaHome(s, nome) {
  const m = await medidasDaHome(s.page);
  const util = m.nav ? m.nav.topo : m.janela.a;
  if (!m.botao) s.achado({ regra: 'home-sem-jogar-agora', gravidade: 'atrapalha', tipo: 'layout', oQue: `${nome}: o "Jogar agora" não está na Home.`, talvezSimulador: true });
  else if (m.botao.base > util)
    s.achado({ regra: 'home-jogar-agora-abaixo-da-dobra', gravidade: 'atrapalha', tipo: 'layout', oQue: `${nome}: o "Jogar agora" vai de y=${m.botao.topo} a y=${m.botao.base}, e a área útil acaba em y=${util} (janela ${m.janela.l}×${m.janela.a}, barra de navegação ${m.nav ? m.nav.alt : 0} px).`, chave: 'home-botao-dobra:' + nome, sugestao: 'Regra da Rota B (docs/visual.md, Início): o botão e o topo do 1º card à vista sem rolar em 360×740.' });
  if (!m.card1) s.achado({ regra: 'home-sem-card', gravidade: 'atrapalha', tipo: 'layout', oQue: `${nome}: nenhum card de jogo na Home.`, talvezSimulador: true });
  else if (m.card1.topo >= util)
    s.achado({ regra: 'home-card-abaixo-da-dobra', gravidade: 'atrapalha', tipo: 'layout', oQue: `${nome}: o 1º card de jogo começa em y=${m.card1.topo}, e a área útil acaba em y=${util} (janela ${m.janela.l}×${m.janela.a}).`, chave: 'home-card-dobra:' + nome, sugestao: 'Regra da Rota B (docs/visual.md, Início): o topo do 1º card à vista sem rolar.' });
  s.medir(`${nome}: Jogar agora ${m.botao ? `y=${m.botao.topo}..${m.botao.base}` : 'ausente'}, 1º card ${m.card1 ? `y=${m.card1.topo}` : 'ausente'}, área útil até y=${util}`, m.botao?.topo ?? 0);
  return m;
}

/** Texto cortado: algum elemento da lista tem conteúdo maior do que a caixa (scroll* > client*). */
export function textosCortados(p, seletores) {
  return p.evaluate((sels) => {
    const cortados = [];
    for (const sel of sels)
      for (const el of document.querySelectorAll(sel)) {
        if (el.getClientRects().length === 0) continue;
        const dx = el.scrollWidth - el.clientWidth;
        const dy = el.scrollHeight - el.clientHeight;
        if (dx > 1 || dy > 1) cortados.push({ sel, texto: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60), dx, dy });
      }
    return cortados;
  }, seletores);
}

/** Caixas que se encostam (interseção com área > 0, com folga de 0 px). */
export const seEncostam = (a, b) => a && b && a.esq < b.dir && b.esq < a.dir && a.topo < b.base && b.topo < a.base;
