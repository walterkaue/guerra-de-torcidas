// Prova de Boleiro (docs/jogo.md, seção 7.1): 8 perguntas na escada, 20 s cada, parar ou seguir
// a partir da 3ª e 3 ajudas. Tudo vem do servidor, uma pergunta por vez; aqui é só toque e desenho.
// O relógio da tela é só aviso: quem mede o tempo é o servidor.

import { esc, irPara, type Rota } from '../app';
import { ID_OUTRO, corDeTexto, timePorId, TIMES, type Time } from '../dados/times';
import { prefs } from '../estado';
import { DEGRAU_DA_POSICAO, NOME_DEGRAU, PERGUNTAS, PONTOS_DO_DEGRAU, ERROS_QUE_ENCERRAM, type Ajuda, type Degrau } from '../jogo/prova';

/** Nome do degrau na tela: "Média" sozinho parecia média de pontos. */
const ROTULO_DEGRAU: Record<Degrau, string> = { ...NOME_DEGRAU, 2: 'Nível médio' };
import { criarNarrador } from '../narrador/sessao';
import { eventoDoErroNaProva } from '../narrador/lance';
import type { ContextoNarrador } from '../narrador/escolher';
import type { EventoNarrador } from '../narrador/frases';
import {
  ErroServidor,
  novaProva,
  pedirAjuda,
  proximaPergunta,
  responderPergunta,
  type DesafioProvaRecebido,
  type FimProva,
  type PerguntaProva,
  verDesafioProva,
} from '../servidor/api';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { aoTocarNoEstado, cabecalhoTela, estado } from './blocos';
import { icone, type NomeIcone } from './icones';
import { vibrar } from './toque';
import { papelPicadoNaTela } from './papelPicado';
import { dicasDoAparelho, mostrarDica, tirarDica } from './dicas';
import { DICAS } from '../jogo/dicas';
import { primeiraDica } from '../jogo/dicasGatilhos';
import { abrirRegras } from './regras';
import { contar as contarFunil, etapa } from '../servidor/funil';

export interface DadosResultadoProva {
  timeId: string;
  fim: FimProva;
  desafio: DesafioProvaRecebido | null;
  frases: string[];
}

const LETRAS = ['A', 'B', 'C', 'D'];
const AJUDA_INFO: Record<Ajuda, { icone: NomeIcone; nome: string }> = {
  tira_duas: { icone: 'tesoura', nome: 'Tira duas' },
  arquibancada: { icone: 'megafone', nome: 'Arquibancada' },
  troca: { icone: 'troca', nome: 'Troca' },
};
/** Pausa para ver a certa antes de seguir. */
const PAUSA_RESPOSTA_MS = 1400;

const MENSAGENS: Record<string, string> = {
  muitas_partidas: 'Calma! São até 3 partidas por minuto. Respira e tenta de novo já já.',
  sem_perguntas: 'O banco de perguntas ainda tá sendo montado. Volta logo!',
  desafio_sem_perguntas: 'Esse X1 usa perguntas que saíram do banco. Bora numa prova nova?',
  sem_conexao: 'Sem conexão: a Prova de Boleiro precisa de internet.',
  tempo_esgotado: 'O servidor demorou pra responder. Confere a internet e tenta de novo.',
};
const mensagemDe = (e: unknown) =>
  (e instanceof ErroServidor && MENSAGENS[e.codigo]) || 'Deu ruim na conexão com o placar. Tenta de novo.';

// Em desenvolvimento, ?provaFalsa troca o servidor por um de mentira (src/dev/provaFalsa.ts).
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('provaFalsa');
const SERVIDOR = { novaProva, proximaPergunta, responderPergunta, pedirAjuda };
const servidor = (): Promise<typeof SERVIDOR> => (FALSA ? import('../dev/provaFalsa') : Promise.resolve(SERVIDOR));

const nomeOrigem = (clube: string) => {
  const t = timePorId(clube);
  return t ? `${t.artigo === 'a' ? 'da' : 'do'} ${t.nome}` : 'geral';
};

export function telaProva(root: HTMLElement, rota: Rota): () => void {
  const time: Time = timePorId(prefs.get().time) ?? TIMES[TIMES.length - 1];
  let codigoDesafio = rota.tela === 'prova' ? rota.desafio : undefined;
  const narrador = criarNarrador(time, prefs.get().apelido);
  const falar = (ev: EventoNarrador, extra: Partial<ContextoNarrador> = {}) => narrador.falar(ev, extra);

  let partidaId: string | null = null;
  let desafio: DesafioProvaRecebido | null = null;
  let pergunta: PerguntaProva | null = null;
  /** Estado de cada degrau na escada da tela. */
  const degraus: ('futuro' | 'certa' | 'ajuda' | 'errada')[] = Array(PERGUNTAS).fill('futuro');
  const usadas = new Set<Ajuda>();
  let ajudaNaAtual = false;
  let travado = true;
  let saiu = false;
  let relogio = 0;
  let estouro = 0;
  let pausa = 0;
  let inicioPergunta = 0;
  let errosFeitos = 0;
  // "1º ..." de cada dica vale por prova; o limite por aparelho fica em jogo/dicas.ts.
  const vistas = { decisao: false, tempo: false, ultima: false, ajuda: false };

  root.innerHTML = `
    <main class="tela prova" style="--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}">
      ${cabecalhoTela({
        titulo: 'Prova de Boleiro',
        voltar: true,
        extra: '<button class="voltar prova-como" type="button" aria-label="Regras e pontos">?</button>',
      })}

      <div class="escada-bloco">
        <ol class="escada" aria-label="Escada de perguntas: número e pontos de cada uma">
          ${DEGRAU_DA_POSICAO.map(
            (d, i) => `<li data-degrau="${i}"><span class="num">${i + 1}</span><span class="val">${PONTOS_DO_DEGRAU[d]}</span></li>`,
          ).join('')}
        </ol>
        <p class="escada-legenda" aria-hidden="true"><span>nº da pergunta</span><span>pontos</span></p>
      </div>

      <section class="prova-inicio" data-inicio>
        <p class="adesivo" data-abertura></p>
        <div class="convite-desafio" data-convite hidden></div>
        <button class="botao" type="button" data-comecar>Começar a prova</button>
        <div class="prova-erro" data-erro hidden></div>
      </section>

      <section class="prova-jogo" data-jogo hidden>
        <p class="prova-erros" data-erros aria-live="polite"></p>
        <div class="relogio" aria-hidden="true"><span class="relogio-barra"></span><strong data-segundos></strong></div>
        <article class="placa filete cartao-pergunta">
          <p class="faixa" data-rotulo></p>
          <h2 class="pergunta-texto" data-texto aria-live="polite"></h2>
          <div class="alternativas" data-alternativas></div>
        </article>
        <p class="faixa-dica" data-dica hidden aria-live="polite"></p>
        <div class="ajudas" data-ajudas>
          ${(Object.keys(AJUDA_INFO) as Ajuda[])
            .map(
              (a) => `<button type="button" class="ajuda-btn" data-ajuda="${a}">
                ${icone(AJUDA_INFO[a].icone)}${AJUDA_INFO[a].nome}</button>`,
            )
            .join('')}
        </div>
        <p class="adesivo prova-grito" data-grito hidden></p>
      </section>

      <section class="prova-decisao" data-decisao hidden role="dialog" aria-modal="true" aria-labelledby="pd-titulo">
        <div class="cj-caixa placa filete">
          <p class="faixa" data-decisao-degrau></p>
          <h2 id="pd-titulo" class="cj-titulo" data-decisao-titulo></h2>
          <p class="adesivo" data-decisao-frase></p>
          <p class="faixa-dica" data-dica-decisao hidden aria-live="polite"></p>
          <button class="botao" type="button" data-seguir></button>
          <button class="botao botao-sec" type="button" data-parar></button>
        </div>
      </section>
    </main>
  `;

  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const elInicio = $('[data-inicio]');
  const elJogo = $('[data-jogo]');
  const elErro = $('[data-erro]');
  const btnComecar = $<HTMLButtonElement>('[data-comecar]');
  const elTexto = $('[data-texto]');
  const elRotulo = $('[data-rotulo]');
  const elAlts = $('[data-alternativas]');
  const elGrito = $('[data-grito]');
  // Dicas na hora do erro (jogo.md, 14.4).
  const elDica = $('[data-dica]');
  const dicas = dicasDoAparelho();
  const elErros = $('[data-erros]');
  const elSeg = $('[data-segundos]');
  const elRelogio = $('.relogio');
  const elDecisao = $('[data-decisao]');

  $('[data-abertura]').textContent = falar('prova_abertura') ?? 'Prova de Boleiro!';

  // ---------- desafio por link ----------
  const mostrarConvite = (d: Pick<DesafioProvaRecebido, 'apelido' | 'timeId' | 'pontos' | 'escada' | 'resumo'>) => {
    const t = timePorId(d.timeId);
    const el = $('[data-convite]');
    el.innerHTML = `<p class="rotulo">Te chamaram no X1</p>
      <p><strong>${esc(d.apelido ?? 'Alguém')}</strong>${t && t.id !== ID_OUTRO ? ` (${esc(t.nome)})` : ''}: ${esc(d.resumo)},
      <strong>${d.pontos} pontos</strong>.</p><p class="escada-emoji">${esc(d.escada)}</p>
      <p class="nota">As mesmas 8 perguntas, na mesma ordem. Faz mais pontos e vence.</p>`;
    el.hidden = false;
  };

  // ---------- escada ----------
  function pintarEscada(atual: number | null): void {
    root.querySelectorAll<HTMLElement>('.escada li').forEach((li, i) => {
      li.className = degraus[i] === 'futuro' ? (i === atual ? 'atual' : '') : degraus[i];
    });
  }

  // ---------- grito do narrador ----------
  function gritar(texto: string | null): void {
    elGrito.hidden = !texto;
    elGrito.textContent = texto ?? '';
    elGrito.classList.remove('pulso');
    void elGrito.offsetWidth;
    elGrito.classList.add('pulso');
  }

  // ---------- relógio (só aviso; o servidor mede) ----------
  function pararRelogio(): void {
    clearInterval(relogio);
    clearTimeout(estouro);
  }

  function ligarRelogio(segundos: number): void {
    pararRelogio();
    inicioPergunta = performance.now();
    elRelogio.style.setProperty('--dur', `${segundos}s`);
    elRelogio.classList.remove('correndo', 'acabando');
    void elRelogio.offsetWidth;
    elRelogio.classList.add('correndo');
    const tique = () => {
      const resta = Math.max(0, Math.ceil(segundos - (performance.now() - inicioPergunta) / 1000));
      elSeg.textContent = `${resta} s`;
      elRelogio.classList.toggle('acabando', resta <= 5);
    };
    tique();
    relogio = window.setInterval(tique, 250);
    estouro = window.setTimeout(() => void responder(null), segundos * 1000);
  }

  // ---------- erros restantes ----------
  function mostrarErros(feitos: number): void {
    errosFeitos = feitos;
    const restam = Math.max(0, ERROS_QUE_ENCERRAM - feitos);
    const bolas = Array.from({ length: ERROS_QUE_ENCERRAM }, (_, k) => `<span class="bola${k < feitos ? ' gasta' : ''}"></span>`).join('');
    elErros.innerHTML = `${bolas} ${restam === 1 ? 'Mais 1 erro e acaba' : `${restam} erros restantes`}`;
  }

  // ---------- pergunta ----------
  function mostrarPergunta(p: PerguntaProva): void {
    pergunta = p;
    dicas.novoLance();
    tirarDica(elDica);
    mostrarErros(p.erros ?? 0);
    ajudaNaAtual = false;
    const i = p.numero - 1;
    elRotulo.textContent = `Pergunta ${p.numero} · ${ROTULO_DEGRAU[p.degrau]} · ${nomeOrigem(p.clube)}`;
    elTexto.textContent = p.texto;
    elAlts.innerHTML = p.alternativas
      .map(
        (a, k) => `<button type="button" class="alt" data-alt="${esc(a.id)}">
          <span class="letra">${LETRAS[k]}</span><span class="alt-texto">${esc(a.texto)}</span><span class="pct" hidden></span></button>`,
      )
      .join('');
    elAlts.querySelectorAll<HTMLButtonElement>('[data-alt]').forEach((b) =>
      b.addEventListener('click', () => void responder(b.dataset.alt!)),
    );
    for (const a of p.ajudasUsadas) usadas.add(a);
    travado = false;
    atualizarAjudas();
    pintarEscada(i);
    elGrito.hidden = true;
    elDecisao.hidden = true;
    elJogo.hidden = false;
    ligarRelogio(p.segundos);
    // Travou? A 1ª difícil, ainda sem ajuda usada.
    if (p.degrau === 3 && usadas.size === 0 && !vistas.ajuda) vistas.ajuda = mostrarDica(elDica, dicas.pedir('prova_ajuda'));
  }

  function atualizarAjudas(): void {
    root.querySelectorAll<HTMLButtonElement>('[data-ajuda]').forEach((b) => {
      b.disabled = usadas.has(b.dataset.ajuda as Ajuda) || travado;
    });
  }

  function travar(sim: boolean): void {
    travado = sim;
    elAlts.querySelectorAll<HTMLButtonElement>('[data-alt]').forEach((b) => (b.disabled = sim || b.classList.contains('removida')));
    atualizarAjudas();
  }

  // ---------- responder ----------
  async function responder(id: string | null): Promise<void> {
    if (travado || !partidaId || saiu) return;
    // Funil do X1: o 1º gesto de uma prova de X1 recebido (`desafio` fica null se o servidor recusou o X1).
    if (desafio && pergunta?.numero === 1) contarFunil({ ev: 'primeiro_chute', tipo: 'x1_prova', x1: desafio.id });
    travar(true);
    pararRelogio();
    elRelogio.classList.remove('correndo');
    const botao = id ? elAlts.querySelector<HTMLElement>(`[data-alt="${CSS.escape(id)}"]`) : null;
    botao?.classList.add('escolhida');
    try {
      const r = await (await servidor()).responderPergunta(partidaId, id);
      if (saiu) return;
      const i = (pergunta?.numero ?? 1) - 1;
      elAlts.querySelector(`[data-alt="${CSS.escape(r.certa)}"]`)?.classList.add('certa');
      if (r.desfecho !== 'acertou') botao?.classList.add('errada');
      degraus[i] = r.desfecho === 'acertou' ? (ajudaNaAtual ? 'ajuda' : 'certa') : 'errada';
      mostrarErros(r.erros ?? errosFeitos + (r.desfecho === 'acertou' ? 0 : 1));
      pintarEscada(null);
      vibrar(r.desfecho === 'acertou' ? 'acerto' : 'erro');
      if (r.desfecho === 'acertou') {
        gritar(falar('prova_acertou'));
        if (botao) papelPicadoNaTela(botao, [time.cores[0], time.cores[1], '#ffd23f']);
      }
      // No 3º erro a partida acaba: o grito de "segue" não cabe, quem fala é o fim da prova.
      else if (!r.fim) {
        gritar(falar(eventoDoErroNaProva(r.desfecho, errosFeitos)));
        // Vale a mais específica: tempo esgotado, depois a última vida, depois o 1º erro.
        const texto = primeiraDica(dicas, [
          [r.desfecho === 'tempo' && !vistas.tempo, 'prova_tempo'],
          [errosFeitos === ERROS_QUE_ENCERRAM - 1 && !vistas.ultima, 'prova_ultima_vida'],
          [errosFeitos === 1, 'prova_primeiro_erro'],
        ]);
        if (mostrarDica(elDica, texto)) {
          if (texto === DICAS.prova_tempo) vistas.tempo = true;
          else if (texto === DICAS.prova_ultima_vida) vistas.ultima = true;
        }
      }

      pausa = window.setTimeout(() => {
        if (saiu) return;
        if (r.fim) return terminar(r.fim);
        if (r.proxima?.decidir) return decidir(r.proxima.numero, r.levar);
        void seguir();
      }, PAUSA_RESPOSTA_MS);
    } catch (e) {
      if (saiu) return;
      mostrarFalha(e);
    }
  }

  // ---------- parar ou seguir ----------
  function decidir(numero: number, garantidos: number): void {
    const d = DEGRAU_DA_POSICAO[numero - 1];
    $('[data-decisao-degrau]').textContent = `Pergunta ${numero} · ${ROTULO_DEGRAU[d]} · vale ${PONTOS_DO_DEGRAU[d]}`;
    $('[data-decisao-titulo]').textContent = 'Para ou segue?';
    $('[data-decisao-frase]').textContent = falar('prova_decisao', { levar: garantidos, numero }) ?? '';
    const restam = Math.max(0, ERROS_QUE_ENCERRAM - errosFeitos);
    const elDicaDecisao = $('[data-dica-decisao]');
    dicas.novoLance();
    tirarDica(elDicaDecisao);
    if (!vistas.decisao) vistas.decisao = mostrarDica(elDicaDecisao, dicas.pedir('prova_parar_ou_seguir'));
    $('[data-seguir]').innerHTML = `Seguir<small>${restam === 1 ? 'mais 1 erro e acaba' : `${restam} erros restantes`}</small>`;
    $('[data-parar]').innerHTML = `Parar e levar ${garantidos}`;
    elDecisao.hidden = false;
    pintarEscada(numero - 1);
  }

  async function seguir(decisao?: 'seguir' | 'parar'): Promise<void> {
    if (!partidaId) return;
    elDecisao.querySelectorAll('button').forEach((b) => (b.disabled = true));
    try {
      const r = await (await servidor()).proximaPergunta(partidaId, decisao);
      if (saiu) return;
      if (r.fim) {
        terminar(r.fim);
      } else if (r.pergunta) mostrarPergunta(r.pergunta);
    } catch (e) {
      if (!saiu) mostrarFalha(e);
    } finally {
      elDecisao.querySelectorAll('button').forEach((b) => (b.disabled = false));
    }
  }
  $('[data-seguir]').addEventListener('click', () => void seguir('seguir'));
  $('[data-parar]').addEventListener('click', () => void seguir('parar'));

  // ---------- ajudas ----------
  root.querySelectorAll<HTMLButtonElement>('[data-ajuda]').forEach((b) =>
    b.addEventListener('click', async () => {
      const tipo = b.dataset.ajuda as Ajuda;
      if (travado || usadas.has(tipo) || !partidaId) return;
      b.disabled = true;
      try {
        const r = await (await servidor()).pedirAjuda(partidaId, tipo);
        if (saiu) return;
        usadas.add(tipo);
        ajudaNaAtual = true;
        for (const id of r.removidas ?? []) {
          const alt = elAlts.querySelector<HTMLButtonElement>(`[data-alt="${CSS.escape(id)}"]`);
          alt?.classList.add('removida');
          if (alt) alt.disabled = true;
        }
        if (r.porcentagens) {
          for (const [id, pct] of Object.entries(r.porcentagens)) {
            const alt = elAlts.querySelector<HTMLElement>(`[data-alt="${CSS.escape(id)}"]`);
            const el = alt?.querySelector<HTMLElement>('.pct');
            if (!alt || !el) continue;
            alt.style.setProperty('--pct', `${pct}%`);
            alt.classList.add('com-pct');
            el.textContent = `${pct}%`;
            el.hidden = false;
          }
        }
        if (r.pergunta) {
          mostrarPergunta(r.pergunta);
          ajudaNaAtual = true;
        }
        gritar(
          r.tiraUma
            ? 'A arquibancada ainda tá chegando: tirou uma!'
            : falar('prova_ajuda', { etiquetas: new Set([tipo]) }),
        );
        if (r.tiraUma) mostrarDica(elDica, dicas.pedir('prova_arquibancada'));
        atualizarAjudas();
      } catch (e) {
        if (saiu) return;
        const codigo = e instanceof ErroServidor ? e.codigo : '';
        gritar(codigo === 'ajuda_indisponivel' ? 'Essa ajuda não dá pra usar agora.' : 'A ajuda não chegou. Segue o jogo!');
        atualizarAjudas();
      }
    }),
  );

  // ---------- fim ----------
  function terminar(fim: FimProva): void {
    pararRelogio();
    etapa(null);
    // Uma frase só: a do fim (o 8 de 8 ganha a própria; a de "parou" era de transição e saiu).
    const frase = fim.fim === 'perfeita' ? falar('prova_perfeita') : falar('prova_fim', { pontos: fim.pontos.total });
    irPara({
      tela: 'provaResultado',
      dados: { timeId: time.id, fim, desafio, frases: frase ? [frase] : [] },
    });
  }

  /** Falha com "Tentar de novo": o botão de começar sai e quem recomeça é o do estado. */
  function mostrarErro(texto: string, acao: string): void {
    elErro.innerHTML = estado('erro', texto, { acao });
    aoTocarNoEstado(elErro, () => void comecar());
    elErro.hidden = false;
    btnComecar.hidden = true;
  }

  function mostrarFalha(e: unknown): void {
    pararRelogio();
    elJogo.hidden = true;
    elDecisao.hidden = true;
    elInicio.hidden = false;
    mostrarErro(`${mensagemDe(e)} A prova foi encerrada; começa outra quando quiser.`, 'Nova prova');
    btnComecar.disabled = false;
    partidaId = null;
  }

  // ---------- começar ----------
  async function comecar(): Promise<void> {
    btnComecar.hidden = false;
    btnComecar.disabled = true;
    btnComecar.textContent = 'Preparando…';
    elErro.hidden = true;
    try {
      const api = await servidor();
      const pedir = async (codigo?: string) => {
        if (FALSA) return api.novaProva(codigo);
        await sincronizarTorcedor();
        try {
          return await api.novaProva(codigo);
        } catch (e) {
          if (!(e instanceof ErroServidor) || e.codigo !== 'sem_time') throw e;
          await sincronizarTorcedor(true);
          return api.novaProva(codigo);
        }
      };
      let p;
      try {
        p = await pedir(codigoDesafio);
      } catch (e) {
        if (!(e instanceof ErroServidor) || !codigoDesafio || !['proprio_desafio', 'desafio_nao_encontrado', 'desafio_sem_perguntas', 'desafio_ja_jogado'].includes(e.codigo)) throw e;
        // Link do próprio desafio ou quebrado: vira prova normal.
        const aviso =
          e.codigo === 'desafio_ja_jogado' ? 'Esse X1 você já jogou. Vai uma prova nova!' : 'X1 indisponível. Vai uma prova nova!';
        codigoDesafio = undefined;
        p = await pedir();
        window.setTimeout(() => !saiu && gritar(aviso), 50);
      }
      if (saiu) return;
      partidaId = p.partidaId;
      desafio = p.desafio;
      etapa({ tipo: 'partida', jogo: 'prova', ...(desafio ? { x1: desafio.id } : {}) });
      elInicio.hidden = true;
      degraus.fill('futuro');
      usadas.clear();
      mostrarPergunta(p.pergunta);
    } catch (e) {
      if (saiu) return;
      btnComecar.disabled = false;
      btnComecar.textContent = codigoDesafio ? 'Aceitar o X1' : 'Começar a prova';
      mostrarErro(mensagemDe(e), 'Tentar de novo');
    }
  }
  btnComecar.addEventListener('click', () => void comecar());

  // "?" mostra as regras de novo (só fora da pergunta, que corre contra o relógio).
  $('.prova-como').addEventListener('click', () => {
    // Com a prova rodando o relógio corre: as regras abrem antes de começar (como o "?" dos pênaltis, que só abre fora da defesa).
    if (elInicio.hidden) gritar('As regras abrem antes de começar a prova. Agora é com você!');
    else abrirRegras(root, 'prova');
  });

  $('[data-voltar]').addEventListener('click', () => {
    const noMeio = partidaId && elInicio.hidden;
    if (noMeio && !confirm('Sair da prova? No meio da pergunta conta como tempo esgotado.')) return;
    irPara({ tela: 'inicio' });
  });

  // Convite do desafio (se veio pelo link).
  if (codigoDesafio) {
    verDesafioProva(codigoDesafio)
      .then((d) => {
        if (!d || saiu) return;
        mostrarConvite({ apelido: d.apelido, timeId: d.time_id, pontos: d.pontos, escada: d.escada, resumo: d.resumo });
        btnComecar.textContent = 'Aceitar o X1';
      })
      .catch(() => {});
  }

  pintarEscada(null);

  return () => {
    saiu = true;
    pararRelogio();
    clearTimeout(pausa);
  };
}
