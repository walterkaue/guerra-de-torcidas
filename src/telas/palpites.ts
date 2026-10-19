// Aba Palpites: Crava a Rodada (docs/jogo.md, seção 7; docs/visual.md, "Crava a Rodada").
// Aviso fixo no topo, um cartão por jogo com − e +, jogo da certeza, como a torcida cravou depois
// do início, pontos depois da confirmação, ranking das torcidas no palpite e os dois cards.
// Quem decide se o palpite ainda vale é o servidor (RLS pela hora dele); a tela só acompanha.

import { esc, irPara, type Rota } from '../app';
import { ID_OUTRO, corDeTexto, proTime, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import { desenharCardCrava, type DadosCardCrava } from '../jogo/cardCrava';
import {
  GOLS_MAX,
  linhaEmoji,
  ordinalRodada,
  palpiteContra,
  pontosDaRodada,
  type Placar,
  type PontosDoJogo,
} from '../jogo/crava';
import { AVISO_RESENHA, adiado, faseDoJogo, horaDoJogo, rodadaEmFoco, tempoAte, textoMeusPalpites, textoResultadoRodada } from '../jogo/cravaTela';
import { escolherFrase, type ContextoNarrador, type Etiqueta } from '../narrador/escolher';
import type { EventoNarrador } from '../narrador/frases';
import { lerRecentes, registrarVista } from '../narrador/historico';
import { contextoDoTime } from '../narrador/sessao';
import { ErroServidor } from '../servidor/api';
import {
  comoCravaram,
  cravar,
  jogosDoCrava,
  marcarCerteza,
  meusDadosDoCrava,
  minhaPosicaoCrava,
  rankingCrava,
  rodadasDoCrava,
  valendoDesdeRodada,
  type ComoCravaram,
  type Jogo,
  type MeusDados,
  type Rodada,
} from '../servidor/crava';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';

const LINK = 'https://torcida.kauewalter.com.br/';
const nomeDo = (id: string) => timePorId(id)?.nome ?? id;
const iguais = (a?: Placar, b?: Placar) => !!a && !!b && a.m === b.m && a.v === b.v;
const placarTexto = (p: Placar) => `${p.m} x ${p.v}`;

export function telaPalpites(root: HTMLElement, _rota: Rota): () => void {
  const time = timePorId(prefs.get().time);
  const outro = !time || time.id === ID_OUTRO;
  const paraTime = time && !outro ? proTime(time) : null;
  const ctxBase: ContextoNarrador = time ? contextoDoTime(time) : {};
  const usadas = new Set<string>();

  let jogos: Jogo[] = [];
  let rodadas: Rodada[] = [];
  let meus: MeusDados = { palpites: new Map(), certezas: new Map(), pontos: new Map() };
  let valendoDesde = 99;
  let rodada: number | null = null;
  let rankingDe: 'rodada' | 'tudo' = 'rodada';
  const rascunho = new Map<string, Placar>();
  const como = new Map<string, ComoCravaram>();
  const fraseDoJogo = new Map<string, string>();
  let saiu = false;
  /** Situação do grito do topo e do lembrete já narrados (não troca a frase a cada redesenho). */
  let topoVisto = '';
  let lembreteVisto = '';

  root.innerHTML = `
    <main class="tela palpites">
      <p class="aviso-resenha" role="note">${esc(AVISO_RESENHA)}</p>
      <header class="cabecalho"><h2 class="titulo-placar">Crava a Rodada</h2></header>
      <p class="faixa-ensaio" data-ensaio hidden><strong>Modo ensaio:</strong> os palpites valem pra resenha e pro ranking do Crava, mas ainda não somam no ranking da semana.</p>
      <nav class="seletor-rodada" aria-label="Rodada" hidden>
        <button type="button" class="voltar" data-acao="rodada-ant" aria-label="Rodada anterior">‹</button>
        <strong class="rotulo" data-rodada></strong>
        <button type="button" class="voltar" data-acao="rodada-prox" aria-label="Próxima rodada">›</button>
      </nav>
      <p class="adesivo" data-adesivo hidden></p>
      <p class="nota" data-lembrete hidden></p>
      <section class="lista-jogos" aria-live="polite"><p class="vazio">Carregando os jogos…</p></section>
      <section class="crava-resumo" hidden>
        <p class="crava-meus-pontos" data-meus-pontos></p>
        <p class="crava-posicao" data-posicao></p>
        <p class="rotulo">Torcidas no palpite</p>
        <div class="abas" role="tablist">
          <button role="tab" class="rotulo" aria-selected="true" data-acao="rk-rodada">Rodada</button>
          <button role="tab" class="rotulo" aria-selected="false" data-acao="rk-tudo">Brasileirão</button>
        </div>
        <div class="tabela" data-ranking><p class="vazio">Carregando…</p></div>
        <p class="explica">Média dos 30 melhores palpiteiros de cada torcida. Torcida com menos de 30 completa as vagas com 80% da média geral. Os pontos já vêm com o peso ×2 e o teto de 300 por rodada.</p>
      </section>
      <section class="crava-compartilhar" hidden>
        <button class="botao botao-zap" type="button" data-acao="card-meus">Mandar meus palpites</button>
        <button class="botao botao-sec" type="button" data-acao="card-resultado" hidden>Mandar o resultado da rodada</button>
      </section>
      ${barraNavegacao('palpites')}
    </main>`;
  ligarBarraNavegacao(root);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const elLista = $('.lista-jogos');
  const elAdesivo = $('[data-adesivo]');
  const elLembrete = $('[data-lembrete]');
  const elResumo = $('.crava-resumo');
  const elShare = $('.crava-compartilhar');
  if (time && !outro) {
    root.querySelector<HTMLElement>('.palpites')!.style.cssText = `--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}`;
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
  const certezaDaRodada = () => (rodada === null ? null : (meus.certezas.get(rodada) ?? null));

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
  function linhaTime(id: string, lado: 'm' | 'v', valor: number | null, editavel: boolean): string {
    const t = timePorId(id);
    const ajuste = editavel
      ? `<div class="ajuste">
          <button type="button" data-acao="menos" data-lado="${lado}" aria-label="Menos um gol ${esc(nomeDo(id))}" ${valor === 0 ? 'disabled' : ''}>−</button>
          <output aria-live="polite">${valor}</output>
          <button type="button" data-acao="mais" data-lado="${lado}" aria-label="Mais um gol ${esc(nomeDo(id))}" ${valor === GOLS_MAX ? 'disabled' : ''}>+</button>
        </div>`
      : `<span class="gols-final">${valor ?? ''}</span>`;
    return `<div class="linha-time">
      <span class="cor" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}"></span>
      <span class="nome">${esc(nomeDo(id))}${time && id === time.id ? '<small> seu time</small>' : ''}</span>
      ${ajuste}
    </div>`;
  }

  function blocoComo(j: Jogo): string {
    const c = como.get(j.id);
    if (!c) return '';
    if (c.total === null) return '<p class="como-pouca">Pouca gente cravou esse.</p>';
    const linha = (rotulo: string, pct: number | null) =>
      `<div class="como-linha"><span>${esc(rotulo)}</span><span class="como-barra" style="--p:${pct ?? 0}"></span><strong>${pct ?? 0}%</strong></div>`;
    return `<div class="como">
      <p class="rotulo">Como a torcida cravou · ${c.total} palpites</p>
      ${linha(`${nomeDo(j.mandante_id)} vence`, c.pct_mandante)}
      ${linha('Empate', c.pct_empate)}
      ${linha(`${nomeDo(j.visitante_id)} vence`, c.pct_visitante)}
    </div>`;
  }

  function cartao(j: Jogo, resultados: PontosDoJogo[]): string {
    const agora = new Date();
    const fase = faseDoJogo(j, agora);
    const salvo = meus.palpites.get(j.id);
    const certeza = certezaDaRodada() === j.id;
    const topo = `<header class="jogo-topo">
      <span class="rotulo">${esc(horaDoJogo(j.inicio))}${adiado(j) ? ' <em class="tag-adiado">adiado</em>' : ''}</span>
      ${
        fase === 'aberto' && !certezaTravada()
          ? `<button type="button" class="certeza" data-acao="certeza" aria-pressed="${certeza}">${certeza ? '★' : '☆'} Certeza</button>`
          : certeza
            ? '<span class="certeza ligada">★ Certeza</span>'
            : ''
      }
    </header>`;

    if (fase === 'aberto') {
      const atual = rascunho.get(j.id) ?? salvo ?? { m: 0, v: 0 };
      const pronto = iguais(atual, salvo);
      return `<article class="jogo-card aberto${certeza ? ' com-certeza' : ''}" data-jogo="${j.id}">
        ${topo}
        ${linhaTime(j.mandante_id, 'm', atual.m, true)}
        ${linhaTime(j.visitante_id, 'v', atual.v, true)}
        <div class="jogo-rodape">
          <span class="estado">${salvo ? `Cravado: <strong>${placarTexto(salvo)}</strong>` : 'Ainda não cravado'}</span>
          <button type="button" class="botao cravar" data-acao="cravar" ${pronto ? 'disabled' : ''}>${pronto ? 'Cravado ✓' : 'Cravar'}</button>
        </div>
      </article>`;
    }

    const meuTexto = salvo
      ? `Seu palpite: <strong>${placarTexto(salvo)}</strong>${certeza ? ' ⭐' : ''}`
      : 'Você não cravou esse.';
    if (fase === 'anulado') {
      return `<article class="jogo-card fechado" data-jogo="${j.id}">${topo}
        ${linhaTime(j.mandante_id, 'm', null, false)}${linhaTime(j.visitante_id, 'v', null, false)}
        <p class="estado">${meuTexto}</p><p class="nota">Jogo anulado: sem pontos.</p></article>`;
    }
    if (fase === 'rolando') {
      return `<article class="jogo-card fechado" data-jogo="${j.id}">${topo}
        ${linhaTime(j.mandante_id, 'm', null, false)}${linhaTime(j.visitante_id, 'v', null, false)}
        <p class="estado"><span class="rolando">Bola rolando</span> · ${meuTexto}</p>
        ${blocoComo(j)}</article>`;
    }
    // confirmado
    const r = resultados.find((x) => x.jogoId === j.id);
    const ganho = r
      ? `<p class="acerto">${r.acerto ? `${linhaEmoji([r])} ` : ''}<strong>+${r.torcida}</strong> ${r.torcida === 1 ? 'ponto' : 'pontos'}${paraTime ? ` ${esc(paraTime)}` : ''}</p>`
      : '';
    const frase = salvo && r ? fraseDoResultado(j, salvo, r) : null;
    return `<article class="jogo-card fechado confirmado" data-jogo="${j.id}">${topo}
      ${linhaTime(j.mandante_id, 'm', j.gols_mandante, false)}${linhaTime(j.visitante_id, 'v', j.gols_visitante, false)}
      <p class="estado">${meuTexto}</p>${ganho}
      ${frase ? `<p class="frase-jogo">${esc(frase)}</p>` : ''}
      ${blocoComo(j)}</article>`;
  }

  function fraseDoResultado(j: Jogo, palpite: Placar, r: PontosDoJogo): string | null {
    const ja = fraseDoJogo.get(j.id);
    if (ja) return ja;
    if (!r.acerto) return null;
    const etiquetas = new Set<Etiqueta>();
    if (j.gols_mandante === j.gols_visitante) etiquetas.add('empate');
    if (palpiteContra(palpite, j.mandante_id, j.visitante_id, time?.id)) etiquetas.add('contra');
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
    const nums = [...new Set(jogos.map((j) => j.rodada))].sort((a, b) => a - b);
    const seletor = $('.seletor-rodada');
    if (rodada === null || !nums.length) {
      seletor.hidden = true;
      elLista.innerHTML = '<p class="vazio">Os jogos da rodada ainda não chegaram. Volta daqui a pouco!</p>';
      elResumo.hidden = true;
      elShare.hidden = true;
      return;
    }
    seletor.hidden = false;
    $('[data-rodada]').textContent = `${ordinalRodada(rodada)} rodada`;
    $<HTMLButtonElement>('[data-acao="rodada-ant"]').disabled = rodada <= nums[0];
    $<HTMLButtonElement>('[data-acao="rodada-prox"]').disabled = rodada >= nums[nums.length - 1];
    $('[data-ensaio]').hidden = rodada >= valendoDesde;

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
        falar('crava_rodada_fim', {
          rodada: ordinalRodada(rodada),
          acertos: resultados.filter((r) => r.acerto && r.acerto !== 'errou').length,
          jogos: palpitados.length,
          pontos,
        }),
      );
    } else if (situacao === 'rolando') {
      gritar(falar('crava_fechou'));
    } else {
      gritar(falar('crava_abertura', { rodada: ordinalRodada(rodada) }));
    }
    topoVisto = chave;

    const trava = travaDaRodada();
    const falta = trava ? Date.parse(trava) - agora.getTime() : 0;
    const chaveLembrete = falta > 0 ? `${rodada}:${tempoAte(falta)}` : '';
    if (chaveLembrete !== lembreteVisto) {
      const lembrete = falta > 0 ? falar('crava_lembrete', { horas: tempoAte(falta) }) : null;
      elLembrete.textContent = lembrete ?? '';
      elLembrete.hidden = !lembrete;
      lembreteVisto = chaveLembrete;
    }

    desenharCompartilhar();
    void carregarComo();
    void carregarRanking();
  }

  function desenharCompartilhar(): void {
    const lista = daRodada();
    const temPalpite = lista.some((j) => meus.palpites.has(j.id));
    elShare.hidden = !temPalpite;
    $('[data-acao="card-resultado"]').hidden = !resultadosDaRodada().some((r) => r.acerto !== null);
  }

  // ---------- como a torcida cravou (só depois do início) ----------
  async function carregarComo(): Promise<void> {
    const r = rodada;
    if (r === null || !daRodada().some((j) => faseDoJogo(j, new Date()) !== 'aberto')) return;
    try {
      const linhas = await comoCravaram(r);
      if (saiu || r !== rodada) return;
      for (const l of linhas) como.set(l.jogo_id, l);
      for (const l of linhas) desenharCartao(l.jogo_id);
    } catch {
      // sem conexão: fica sem a porcentagem
    }
  }

  // ---------- ranking das torcidas no palpite e a própria posição ----------
  async function carregarRanking(): Promise<void> {
    const r = rodada;
    if (r === null) return;
    elResumo.hidden = false;
    const alvo = rankingDe === 'rodada' ? r : null;
    const meusPontos = daRodada().reduce((s, j) => s + (meus.pontos.get(j.id) ?? 0), 0);
    $('[data-meus-pontos]').innerHTML =
      `Na ${ordinalRodada(r)}: <strong>${meusPontos}</strong> ${meusPontos === 1 ? 'ponto' : 'pontos'}${paraTime ? ` ${esc(paraTime)}` : ''}` +
      (r < valendoDesde ? ' <small>(ensaio)</small>' : '');
    const elRk = $('[data-ranking]');
    const elPos = $('[data-posicao]');
    try {
      const [linhas, pos] = await Promise.all([rankingCrava(alvo), minhaPosicaoCrava(alvo).catch(() => null)]);
      if (saiu || r !== rodada) return;
      const onde = rankingDe === 'rodada' ? 'na rodada' : 'no Brasileirão';
      elPos.textContent = pos
        ? `Sua posição: ${pos.posicao}º de ${pos.total} ${onde}.`
        : 'Sua posição aparece quando sair o primeiro resultado que você cravou.';
      if (!linhas.some((l) => l.palpiteiros > 0)) {
        elRk.innerHTML = '<p class="vazio">Sai quando o primeiro placar for confirmado.</p>';
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
            <span class="nome">${esc(t?.nome ?? l.time_id)}<small> ${l.palpiteiros}</small></span>
            <span class="valor">${Math.round(l.media30).toLocaleString('pt-BR')}</span>
          </div>`;
        })
        .join('');
    } catch {
      if (!saiu) elRk.innerHTML = '<p class="vazio">Sem conexão com o placar agora.</p>';
    }
  }

  // ---------- ações ----------
  async function salvar(j: Jogo, botao: HTMLButtonElement): Promise<void> {
    if (!time) {
      irPara({ tela: 'times', depois: 'palpites' });
      return;
    }
    const placar = rascunho.get(j.id) ?? meus.palpites.get(j.id) ?? { m: 0, v: 0 };
    botao.disabled = true;
    botao.textContent = 'Cravando…';
    try {
      await sincronizarTorcedor();
      await cravar(j.id, placar);
      meus.palpites.set(j.id, placar);
      rascunho.delete(j.id);
      const contra = palpiteContra(placar, j.mandante_id, j.visitante_id, time.id);
      gritar(falar(contra ? 'crava_contra_time' : 'crava_salvo'));
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
      await sincronizarTorcedor();
      await marcarCerteza(rodada, ligar ? j.id : null);
      if (ligar) meus.certezas.set(rodada, j.id);
      else meus.certezas.delete(rodada);
      if (ligar) gritar(falar('crava_certeza'));
    } catch (e) {
      const fechado = e instanceof ErroServidor && e.codigo === 'fechado';
      gritar(fechado ? 'O jogo da certeza já travou nesta rodada.' : 'Sem conexão agora. Tenta de novo em instantes.');
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
    const nums = [...new Set(jogos.map((j) => j.rodada))].sort((a, b) => a - b);
    const i = nums.indexOf(rodada ?? nums[0]) + passo;
    if (i < 0 || i >= nums.length) return;
    rodada = nums[i];
    desenhar();
  }

  root.querySelectorAll<HTMLButtonElement>('[data-acao^="rk-"]').forEach((b) =>
    b.addEventListener('click', () => {
      rankingDe = b.dataset.acao === 'rk-tudo' ? 'tudo' : 'rodada';
      root.querySelectorAll('[data-acao^="rk-"]').forEach((o) => o.setAttribute('aria-selected', String(o === b)));
      void carregarRanking();
    }),
  );

  // ---------- cards ----------
  const avisar = (botao: HTMLElement, texto: string) => {
    const antes = botao.textContent;
    botao.textContent = texto;
    setTimeout(() => (botao.textContent = antes), 1800);
  };

  async function compartilhar(botao: HTMLElement, dados: DadosCardCrava, texto: string): Promise<void> {
    try {
      try {
        await Promise.all([document.fonts.load('400 100px Anton'), document.fonts.load('700 40px Barlow')]);
      } catch {
        // segue com a fonte que tiver
      }
      const canvas = desenharCardCrava(dados);
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
      const arquivo = blob ? new File([blob], 'crava-a-rodada.png', { type: 'image/png' }) : null;
      if (arquivo && navigator.canShare?.({ files: [arquivo] })) await navigator.share({ files: [arquivo], text: texto });
      else if (navigator.share) await navigator.share({ text: texto });
      else {
        await navigator.clipboard.writeText(texto);
        avisar(botao, 'Copiado!');
      }
    } catch {
      // cancelou o compartilhamento
    }
  }

  const timeDoCard = (): Time => time ?? timePorId(ID_OUTRO)!;
  const link = () => (time && !outro ? `${LINK}?time=${time.id}` : LINK);

  $('[data-acao="card-meus"]').addEventListener('click', (ev) => {
    if (rodada === null) return;
    const certeza = certezaDaRodada();
    const linhas = daRodada()
      .filter((j) => meus.palpites.has(j.id))
      .map((j) => ({ mandante: nomeDo(j.mandante_id), visitante: nomeDo(j.visitante_id), placar: meus.palpites.get(j.id)!, certeza: j.id === certeza }));
    if (!linhas.length) return;
    void compartilhar(
      ev.currentTarget as HTMLElement,
      { tipo: 'meus', time: timeDoCard(), rodada, linhas, link: link().replace('https://', '') },
      textoMeusPalpites(rodada, linhas, link()),
    );
  });

  $('[data-acao="card-resultado"]').addEventListener('click', (ev) => {
    if (rodada === null) return;
    const ordem = new Map(daRodada().map((j, i) => [j.id, i]));
    const resultados = resultadosDaRodada().sort((a, b) => ordem.get(a.jogoId)! - ordem.get(b.jogoId)!);
    const pontos = resultados.reduce((s, r) => s + r.torcida, 0);
    void compartilhar(
      ev.currentTarget as HTMLElement,
      {
        tipo: 'resultado',
        time: timeDoCard(),
        rodada,
        pontos,
        paraTime,
        emoji: linhaEmoji(resultados),
        frase: elAdesivo.hidden ? '' : (elAdesivo.textContent ?? ''),
        link: link().replace('https://', ''),
      },
      textoResultadoRodada(rodada, pontos, paraTime, resultados, link()),
    );
  });

  // ---------- carga ----------
  async function recarregar(): Promise<void> {
    try {
      const [j, r, v] = await Promise.all([jogosDoCrava(), rodadasDoCrava(), valendoDesdeRodada()]);
      jogos = j;
      rodadas = r;
      valendoDesde = v;
      try {
        meus = await meusDadosDoCrava();
      } catch {
        // sem sessão ainda: mostra os jogos mesmo assim
      }
      if (saiu) return;
      if (rodada === null || !jogos.some((x) => x.rodada === rodada)) rodada = rodadaEmFoco(jogos, new Date());
      desenhar();
    } catch {
      if (!saiu) elLista.innerHTML = '<p class="vazio">Sem conexão com o placar agora. Tenta de novo daqui a pouco.</p>';
    }
  }
  void recarregar();

  // Jogo que começa com a tela aberta tranca na hora (o servidor já recusa; a tela acompanha).
  let fasesVistas = '';
  const relogio = window.setInterval(() => {
    const agora = new Date();
    const fases = daRodada().map((j) => faseDoJogo(j, agora)).join();
    if (fasesVistas && fases !== fasesVistas) desenhar();
    fasesVistas = fases;
  }, 15_000);

  return () => {
    saiu = true;
    clearInterval(relogio);
  };
}
