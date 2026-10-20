// Time do Dia (docs/jogo.md, seção 7.2): um clube secreto por dia, 6 chutes, uma linha de pistas por
// chute. O secreto fica só no servidor; aqui é a lista com busca, a grade e o resultado (com o card).

import { esc, irPara, type Rota } from '../app';
import { corDeTexto, timePorId, TIMES, type Time } from '../dados/times';
import { prefs } from '../estado';
import { desenharCardDia } from '../jogo/cardDia';
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
import { criarNarrador } from '../narrador/sessao';
import {
  ErroServidor,
  estadoDoDia,
  tentarClube,
  type ClubeDaLista,
  type EstadoDoDia,
} from '../servidor/api';
import { sincronizarTorcedor } from '../servidor/torcedor';

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
  estado: 'UF',
  fundacao: 'Fund.',
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
      return c.capital ? 'Cap.' : 'Int.';
  }
}

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

  const mostrarComo = !prefs.get().semComoDia;

  root.innerHTML = `
    <main class="tela time-do-dia" style="--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}">
      <header class="prova-topo">
        <button class="voltar" type="button" aria-label="Voltar">‹</button>
        <p class="rotulo prova-nome" data-titulo>Time do Dia</p>
        <span class="selo-amistoso rotulo" data-amistoso hidden>em teste</span>
        <button class="voltar prova-como" type="button" aria-label="Como jogar">?</button>
      </header>

      <p class="adesivo" data-grito></p>

      <section class="dia-como" data-como ${mostrarComo ? '' : 'hidden'}>
        <ul class="cj-passos">
          <li><span class="cj-icone" aria-hidden="true">🔎</span><p><strong>Um clube secreto por dia</strong>, o mesmo pra todo mundo. Clubes das Séries A, B e C de 2026. Troca às 00h.</p></li>
          <li><span class="cj-icone" aria-hidden="true">⚽</span><p><strong>6 chutes.</strong> Escolha um clube na busca e veja as pistas.</p></li>
          <li><span class="cj-icone" aria-hidden="true">🟩</span><p><strong>🟩 igual, 🟨 perto, ⬜ longe.</strong> Estado (🟨 = mesma região), fundação (🟨 = até 10 anos), títulos do Brasileirão (🟨 = até 2), série, as 2 cores (🟨 = uma igual) e capital ou interior.</p></li>
          <li><span class="cj-icone" aria-hidden="true">↑</span><p><strong>↑ ou ↓</strong> no ano e nos títulos: o secreto tem número maior (fundado depois, mais títulos) ou menor.</p></li>
          <li><span class="cj-icone" aria-hidden="true">🏆</span><p><strong>Pontos:</strong> 100 de primeira, depois 85, 70, 55, 40 e 25.</p></li>
        </ul>
        <label class="cj-check"><input type="checkbox" data-pular> Não exibir de novo</label>
      </section>

      <p class="nota" data-aviso-amistoso hidden>Em teste: ainda não soma no ranking.</p>

      <div class="dia-cabecalho" aria-hidden="true">
        ${NOMES_PISTAS.map((n) => `<span>${SIGLA_CURTA[n]}</span>`).join('')}
      </div>
      <ol class="dia-grade" data-grade aria-label="Seus chutes" aria-live="polite"></ol>

      <section class="dia-chutar" data-chutar hidden>
        <label class="rotulo" for="dia-busca">Seu chute <span data-restam></span></label>
        <input id="dia-busca" class="dia-busca" type="search" autocomplete="off" autocapitalize="none"
          spellcheck="false" placeholder="Busque o clube" enterkeyhint="search" />
        <ul class="dia-resultados" data-resultados></ul>
        <button class="botao" type="button" data-chutar-btn disabled>Escolha um clube</button>
      </section>

      <section class="dia-fim" data-fim hidden></section>

      <p class="vazio" data-carregando>Procurando o time escondido…</p>
      <p class="prova-erro" data-erro hidden></p>
    </main>
  `;

  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const elGrade = $('[data-grade]');
  const elChutar = $('[data-chutar]');
  const elBusca = $<HTMLInputElement>('#dia-busca');
  const elResultados = $('[data-resultados]');
  const btnChutar = $<HTMLButtonElement>('[data-chutar-btn]');
  const elFim = $('[data-fim]');
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

  function erro(texto: string | null): void {
    elErro.hidden = !texto;
    elErro.textContent = texto ?? '';
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
  async function chutar(): Promise<void> {
    if (!estado || !escolhido || enviando) return;
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
    elChutar.hidden = true;
    // O fim já explica se soma ou não: o aviso do topo sairia repetido.
    $('[data-aviso-amistoso]').hidden = true;
    const n = e.tentativas.length;
    if (!frasesFinais.length) {
      const f1 = e.acertou
        ? n === 1
          ? narrador.falar('dia_acertou_primeira')
          : narrador.falar('dia_acertou', { tentativas: n })
        : narrador.falar('dia_errou');
      const f2 = e.sequencia > 1 ? narrador.falar('dia_sequencia', { dias: e.sequencia }) : null;
      frasesFinais = [f1, f2].filter((f): f is string => !!f);
    }
    if (frasesFinais[0]) gritar(frasesFinais[0]);

    const placar = placarDoDia(n, e.acertou);
    const grade = gradeEmoji(e.tentativas.map((t) => t.pistas));
    const link = `${SITE}/?dia`;
    const linha = linhaDoCard(e.numero, placar, e.sequencia, e.amistoso);
    const textoShare = `${linha}\n${grade}\n${conviteDia(n, e.acertou)} ${link}`;
    const situacao = e.amistoso
      ? 'Em teste: ainda não soma no ranking.'
      : `+${e.pontos} no ranking da semana, por fora do teto das 5 partidas.`;

    elFim.innerHTML = `
      <div class="dia-revelado faixa-tv">
        <p class="rotulo">${e.acertou ? 'Achou!' : 'Era o time de hoje'}</p>
        <h2>${esc(e.secreto?.nome ?? '')}</h2>
      </div>
      <div class="dia-placar">
        <strong>${placar}</strong>
        <span>${e.acertou ? `${e.pontos} pontos` : 'sem pontos hoje'}${e.sequencia > 1 ? ` · 🔥 ${e.sequencia} dias` : ''}</span>
      </div>
      ${frasesFinais[1] ? `<p class="adesivo segundo">${esc(frasesFinais[1])}</p>` : ''}
      <p class="situacao${e.amistoso ? ' sem-pontos' : ''}">${esc(situacao)}</p>
      <p class="dia-proximo rotulo">Próximo time em <strong data-relogio>${formatarRelogio(Date.parse(e.proximoEm) - Date.now())}</strong></p>
      <section class="res-compartilhar">
        <a class="botao botao-zap" target="_blank" rel="noopener"
          href="https://wa.me/?text=${encodeURIComponent(textoShare)}">Chamar no X1</a>
        <div class="trio">
          <button class="botao botao-sec" type="button" data-acao="share">Stories</button>
          <button class="botao botao-sec" type="button" data-acao="emoji">Grade em emoji</button>
          <button class="botao botao-sec" type="button" data-acao="copiar">Copiar link</button>
        </div>
      </section>
      <details class="res-card">
        <summary class="rotulo">Ver o card</summary>
        <img class="card" alt="Card do Time do Dia, sem o nome do clube" />
      </details>
      <div class="res-acoes">
        <button class="botao botao-sec" type="button" data-acao="inicio">Início</button>
        <button class="botao" type="button" data-acao="jogar">Pênaltis<small>enquanto o dia não vira</small></button>
      </div>`;
    elFim.hidden = false;

    const elRelogio = elFim.querySelector<HTMLElement>('[data-relogio]')!;
    clearInterval(relogio);
    relogio = window.setInterval(() => {
      const ms = Date.parse(e.proximoEm) - Date.now();
      elRelogio.textContent = formatarRelogio(ms);
      if (ms <= 0) {
        clearInterval(relogio);
        elRelogio.textContent = 'já! Recarrega a página';
      }
    }, 1000);

    // ---------- card ----------
    const img = elFim.querySelector<HTMLImageElement>('.card')!;
    const cardPronto = (async () => {
      try {
        await Promise.all([document.fonts.load('400 100px Anton'), document.fonts.load('700 40px Barlow')]);
      } catch {
        // segue com a fonte que tiver
      }
      const canvas = desenharCardDia({
        time,
        numero: e.numero,
        placar,
        dias: e.sequencia,
        grade,
        frase: frasesFinais[0] ?? '',
        amistoso: e.amistoso,
        link: link.replace('https://', ''),
      });
      img.src = canvas.toDataURL('image/png');
      return canvas;
    })();

    const avisar = (botao: HTMLButtonElement, texto: string) => {
      const antes = botao.textContent;
      botao.textContent = texto;
      setTimeout(() => (botao.textContent = antes), 1800);
    };
    const btnShare = elFim.querySelector<HTMLButtonElement>('[data-acao="share"]')!;
    btnShare.addEventListener('click', async () => {
      try {
        const canvas = await cardPronto;
        const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
        const arquivo = blob ? new File([blob], 'time-do-dia.png', { type: 'image/png' }) : null;
        if (arquivo && navigator.canShare?.({ files: [arquivo] })) await navigator.share({ files: [arquivo], text: textoShare });
        else if (navigator.share) await navigator.share({ text: textoShare });
        else {
          await navigator.clipboard.writeText(textoShare);
          avisar(btnShare, 'Copiado!');
        }
      } catch {
        // cancelou
      }
    });
    const btnEmoji = elFim.querySelector<HTMLButtonElement>('[data-acao="emoji"]')!;
    btnEmoji.addEventListener('click', async () => {
      try {
        if (navigator.share) await navigator.share({ text: textoShare });
        else {
          await navigator.clipboard.writeText(textoShare);
          avisar(btnEmoji, 'Copiado!');
        }
      } catch {
        // cancelou
      }
    });
    const btnCopiar = elFim.querySelector<HTMLButtonElement>('[data-acao="copiar"]')!;
    btnCopiar.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(link);
        avisar(btnCopiar, 'Copiado!');
      } catch {
        avisar(btnCopiar, link);
      }
    });
    elFim.querySelector('[data-acao="inicio"]')?.addEventListener('click', () => irPara({ tela: 'inicio' }));
    elFim.querySelector('[data-acao="jogar"]')?.addEventListener('click', () => irPara({ tela: 'partida' }));
  }

  // ---------- carregar o dia ----------
  async function carregar(): Promise<void> {
    elCarregando.hidden = false;
    try {
      const api = await servidor();
      if (!FALSA) await sincronizarTorcedor();
      const r = await api.estadoDoDia();
      if (saiu) return;
      elCarregando.hidden = true;
      if (!r.pronto) {
        elCarregando.hidden = false;
        elCarregando.textContent = 'O Time do Dia entra em campo já já. Volta mais tarde!';
        return;
      }
      estado = r;
      clubes = r.clubes ?? clubes;
      $('[data-titulo]').textContent = `Time do Dia #${r.numero}`;
      $('[data-amistoso]').hidden = !r.amistoso;
      $('[data-aviso-amistoso]').hidden = !r.amistoso || r.fim;
      desenharGrade();
      if (r.fim) terminar();
      else {
        elChutar.hidden = false;
        atualizarRestam();
        if (!r.tentativas.length) gritar(narrador.falar('dia_abertura'));
      }
    } catch (e) {
      if (saiu) return;
      elCarregando.hidden = true;
      erro(mensagemDe(e));
    }
  }

  // ---------- topo ----------
  $('.prova-como').addEventListener('click', () => {
    const el = $('[data-como]');
    el.hidden = !el.hidden;
  });
  $<HTMLInputElement>('[data-pular]').addEventListener('change', (ev) => {
    const marcado = (ev.target as HTMLInputElement).checked;
    prefs.set({ semComoDia: marcado || undefined });
    if (marcado) $('[data-como]').hidden = true;
  });
  $('.voltar').addEventListener('click', () => irPara({ tela: 'inicio' }));

  void carregar();

  return () => {
    saiu = true;
    clearInterval(relogio);
  };
}
