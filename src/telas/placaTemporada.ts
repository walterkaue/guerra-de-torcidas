// Placa de fim do mês da Home (docs/jogo.md, seção 5, "Telas do resto das divisões", Rota 1 "tabela final no telão").
// Mora na mesma <section data-placa-trofeu> da placa "Troféu novo" (abaixo do "Jogar agora", por causa do J08) e as
// duas nunca aparecem na mesma abertura: `mostrarPlacaDaHome` tenta a do mês e, sem ela, chama a do troféu.
// Uma vez por mês por aparelho (prefs.temporadaVista); fica visível no resto da abertura e some ao tocar num botão.
// Papel picado e vibração só na primeira vez e só nos destinos de festa. Sem urgência (seção 13).

import '../estilos/placaTrofeu.css';
import '../estilos/placaTemporada.css';
import { esc, irPara } from '../app';
import { ID_OUTRO, rivalDe, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import { chaveDoTrofeu, guardarAnunciados } from '../jogo/galeria';
import {
  caiuNoMes,
  destinoDoMes,
  emblemaDoDestino,
  linhaDoFim,
  mesParaAnunciar,
  mesPorExtenso,
  mesSeguinte,
  nomeDaSerie,
  temFesta,
  TITULO_DO_DESTINO,
  topoDaPlaca,
  trofeusDoMes,
  type DestinoDoMes,
  type LinhaTemporada,
  type Temporada,
} from '../jogo/temporada';
import { eventoDoFim, fraseDaTemporada } from '../narrador/temporada';
import { diaBrasilia } from '../servidor/tempo';
import { lerTemporadas, servidorDaTemporada, temporadaFalsaLigada } from './blocoDivisoes';
import { mandarTemporadaNoGrupo } from './mandarTemporada';
import { papelPicadoNaTela } from './papelPicado';
import { mostrarPlacaTrofeu } from './placaTrofeu';
import { vibrar } from './toque';

interface PlacaDoMes {
  temporada: Temporada;
  linhas: LinhaTemporada[];
  linha: LinhaTemporada;
  destino: DestinoDoMes;
  /** A frase sorteada uma vez; a placa e o card usam a mesma. */
  frase: string | null;
  /** O mês deu troféu à Galeria (nunca na pré-temporada). */
  temTrofeu: boolean;
}

/**
 * Uma leitura por abertura do app. `leitura` guarda a placa do mês (ou `null`: não há, a do troféu tem a vez).
 * `comemorou` marca que a festa já saiu; `dispensada` que a pessoa tocou num botão (a placa não volta nesta abertura).
 */
let leitura: { time: string; placa: Promise<PlacaDoMes | null> } | null = null;
let comemorou = false;
let dispensada = false;

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Emblema desenhado em SVG: nunca taça real nem escudo. */
function emblema(tipo: 'sobe' | 'desce' | 'fica', nome: string): string {
  const miolo =
    tipo === 'fica'
      ? '<rect x="12" y="26" width="40" height="12" rx="3" style="fill:var(--texto-suave)"/>'
      : `<polygon points="32,10 54,36 40,36 40,54 24,54 24,36 10,36" transform="${tipo === 'desce' ? 'rotate(180 32 32)' : ''}" style="fill:${tipo === 'sobe' ? 'var(--subiu)' : 'var(--texto-suave)'}"/>`;
  return `<svg viewBox="0 0 64 64" role="img" aria-label="${esc(nome)}"><rect width="64" height="64" rx="12" fill="rgba(255,255,255,0.08)"/>${miolo}</svg>`;
}

function desenhar(el: HTMLElement, p: PlacaDoMes, time: Time, comemorar: boolean, saiu: () => boolean): void {
  const festa = temFesta(p.destino);
  const titulo = TITULO_DO_DESTINO[p.destino];
  el.classList.remove('so-dialogo');
  el.innerHTML = `<div class="placa-trofeu-miolo">
    <div class="placa placa-trofeu placa-mes filete" style="--c1:${time.cores[0]};--c2:${time.cores[1]}">
      <div class="placa-mes-cab">
        <span class="faixa">${esc(topoDaPlaca(p.temporada.mes))}</span>
        ${p.temporada.pre_temporada ? '<span class="placa-mes-teste">Teste das divisões</span>' : ''}
      </div>
      <div class="placa-trofeu-corpo">
        <div class="placa-trofeu-desenho" data-desenho>${emblema(emblemaDoDestino(p.destino), titulo)}</div>
        <div class="placa-trofeu-texto">
          <strong>${esc(titulo)}</strong>
          <span>${esc(linhaDoFim(p.linha, time))}</span>
        </div>
      </div>
      ${p.frase ? `<p class="adesivo placa-mes-frase">${esc(p.frase)}</p>` : ''}
      <div class="dupla">
        <button class="botao-placa escuro" type="button" data-acao="${p.temTrofeu ? 'ver-galeria' : 'ver-tabela'}">${p.temTrofeu ? 'Ver na Galeria' : 'Ver a tabela'}</button>
        <button class="botao-placa" type="button" data-acao="mandar-mes">Mandar no grupo</button>
      </div>
    </div>
  </div>`;
  el.hidden = false;
  el.classList.toggle('entra', comemorar && !semMovimento());
  const miolo = el.querySelector<HTMLElement>('.placa-trofeu-miolo')!;
  // Tocar em qualquer botão tira a placa do resto da abertura.
  const dispensar = () => {
    dispensada = true;
  };
  el.querySelector('[data-acao="ver-tabela"]')?.addEventListener('click', () => {
    dispensar();
    el.hidden = true;
    irPara({ tela: 'ranking', aba: 'temporada' });
  });
  el.querySelector('[data-acao="ver-galeria"]')?.addEventListener('click', () => {
    dispensar();
    el.hidden = true;
    irPara({ tela: 'ranking', aba: 'conquistas', sub: 'galeria' });
  });
  el.querySelector('[data-acao="mandar-mes"]')!.addEventListener('click', () => {
    // Abre direto no toque, sem await antes (iPhone). O dialog entra em `el`: a placa se esconde, mas `el` fica.
    mandarTemporadaNoGrupo({ temporada: p.temporada, linhas: p.linhas, time, destino: p.destino, frase: p.frase }, { raiz: el });
    dispensar();
    miolo.hidden = true;
    el.classList.add('so-dialogo');
  });
  if (comemorar && festa) {
    if (!semMovimento()) {
      const desenho = el.querySelector('[data-desenho]')!;
      window.setTimeout(() => !saiu() && !dispensada && papelPicadoNaTela(desenho, time.cores), 280);
    }
    vibrar('acerto');
  }
}

/** Lê o mês fechado e decide a placa; grava o mês e os troféus dele como vistos (fora do modo falso). */
async function lerPlaca(time: Time): Promise<PlacaDoMes | null> {
  const falsa = temporadaFalsaLigada();
  const temporada = mesParaAnunciar(await lerTemporadas(), falsa ? undefined : prefs.get().temporadaVista, diaBrasilia());
  if (!temporada) return null;
  const linhas = await (await servidorDaTemporada()).classificacaoDoMes(temporada.mes);
  const linha = linhas.find((l) => l.time_id === time.id);
  const destino = linha ? destinoDoMes(linha, temporada) : null;
  if (!linha || !destino) return null;

  const rival = rivalDe(time);
  const rivalCaiu = !!rival && caiuNoMes(linhas, rival.id);
  const frase = fraseDaTemporada(eventoDoFim(destino, rivalCaiu), {
    time,
    serie: nomeDaSerie(linha.serie),
    mes: mesPorExtenso(mesSeguinte(temporada.mes)),
    rival,
  });
  const trofeus = trofeusDoMes(linha, temporada);
  if (!falsa) {
    // Gravado assim que foi lido: a placa do troféu não repete o que o mês já mostrou.
    const antes = prefs.get().trofeusAnunciados ?? [];
    prefs.set({ temporadaVista: temporada.mes, trofeusAnunciados: guardarAnunciados(antes, trofeus.map(chaveDoTrofeu)) });
  }
  return { temporada, linhas, linha, destino, frase, temTrofeu: trofeus.length > 0 };
}

/**
 * Chamada pela Home depois de desenhar. `el` é a <section data-placa-trofeu hidden>; `timeId` o time do coração.
 * Uma placa só por abertura: a do mês tem a vez; sem ela (ou sem rede), a do "Troféu novo".
 */
export async function mostrarPlacaDaHome(el: HTMLElement, timeId: string | undefined, saiu: () => boolean): Promise<void> {
  const time = timeId && timeId !== ID_OUTRO ? timePorId(timeId) : undefined;
  if (!time) return;
  if (leitura?.time !== time.id) {
    const placa = lerPlaca(time);
    leitura = { time: time.id, placa };
    comemorou = false;
    dispensada = false;
    placa.catch(() => {
      if (leitura?.placa === placa) leitura = null; // sem internet: a próxima Home tenta de novo
    });
  }
  let placa: PlacaDoMes | null;
  try {
    placa = await leitura.placa;
  } catch {
    placa = null;
  }
  if (saiu()) return;
  if (!placa) return mostrarPlacaTrofeu(el, time.id, saiu);
  if (dispensada) return;
  const primeira = !comemorou;
  comemorou = true;
  desenhar(el, placa, time, primeira, saiu);
}

/** Só para testes e depuração: esquece a leitura da abertura. */
export function esquecerLeituraDoMes(): void {
  leitura = null;
  comemorou = false;
  dispensada = false;
}
