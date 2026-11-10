// Central de avisos (B01, docs/visual.md "Central de avisos"): o que as personas usam para semear a caixa, abrir a folha
// e medir os alvos. Este arquivo não tem export default, então o simulador não o carrega como persona.

/** Hoje (AAAA-MM-DD) em Brasília, como o jogo conta o dia. */
export const hojeBrasilia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** Versão dos Termos em vigor (src/jogo/termos.ts) lida do código, para o aviso "Os Termos mudaram". */
export async function versaoDosTermos(raiz) {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const txt = await readFile(join(raiz, 'src', 'jogo', 'termos.ts'), 'utf8');
  return txt.match(/DATA_DA_VERSAO\s*=\s*'([^']+)'/)?.[1] ?? null;
}

/**
 * Põe avisos na caixa do aparelho que a página atual já usa (mescla em gdt:prefs, sem apagar time, faixa etc.).
 * `ids`: lista de ids de avisos por registro (peca:, trofeu:, mes:, desafio:, termos:). `aquecimento`: põe o card na caixa.
 * A página precisa ser do jogo (mesma origem); depois disso, abra a Home de novo com s.abrir.
 */
export async function semearAvisos(s, { ids = [], aquecimento = true, termosAntigos = false } = {}) {
  const hoje = hojeBrasilia();
  await s.page.evaluate(
    ({ ids, aquecimento, hoje, termosAntigos }) => {
      const prefs = JSON.parse(localStorage.getItem('gdt:prefs') || '{}');
      const datas = {};
      for (const id of ids) datas[id] = hoje;
      prefs.avisos = { datas };
      if (aquecimento) prefs.aquecimento = { ...(prefs.aquecimento || {}), cardNaHome: true, visto: false };
      if (termosAntigos) prefs.termosVistos = '01/01/2026';
      localStorage.setItem('gdt:prefs', JSON.stringify(prefs));
    },
    { ids, aquecimento, hoje, termosAntigos },
  );
}

/** Quantos avisos novos o sininho diz que tem (lê o aria-label). */
export const rotuloDoSininho = (p) => p.locator('button[data-acao="sininho"]').getAttribute('aria-label');

/** Mede cada botão da folha (Fechar, Encarar/Ver/Vestir…, Dispensar) e a rolagem lateral. */
export function medirFolha(p) {
  return p.evaluate(() => {
    const folha = document.querySelector('[data-central-avisos]');
    if (!folha) return null;
    const caixa = (el) => {
      const r = el.getBoundingClientRect();
      return { larg: Math.round(r.width), alt: Math.round(r.height), topo: Math.round(r.top), base: Math.round(r.bottom), esq: Math.round(r.left), dir: Math.round(r.right) };
    };
    const botoes = [...folha.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => ({ nome: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 50), ...caixa(b) }));
    const rol = folha.querySelector('.avisos-rolagem');
    return {
      botoes,
      janela: { l: innerWidth, a: innerHeight },
      paginaRolaLado: document.documentElement.scrollWidth > innerWidth + 1,
      folhaRolaLado: folha.scrollWidth > folha.clientWidth + 1,
      rolagem: rol ? { alt: rol.clientHeight, conteudo: rol.scrollHeight, topo: Math.round(rol.scrollTop), overflowY: getComputedStyle(rol).overflowY } : null,
      textoTodo: (folha.innerText || '').replace(/\s+/g, ' '),
      avisos: folha.querySelectorAll('li.aviso').length,
    };
  });
}
