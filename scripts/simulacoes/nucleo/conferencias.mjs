// Conferências que rodam dentro da página, em cada passo (sessao.mjs chama `page.evaluate(conferirNaPagina, …)`).
// Esta função é serializada para o navegador: nada de import nem variável de fora dela.
// Devolve achados crus { regra, gravidade, tipo, oQue, chave, sugestao, amostras? }; a sessão completa o resto.

export function conferirNaPagina(op) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const achados = [];
  const add = (a) => achados.push(a);

  const desc = (el) => {
    if (!el) return '?';
    const t = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
    const acao = el.getAttribute('data-acao');
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}${acao ? `[data-acao=${acao}]` : ''}${t ? ` "${t}"` : ''}`;
  };
  const visivel = (el) => {
    if (!(el instanceof Element)) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (el.checkVisibility) return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity) > 0;
  };
  const naTela = (r) => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  const ancestralRolavelX = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return p;
    }
    return null;
  };
  const fixoDe = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === 'fixed' || pos === 'sticky') return p;
    }
    return null;
  };
  const temTextoProprio = (el) => {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim().length > 0) return true;
    return false;
  };

  const SEL_INTERATIVO =
    'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link], [role=checkbox], [role=radio], [role=switch], [role=option], [tabindex]:not([tabindex="-1"])';
  const todos = [...document.querySelectorAll('body *')].filter(
    (el) => !el.closest('svg') && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName),
  );
  const vis = todos.filter(visivel);
  const interativos = vis.filter((el) => el.matches(SEL_INTERATIVO) && !el.disabled && el.getAttribute('aria-hidden') !== 'true');

  // Tela em branco: nada escrito e nenhum desenho grande.
  const textoTela = (document.body.innerText || '').trim();
  const desenhoGrande = vis.some((el) => /^(CANVAS|IMG|VIDEO)$/.test(el.tagName) && el.getBoundingClientRect().width > 100);
  if (textoTela.length < 3 && !desenhoGrande)
    add({ regra: 'tela-em-branco', gravidade: 'bloqueia', tipo: 'erro', oQue: 'Tela em branco: nenhum texto nem desenho visível.', chave: 'branco', sugestao: 'Mostrar estado de carregamento ou erro em vez de tela vazia.' });

  // 2. Layout ---------------------------------------------------------------------------------------------
  const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (sw > vw + 1)
    add({ regra: 'rolagem-lateral', gravidade: 'atrapalha', tipo: 'layout', oQue: `Rolagem para o lado: a página tem ${sw}px de largura numa tela de ${vw}px.`, chave: 'rolagem', sugestao: 'Achar o elemento mais largo que a tela (ver amostras) e limitar com max-width: 100%.' });

  const saindo = vis.filter((el) => {
    if (!(temTextoProprio(el) || el.matches(SEL_INTERATIVO))) return false;
    const r = el.getBoundingClientRect();
    if (!(r.right > vw + 1 || r.left < -1)) return false;
    if (r.bottom < 0 || r.top > vh * 4) return false;
    if (fixoDe(el) && getComputedStyle(fixoDe(el)).transform !== 'none') return false; // folha animando
    return !ancestralRolavelX(el);
  });
  if (saindo.length)
    add({ regra: 'saindo-da-tela', gravidade: 'atrapalha', tipo: 'layout', oQue: `${saindo.length} elemento(s) saindo da tela pelo lado.`, chave: saindo.slice(0, 3).map(desc).join(' | '), amostras: saindo.slice(0, 5).map(desc), sugestao: 'Quebrar a linha ou encolher o elemento para caber na largura.' });

  const cortados = [];
  const reticencias = [];
  for (const el of vis) {
    if (!temTextoProprio(el)) continue;
    // Texto só para leitor de tela (caixa de 1 px recortada): escondido de propósito, não é corte (G3).
    const caixa = el.getBoundingClientRect();
    if (caixa.width <= 1 && caixa.height <= 1) continue;
    const s = getComputedStyle(el);
    const escondeX = /hidden|clip/.test(s.overflowX);
    const escondeY = /hidden|clip/.test(s.overflowY);
    if (escondeX && el.scrollWidth > el.clientWidth + 1) (s.textOverflow === 'ellipsis' ? reticencias : cortados).push(el);
    else if (escondeY && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) (s.webkitLineClamp && s.webkitLineClamp !== 'none' ? reticencias : cortados).push(el);
  }
  if (cortados.length)
    add({ regra: 'texto-cortado', gravidade: 'atrapalha', tipo: 'layout', oQue: `${cortados.length} texto(s) cortado(s) sem reticências.`, chave: cortados.slice(0, 3).map(desc).join(' | '), amostras: cortados.slice(0, 5).map(desc), sugestao: 'Deixar o texto quebrar linha ou reduzir o tamanho naquele espaço.' });
  if (reticencias.length)
    add({ regra: 'texto-reticencias', gravidade: 'detalhe', tipo: 'layout', oQue: `${reticencias.length} texto(s) encurtado(s) com reticências.`, chave: reticencias.slice(0, 3).map(desc).join(' | '), amostras: reticencias.slice(0, 5).map(desc), sugestao: 'Conferir se a parte escondida faz falta.' });

  // Coberto por barra fixa, folha ou entalhe: o ponto do meio e o de baixo do alvo devem ser dele.
  const cobertos = [];
  for (const el of interativos) {
    const r = el.getBoundingClientRect();
    // No topo, só alvos inteiros na tela; no fim da página (op.parcial), também os cortados pela borda,
    // porque ali não dá mais para rolar e o que a barra cobre fica coberto de vez.
    if (!naTela(r) || (!op.parcial && (r.top < 0 || r.bottom > vh))) continue;
    const meuFixo = fixoDe(el);
    for (const [x, y] of [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + r.width / 2, r.bottom - 2],
    ]) {
      if (x < 0 || x >= vw || y < 0 || y >= vh) continue;
      const topo = document.elementFromPoint(x, y);
      if (!topo || topo === el || el.contains(topo) || topo.contains(el)) continue;
      const fixo = fixoDe(topo);
      if (!fixo || fixo === meuFixo || (meuFixo && meuFixo.contains(fixo))) continue;
      const fr = fixo.getBoundingClientRect();
      if (fr.height > vh * 0.6) continue; // folha ou véu de tela inteira: é de propósito
      cobertos.push(`${desc(el)} sob ${desc(fixo)}`);
      break;
    }
  }
  // Entalhe: com viewport-fit=cover, nada clicável nos primeiros 44 px do topo sem safe-area.
  if (cobertos.length)
    add({ regra: 'coberto', gravidade: 'atrapalha', tipo: 'layout', oQue: `${cobertos.length} botão(ões) ou link(s) cobertos por barra fixa.`, chave: cobertos.slice(0, 2).join(' | '), amostras: cobertos.slice(0, 5), sugestao: 'Dar padding-bottom ao conteúdo do tamanho da barra fixa (mais env(safe-area-inset-bottom)).' });

  // Alvo de toque menor que 44 × 44 (links no meio do texto ficam de fora, como no WCAG).
  const pequenos = [];
  for (const el of interativos) {
    const r = el.getBoundingClientRect();
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.parentElement && el.parentElement.innerText.trim().length > el.innerText.trim().length + 15) continue;
    if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) {
      const lr = el.closest('label').getBoundingClientRect();
      if (lr.width >= 44 && lr.height >= 44) continue;
    }
    if (r.width < 44 || r.height < 44) pequenos.push({ el, w: Math.round(r.width), h: Math.round(r.height) });
  }
  const muitoPequenos = pequenos.filter((p) => p.w < 24 || p.h < 24);
  if (muitoPequenos.length)
    add({ regra: 'alvo-menor-24', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: `${muitoPequenos.length} alvo(s) de toque menor(es) que 24 px.`, chave: muitoPequenos.slice(0, 3).map((p) => desc(p.el)).join(' | '), amostras: muitoPequenos.slice(0, 6).map((p) => `${desc(p.el)} ${p.w}×${p.h}`), sugestao: 'Aumentar a área de toque para 44 × 44 (padding ou ::after invisível).' });
  const medios = pequenos.filter((p) => p.w >= 24 && p.h >= 24);
  if (medios.length)
    add({ regra: 'alvo-menor-44', gravidade: 'detalhe', tipo: 'acessibilidade', oQue: `${medios.length} alvo(s) de toque entre 24 e 44 px.`, chave: medios.slice(0, 3).map((p) => desc(p.el)).join(' | '), amostras: medios.slice(0, 6).map((p) => `${desc(p.el)} ${p.w}×${p.h}`), sugestao: 'Aumentar a área de toque para 44 × 44.' });

  // Texto menor que 12 px.
  const miudos = vis.filter((el) => temTextoProprio(el) && parseFloat(getComputedStyle(el).fontSize) < 12);
  if (miudos.length)
    add({ regra: 'texto-menor-12', gravidade: 'detalhe', tipo: 'acessibilidade', oQue: `${miudos.length} texto(s) menor(es) que 12 px.`, chave: miudos.slice(0, 3).map(desc).join(' | '), amostras: miudos.slice(0, 6).map((el) => `${desc(el)} ${parseFloat(getComputedStyle(el).fontSize).toFixed(1)}px`), sugestao: 'Subir para 12 px no mínimo.' });

  // 3. Regras do jogo.md -----------------------------------------------------------------------------------
  // Botões lado a lado do mesmo tamanho: linhas de 2 ou 3 botões de ação que ocupam a largura do pai.
  const linhasDiferentes = [];
  const pais = new Set(interativos.map((el) => el.parentElement).filter(Boolean));
  for (const pai of pais) {
    if (ancestralRolavelX(pai) || /auto|scroll/.test(getComputedStyle(pai).overflowX)) continue;
    const irmaos = [...pai.children].filter((c) => interativos.includes(c) && /^(BUTTON|A)$/.test(c.tagName));
    if (irmaos.length < 2 || irmaos.length > 3) continue;
    const rs = irmaos.map((c) => c.getBoundingClientRect());
    if (rs.some((r) => Math.abs(r.top - rs[0].top) > 3)) continue;
    const larguraPai = pai.getBoundingClientRect().width;
    const soma = rs.reduce((s, r) => s + r.width, 0);
    if (soma < larguraPai * 0.6) continue;
    const dw = Math.max(...rs.map((r) => r.width)) - Math.min(...rs.map((r) => r.width));
    const dh = Math.max(...rs.map((r) => r.height)) - Math.min(...rs.map((r) => r.height));
    // Par principal × secundário na proporção 1 : 1,4 (Salvar × Compartilhar, Início × Revanche; S14): mesma altura, largura de 1,3 a 1,5 vezes.
    const proporcional = irmaos.length === 2 && dh <= 2 && (() => { const [p, g] = rs.map((r) => r.width).sort((x, y) => x - y); return g / p >= 1.3 && g / p <= 1.5; })();
    if (!proporcional && (dw > 2 || dh > 2)) linhasDiferentes.push(`${irmaos.map(desc).join(' + ')} (${rs.map((r) => `${Math.round(r.width)}×${Math.round(r.height)}`).join(', ')})`);
  }
  if (linhasDiferentes.length)
    add({ regra: 'botoes-lado-a-lado', gravidade: 'detalhe', tipo: 'regra do jogo.md', oQue: `Botões lado a lado com tamanhos diferentes.`, chave: linhasDiferentes[0].slice(0, 120), amostras: linhasDiferentes.slice(0, 4), sugestao: 'Usar grid de colunas iguais (1fr 1fr) nessa linha.' });

  // Um só botão amarelo (var(--amarelo)) visível por tela.
  const sonda = document.createElement('div');
  sonda.style.cssText = 'position:absolute;left:-9999px;background:var(--amarelo)';
  document.body.append(sonda);
  const amarelo = getComputedStyle(sonda).backgroundColor;
  sonda.remove();
  if (amarelo && amarelo !== 'rgba(0, 0, 0, 0)') {
    const amarelos = interativos.filter((el) => getComputedStyle(el).backgroundColor === amarelo);
    const naTelaAgora = amarelos.filter((el) => naTela(el.getBoundingClientRect()));
    if (naTelaAgora.length > 1)
      add({ regra: 'dois-amarelos', gravidade: 'detalhe', tipo: 'regra do jogo.md', oQue: `${naTelaAgora.length} botões amarelos visíveis ao mesmo tempo.`, chave: naTelaAgora.slice(0, 3).map(desc).join(' | '), amostras: naTelaAgora.map(desc), sugestao: 'Deixar amarelo só a ação principal; as outras no estilo claro.' });
    if (op.principalNaDobra && amarelos.length && !naTelaAgora.length && window.scrollY < 5)
      add({ regra: 'principal-abaixo-da-dobra', gravidade: 'atrapalha', tipo: 'layout', oQue: `O botão principal (${desc(amarelos[0])}) só aparece rolando.`, chave: desc(amarelos[0]), sugestao: 'Subir o botão principal ou encolher o que vem antes dele nessa altura de tela.' });
  }

  // Textos da tela (inclui rótulos que não aparecem no innerText).
  let texto = textoTela;
  for (const el of vis) for (const at of ['aria-label', 'title', 'placeholder', 'alt']) if (el.getAttribute(at)) texto += '\n' + el.getAttribute(at);
  const semAviso = texto.split(op.avisoFixo).join(' ');
  const trecho = (t, i, n) => t.slice(Math.max(0, i - 35), i + n + 35).replace(/\s+/g, ' ');
  const procurar = (lista, alvo) => {
    const out = [];
    for (const item of lista) {
      const re = new RegExp(item.re, 'giu');
      let m;
      while ((m = re.exec(alvo))) {
        out.push({ rotulo: item.rotulo, trecho: trecho(alvo, m.index, m[0].length) });
        if (out.length > 20) break;
      }
    }
    return out;
  };
  const nosTermos = location.hash.startsWith('#termos');
  if (!nosTermos)
    for (const p of procurar(op.proibidas, semAviso))
      add({ regra: 'palavra-proibida', gravidade: 'bloqueia', tipo: 'regra do jogo.md', oQue: `Palavra proibida "${p.rotulo}" (seção 7): …${p.trecho}…`, chave: p.rotulo + ':' + p.trecho.slice(20, 60), sugestao: 'Trocar a palavra (seção 7 do docs/jogo.md).' });
  for (const p of procurar(op.urgencia, texto))
    add({ regra: 'urgencia', gravidade: 'atrapalha', tipo: 'texto e tom', oQue: `Possível ${p.rotulo} (seção 13): …${p.trecho}…`, chave: p.rotulo + ':' + p.trecho.slice(20, 60), sugestao: 'Tirar a pressão para voltar; só informar.' });
  if (op.menor)
    for (const p of procurar(op.so18, texto))
      add({ regra: 'oferta-18', gravidade: 'bloqueia', tipo: 'regra do jogo.md', oQue: `Oferta só para 18+ ("${p.rotulo}") na tela de quem tem menos de 16: …${p.trecho}…`, chave: p.rotulo, sugestao: 'Esconder pela regra soPara18Mais (src/jogo/faixaEtaria.ts).' });

  // Nome de pessoa real fora das fichas factuais (mesma lista do filtro de apelidos).
  if (!op.fichaFactual && op.famosos && op.famosos.length) {
    const set = new Set(op.famosos);
    const norm = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, ' ');
    const pal = norm.split(' ').filter(Boolean);
    const achadosNomes = new Set();
    for (let i = 0; i < pal.length; i++) {
      for (let n = 1; n <= 3 && i + n <= pal.length; n++) {
        const k = pal.slice(i, i + n).join('');
        if (k.length >= 5 && set.has(k)) achadosNomes.add(pal.slice(i, i + n).join(' '));
      }
    }
    if (achadosNomes.size)
      add({ regra: 'nome-real', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: `Possível nome de pessoa real fora de ficha factual: ${[...achadosNomes].slice(0, 4).join(', ')}.`, chave: [...achadosNomes].sort().join(','), sugestao: 'Conferir se é ficha factual; se não, tirar o nome (seção 8).' });
  }

  return {
    achados,
    url: location.href,
    hash: location.hash || '#inicio',
    titulo: (document.querySelector('h1, h2, [role=heading]')?.innerText || document.title || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    altura: document.documentElement.scrollHeight,
  };
}

/** Há carregamento na tela? (para esperar até 10 s antes de conferir) */
export function carregandoNaPagina() {
  const els = [...document.querySelectorAll('[aria-busy="true"], .carregando, .esqueleto, .skeleton, [data-carregando]')];
  const vis = els.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  });
  if (vis.length) return vis.length;
  const t = (document.body.innerText || '').slice(0, 4000);
  return /\bcarregando\b|\baguarde\b|\bum instante\b/i.test(t) ? 1 : 0;
}

/** Animações rodando e assinatura dos canvas (para o movimento reduzido). */
export function movimentoNaPagina() {
  const anims = (document.getAnimations ? document.getAnimations() : [])
    .filter((a) => a.playState === 'running')
    .map((a) => {
      const alvo = a.effect && a.effect.target;
      const nome = a.animationName || a.transitionProperty || (a.constructor && a.constructor.name) || 'animação';
      const d = alvo && alvo.tagName ? `${alvo.tagName.toLowerCase()}${alvo.className && typeof alvo.className === 'string' ? '.' + alvo.className.trim().split(/\s+/)[0] : ''}` : '?';
      return `${nome} em ${d}`;
    });
  const canvas = [...document.querySelectorAll('canvas')]
    .filter((c) => c.width > 0 && c.getBoundingClientRect().width > 0)
    .map((c) => {
      try {
        const u = c.toDataURL('image/png');
        let h = 0;
        for (let i = 0; i < u.length; i += 7) h = (h * 31 + u.charCodeAt(i)) | 0;
        return h;
      } catch {
        return null;
      }
    });
  return { anims, canvas };
}

/** O que está com foco e se o foco aparece. */
export function focoNaPagina() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return { desc: '(nada)', visivel: false, naTela: false };
  const s = getComputedStyle(el);
  const contorno = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  const sombra = s.boxShadow && s.boxShadow !== 'none';
  let fv = false;
  try {
    fv = el.matches(':focus-visible');
  } catch {
    /* navegador antigo */
  }
  const r = el.getBoundingClientRect();
  const t = (el.getAttribute('aria-label') || el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return {
    desc: `${el.tagName.toLowerCase()}${el.getAttribute('data-acao') ? `[data-acao=${el.getAttribute('data-acao')}]` : ''}${t ? ` "${t}"` : ''}`,
    visivel: fv && (contorno || sombra),
    contorno,
    sombra: !!sombra,
    focusVisible: fv,
    naTela: r.bottom > 0 && r.top < innerHeight && r.width > 0,
    topo: Math.round(r.top),
    // Posição na página (com a rolagem): o Tab rola a tela e o topo na janela cai mesmo na ordem certa (G3, S17).
    topoNaPagina: Math.round(r.top + scrollY),
    esquerda: Math.round(r.left),
  };
}
