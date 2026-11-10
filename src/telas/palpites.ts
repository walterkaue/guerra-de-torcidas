// Aba Palpites: Crava a Rodada (docs/jogo.md, seção 7; docs/visual.md, "Crava a Rodada").
// Aviso fixo no topo, um cartão por jogo com − e +, jogo da certeza, como a torcida cravou depois
// do início, pontos depois da confirmação, ranking das torcidas no palpite e os dois cards.
// Quem decide se o palpite ainda vale é o servidor (RLS pela hora dele); a tela só acompanha.

import { esc, irPara, type Rota } from '../app';
import { ID_OUTRO, TIMES, corDeTexto, proTime, timePorId, type Time } from '../dados/times';
import { apelidoDoCard, prefs } from '../estado';
import type { DadosDoCard } from '../jogo/cardPersonalizado';
import { linhaDoTorcedor } from '../jogo/cardTextos';
import {
  GOLS_MAX,
  EMOJI_ACERTO,
  linhaEmoji,
  ordinalRodada,
  pontosDaRodada,
  type Placar,
  type PontosDoJogo,
} from '../jogo/crava';
import {
  AVISO_RESENHA,
  NOME_DO_ACERTO,
  acertosDaRodada,
  adiado,
  faseDoJogo,
  ehEspecial,
  horaDoJogo,
  ladoDoJogo,
  linhaAcertosDoBrasileirao,
  linhaPosicaoFinal,
  nomeDaRodada,
  palpiteContraNoJogo,
  placarTexto,
  resumoDoBrasileirao,
  rodadaEmFoco,
  rodadasNoTempo,
  rotuloDePontos,
  tempoAte,
  textoMeusPalpites,
  textoResultadoBrasileirao,
  textoResultadoRodada,
  tituloDaRodadaEspecial,
  torcidaQueMaisPontuou,
} from '../jogo/cravaTela';
import { brasileiraoEncerrado, linhaDoProximoEspecial } from '../jogo/statusJogos';
import { linhaRecorde, recordeCrava } from '../jogo/posicao';
import { ZONA_REBAIXAMENTO, classificacao, dicasDoJogo, type Letra, type LinhaTabela, type Resultado } from '../jogo/tabela';
import { escolherFrase, type ContextoNarrador, type Etiqueta } from '../narrador/escolher';
import type { EventoNarrador } from '../narrador/frases';
import { lerRecentes, registrarVista } from '../narrador/historico';
import { contextoDoTime } from '../narrador/sessao';
import { ErroServidor } from '../servidor/api';
import * as real from '../servidor/crava';
import type { ComoCravaram, Jogo, MeusDados, MinhaPosicao, Rodada } from '../servidor/crava';
import { sincronizarTorcedor as sincronizarReal } from '../servidor/torcedor';
import { abrirCardPersonalizado } from './cardPersonalizado';
import { nivelParaCard } from './carreira';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';
import { icone } from './icones';
import { dicasDoAparelho, mostrarDica } from './dicas';
import { DICAS } from '../jogo/dicas';
import { primeiraDica } from '../jogo/dicasGatilhos';
import { abrirRegras } from './regras';
import { abas, aoTocarNoEstado, cabecalhoTela, estado, faixa, marcarAba, numero, posicaoHtml, selo } from './blocos';

// Em desenvolvimento, ?homeFalsa troca o servidor por um de mentira (src/dev/cravaFalsa.ts).
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa');
type Api = typeof real & { sincronizarTorcedor: () => Promise<unknown> };

const LINK = 'https://torcida.kauewalter.com.br/';
const nomeDo = (id: string) => timePorId(id)?.nome ?? id;
const iguais = (a?: Placar, b?: Placar) => !!a && !!b && a.m === b.m && a.v === b.v;
const OFICIAIS = TIMES.filter((t) => t.id !== ID_OUTRO).map((t) => t.id);
const NOME_LETRA: Record<Letra, string> = { V: 'vitória', E: 'empate', D: 'derrota' };

/** Últimos 5 jogos em quadradinhos V/E/D (do mais antigo ao mais recente). */
function formaHtml(forma: readonly Letra[]): string {
  if (!forma.length) return '';
  const rotulo = `Últimos ${forma.length} jogos: ${forma.map((l) => NOME_LETRA[l]).join(', ')}`;
  return `<span class="forma" role="img" aria-label="${rotulo}">${forma.map((l) => `<i class="f-${l}" aria-hidden="true">${l}</i>`).join('')}</span>`;
}

export function telaPalpites(root: HTMLElement, _rota: Rota): () => void {
  const time = timePorId(prefs.get().time);
  const outro = !time || time.id === ID_OUTRO;
  const paraTime = time && !outro ? proTime(time) : null;
  const ctxBase: ContextoNarrador = time ? contextoDoTime(time) : {};
  const usadas = new Set<string>();
  let api: Api = { ...real, sincronizarTorcedor: sincronizarReal };

  let jogos: Jogo[] = [];
  let rodadas: Rodada[] = [];
  let meus: MeusDados = { palpites: new Map(), certezas: new Map(), pontos: new Map() };
  let rodada: number | null = null;
  let rankingDe: 'rodada' | 'tudo' = 'rodada';
  /** Posição na rodada em foco: undefined = ainda carregando, null = sem posição. */
  let posRodada: MinhaPosicao | null | undefined;
  let rodadaDaPosicao: number | null = null;
  let visao: 'palpites' | 'tabela' = 'palpites';
  // Resultados da temporada (placar da API) e a tabela calculada deles: apoio para cravar.
  let temporada: Resultado[] = [];
  let tabela = new Map<string, LinhaTabela>();
  const rascunho = new Map<string, Placar>();
  const como = new Map<string, ComoCravaram>();
  const fraseDoJogo = new Map<string, string>();
  let saiu = false;
  /** Situação do grito do topo e do lembrete já narrados (não troca a frase a cada redesenho). */
  let topoVisto = '';
  let lembreteVisto = '';
  // Dicas (jogo.md, 14.4): o "1º ..." vale por visita à tela; o limite por aparelho fica em jogo/dicas.ts.
  const dicas = dicasDoAparelho();
  const vistas = { mudar: false, estrela: false, travada: false, ved: false, rolando: false, fechada: false };
  /** A dica da estrela está no ar: o botão da estrela fica em destaque até a pessoa escolher o jogo da certeza. */
  let destacarEstrela = false;

  root.innerHTML = `
    <main class="tela palpites">
      <p class="aviso-resenha" role="note">${esc(AVISO_RESENHA)}</p>
      ${cabecalhoTela({
        titulo: 'Palpite da Rodada',
        extra: '<button class="ajuda" type="button" data-acao="como-cravar" aria-label="Regras e pontos">?</button>',
      })}
      ${abas('visao', [{ id: 'palpites', texto: 'Palpites' }, { id: 'tabela', texto: 'Tabela' }], 'palpites', 1)}
      <section class="tabela-campeonato" data-tabela hidden></section>
      <div class="visao-palpites" data-visao-palpites>
        <section class="placa filete encerramento" data-encerramento aria-label="Brasileirão encerrado" hidden></section>
        <nav class="seletor-rodada placa aperta" aria-label="Rodada" hidden>
          <button type="button" class="voltar" data-acao="rodada-ant" aria-label="Rodada anterior">‹</button>
          <strong data-rodada></strong>
          <button type="button" class="voltar" data-acao="rodada-prox" aria-label="Próxima rodada">›</button>
        </nav>
        <p class="nota aviso-especial" data-aviso-especial role="note" hidden>Vale o placar dos 90 minutos. Prorrogação e pênaltis não contam.</p>
        <section class="placa filete sua-rodada" data-sua-rodada aria-label="Sua rodada" hidden></section>
        <p class="adesivo" data-adesivo hidden></p>
        <p class="faixa-dica" data-dica hidden aria-live="polite"></p>
        <p class="nota" data-lembrete hidden></p>
        <section class="lista-jogos" aria-live="polite">${estado('carregando', 'Buscando os jogos…')}</section>
        <section class="placa crava-ranking" data-ranking-placa hidden>
          ${faixa('Tabela dos palpites')}
          ${abas('rk', [{ id: 'rodada', texto: 'Rodada' }, { id: 'tudo', texto: 'Brasileirão' }], 'rodada', 2)}
          <p class="crava-posicao" data-posicao></p>
          <div class="tabela" data-ranking>${estado('carregando', 'Buscando a tabela…')}</div>
          <p class="explica">Média dos 30 melhores de cada torcida. Na semana, vale em dobro (até 300 por rodada).</p>
        </section>
        <section class="mandar crava-compartilhar" aria-label="Mandar no grupo" hidden>
          ${faixa('Mandar no grupo')}
          <button class="botao botao-zap" type="button" data-acao="card-meus">
            Mandar meus palpites
            <small>Card com os placares que você palpitou, sem porcentagem</small>
          </button>
          <button class="botao-linha mandar-resultado" type="button" data-acao="card-resultado" hidden>
            Mandar o resultado da rodada
            <small>Seus pontos e um emoji por jogo: 🎯 ✅ 👍 ❌</small>
          </button>
        </section>
      </div>
      ${barraNavegacao('palpites')}
    </main>`;
  ligarBarraNavegacao(root);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const elLista = $('.lista-jogos');
  const elAdesivo = $('[data-adesivo]');
  const elLembrete = $('[data-lembrete]');
  const elDica = $('[data-dica]');
  const elSua = $('[data-sua-rodada]');
  const elEncerra = $('[data-encerramento]');
  const elAvisoEspecial = $('[data-aviso-especial]');
  const elRankPlaca = $('[data-ranking-placa]');
  const elShare = $('.crava-compartilhar');
  if (time && !outro) {
    root.querySelector<HTMLElement>('.palpites')!.style.cssText = `--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}`;
  }

  /** Troca o conteúdo de um bloco por um estado (vazio, erro, carregando) e liga o "Tentar de novo". */
  function mostrar(el: HTMLElement, html: string, tentar?: () => void): void {
    el.innerHTML = html;
    if (tentar) aoTocarNoEstado(el, tentar);
  }

  // ---------- narrador ----------
  function falar(evento: EventoNarrador, extra: Partial<ContextoNarrador> = {}): string | null {
    const f = escolherFrase(evento, { ...ctxBase, ...extra, usadas, recentes: lerRecentes() }, Math.random);
    if (!f) return null;
    usadas.add(f.id);
    registrarVista(f.id);
    return f.texto;
  }
  function gritar(texto: string | null): void {
    elAdesivo.textContent = texto ?? '';
    elAdesivo.hidden = !texto;
  }

  // ---------- dados da rodada ----------
  const daRodada = () => jogos.filter((j) => j.rodada === rodada);
  const travaDaRodada = () => rodadas.find((r) => r.numero === rodada)?.trava_certeza ?? null;
  const certezaTravada = () => {
    const t = travaDaRodada();
    return !t || Date.now() >= Date.parse(t);
  };
  /** Título do jogo especial da rodada aberta (null nas rodadas do Brasileirão). */
  const tituloEspecial = (r: number | null = rodada): string | null => (r === null ? null : tituloDaRodadaEspecial(jogos, r));
  /** Jogo especial não tem jogo da certeza. */
  const certezaDaRodada = () => (rodada === null || tituloEspecial() !== null ? null : (meus.certezas.get(rodada) ?? null));

  function resultadosDaRodada(): PontosDoJogo[] {
    const lista = daRodada().map((j) => ({
      id: j.id,
      confirmadoEm: j.confirmado_em,
      placar: j.gols_mandante === null || j.gols_visitante === null ? null : { m: j.gols_mandante, v: j.gols_visitante },
      anulado: j.anulado,
    }));
    return pontosDaRodada(lista, meus.palpites, certezaDaRodada());
  }

  // ---------- cartão de um jogo ----------
  function linhaTime(j: Jogo, lado: 'm' | 'v', valor: number | null, editavel: boolean): string {
    const l = ladoDoJogo(j, lado, nomeDo);
    const t = timePorId(l.id);
    const ajuste = editavel
      ? `<div class="ajuste">
          <button type="button" data-acao="menos" data-lado="${lado}" aria-label="Menos um gol ${esc(l.nome)}" ${valor === 0 ? 'disabled' : ''}>−</button>
          <output aria-live="polite">${valor}</output>
          <button type="button" data-acao="mais" data-lado="${lado}" aria-label="Mais um gol ${esc(l.nome)}" ${valor === GOLS_MAX ? 'disabled' : ''}>+</button>
        </div>`
      : `<span class="gols-final">${valor ?? ''}</span>`;
    const ind = editavel && l.id ? tabela.get(l.id) : undefined;
    const indicador = ind && ind.jogos ? `<span class="indicador">${ind.posicao}º · ${ind.pontos} pts ${formaHtml(ind.forma)}</span>` : '';
    // Time de fora: só o nome, numa faixa neutra (sem cor de clube nem escudo).
    const cor = l.fora
      ? '<span class="cor fora" aria-hidden="true"></span>'
      : `<span class="cor" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}"></span>`;
    const nome = l.fora
      ? `<span class="nome-time faixa-fora">${esc(l.nome)}</span>`
      : `<span class="nome-time">${esc(l.nome)}${time && l.id === time.id ? '<small> seu time</small>' : ''}</span>`;
    return `<div class="linha-time${indicador ? ' com-indicador' : ''}${l.fora ? ' de-fora' : ''}">
      ${cor}
      <span class="nome">${nome}${indicador}</span>
      ${ajuste}
    </div>`;
  }

  function dicasHtml(j: Jogo): string {
    const m = timePorId(j.mandante_id);
    const v = timePorId(j.visitante_id);
    if (!m || !v || !temporada.length) return '';
    const dicas = dicasDoJogo(temporada, m, v);
    return dicas.length ? `<p class="dicas">${dicas.map(esc).join('<br />')}</p>` : '';
  }

  function blocoComo(j: Jogo): string {
    const c = como.get(j.id);
    if (!c) return '';
    if (c.total === null) return '<p class="como-pouca">Pouca gente palpitou nesse.</p>';
    const linha = (rotulo: string, pct: number | null) =>
      `<div class="como-linha"><span>${esc(rotulo)}</span><span class="como-barra" style="--p:${pct ?? 0}"></span><strong>${pct ?? 0}%</strong></div>`;
    return `<div class="como">
      <p class="rotulo">Como a torcida palpitou · ${c.total} palpites</p>
      ${linha(`${ladoDoJogo(j, 'm', nomeDo).nome} vence`, c.pct_mandante)}
      ${linha('Empate', c.pct_empate)}
      ${linha(`${ladoDoJogo(j, 'v', nomeDo).nome} vence`, c.pct_visitante)}
    </div>`;
  }

  /** Cartão do jogo: uma placa (filete na cor do seu time quando ele joga). */
  function cartao(j: Jogo, resultados: PontosDoJogo[]): string {
    const agora = new Date();
    const fase = faseDoJogo(j, agora);
    const salvo = meus.palpites.get(j.id);
    const certeza = certezaDaRodada() === j.id;
    const doMeuTime = !!time && !outro && (j.mandante_id === time.id || j.visitante_id === time.id);
    const abre = (extra: string) =>
      `<article class="placa jogo-card${doMeuTime ? ' filete' : ''}${extra}" data-jogo="${j.id}">`;
    const topo = `<header class="jogo-topo">
      <span class="rotulo">${esc(horaDoJogo(j.inicio))}${adiado(j) ? ' <em class="tag-adiado">adiado</em>' : ''}</span>
      ${
        fase === 'aberto' && !ehEspecial(j) && !certezaTravada()
          ? `<button type="button" class="certeza${destacarEstrela && !certeza ? ' dica-estrela' : ''}" data-acao="certeza" aria-pressed="${certeza}">${certeza ? '★' : '☆'} Certeza ×2</button>`
          : certeza
            ? '<span class="certeza ligada">★ Certeza ×2</span>'
            : ''
      }
    </header>`;

    if (fase === 'aberto') {
      const atual = rascunho.get(j.id) ?? salvo ?? { m: 0, v: 0 };
      const pronto = iguais(atual, salvo);
      return `${abre(` aberto${certeza ? ' com-certeza' : ''}`)}
        ${topo}
        ${linhaTime(j, 'm', atual.m, true)}
        ${linhaTime(j, 'v', atual.v, true)}
        ${dicasHtml(j)}
        <div class="jogo-rodape">
          <span class="situacao">${salvo ? `Palpite: <strong>${placarTexto(salvo)}</strong>` : 'Sem palpite ainda'}</span>
          <button type="button" class="cravar${pronto ? ' feito' : ''}" data-acao="cravar" ${pronto ? 'disabled' : ''}>${pronto ? 'Palpite salvo ✓' : 'Salvar palpite'}</button>
        </div>
      </article>`;
    }

    const meuTexto = salvo
      ? `Seu palpite: <strong>${placarTexto(salvo)}</strong>${certeza ? ' ⭐' : ''}`
      : 'Sem palpite seu nesse.';
    if (fase === 'anulado') {
      return `${abre(' fechado')}${topo}
        ${linhaTime(j, 'm', null, false)}${linhaTime(j, 'v', null, false)}
        <p class="situacao">${meuTexto}</p><p class="nota">Jogo anulado: sem pontos.</p></article>`;
    }
    if (fase === 'rolando') {
      return `${abre(' fechado')}${topo}
        ${linhaTime(j, 'm', null, false)}${linhaTime(j, 'v', null, false)}
        <p class="situacao"><span class="rolando">Bola rolando</span> · ${meuTexto}</p>
        ${blocoComo(j)}</article>`;
    }
    // confirmado: pontos em número de bloco, acerto em selo
    const r = resultados.find((x) => x.jogoId === j.id);
    const ganho = r
      ? `<div class="numeros dois">
          ${numero(`+${r.torcida}`, rotuloDePontos(r.torcida, paraTime), r.torcida > 0 ? 'destaque' : 'apagado')}
          ${numero(salvo ? placarTexto(salvo) : '–', 'Seu palpite', 'apagado')}
        </div>
        <div class="selos">${r.acerto ? selo(`${EMOJI_ACERTO[r.acerto]} ${esc(NOME_DO_ACERTO[r.acerto])}`) : ''}${r.certeza ? selo('★ Certeza ×2') : ''}</div>`
      : `<p class="situacao">${meuTexto}</p>`;
    const frase = salvo && r ? fraseDoResultado(j, salvo, r) : null;
    return `${abre(' fechado confirmado')}${topo}
      ${linhaTime(j, 'm', j.gols_mandante, false)}${linhaTime(j, 'v', j.gols_visitante, false)}
      ${ganho}
      ${frase ? `<p class="frase-jogo">${esc(frase)}</p>` : ''}
      ${blocoComo(j)}</article>`;
  }

  function fraseDoResultado(j: Jogo, palpite: Placar, r: PontosDoJogo): string | null {
    const ja = fraseDoJogo.get(j.id);
    if (ja) return ja;
    if (!r.acerto) return null;
    const etiquetas = new Set<Etiqueta>();
    if (j.gols_mandante === j.gols_visitante) etiquetas.add('empate');
    if (palpiteContraNoJogo(palpite, j, time?.id)) etiquetas.add('contra');
    const evento: EventoNarrador = r.certeza
      ? r.acerto === 'errou'
        ? 'crava_certeza_errou'
        : 'crava_certeza_acertou'
      : (`crava_${r.acerto}` as EventoNarrador);
    const texto = falar(evento, { placar: placarTexto(palpite), etiquetas });
    if (texto) fraseDoJogo.set(j.id, texto);
    return texto;
  }

  // ---------- desenho ----------
  function desenharCartao(id: string): void {
    const j = jogos.find((x) => x.id === id);
    const el = elLista.querySelector(`[data-jogo="${id}"]`);
    if (j && el) el.outerHTML = cartao(j, resultadosDaRodada());
    desenharCompartilhar();
  }

  function desenhar(): void {
    const nums = rodadasNoTempo(jogos);
    const seletor = $('.seletor-rodada');
    desenharEncerramento();
    if (rodada === null || !nums.length) {
      elAvisoEspecial.hidden = true;
      seletor.hidden = true;
      mostrar(elLista, estado('vazio', 'Os jogos da rodada ainda não chegaram.', { detalhe: 'Volta daqui a pouco!' }));
      elSua.hidden = true;
      elRankPlaca.hidden = true;
      elShare.hidden = true;
      return;
    }
    seletor.hidden = false;
    const especial = tituloEspecial() !== null;
    elAvisoEspecial.hidden = !especial;
    $('[data-rodada]').textContent = nomeDaRodada(jogos, rodada);
    if (rodada !== rodadaDaPosicao) {
      posRodada = undefined;
      rodadaDaPosicao = rodada;
    }
    const posicaoNaLista = nums.indexOf(rodada);
    $<HTMLButtonElement>('[data-acao="rodada-ant"]').disabled = posicaoNaLista <= 0;
    $<HTMLButtonElement>('[data-acao="rodada-prox"]').disabled = posicaoNaLista >= nums.length - 1;

    const lista = daRodada();
    const resultados = resultadosDaRodada();
    elLista.innerHTML = lista.map((j) => cartao(j, resultados)).join('');

    // Grito do topo: fim da rodada > bola rolando > abertura.
    const palpitados = lista.filter((j) => meus.palpites.has(j.id));
    const agora = new Date();
    const todosFechados = palpitados.length > 0 && palpitados.every((j) => j.confirmado_em || j.anulado);
    const situacao = todosFechados
      ? 'fim'
      : lista.some((j) => faseDoJogo(j, agora) === 'rolando' && meus.palpites.has(j.id))
        ? 'rolando'
        : 'aberta';
    const chave = `${rodada}:${situacao}`;
    if (chave === topoVisto) {
      // mantém o grito atual (inclusive o "Cravado!" depois de um palpite)
    } else if (todosFechados) {
      const pontos = resultados.reduce((s, r) => s + r.torcida, 0);
      gritar(
        // Jogo especial: sem {rodada} (as frases com o número da rodada são puladas).
        falar('crava_rodada_fim', {
          rodada: especial ? undefined : ordinalRodada(rodada),
          acertos: resultados.filter((r) => r.acerto && r.acerto !== 'errou').length,
          jogos: palpitados.length,
          pontos,
        }),
      );
    } else if (situacao === 'rolando') {
      gritar(falar('crava_fechou'));
    } else {
      gritar(falar('crava_abertura', { rodada: especial ? undefined : ordinalRodada(rodada) }));
    }
    topoVisto = chave;
    dicaDaRodada(lista, todosFechados, agora, especial);

    const trava = travaDaRodada();
    const falta = trava ? Date.parse(trava) - agora.getTime() : 0;
    // Lembrete só nas últimas 24 h antes do 1º jogo ("Rodada começando…" não serve 4 dias antes).
    // O lembrete do narrador fala do jogo da certeza: no jogo especial, quem avisa é a linha "fecha em" da Home.
    const lembrar = !especial && falta > 0 && falta <= 24 * 3600_000;
    const chaveLembrete = lembrar ? `${rodada}:${tempoAte(falta)}` : '';
    if (chaveLembrete !== lembreteVisto) {
      const lembrete = lembrar ? falar('crava_lembrete', { horas: tempoAte(falta) }) : null;
      elLembrete.textContent = lembrete ?? '';
      elLembrete.hidden = !lembrete;
      lembreteVisto = chaveLembrete;
    }

    desenharSuaRodada();
    desenharCompartilhar();
    void carregarComo();
    void carregarRanking();
  }

  /** Uma dica por vez na faixa: rodada fechada, bola rolando, certeza travada ou a estrela (antes do 1º jogo). */
  function dicaDaRodada(lista: Jogo[], todosFechados: boolean, agora: Date, especial: boolean): void {
    const fases = lista.map((j) => faseDoJogo(j, agora));
    const aberto = fases.includes('aberto');
    const travada = !especial && certezaTravada() && !!travaDaRodada();
    dicas.novoLance();
    const texto = primeiraDica(dicas, [
      [todosFechados && !vistas.fechada, 'crava_rodada_fechada'],
      [fases.includes('rolando') && !vistas.rolando, 'crava_rolando'],
      [travada && aberto && !vistas.travada, 'crava_certeza_travada'],
      [!especial && !certezaTravada() && aberto && certezaDaRodada() === null && !vistas.estrela, 'crava_estrela'],
    ]);
    if (!mostrarDica(elDica, texto)) return;
    if (texto === DICAS.crava_rodada_fechada) vistas.fechada = true;
    else if (texto === DICAS.crava_rolando) vistas.rolando = true;
    else if (texto === DICAS.crava_certeza_travada) vistas.travada = true;
    else {
      vistas.estrela = true;
      destacarEstrela = true;
      for (const j of lista) if (faseDoJogo(j, agora) === 'aberto') desenharCartao(j.id);
    }
  }

  function desenharCompartilhar(): void {
    const lista = daRodada();
    const temPalpite = lista.some((j) => meus.palpites.has(j.id));
    elShare.hidden = !temPalpite;
    const temResultado = resultadosDaRodada().some((r) => r.acerto !== null);
    const btnResultado = $('[data-acao="card-resultado"]');
    const btnMeus = $('[data-acao="card-meus"]');
    btnResultado.hidden = !temResultado;
    // Um verde só: com resultado, o que importa é mandar os pontos; os palpites viram o botão de contorno.
    btnResultado.className = temResultado ? 'botao botao-zap' : 'botao-linha mandar-resultado';
    btnMeus.className = temResultado ? 'botao-linha mandar-resultado' : 'botao botao-zap';
    if (temResultado) btnResultado.parentElement!.insertBefore(btnResultado, btnMeus);
    else btnMeus.parentElement!.insertBefore(btnMeus, btnResultado);
  }

  /** Placa "Sua rodada": pontos, acertos e posição como números; recorde em selo. Só depois do 1º resultado. */
  function desenharSuaRodada(): void {
    const resultados = resultadosDaRodada();
    const { acertos, jogos: comResultado } = acertosDaRodada(resultados);
    if (rodada === null || !comResultado) {
      elSua.hidden = true;
      return;
    }
    const pontos = resultados.reduce((s, x) => s + x.torcida, 0);
    // Recorde por rodada é do Brasileirão: o jogo especial não entra nele.
    const especial = tituloEspecial() !== null;
    const rec = recordeCrava(pontosPorRodada(), rodada);
    const textoRec = especial ? '' : linhaRecorde(rec.recorde);
    const selos = especial ? '' : rec.novo
      ? selo(`${icone('estrela')} Novo recorde!`, 'ouro') + (textoRec ? selo(`${esc(textoRec)} numa rodada`) : '')
      : textoRec
        ? selo(`${esc(textoRec)} numa rodada`)
        : '';
    elSua.hidden = false;
    elSua.innerHTML = `${faixa(especial ? (tituloEspecial() ?? '') : `Sua ${ordinalRodada(rodada)} rodada`)}
      <div class="numeros tres">
        ${numero(`${pontos}`, rotuloDePontos(pontos, paraTime), 'destaque')}
        ${numero(`${acertos}<small>de ${comResultado}</small>`, 'Acertos')}
        ${posRodada ? numero(posicaoHtml(posRodada.posicao), 'Na rodada') : numero('–', 'Na rodada', 'apagado')}
      </div>
      ${selos ? `<div class="selos">${selos}</div>` : ''}`;
  }

  // ---------- como a torcida cravou (só depois do início) ----------
  async function carregarComo(): Promise<void> {
    const r = rodada;
    if (r === null || !daRodada().some((j) => faseDoJogo(j, new Date()) !== 'aberto')) return;
    try {
      const linhas = await api.comoCravaram(r);
      if (saiu || r !== rodada) return;
      for (const l of linhas) como.set(l.jogo_id, l);
      for (const l of linhas) desenharCartao(l.jogo_id);
    } catch {
      // sem conexão: fica sem a porcentagem
    }
  }

  /** Pontos que já foram pra torcida, somados por rodada (para o recorde pessoal). */
  function pontosPorRodada(): Map<number, number> {
    const porRodada = new Map<number, number>();
    for (const j of jogos) {
      if (ehEspecial(j)) continue;
      const p = meus.pontos.get(j.id);
      if (p !== undefined) porRodada.set(j.rodada, (porRodada.get(j.rodada) ?? 0) + p);
    }
    return porRodada;
  }

  // ---------- ranking das torcidas no palpite e a própria posição ----------
  async function carregarRanking(): Promise<void> {
    const r = rodada;
    if (r === null) return;
    elRankPlaca.hidden = false;
    const alvo = rankingDe === 'rodada' ? r : null;
    const elRk = $('[data-ranking]');
    const elPos = $('[data-posicao]');
    try {
      // A posição da rodada também alimenta a placa "Sua rodada"; a do Brasileirão só aparece aqui embaixo.
      const [linhas, posR, posT] = await Promise.all([
        api.rankingCrava(alvo),
        api.minhaPosicaoCrava(r).catch(() => null),
        alvo === null ? api.minhaPosicaoCrava(null).catch(() => null) : Promise.resolve(null),
      ]);
      if (saiu || r !== rodada) return;
      posRodada = posR;
      desenharSuaRodada();
      const pos = alvo === null ? posT : posR;
      const onde = rankingDe === 'rodada' ? 'na rodada' : 'no Brasileirão';
      elPos.textContent = pos
        ? `Sua posição: ${pos.posicao}º de ${pos.total} ${onde}.`
        : 'Sua posição aparece quando sair o primeiro resultado que você palpitou.';
      if (!linhas.some((l) => l.palpiteiros > 0)) {
        mostrar(elRk, estado('vazio', 'Sai quando o primeiro placar for confirmado.'));
        return;
      }
      elRk.innerHTML = linhas
        .sort((a, b) => a.posicao - b.posicao)
        .map((l) => {
          const t = timePorId(l.time_id);
          const classes = ['mini-linha'];
          if (l.posicao === 1 && l.palpiteiros > 0) classes.push('lider');
          if (time && l.time_id === time.id) classes.push('meu');
          return `<div class="${classes.join(' ')}">
            <span class="pos">${l.posicao}º</span><span class="seta" aria-hidden="true"></span>
            <span class="cor" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}"></span>
            <span class="nome">${esc(t?.nome ?? l.time_id)} <small>${l.palpiteiros}</small></span>
            <span class="valor">${Math.round(l.media30).toLocaleString('pt-BR')}</span>
          </div>`;
        })
        .join('');
    } catch {
      if (!saiu) {
        elPos.textContent = '';
        mostrar(elRk, estado('erro', 'Sem conexão com o placar agora.'), () => void carregarRanking());
      }
    }
  }

  // ---------- tabela do campeonato ----------
  function desenharTabela(): void {
    const el = $('[data-tabela]');
    const linhas = [...tabela.values()].sort((a, b) => a.posicao - b.posicao);
    if (!linhas.some((l) => l.jogos > 0)) {
      mostrar(el, estado('vazio', 'A tabela aparece depois da próxima atualização dos resultados.'));
      return;
    }
    const ultimaRodada = Math.max(...temporada.map((r) => r.rodada));
    el.innerHTML = `
      <div class="tabela tabela-brasileirao" role="table" aria-label="Classificação do Brasileirão">
        <div class="tb-linha tb-cabeca" role="row">
          <span role="columnheader">#</span><span></span><span role="columnheader">Time</span>
          <span role="columnheader" title="Pontos">P</span><span role="columnheader" title="Jogos">J</span>
          <span role="columnheader" title="Saldo de gols">SG</span><span role="columnheader">Últimos 5</span>
        </div>
        ${linhas
          .map((l) => {
            const t = timePorId(l.timeId);
            const classes = ['tb-linha'];
            if (l.posicao > linhas.length - ZONA_REBAIXAMENTO) classes.push('z4');
            if (time && l.timeId === time.id) classes.push('meu');
            return `<div class="${classes.join(' ')}" role="row">
              <span class="pos">${l.posicao}</span>
              <span class="cor" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}"></span>
              <span class="nome">${esc(t?.nome ?? l.timeId)}</span>
              <strong>${l.pontos}</strong><span>${l.jogos}</span>
              <span>${l.saldo > 0 ? '+' : ''}${l.saldo}</span>
              ${formaHtml(l.forma)}
            </div>`;
          })
          .join('')}
      </div>
      <p class="explica">Até a ${ultimaRodada}ª rodada, pelos placares da API (pode atrasar uns minutos depois do apito).
      Desempate: pontos, vitórias, saldo e gols marcados. Em vermelho, a zona de rebaixamento.
      Últimos 5: V vitória, E empate, D derrota, do mais antigo ao mais recente.</p>`;
  }

  root.querySelectorAll<HTMLButtonElement>('[data-visao]').forEach((b) =>
    b.addEventListener('click', () => {
      visao = b.dataset.visao === 'tabela' ? 'tabela' : 'palpites';
      marcarAba(root, 'visao', visao);
      $('[data-visao-palpites]').hidden = visao !== 'palpites';
      $('[data-tabela]').hidden = visao !== 'tabela';
      if (visao === 'tabela') desenharTabela();
    }),
  );

  // ---------- ações ----------
  async function salvar(j: Jogo, botao: HTMLButtonElement): Promise<void> {
    if (!time) {
      irPara({ tela: 'times', depois: 'palpites' });
      return;
    }
    const placar = rascunho.get(j.id) ?? meus.palpites.get(j.id) ?? { m: 0, v: 0 };
    botao.disabled = true;
    botao.textContent = 'Salvando…';
    try {
      await api.sincronizarTorcedor();
      await api.cravar(j.id, placar);
      meus.palpites.set(j.id, placar);
      rascunho.delete(j.id);
      const contra = palpiteContraNoJogo(placar, j, time.id);
      gritar(falar(contra ? 'crava_contra_time' : 'crava_salvo'));
      dicas.novoLance();
      if (!vistas.mudar) vistas.mudar = mostrarDica(elDica, dicas.pedir('crava_mudar'));
    } catch (e) {
      const fechado = e instanceof ErroServidor && e.codigo === 'fechado';
      gritar(fechado ? 'Esse jogo já começou: palpite trancado.' : 'Sem conexão agora. Tenta de novo em instantes.');
      if (fechado) void recarregar();
    }
    desenharCartao(j.id);
  }

  async function alternarCerteza(j: Jogo): Promise<void> {
    if (rodada === null) return;
    if (!time) {
      irPara({ tela: 'times', depois: 'palpites' });
      return;
    }
    const ligar = certezaDaRodada() !== j.id;
    const antes = certezaDaRodada();
    try {
      await api.sincronizarTorcedor();
      await api.marcarCerteza(rodada, ligar ? j.id : null);
      if (ligar) meus.certezas.set(rodada, j.id);
      else meus.certezas.delete(rodada);
      if (ligar) gritar(falar('crava_certeza'));
      destacarEstrela = false;
    } catch (e) {
      const fechado = e instanceof ErroServidor && e.codigo === 'fechado';
      gritar(fechado ? 'O jogo da certeza já travou nesta rodada.' : 'Sem conexão agora. Tenta de novo em instantes.');
      if (fechado && !vistas.travada) {
        dicas.novoLance();
        vistas.travada = mostrarDica(elDica, dicas.pedir('crava_certeza_travada'));
      }
    }
    if (antes) desenharCartao(antes);
    desenharCartao(j.id);
  }

  elLista.addEventListener('click', (ev) => {
    const botao = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-acao]');
    const id = botao?.closest<HTMLElement>('[data-jogo]')?.dataset.jogo;
    const j = id ? jogos.find((x) => x.id === id) : undefined;
    if (!botao || !j || botao.disabled) return;
    const acao = botao.dataset.acao;
    if (acao === 'mais' || acao === 'menos') {
      const atual = { ...(rascunho.get(j.id) ?? meus.palpites.get(j.id) ?? { m: 0, v: 0 }) };
      const lado = botao.dataset.lado as 'm' | 'v';
      atual[lado] = Math.min(GOLS_MAX, Math.max(0, atual[lado] + (acao === 'mais' ? 1 : -1)));
      rascunho.set(j.id, atual);
      desenharCartao(j.id);
    } else if (acao === 'cravar') {
      void salvar(j, botao);
    } else if (acao === 'certeza') {
      void alternarCerteza(j);
    }
  });

  root.querySelector('[data-acao="rodada-ant"]')!.addEventListener('click', () => trocarRodada(-1));
  root.querySelector('[data-acao="rodada-prox"]')!.addEventListener('click', () => trocarRodada(1));
  function trocarRodada(passo: number): void {
    const nums = rodadasNoTempo(jogos);
    const i = nums.indexOf(rodada ?? nums[0]) + passo;
    if (i < 0 || i >= nums.length) return;
    rodada = nums[i];
    desenhar();
  }

  root.querySelectorAll<HTMLButtonElement>('[data-rk]').forEach((b) =>
    b.addEventListener('click', () => {
      rankingDe = b.dataset.rk === 'tudo' ? 'tudo' : 'rodada';
      marcarAba(root, 'rk', rankingDe);
      void carregarRanking();
    }),
  );

  // ---------- cards ----------
  // Os dois botões abrem a tela "Seu card" (jogo.md 14.6); o aviso fixo do Crava sai sempre.
  const timeDoCard = (): Time => time ?? timePorId(ID_OUTRO)!;
  const link = () => (time && !outro ? `${LINK}?time=${time.id}` : LINK);
  const semHttps = (l: string) => l.replace('https://', '');

  $('[data-acao="card-meus"]').addEventListener('click', () => {
    if (rodada === null) return;
    const rodadaDoCard = rodada;
    const titulo = tituloEspecial(rodadaDoCard);
    const nomeDaRodadaNoCard = titulo ?? `${ordinalRodada(rodadaDoCard)} rodada`;
    const certeza = certezaDaRodada();
    const linhas = daRodada()
      .filter((j) => meus.palpites.has(j.id))
      .map((j) => ({
        mandante: ladoDoJogo(j, 'm', nomeDo).nome,
        visitante: ladoDoJogo(j, 'v', nomeDo).nome,
        placar: meus.palpites.get(j.id)!,
        certeza: j.id === certeza,
      }));
    if (!linhas.length) return;
    const meusPalpites = (apelido?: string) => `${apelido ? `${apelido} · meus palpites` : 'Meus palpites'}${paraTime ? ` ${paraTime}` : ''}`;
    abrirCardPersonalizado({
      raiz: root,
      dados: (async (): Promise<DadosDoCard> => ({
        tipo: 'jogo',
        time: timeDoCard(),
        jogo: `Palpite da Rodada · ${titulo ?? ordinalRodada(rodadaDoCard)}`,
        destaque: `${linhas.length} ${linhas.length === 1 ? 'PALPITE' : 'PALPITES'}`,
        quem: { comApelido: meusPalpites(apelidoDoCard()), semApelido: meusPalpites() },
        lance: nomeDaRodadaNoCard,
        placarEmoji: '',
        frase: '',
        novoRecorde: false,
        link: semHttps(link()),
        avisoFixo: AVISO_RESENHA,
        nivel: await nivelParaCard(),
        conteudo: { jogo: 'crava-meus', rodada: rodadaDoCard, linhas },
      }))(),
      texto: textoMeusPalpites(titulo ?? rodadaDoCard, linhas, link()),
      link: link(),
      quemComApelido: meusPalpites,
    });
  });

  $('[data-acao="card-resultado"]').addEventListener('click', () => {
    if (rodada === null) return;
    const rodadaDoCard = rodada;
    const titulo = tituloEspecial(rodadaDoCard);
    const ordem = new Map(daRodada().map((j, i) => [j.id, i]));
    const resultados = resultadosDaRodada().sort((a, b) => ordem.get(a.jogoId)! - ordem.get(b.jogoId)!);
    const pontos = resultados.reduce((s, r) => s + r.torcida, 0);
    const novoRecorde = titulo === null && recordeCrava(pontosPorRodada(), rodadaDoCard).novo;
    const apelido = apelidoDoCard();
    abrirCardPersonalizado({
      raiz: root,
      dados: (async (): Promise<DadosDoCard> => ({
        tipo: 'jogo',
        time: timeDoCard(),
        jogo: `Palpite da Rodada · ${titulo ?? ordinalRodada(rodadaDoCard)}`,
        destaque: `+${pontos}`,
        quem: { comApelido: linhaDoTorcedor(apelido, pontos, paraTime), semApelido: linhaDoTorcedor(undefined, pontos, paraTime) },
        lance: titulo ?? `${ordinalRodada(rodadaDoCard)} rodada`,
        placarEmoji: linhaEmoji(resultados),
        frase: elAdesivo.hidden ? '' : (elAdesivo.textContent ?? ''),
        novoRecorde,
        link: semHttps(link()),
        avisoFixo: AVISO_RESENHA,
        nivel: await nivelParaCard(),
        conteudo: { jogo: 'crava-resultado', rodada: rodadaDoCard, resultados },
      }))(),
      texto: textoResultadoRodada(titulo ?? rodadaDoCard, pontos, paraTime, resultados, link()),
      link: link(),
      // O mesmo evento do narrador que a tela usa para o grito do fim da rodada.
      sortearFrase: () =>
        falar('crava_rodada_fim', {
          rodada: titulo === null ? ordinalRodada(rodadaDoCard) : undefined,
          acertos: resultados.filter((r) => r.acerto && r.acerto !== 'errou').length,
          jogos: resultados.length,
          pontos,
        }),
      quemComApelido: (a) => linhaDoTorcedor(a, pontos, paraTime),
    });
  });

  // ---------- encerramento do Brasileirão ----------
  // Posição e ranking só são lidos quando o encerramento vale (a aba não pesa no resto do ano).
  let fim: { pos: MinhaPosicao | null; lider: string | null } | undefined;
  let fimPedido = false;
  let fimDesenhado = '';

  async function carregarEncerramento(): Promise<void> {
    const [pos, ranking] = await Promise.all([api.minhaPosicaoCrava(null).catch(() => null), api.rankingCrava(null).catch(() => [])]);
    if (saiu) return;
    const lider = torcidaQueMaisPontuou(ranking);
    fim = { pos, lider: lider ? nomeDo(lider) : null };
    desenharEncerramento();
  }

  function desenharEncerramento(): void {
    const agora = new Date();
    if (!brasileiraoEncerrado(jogos, agora)) {
      elEncerra.hidden = true;
      return;
    }
    if (!fimPedido) {
      fimPedido = true;
      void carregarEncerramento();
    }
    const html = `${faixa('Brasileirão encerrado')}
      ${fim?.pos ? `<p class="encerra-pos">${esc(linhaPosicaoFinal(fim.pos))}</p>` : ''}
      ${fim?.lider ? `<p>Torcida que mais pontuou: <strong>${esc(fim.lider)}</strong></p>` : ''}
      <p class="encerra-proximo">${esc(linhaDoProximoEspecial(jogos, agora))}</p>
      ${fim?.pos ? '<button class="botao-linha" type="button" data-acao="card-brasileirao">Ver meu card</button>' : ''}`;
    elEncerra.hidden = false;
    if (html !== fimDesenhado) {
      elEncerra.innerHTML = html;
      fimDesenhado = html;
    }
  }

  elEncerra.addEventListener('click', (ev) => {
    if (!(ev.target as HTMLElement).closest('[data-acao="card-brasileirao"]')) return;
    const resumo = resumoDoBrasileirao(jogos, meus.palpites, meus.certezas, fim?.pos ?? null);
    if (!resumo) return;
    const apelido = apelidoDoCard();
    abrirCardPersonalizado({
      raiz: root,
      dados: (async (): Promise<DadosDoCard> => ({
        tipo: 'jogo',
        time: timeDoCard(),
        jogo: 'Palpite da Rodada · Brasileirão',
        destaque: `+${resumo.pontos}`,
        quem: { comApelido: linhaDoTorcedor(apelido, resumo.pontos, paraTime), semApelido: linhaDoTorcedor(undefined, resumo.pontos, paraTime) },
        lance: 'Brasileirão encerrado',
        placarEmoji: linhaAcertosDoBrasileirao(resumo),
        frase: '',
        novoRecorde: false,
        link: semHttps(link()),
        avisoFixo: AVISO_RESENHA,
        nivel: await nivelParaCard(),
        conteudo: { jogo: 'crava-brasileirao', resumo },
      }))(),
      texto: textoResultadoBrasileirao(resumo, paraTime, link()),
      link: link(),
      quemComApelido: (a) => linhaDoTorcedor(a, resumo.pontos, paraTime),
    });
  });

  $('[data-acao="como-cravar"]').addEventListener('click', () => abrirRegras(root, 'crava'));

  // ---------- carga ----------
  async function recarregar(): Promise<void> {
    if (FALSA) api = await import('../dev/cravaFalsa');
    try {
      const [j, r] = await Promise.all([api.jogosDoCrava(), api.rodadasDoCrava()]);
      jogos = j;
      rodadas = r;
      try {
        meus = await api.meusDadosDoCrava();
      } catch {
        // sem sessão ainda: mostra os jogos mesmo assim
      }
      if (saiu) return;
      if (rodada === null || !jogos.some((x) => x.rodada === rodada)) rodada = rodadaEmFoco(jogos, new Date());
      desenhar();
      void carregarTemporada();
    } catch {
      if (!saiu) mostrar(elLista, estado('erro', 'Sem conexão com o placar agora.', { detalhe: 'Tenta de novo daqui a pouco.' }), () => void recarregar());
    }
  }
  void recarregar();

  async function carregarTemporada(): Promise<void> {
    try {
      temporada = await api.resultadosDaTemporada();
    } catch {
      return; // sem os dados de apoio, a aba funciona igual
    }
    if (saiu) return;
    tabela = new Map(classificacao(temporada, OFICIAIS).map((l) => [l.timeId, l]));
    // Só os cartões abertos mostram os indicadores: redesenha sem mexer no grito do topo.
    for (const j of daRodada()) if (faseDoJogo(j, new Date()) === 'aberto') desenharCartao(j.id);
    // 1ª vez com V/E/D na tela, se a faixa estiver livre (nenhuma outra dica no ar).
    if (!vistas.ved && elDica.hidden && elLista.querySelector('.forma')) {
      dicas.novoLance();
      vistas.ved = mostrarDica(elDica, dicas.pedir('crava_ved'));
    }
    if (visao === 'tabela') desenharTabela();
  }

  // Jogo que começa com a tela aberta tranca na hora (o servidor já recusa; a tela acompanha).
  let fasesVistas = '';
  const relogio = window.setInterval(() => {
    const agora = new Date();
    const fases = daRodada().map((j) => faseDoJogo(j, agora)).join();
    if (fasesVistas && fases !== fasesVistas) desenhar();
    else if (jogos.length) desenharEncerramento();
    fasesVistas = fases;
  }, 15_000);

  return () => {
    saiu = true;
    clearInterval(relogio);
  };
}
