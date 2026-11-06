// Galeria de Troféus em estante, sub-aba "Galeria" de Ranking > Conquistas (docs/jogo.md, seção 5, "Telas aprovadas em
// 05/11/2026"): botão do time no topo, prateleiras (Taças, Campeão da semana, Vitrine · Maior torcida), a linha de
// sobe e desce, a ficha do troféu (folha que abre de baixo) e a pré-temporada (prateleiras-fantasma até o zerar).
// Só leitura: servidorDaGaleria() é a única fonte. Baixa sob demanda, quando a sub-aba abre.

import '../estilos/trofeus.css';
import '../estilos/galeria.css';
import { esc, irPara } from '../app';
import { corDeTexto, ID_OUTRO, TIMES, timePorId } from '../dados/times';
import { prefs } from '../estado';
import {
  EXPLICACAO_DO_TROFEU,
  NOME_DO_TROFEU,
  TEXTO_PRE_GALERIA,
  fraseSobeDesce,
  galeriaEmPreTemporada,
  linhaEmCampo,
  montarEstante,
  numerosDaFicha,
  periodoDoTrofeu,
  serieDoTrofeu,
  textoDoTotal,
  top3,
  type Estante,
  type Linha52,
  type Trofeu,
} from '../jogo/galeria';
import { fraseDaGaleria } from '../narrador/galeria';
import { servidorDaGaleria } from '../servidor/galeria';
import { aoTocarNoEstado, estado, numero, placa } from './blocos';
import { mandarTrofeuNoGrupo } from './mandarTrofeu';
import { svgDoTrofeu, svgFlamula, svgMegafone, svgTaca } from './trofeusDesenho';

const OFICIAIS = TIMES.filter((t) => t.id !== ID_OUTRO);
const MAX_FLAMULAS = 8;
const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export interface OpcoesDaGaleria {
  /** Troca para a sub-aba Medalhas (o "Ver minhas medalhas" da pré-temporada). */
  verMedalhas?: () => void;
}

const estiloDoTime = (c: readonly string[]) => `--c1:${c[0]};--c2:${c[1]};--txt:${corDeTexto(c[0])}`;

export function desenharGaleria(el: HTMLElement, o: OpcoesDaGaleria = {}): () => void {
  let saiu = false;
  let geracao = 0;
  const meu = prefs.get().time;
  // Quem é de "Outro time" (ou não escolheu) começa sem torcida e escolhe uma; vale só na tela, nada é gravado.
  let visto: string | null = meu && meu !== ID_OUTRO && timePorId(meu) ? meu : null;
  let estante: Estante | null = null;
  let fichas: Trofeu[] = [];
  let sobeDesce: string | null = null;
  let todas = false;
  let aberta: HTMLDialogElement | null = null;

  el.innerHTML = `<div class="galeria">
      <button type="button" class="gal-time" data-gal-time aria-haspopup="dialog"></button>
      <div class="gal-corpo galeria" data-gal-corpo aria-live="polite"></div>
    </div>`;
  const botaoTime = el.querySelector<HTMLButtonElement>('[data-gal-time]')!;
  const corpo = el.querySelector<HTMLElement>('[data-gal-corpo]')!;

  function pintarTopo(total: number | null | 'erro'): void {
    const t = visto ? timePorId(visto) : undefined;
    if (!t) {
      botaoTime.removeAttribute('style');
      botaoTime.innerHTML = `<span class="gal-time-nome">Escolha uma torcida<small>Toque pra ver a Galeria de um time</small></span><span class="gal-troca" aria-hidden="true">Escolher</span>`;
      botaoTime.setAttribute('aria-label', 'Escolha uma torcida');
      return;
    }
    const texto = total === null ? 'Buscando…' : total === 'erro' ? 'Sem conexão' : textoDoTotal(total);
    botaoTime.setAttribute('style', `--gc1:${t.cores[0]};--gc2:${t.cores[1]};--gtxt:${corDeTexto(t.cores[0])}`);
    botaoTime.innerHTML = `<span class="gal-time-nome">${esc(t.nome)}<small>${esc(texto)}</small></span><span class="gal-troca" aria-hidden="true">Trocar</span>`;
    botaoTime.setAttribute('aria-label', `Galeria ${t.artigo === 'a' ? 'da' : 'do'} ${t.nome}, ${texto}. Trocar de time`);
  }

  const listaDeTimes = (): string =>
    `<ul class="gal-times">${OFICIAIS.map(
      (t) => `<li><button type="button" class="gal-opcao" data-gal-escolher="${esc(t.id)}"${t.id === visto ? ' aria-current="true"' : ''}>
        <span class="cor" style="--c1:${t.cores[0]};--c2:${t.cores[1]}" aria-hidden="true"></span><span>${esc(t.nome)}</span></button></li>`,
    ).join('')}</ul>`;

  /** Mostra um <dialog> modal dentro de `el` (a tela o leva embora ao trocar). */
  function abrirFolha(d: HTMLDialogElement): void {
    el.append(d);
    d.addEventListener('close', () => {
      d.remove();
      if (aberta === d) aberta = null;
    });
    d.addEventListener('click', (e) => {
      if (e.target === d) d.close();
    });
    d.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', () => d.close()));
    aberta = d;
    if (typeof d.showModal === 'function') d.showModal();
    else d.setAttribute('open', '');
    if (semMovimento()) d.style.animation = 'none';
  }

  function folhaDeTimes(): void {
    const d = document.createElement('dialog');
    d.className = 'ficha-lance gal-folha';
    d.setAttribute('aria-label', 'Escolha uma torcida');
    d.innerHTML = `<div class="ficha-corpo">
        <h2 class="gal-folha-titulo">Escolha uma torcida</h2>
        ${listaDeTimes()}
        <button type="button" class="botao botao-sec" data-fechar>Fechar</button>
      </div>`;
    abrirFolha(d);
  }

  // ---------- ficha do troféu ----------

  function abrirFicha(t: Trofeu): void {
    const time = timePorId(t.time_id);
    if (!time) return;
    const nome = NOME_DO_TROFEU[t.trofeu];
    const serie = serieDoTrofeu(t);
    const frase = fraseDaGaleria(t.trofeu, time);
    const d = document.createElement('dialog');
    d.className = 'ficha-lance gal-ficha';
    d.setAttribute('style', estiloDoTime(time.cores));
    d.setAttribute('aria-labelledby', 'gal-ficha-nome');
    d.innerHTML = `<div class="ficha-corpo">
        <div class="gal-ficha-desenho">${svgDoTrofeu(t.trofeu, time.cores, esc(`${nome} ${time.artigo === 'a' ? 'da' : 'do'} ${time.nome}`))}</div>
        <h2 id="gal-ficha-nome" class="gal-ficha-nome">${esc(nome)}</h2>
        <p class="ficha-meta">${esc([serie, periodoDoTrofeu(t)].filter(Boolean).join(' · '))}</p>
        <p class="gal-explica">${esc(EXPLICACAO_DO_TROFEU[t.trofeu])}</p>
        <div class="numeros tres gal-esq" data-gal-numeros aria-hidden="true">${numero('88', 'carregando')}${numero('88', 'carregando')}${numero('88', 'carregando')}</div>
        <p class="gal-campo" data-gal-campo hidden></p>
        ${frase ? `<p class="gal-frase">${esc(frase)}</p>` : ''}
        <div class="dupla">
          <button type="button" class="botao botao-sec" data-fechar>Fechar</button>
          <button type="button" class="botao botao-zap" data-gal-mandar>Mandar no grupo</button>
        </div>
      </div>`;
    // Direto no toque, sem await antes: o iPhone perde o gesto do compartilhar.
    d.querySelector('[data-gal-mandar]')!.addEventListener('click', () => mandarTrofeuNoGrupo(t, time));
    abrirFolha(d);

    const numeros = d.querySelector<HTMLElement>('[data-gal-numeros]')!;
    const campo = d.querySelector<HTMLElement>('[data-gal-campo]')!;
    void servidorDaGaleria()
      .then((api) => api.dadosDaFicha(t))
      .then((dados) => {
        if (!d.isConnected) return;
        const lista = numerosDaFicha(t, dados);
        if (lista.length) {
          numeros.classList.remove('gal-esq');
          numeros.removeAttribute('aria-hidden');
          numeros.innerHTML = lista.map((n) => numero(esc(n.valor).replace('º', '<i>º</i>'), n.rotulo)).join('');
        } else numeros.remove();
        const emCampo = linhaEmCampo(t, prefs.get().time, dados.meusPontos);
        if (emCampo) {
          campo.textContent = emCampo;
          campo.hidden = false;
        }
      })
      // Sem os números a ficha continua inteira; só some o bloco.
      .catch(() => numeros.remove());
  }

  // ---------- telas ----------

  const botaoMedalhas = `<button type="button" class="botao-linha gal-largo" data-gal-medalhas>Ver minhas medalhas</button>`;

  function pintarEscolha(): void {
    corpo.innerHTML = placa(listaDeTimes(), { titulo: 'Escolha uma torcida', filete: true });
  }

  function pintarPre(top: Linha52[]): void {
    const taca = (tipo: 'campeao_estreia' | 'campeao_temporada' | 'campeao_serie_b') =>
      `<div class="gal-item vazio">${svgTaca({ estrela: tipo === 'campeao_estreia', vazia: true, rotulo: esc(NOME_DO_TROFEU[tipo]) })}<span>${esc(NOME_DO_TROFEU[tipo])}</span></div>`;
    const linhas = top
      .map((l) => {
        const t = timePorId(l.time_id);
        return `<div class="mini-linha gal-linha${l.time_id === visto ? ' meu' : ''}">
          <span class="pos">${l.posicao}º</span>
          <span class="cor" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}" aria-hidden="true"></span>
          <span class="nome">${esc(t?.nome ?? l.time_id)}</span>
          <span class="valor">${l.pontos.toLocaleString('pt-BR')}</span>
        </div>`;
      })
      .join('');
    corpo.innerHTML = `${placa(
      `<div class="gal-fantasma" aria-hidden="true">
          <div class="gal-fantasma-linha">${taca('campeao_estreia')}${taca('campeao_temporada')}${taca('campeao_serie_b')}</div>
          <div class="gal-fantasma-linha">
            <div class="gal-item">${svgFlamula(['#8a948d', '#5d6760'], 'Flâmula')}<span>Semana</span></div>
            <div class="gal-item">${svgMegafone('Megafone')}<span>Vitrine</span></div>
          </div>
        </div>
        <h2 class="gal-abre">${esc(TEXTO_PRE_GALERIA.titulo)}</h2>
        <p class="gal-texto">${esc(TEXTO_PRE_GALERIA.explica)}</p>`,
      { filete: true },
    )}${top.length ? placa(`<div class="gal-lista">${linhas}</div>`, { titulo: TEXTO_PRE_GALERIA.top3 }) : ''}${botaoMedalhas}`;
  }

  /** Taça, flâmula ou megafone: com troféu abre a ficha; sem, fica tracejado e sem toque. */
  function botaoDoTrofeu(t: Trofeu, texto: string, desenho: string, extra = ''): string {
    fichas.push(t);
    return `<button type="button" class="gal-item" data-gal-ficha="${fichas.length - 1}" aria-label="${esc(texto)}. Abrir a ficha">${desenho}${extra}</button>`;
  }

  function pintarEstante(): void {
    if (!estante || !visto) return;
    const time = timePorId(visto)!;
    fichas = [];
    const tacas = estante.tacas
      .map((c) => {
        const x = c.multiplo ? `<b class="gal-x" aria-hidden="true">${esc(c.multiplo)}</b>` : '';
        if (!c.ultimo) {
          return `<div class="gal-item vazio">${svgTaca({ estrela: c.tipo === 'campeao_estreia', vazia: true, rotulo: esc(`${c.nome}: ainda não`) })}<span>${esc(c.nome)}</span><small>ainda não</small></div>`;
        }
        const texto = `${c.nome}${c.multiplo ? `, ${c.vezes} vezes` : ''}`;
        return botaoDoTrofeu(
          c.ultimo,
          texto,
          svgTaca({ estrela: c.tipo === 'campeao_estreia', rotulo: esc(c.nome) }),
          `${x}<span>${esc(c.nome)}</span>`,
        );
      })
      .join('');

    const visiveis = todas ? estante.flamulas : estante.flamulas.slice(0, MAX_FLAMULAS);
    const flamulas = estante.flamulas.length
      ? `<div class="gal-flamulas">${visiveis
          .map((f) =>
            botaoDoTrofeu(
              f.trofeu,
              `Campeão da semana de ${f.data}${f.serieB ? ', Série B' : ''}`,
              svgFlamula(time.cores, esc(`Flâmula da semana de ${f.data}`)),
              `<span>${esc(f.data)}</span>${f.serieB ? '<em class="gal-b">Série B</em>' : ''}`,
            ),
          )
          .join('')}</div>
        ${
          estante.flamulas.length > MAX_FLAMULAS
            ? `<button type="button" class="botao-linha gal-todas" data-gal-todas aria-expanded="${todas}">${todas ? 'Ver menos' : `Ver todas (${estante.flamulas.length})`}</button>`
            : ''
        }`
      : '<p class="gal-texto">Nenhuma flâmula ainda. A primeira semana fechada abre a parede.</p>';

    const v = estante.vitrine;
    const vitrine = v.ultimo
      ? (() => {
          fichas.push(v.ultimo);
          return `<button type="button" class="gal-vitrine" data-gal-ficha="${fichas.length - 1}" aria-label="Maior torcida${v.multiplo ? `, ${v.vezes} vezes` : ''}. Abrir a ficha">${svgMegafone('Megafone da Maior torcida')}<span><b>${esc(v.multiplo ?? '×1')}</b>Soma de todo mundo. Não é título.</span></button>`;
        })()
      : `<div class="gal-vitrine">${svgMegafone('Megafone: ainda não')}<span><b>Ainda não</b>Soma de todo mundo. Não é título.</span></div>`;

    corpo.innerHTML = `${placa(`<div class="gal-tacas">${tacas}</div>`, { titulo: 'Taças', filete: true })}
      ${placa(flamulas, { titulo: 'Campeão da semana' })}
      ${placa(vitrine, { titulo: 'Vitrine · Maior torcida' })}
      ${sobeDesce ? `<p class="gal-sobe">${esc(sobeDesce)}</p>` : ''}
      <button type="button" class="botao-linha gal-largo" data-gal-campeas>Campeãs de estado</button>`;
  }

  async function carregar(): Promise<void> {
    const g = ++geracao;
    const velha = () => saiu || g !== geracao;
    pintarTopo(null);
    corpo.innerHTML = estado('carregando', 'Buscando a Galeria…');
    try {
      const api = await servidorDaGaleria();
      if (galeriaEmPreTemporada(await api.temporadas())) {
        const top = top3(await api.ranking52());
        if (velha()) return;
        pintarTopo(visto ? 0 : null);
        pintarPre(top);
        return;
      }
      if (!visto) {
        pintarTopo(null);
        pintarEscolha();
        return;
      }
      const [trofeus, historico] = await Promise.all([api.trofeusDoTime(visto), api.historicoDeSeries(visto).catch(() => [])]);
      if (velha()) return;
      estante = montarEstante(trofeus);
      sobeDesce = fraseSobeDesce(historico);
      todas = false;
      pintarTopo(estante.total);
      pintarEstante();
    } catch {
      if (velha()) return;
      pintarTopo('erro');
      corpo.innerHTML = estado('erro', 'Sem conexão com a Galeria agora.');
      aoTocarNoEstado(corpo, () => void carregar());
    }
  }

  function escolher(id: string): void {
    aberta?.close();
    if (id === visto) return;
    visto = id;
    void carregar();
  }

  const clicou = (e: Event) => {
    const alvo = e.target as HTMLElement;
    const escolhido = alvo.closest<HTMLElement>('[data-gal-escolher]')?.dataset.galEscolher;
    if (escolhido) return escolher(escolhido);
    if (alvo.closest('[data-gal-time]')) return folhaDeTimes();
    const ficha = alvo.closest<HTMLElement>('[data-gal-ficha]')?.dataset.galFicha;
    if (ficha !== undefined && fichas[Number(ficha)]) return abrirFicha(fichas[Number(ficha)]);
    if (alvo.closest('[data-gal-todas]')) {
      todas = !todas;
      return pintarEstante();
    }
    if (alvo.closest('[data-gal-campeas]')) return irPara({ tela: 'ranking', aba: 'cidades', sub: 'campeas' });
    if (alvo.closest('[data-gal-medalhas]')) return o.verMedalhas ? o.verMedalhas() : irPara({ tela: 'ranking', aba: 'conquistas' });
  };
  el.addEventListener('click', clicou);
  void carregar();

  return () => {
    saiu = true;
    geracao++;
    el.removeEventListener('click', clicou);
    aberta?.close();
  };
}
