// Time do Dia (docs/jogo.md, seção 7.2): um clube secreto por dia, 6 chutes, uma linha de pistas por
// chute. O secreto fica só no servidor; aqui é a lista com busca, a grade e o resultado (com o card).

import { esc, irPara, type Rota } from '../app';
import { corDeTexto, ID_OUTRO, proTime, timePorId, TIMES, type Time } from '../dados/times';
import { prefs } from '../estado';
import type { DadosDoCard } from '../jogo/cardPersonalizado';
import { linhaDoTorcedor } from '../jogo/cardTextos';
import { conviteDia } from '../jogo/convites';
import {
  AMOSTRA_COR,
  NOMES_PISTAS,
  ROTULO_PISTA,
  gradeEmoji,
  linhaDoCard,
  normalizarBusca,
  placarDoDia,
  quantasCertas,
  type NomePista,
  type Tentativa,
} from '../jogo/timeDoDia';
import { contextoDoTime, criarNarrador } from '../narrador/sessao';
import {
  ErroServidor,
  estadoDoDia,
  tentarClube,
  type ClubeDaLista,
  type EstadoDoDia,
} from '../servidor/api';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { sorteadorDeFrase } from './cardPersonalizado';
import { mostrarCarreiraNoResultado, nivelParaCard } from './carreira';
import { bomMomentoDoDia } from '../jogo/apoio';
import { oferecerApoio } from './apoio';
import { convidarParaAvisos } from './convitePush';
import { aoTocarNoEstado, cabecalhoTela, estado as blocoEstado, numero, placa } from './blocos';
import { motivoDoConfete } from '../jogo/confete';
import { contar, htmlResultado, htmlSelosDaPosicao, ligarConfete, ligarResultado } from './resultadoPadrao';
import { vibrar } from './toque';
import { dicasDoAparelho, mostrarDica, tirarDica, vezesVista } from './dicas';
import { DICAS } from '../jogo/dicas';
import { coresEmAmarelo, primeiraDica, temSeta, terceiroChuteSemVerde } from '../jogo/dicasGatilhos';
import { abrirRegras } from './regras';
import { lancesUnificados } from './corte';

const SITE = 'https://torcida.kauewalter.com.br';
/** Quantos clubes a busca mostra de uma vez (a lista inteira tem 60). */
const MAX_RESULTADOS = 8;

const MENSAGENS: Record<string, string> = {
  sem_conexao: 'Sem conexão: o Time do Dia precisa de internet.',
  tempo_esgotado: 'O servidor demorou pra responder. Confere a internet e tenta de novo.',
  dia_acabou: 'Virou o dia! Já tem outro time escondido.',
  dia_jogado: 'O Time do Dia de hoje já foi. Amanhã tem outro!',
  clube_repetido: 'Esse você já chutou. Tenta outro!',
  clube_invalido: 'Esse clube não está na lista. Escolhe pela busca.',
  conflito: 'Calma, um chute de cada vez!',
};
const mensagemDe = (e: unknown) =>
  (e instanceof ErroServidor && MENSAGENS[e.codigo]) || 'Deu ruim na conexão com o placar. Tenta de novo.';

// Em desenvolvimento, ?diaFalso troca o servidor por um de mentira (src/dev/diaFalso.ts).
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('diaFalso');
const SERVIDOR = { estadoDoDia, tentarClube };
const servidor = (): Promise<typeof SERVIDOR> => (FALSA ? import('../dev/diaFalso') : Promise.resolve(SERVIDOR));

const SIGLA_CURTA: Record<NomePista, string> = {
  estado: 'Estado',
  fundacao: 'Ano',
  titulos: 'Títulos',
  divisao: 'Série',
  cores: 'Cores',
  capital: 'Capital',
};

function valorDaPista(t: Tentativa, n: NomePista): string {
  const c = t.clube;
  const seta = t.pistas[n].seta === 'acima' ? '<i aria-label="o secreto tem mais">↑</i>' : t.pistas[n].seta === 'abaixo' ? '<i aria-label="o secreto tem menos">↓</i>' : '';
  switch (n) {
    case 'estado':
      return esc(c.uf);
    case 'fundacao':
      return `${c.fundacao}${seta}`;
    case 'titulos':
      return `${c.titulos}${seta}`;
    case 'divisao':
      return c.divisao;
    case 'cores':
      return c.cores
        .map((cor) => `<span class="amostra" style="background:${AMOSTRA_COR[cor]}" title="${esc(cor)}"></span>`)
        .join('');
    case 'capital':
      return c.capital ? 'Capital' : 'Interior';
  }
}

/** Linha de exemplo da 1ª vez (nenhum clube de verdade): tom e valor de cada pista, na ordem da grade. */
const EXEMPLO: readonly (readonly [string, string])[] = [
  ['certo', 'SP'],
  ['perto', '1910<i>↑</i>'],
  ['longe', '7<i>↓</i>'],
  ['certo', 'A'],
  ['perto', '<span class="amostra" style="background:#2e9d4f"></span>'],
  ['longe', 'Interior'],
];

const CABECALHO_PISTAS = `<div class="dia-cabecalho" aria-hidden="true">
        ${NOMES_PISTAS.map((n) => `<span>${SIGLA_CURTA[n]}</span>`).join('')}
      </div>`;

const TEXTO_TOM = { certo: 'igual', perto: 'perto', longe: 'longe' } as const;

function linhaHtml(t: Tentativa, nova: boolean): string {
  return `<li class="dia-linha${t.acertou ? ' acertou' : ''}${nova ? ' nova' : ''}">
    <p class="dia-chute">${esc(t.clube.nome)}</p>
    <div class="dia-celulas">
      ${NOMES_PISTAS.map(
        (n) => `<span class="dia-cel ${t.pistas[n].tom}" aria-label="${ROTULO_PISTA[n]}: ${TEXTO_TOM[t.pistas[n].tom]}">${valorDaPista(t, n)}</span>`,
      ).join('')}
    </div>
  </li>`;
}

function formatarRelogio(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function telaTimeDoDia(root: HTMLElement, _rota: Rota): () => void {
  const time: Time = timePorId(prefs.get().time) ?? TIMES[TIMES.length - 1];
  const narrador = criarNarrador(time, prefs.get().apelido);
  let estado: EstadoDoDia | null = null;
  let clubes: ClubeDaLista[] = [];
  let escolhido: ClubeDaLista | null = null;
  let enviando = false;
  let saiu = false;
  let relogio = 0;
  let frasesFinais: string[] = [];

  // "1º ..." de cada dica vale por partida; o limite por aparelho fica em jogo/dicas.ts.
  const vistas = { seta: false, amarelo: false, fechar: false, busca: false };

  root.innerHTML = `
    <main class="tela time-do-dia" style="--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}">
      ${cabecalhoTela({
        titulo: 'Time do Dia',
        voltar: true,
        extra: '<button class="voltar prova-como" type="button" aria-label="Regras e pontos">?</button>',
      })}

      <p class="adesivo" data-grito></p>

      <section class="placa aperta dia-pistas" data-pistas>
        ${CABECALHO_PISTAS}
        <div class="dia-linha dia-exemplo" data-exemplo hidden aria-hidden="true">
          <p class="dia-chute">Exemplo de pistas</p>
          <div class="dia-celulas">${EXEMPLO.map(([tom, valor], i) => `<span class="dia-cel ${tom}" style="--i:${i}">${valor}</span>`).join('')}</div>
        </div>
        <ol class="dia-grade" data-grade aria-label="Seus chutes" aria-live="polite"></ol>
        <p class="faixa-dica" data-dica hidden aria-live="polite"></p>
      </section>

      <section class="dia-chutar" data-chutar hidden>
        <label class="rotulo" for="dia-busca">Seu chute <span data-restam></span></label>
        <input id="dia-busca" class="dia-busca" type="search" autocomplete="off" autocapitalize="none"
          spellcheck="false" placeholder="Busque o clube" enterkeyhint="search" />
        <ul class="dia-resultados" data-resultados></ul>
        <button class="botao" type="button" data-chutar-btn disabled>Escolha um clube</button>
      </section>

      <div data-carregando>${blocoEstado('carregando', 'Procurando o time escondido…')}</div>
      <div class="prova-erro" data-erro hidden></div>
    </main>
  `;

  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const elGrade = $('[data-grade]');
  const elChutar = $('[data-chutar]');
  const elBusca = $<HTMLInputElement>('#dia-busca');
  const elResultados = $('[data-resultados]');
  const btnChutar = $<HTMLButtonElement>('[data-chutar-btn]');
  const elErro = $('[data-erro]');
  const elGrito = $('[data-grito]');
  const elCarregando = $('[data-carregando]');

  function gritar(texto: string | null): void {
    if (!texto) return;
    elGrito.textContent = texto;
    elGrito.classList.remove('pulso');
    void elGrito.offsetWidth;
    elGrito.classList.add('pulso');
  }

  /** Aviso curto de um chute que não valeu (clube repetido, dia virou…). */
  function erro(texto: string | null): void {
    elErro.className = 'res-aviso forte';
    elErro.hidden = !texto;
    elErro.textContent = texto ?? '';
  }

  /** Falha ao carregar o dia: convite para tentar de novo. */
  function falhaDeCarga(texto: string): void {
    elErro.className = 'prova-erro';
    elErro.innerHTML = blocoEstado('erro', texto);
    aoTocarNoEstado(elErro, () => {
      elErro.hidden = true;
      void carregar();
    });
    elErro.hidden = false;
  }

  // ---------- grade ----------
  function desenharGrade(novaLinha = false): void {
    const e = estado!;
    const feitas = e.tentativas.map((t, i) => linhaHtml(t, novaLinha && i === e.tentativas.length - 1));
    const vazias = e.fim ? [] : Array.from({ length: e.maxTentativas - e.tentativas.length }, (_, i) =>
      `<li class="dia-linha vazia"><p class="dia-chute">${e.tentativas.length + i + 1}º chute</p>
        <div class="dia-celulas">${NOMES_PISTAS.map(() => '<span class="dia-cel"></span>').join('')}</div></li>`);
    elGrade.innerHTML = [...feitas, ...vazias].join('');
  }

  // ---------- busca ----------
  function resultados(): ClubeDaLista[] {
    const q = normalizarBusca(elBusca.value);
    const ja = new Set(estado?.tentativas.map((t) => t.clube.id));
    const livres = clubes.filter((c) => !ja.has(c.id));
    if (!q) return [];
    const comeca = livres.filter((c) => normalizarBusca(c.nome).startsWith(q));
    const contem = livres.filter((c) => !comeca.includes(c) && normalizarBusca(`${c.nome} ${c.uf}`).includes(q));
    return [...comeca, ...contem].slice(0, MAX_RESULTADOS);
  }

  function desenharResultados(): void {
    const lista = resultados();
    const q = elBusca.value.trim();
    elResultados.innerHTML = lista.length
      ? lista
          .map(
            (c) => `<li><button type="button" class="dia-opcao${escolhido?.id === c.id ? ' escolhida' : ''}" data-clube="${esc(c.id)}">
              ${esc(c.nome)}<small>${esc(c.uf)}</small></button></li>`,
          )
          .join('')
      : q
        ? '<li class="nota">Nenhum clube com esse nome (ou você já chutou).</li>'
        : '';
    if (q && !lista.length && !vistas.busca) {
      dicas.novoLance();
      vistas.busca = mostrarDica($('[data-dica]'), dicas.pedir('dia_busca'));
    }
    elResultados.querySelectorAll<HTMLButtonElement>('[data-clube]').forEach((b) =>
      b.addEventListener('click', () => {
        escolhido = clubes.find((c) => c.id === b.dataset.clube) ?? null;
        if (escolhido) elBusca.value = escolhido.nome;
        atualizarBotao();
        desenharResultados();
      }),
    );
  }

  function atualizarBotao(): void {
    btnChutar.disabled = !escolhido || enviando;
    btnChutar.textContent = enviando ? 'Chutando…' : escolhido ? `Chutar: ${escolhido.nome}` : 'Escolha um clube';
  }

  elBusca.addEventListener('input', () => {
    if (escolhido && elBusca.value !== escolhido.nome) escolhido = null;
    atualizarBotao();
    desenharResultados();
  });
  elBusca.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const lista = resultados();
    if (!escolhido && lista.length === 1) {
      escolhido = lista[0];
      elBusca.value = escolhido.nome;
      atualizarBotao();
      desenharResultados();
    } else if (escolhido) void chutar();
  });

  // ---------- chutar ----------
  // Dicas na hora do erro (jogo.md, 14.4).
  const dicas = dicasDoAparelho();
  async function chutar(): Promise<void> {
    if (!estado || !escolhido || enviando) return;
    const elDica = $('[data-dica]');
    dicas.novoLance();
    tirarDica(elDica);
    $('[data-exemplo]').hidden = true;
    enviando = true;
    atualizarBotao();
    erro(null);
    try {
      const api = await servidor();
      const novo = await api.tentarClube(estado.dia, escolhido.id);
      if (saiu) return;
      estado = novo;
      escolhido = null;
      elBusca.value = '';
      desenharResultados();
      const ultima = novo.tentativas[novo.tentativas.length - 1];
      desenharGrade(true);
      if (novo.fim) terminar();
      else {
        const certas = ultima ? quantasCertas(ultima.pistas) : 0;
        gritar(certas >= 4 ? narrador.falar('dia_quase') : certas === 0 ? narrador.falar('dia_longe') : null);
        // Vale a mais específica; o 1º chute leva a dica das cores, que é a que explica a linha.
        const t = novo.tentativas;
        const texto = primeiraDica(dicas, [
          [t.length === 1, 'dia_cores'],
          [terceiroChuteSemVerde(t) && !vistas.fechar, 'dia_fechar'],
          [!!ultima && temSeta(ultima) && !vistas.seta, 'dia_seta'],
          [!!ultima && coresEmAmarelo(ultima) && !vistas.amarelo, 'dia_cores_amarelo'],
        ]);
        if (mostrarDica(elDica, texto)) {
          if (texto === DICAS.dia_fechar) vistas.fechar = true;
          else if (texto === DICAS.dia_seta) vistas.seta = true;
          else if (texto === DICAS.dia_cores_amarelo) vistas.amarelo = true;
        }
        atualizarRestam();
        elBusca.focus({ preventScroll: true });
      }
    } catch (e) {
      if (saiu) return;
      erro(mensagemDe(e));
      // Virou o dia ou o dia já acabou em outra aba: recarrega o estado.
      if (e instanceof ErroServidor && ['dia_acabou', 'dia_jogado', 'conflito'].includes(e.codigo)) void carregar();
    } finally {
      enviando = false;
      atualizarBotao();
    }
  }
  btnChutar.addEventListener('click', () => void chutar());

  function atualizarRestam(): void {
    const e = estado!;
    const restam = e.maxTentativas - e.tentativas.length;
    $('[data-restam]').textContent = `· ${restam} ${restam === 1 ? 'chute' : 'chutes'}`;
  }

  // ---------- fim ----------
  function terminar(): void {
    const e = estado!;
    const n = e.tentativas.length;
    // Primeira vez que o fim aparece nesta visita (não ao reabrir a tela já jogada): só ela comemora.
    const primeiraVez = !frasesFinais.length;
    if (primeiraVez) {
      // Acertou: quem vibra é a comemoração do resultado (confete e vibração, ligarConfete).
      if (!e.acertou) vibrar('erro');
      const f1 = e.acertou
        ? n === 1
          ? narrador.falar('dia_acertou_primeira')
          : narrador.falar('dia_acertou', { tentativas: n })
        : narrador.falar('dia_errou');
      frasesFinais = f1 ? [f1] : [];
    }

    const placar = placarDoDia(n, e.acertou);
    const grade = gradeEmoji(e.tentativas.map((t) => t.pistas));
    const link = `${SITE}/?dia`;
    const novoRecorde = !!e.desempenho?.novoRecorde;
    const linha = linhaDoCard(e.numero, placar, novoRecorde);
    const textoShare = `${linha}\n${grade}\n${conviteDia(n, e.acertou)} ${link}`;
    const paraTime = proTime(time);
    // Casa do [time]: só depois que o dia termina (antes daria pista) e só para clube da Série A.
    const timeCasa = timePorId(e.secreto?.id);
    const casa =
      timeCasa && timeCasa.id !== ID_OUTRO
        ? `<button class="link-casa" type="button" data-acao="casa">
            <span class="rotulo">Conheça a Casa ${timeCasa.artigo === 'a' ? 'da' : 'do'} ${esc(timeCasa.nome)}</span>
            <small>Estádio, troféus, recordes e cores</small>
          </button>`
        : '';

    root.innerHTML = htmlResultado({
      time,
      classe: `resultado time-do-dia-fim ${e.acertou ? 'venceu' : 'perdeu'}`,
      rotulo: `Time do Dia #${e.numero}`,
      titulo: e.acertou ? 'Achou!' : 'Não foi dessa',
      ganhou: e.acertou,
      placar: `<section class="dia-placar-tv" aria-label="Placar">
          <div class="dia-revelado faixa-tv">
            <p class="rotulo">Era o time de hoje</p>
            <h2>${esc(e.secreto?.nome ?? '')}</h2>
          </div>
        <ol class="dia-grade" data-grade aria-label="Seus chutes" aria-live="polite"></ol>
          <p class="dia-chutes"><strong>${placar}</strong><span>${n === 1 ? 'chute' : 'chutes'}</span></p>
        </section>`,
      pontos: e.acertou ? { total: e.pontos, paraTime } : null,
      detalhe: `${placa(`${CABECALHO_PISTAS}<ol class="dia-grade">${e.tentativas.map((t) => linhaHtml(t, false)).join('')}</ol>`, {
        titulo: 'Suas pistas',
        classe: 'aperta dia-pistas',
      })}
        ${casa}
        <div class="numeros">
          ${numero(`<span data-relogio>${formatarRelogio(Date.parse(e.proximoEm) - Date.now())}</span>`, 'Próximo time em')}
          ${e.acertou ? '' : numero('0', 'pontos hoje', 'apagado')}
        </div>`,
      frases: frasesFinais,
      // Desde 09/11 (jogo.md 14.7) o dia vale 3 partidas de Lances e 3 da Prova: o texto não fala mais em 5.
      aviso: e.acertou
        ? { texto: lancesUnificados() ? `+${e.pontos} na semana, por fora das partidas do dia.` : `+${e.pontos} na semana, além das 5 partidas do dia.`, forte: false }
        : null,
      selos: htmlSelosDaPosicao(e.desempenho, 'dia'),
      zap: `https://wa.me/?text=${encodeURIComponent(textoShare)}`,
      // Time do Dia é um por dia: o botão principal leva ao próximo jogo (Lances do Jogo).
      maisUma: 'Lances do Jogo',
    });
    if (e.acertou) contar(root.querySelector<HTMLElement>('[data-contador]'), e.pontos);
    scrollTo(0, 0);
    // Bom momento para oferecer o aviso de domingo: acertou o time do dia.
    if (e.acertou) convidarParaAvisos(root.querySelector<HTMLElement>('[data-convite-push]'));
    oferecerApoio(root.querySelector<HTMLElement>('[data-apoio]'), bomMomentoDoDia({ acertou: e.acertou }));
    const comemorar = ligarConfete(root, time);
    if (primeiraVez)
      comemorar(motivoDoConfete({ acertouTimeDoDia: e.acertou, novoRecorde: !!e.desempenho?.novoRecorde }));

    const elRelogio = root.querySelector<HTMLElement>('[data-relogio]')!;
    clearInterval(relogio);
    relogio = window.setInterval(() => {
      const ms = Date.parse(e.proximoEm) - Date.now();
      elRelogio.textContent = formatarRelogio(ms);
      if (ms <= 0) {
        clearInterval(relogio);
        elRelogio.textContent = 'já!';
      }
    }, 1000);

    // Carreira: só com o servidor (o XP sai de lá); reabrir o dia já feito não mostra nada (XP igual).
    const carreira = e.desempenho ? mostrarCarreiraNoResultado(root.querySelector<HTMLElement>('[data-carreira]')) : Promise.resolve(null);
    // Peça nova no vestiário: só o nível muda no Time do Dia (import() lazy; reabrir o dia feito tem XP igual: nada).
    void import('./pecaNovaBloco').then((m) =>
      m.pecaNovaDoResultado({ alvo: root.querySelector<HTMLElement>('[data-peca-nova]'), contou: !!e.desempenho, carreira, comemorar }),
    );

    // Card personalizável (jogo.md 14.6): o Card abre a tela "Seu card" e o Stories manda o card com as escolhas guardadas.
    const apelido = prefs.get().apelido;
    const dados = (async (): Promise<DadosDoCard> => ({
      tipo: 'jogo',
      time,
      jogo: `Time do Dia #${e.numero}`,
      destaque: `+${e.pontos}`,
      quem: { comApelido: linhaDoTorcedor(apelido, e.pontos, paraTime), semApelido: linhaDoTorcedor(undefined, e.pontos, paraTime) },
      lance: `Time do Dia #${e.numero} · ${placar}`,
      placarEmoji: grade,
      frase: frasesFinais[0] ?? '',
      novoRecorde,
      link: link.replace('https://', ''),
      nivel: await nivelParaCard(),
      conteudo: { jogo: 'dia', numero: e.numero, placar, pistas: e.tentativas.map((t) => t.pistas) },
    }))();

    ligarResultado(root, {
      dados,
      sortearFrase: sorteadorDeFrase(
        e.acertou ? (n === 1 ? 'dia_acertou_primeira' : 'dia_acertou') : 'dia_errou',
        { ...contextoDoTime(time, apelido), tentativas: n },
      ),
      quemComApelido: (a) => linhaDoTorcedor(a, e.pontos, paraTime),
      textoShare,
      link,
      emoji: `${linha}\n${grade}`,
      maisUma: () => irPara({ tela: 'lances' }),
      inicio: () => irPara({ tela: 'inicio' }),
    });
    root.querySelector('[data-acao="casa"]')?.addEventListener('click', () => irPara({ tela: 'casa', id: timeCasa?.id }));
  }

  // ---------- carregar o dia ----------
  async function carregar(): Promise<void> {
    elCarregando.hidden = false;
    elErro.hidden = true;
    try {
      const api = await servidor();
      if (!FALSA) await sincronizarTorcedor();
      const r = await api.estadoDoDia();
      if (saiu) return;
      elCarregando.hidden = true;
      if (!r.pronto) {
        elCarregando.innerHTML = blocoEstado('vazio', 'O Time do Dia entra em campo já já. Volta mais tarde!', { acao: 'Voltar pro início' });
        aoTocarNoEstado(elCarregando, () => irPara({ tela: 'inicio' }));
        elCarregando.hidden = false;
        return;
      }
      estado = r;
      clubes = r.clubes ?? clubes;
      $('.titulo-tela').textContent = `Time do Dia #${r.numero}`;
      desenharGrade();
      if (r.fim) terminar();
      else {
        elChutar.hidden = false;
        atualizarRestam();
        if (!r.tentativas.length) {
          gritar(narrador.falar('dia_abertura'));
          // 1ª vez: a dica traz uma linha de exemplo se pintando (nas outras, só a frase).
          const primeiraVez = vezesVista('dia_comeco') === 0;
          dicas.novoLance();
          if (mostrarDica($('[data-dica]'), dicas.pedir('dia_comeco')) && primeiraVez) $('[data-exemplo]').hidden = false;
        }
      }
    } catch (e) {
      if (saiu) return;
      elCarregando.hidden = true;
      falhaDeCarga(mensagemDe(e));
    }
  }

  // ---------- topo ----------
  $('.prova-como').addEventListener('click', () => abrirRegras(root, 'dia'));
  $('[data-voltar]').addEventListener('click', () => irPara({ tela: 'inicio' }));

  void carregar();

  return () => {
    saiu = true;
    clearInterval(relogio);
  };
}
