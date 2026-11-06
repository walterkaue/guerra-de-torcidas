// Aba Temporada do Ranking: a série de cada torcida no mês e a classificação mensal (docs/jogo.md, seção 5).
// Só leitura: o servidor fecha semana e mês. Sem Realtime (muda uma vez por semana): carrega ao abrir a aba.
// O mês é o mais recente da tabela `temporada`, nunca o relógio do celular.

import { esc, irPara } from '../app';
import { abas, baixarPedaco, estado, marcarAba } from './blocos';
import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import * as real from '../servidor/api';
import {
  LEGENDA_SERIE,
  fraseDoMeuTime,
  mensagemSemSemana,
  nomeDaSerie,
  ordenarLinhas,
  semSemanaFechada,
  segundasDoMes,
  seloDoDestino,
  textoContagem,
  textoDivisor,
  textoDoSelo,
  textoExplica,
  textoVitorias,
  zonaDaLinha,
  type LinhaTemporada,
  type Serie,
  type Temporada,
} from '../jogo/temporada';

type Servidor = Pick<typeof real, 'temporadasRecentes' | 'classificacaoDoMes' | 'semanasFechadasDoMes'>;

// Em desenvolvimento, ?temporadaFalsa=unica|ab|vazia|fechada|erro troca o servidor por um de mentira.
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('temporadaFalsa');
const servidor = async (): Promise<Servidor> => (FALSA ? import('../dev/temporadaFalsa') : real);

interface DadosDoMes {
  linhas: LinhaTemporada[];
  fechadas: number;
}

function desenharMes(el: HTMLElement): () => void {
  let saiu = false;
  let temporadas: Temporada[] | null = null;
  let indice = 0;
  let serieSel: 'a' | 'b' | null = null;
  const cache = new Map<string, DadosDoMes>();

  const aviso = (texto: string, tentar = false) => {
    el.innerHTML = estado(tentar ? 'erro' : 'vazio', texto);
    el.querySelector('[data-estado-acao]')?.setAttribute('data-tentar', '');
  };

  async function carregar(): Promise<void> {
    el.innerHTML = estado('carregando', 'Buscando a temporada…');
    try {
      const api = await servidor();
      temporadas ??= await api.temporadasRecentes();
      if (saiu) return;
      if (temporadas.length === 0) return aviso('A temporada ainda não começou.');
      const t = temporadas[indice];
      if (!cache.has(t.mes)) {
        const [linhas, fechadas] = await Promise.all([api.classificacaoDoMes(t.mes), api.semanasFechadasDoMes(t.mes)]);
        cache.set(t.mes, { linhas, fechadas });
      }
      if (saiu) return;
      desenhar();
    } catch {
      if (!saiu) aviso('Sem conexão com o placar agora.', true);
    }
  }

  function desenhar(): void {
    const t = temporadas![indice];
    const { linhas, fechadas } = cache.get(t.mes)!;
    const meuTime = prefs.get().time;
    const modo = linhas.some((l) => l.serie !== 'unica') ? 'ab' : 'unica';
    const fechado = t.fechada_em !== null;
    const semSemana = !fechado && semSemanaFechada(linhas);
    const minha = meuTime && meuTime !== ID_OUTRO ? linhas.find((l) => l.time_id === meuTime) : undefined;

    if (modo === 'ab') serieSel ??= minha && minha.serie !== 'unica' ? minha.serie : 'a';
    const serieVista: Serie = modo === 'ab' ? serieSel! : 'unica';
    const daSerie = linhas.filter((l) => l.serie === serieVista);
    const nomeDe = (id: string) => timePorId(id)?.nome ?? id;
    const ordem = ordenarLinhas(daSerie, { fechado, semSemana, nomeDe });

    const campeao = t.campeao_estreia_id ? timePorId(t.campeao_estreia_id) ?? null : null;
    const selo = textoDoSelo(t, modo, campeao);
    const frase = fraseDoMeuTime({
      time: meuTime && meuTime !== ID_OUTRO ? timePorId(meuTime) ?? null : null,
      outro: meuTime === ID_OUTRO,
      linha: minha,
      daSerie: minha ? linhas.filter((l) => l.serie === minha.serie) : [],
      mes: t.mes,
      fechada: fechado,
    });

    const subMes =
      temporadas!.length > 1
        ? `<div class="abas-2" role="tablist">
            <button role="tab" class="rotulo" aria-selected="${indice === 0}" data-mes="0">Este mês</button>
            <button role="tab" class="rotulo" aria-selected="${indice === 1}" data-mes="1">Mês passado</button>
          </div>`
        : '';
    const subSerie =
      modo === 'ab'
        ? `<div class="abas-2" role="tablist">
            <button role="tab" class="rotulo" aria-selected="${serieVista === 'a'}" data-serie="a">Série A</button>
            <button role="tab" class="rotulo" aria-selected="${serieVista === 'b'}" data-serie="b">Série B</button>
          </div>`
        : '';

    const linhasHtml = ordem
      .map((l, i) => {
        const time = timePorId(l.time_id);
        const pos = fechado ? l.posicao_final ?? l.posicao : l.posicao;
        const classes = ['mini-linha', 'abre-casa'];
        if (pos === 1 && !semSemana) classes.push('lider');
        if (l.time_id === meuTime && meuTime !== ID_OUTRO) classes.push('meu');
        const zona = semSemana || modo === 'unica' ? null : zonaDaLinha(l.serie, pos);
        if (zona) classes.push(`zona-${zona}`);
        const vit = textoVitorias(l.vitorias);
        const destino = fechado ? seloDoDestino(l.serie, l.destino) : null;
        // Verde para quem vai (ou volta) pra A, vermelho para quem cai; "Fica" e a Série B neutros.
        const corDestino = l.serie === 'a' ? (l.destino === 'b' ? 'desce' : '') : l.destino === 'a' ? 'sobe' : '';
        const nome = time?.nome ?? l.time_id;
        const linhaHtml = `<div class="${classes.join(' ')}" data-casa="${esc(l.time_id)}" role="link" tabindex="0" aria-label="Abrir a Casa ${time?.artigo === 'a' ? 'da' : 'do'} ${esc(nome)}">
          <span class="pos">${semSemana ? '–' : `${pos}º`}</span><span class="seta" aria-hidden="true"></span>
          <span class="cor" style="--c1:${time?.cores[0] ?? '#666'};--c2:${time?.cores[1] ?? '#999'}"></span>
          <span class="nome">${esc(nome)}${vit ? `<small>${vit}</small>` : ''}</span>
          <span class="valor">${destino ? `<em class="selo-destino ${corDestino}">${destino}</em>` : ''}${l.pontos}</span>
        </div>`;
        const divisor =
          modo === 'unica' && !fechado && !semSemana && i === 9 ? `<p class="divisor-serie">${esc(textoDivisor(t.mes))}</p>` : '';
        return linhaHtml + divisor;
      })
      .join('');

    const legenda = modo === 'ab' && !fechado && !semSemana ? `<p class="legenda-zona">${LEGENDA_SERIE[serieVista as 'a' | 'b']}</p>` : '';

    el.innerHTML = `
      <section class="temporada-topo">
        <h3 class="temporada-titulo">${esc(selo.cabecalho)}</h3>
        ${selo.pre ? `<p class="selo-semana provisoria">${esc(selo.pre)}</p>` : ''}
        ${selo.trofeu ? `<p class="selo-semana">${esc(selo.trofeu)}</p>` : ''}
        <p class="selo-semana">${esc(textoContagem(fechadas, segundasDoMes(t.mes).length))}</p>
        ${semSemana ? `<p class="selo-semana provisoria">${esc(mensagemSemSemana(t.mes, new Date()))}</p>` : ''}
        ${frase ? `<p class="frase-meu-time">${esc(frase)}</p>` : ''}
      </section>
      ${subMes || subSerie ? `<div class="abas-linha">${subMes}${subSerie}</div>` : ''}
      <div class="tabela" aria-live="polite" data-tabela-temporada aria-label="${esc(nomeDaSerie(serieVista))}">${linhasHtml}</div>
      ${legenda}
      <p class="explica">${esc(textoExplica(modo))}</p>`;
  }

  const clicou = (e: Event) => {
    const alvo = e.target as HTMLElement;
    if (alvo.closest('[data-tentar]')) {
      void carregar();
      return;
    }
    const mes = alvo.closest<HTMLElement>('[data-mes]');
    if (mes) {
      const novo = Number(mes.dataset.mes);
      if (novo === indice) return;
      indice = novo;
      serieSel = null;
      void carregar();
      return;
    }
    const serie = alvo.closest<HTMLElement>('[data-serie]');
    if (serie) {
      serieSel = serie.dataset.serie as 'a' | 'b';
      desenhar();
      return;
    }
    const id = alvo.closest<HTMLElement>('[data-casa]')?.dataset.casa;
    if (id) irPara({ tela: 'casa', id });
  };
  const tecla = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).closest('[data-casa]')) clicou(e);
  };
  el.addEventListener('click', clicou);
  el.addEventListener('keydown', tecla);
  void carregar();

  return () => {
    saiu = true;
    el.removeEventListener('click', clicou);
    el.removeEventListener('keydown', tecla);
  };
}

/** A aba Temporada: "Mês · Série A e B" (o que já existia) e "52 semanas" (baixa só ao abrir). */
export function desenharTemporada(el: HTMLElement, inicial: 'mes' | '52semanas' = 'mes'): () => void {
  let parar: (() => void) | undefined;
  let atual = '';
  let vez = 0;
  el.innerHTML = `<div class="abas-linha iguais">${abas('tsub', [{ id: 'mes', texto: 'Mês · Série A e B' }, { id: '52semanas', texto: '52 semanas' }], inicial, 2)}</div><div class="painel-ranking"></div>`;
  const corpo = el.lastElementChild as HTMLElement;
  const abrir = (id: string) => {
    if (id === atual) return;
    atual = id;
    parar?.();
    parar = undefined;
    const minha = ++vez;
    marcarAba(el, 'tsub', id);
    corpo.innerHTML = '';
    if (id === 'mes') parar = desenharMes(corpo);
    else
      baixarPedaco(corpo, () => import('./semanas52'), (m) => (parar = m.desenharSemanas52(corpo)), () => minha === vez);
  };
  el.firstElementChild!.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-tsub]')?.dataset.tsub;
    if (id) abrir(id);
  });
  abrir(inicial);

  return () => {
    vez++;
    parar?.();
  };
}
