// Placa "Troféu novo na Galeria" da Home (docs/jogo.md, seção 5, "Telas aprovadas em 05/11/2026", item Home).
// Lazy: a Home só leva a <section data-placa-trofeu hidden> vazia e um import() deste arquivo; texto, SVG e CSS
// ficam aqui. Lê a Galeria do time do coração uma vez por abertura do app; mostra o troféu mais novo que este
// aparelho ainda não anunciou (a conta está em jogo/galeria.ts). Papel picado e vibração só na primeira vez.
// Sem urgência (seção 13): nada de "corre", contagem ou "volte".

import '../estilos/placaTrofeu.css';
import { esc, irPara } from '../app';
import { ID_OUTRO, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import { idDoTrofeu } from '../jogo/avisosCaixa';
import {
  guardarAnunciados,
  NOME_DO_TROFEU,
  periodoDoTrofeu,
  textoDosOutros,
  trofeuParaAnunciar,
  type Anuncio,
} from '../jogo/galeria';
import { galeriaFalsaLigada, servidorDaGaleria } from '../servidor/galeria';
import { diaBrasilia } from '../servidor/tempo';
import { registrarAviso } from './avisosDoAparelho';
import { mandarTrofeuNoGrupo } from './mandarTrofeu';
import { papelPicadoNaTela } from './papelPicado';
import { vibrar } from './toque';
import { svgDoTrofeu } from './trofeusDesenho';

/**
 * Uma leitura por abertura do app: voltar à Home não lê de novo. `leitura` é a leitura (feita ou em andamento) do
 * time; uma Home que chega enquanto ela anda espera a mesma. Falha de rede esquece a leitura, para a próxima Home
 * tentar de novo. `comemorou` marca que o papel picado e a vibração já saíram nesta abertura.
 */
let leitura: { time: string; anuncio: Promise<Anuncio | null> } | null = null;
let comemorou = false;
/** As chaves do troféu vão para o aparelho uma vez por abertura, quando a placa é desenhada. */
let gravouNestaAbertura = false;

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function desenhar(el: HTMLElement, a: Anuncio, time: Time, comemorar: boolean, saiu: () => boolean): void {
  const t = a.trofeu;
  const nome = NOME_DO_TROFEU[t.trofeu] + (t.serie === 'b' ? ' · Série B' : '');
  const outros = textoDosOutros(a.outros);
  el.innerHTML = `<div class="placa-trofeu-miolo">
    <div class="placa placa-trofeu filete" style="--c1:${time.cores[0]};--c2:${time.cores[1]}">
      <span class="faixa">Troféu novo na Galeria</span>
      <div class="placa-trofeu-corpo">
        <div class="placa-trofeu-desenho" data-desenho>${svgDoTrofeu(t.trofeu, time.cores, nome, { contorno: true })}</div>
        <div class="placa-trofeu-texto">
          <strong>${esc(nome)}</strong>
          <span>${esc(periodoDoTrofeu(t))}</span>
          ${outros ? `<span class="adesivo">${esc(outros)}</span>` : ''}
        </div>
      </div>
      <div class="dupla">
        <button class="botao-placa" type="button" data-acao="ver-galeria">Ver na Galeria</button>
        <button class="botao-placa" type="button" data-acao="mandar-trofeu">Mandar no grupo</button>
      </div>
    </div>
  </div>`;
  el.hidden = false;
  // Entra com animação só na primeira vez; ao voltar à Home a placa já está no lugar.
  el.classList.toggle('entra', comemorar && !semMovimento());
  el.querySelector('[data-acao="ver-galeria"]')!.addEventListener('click', () => irPara({ tela: 'ranking', aba: 'conquistas', sub: 'galeria' }));
  // Abre a tela SEU CARD direto no toque, sem await antes; a placa sorteia a frase do narrador.
  el.querySelector('[data-acao="mandar-trofeu"]')!.addEventListener('click', () => mandarTrofeuNoGrupo(t, time, { raiz: el }));
  if (comemorar && !semMovimento()) {
    const desenho = el.querySelector('[data-desenho]')!;
    window.setTimeout(() => !saiu() && papelPicadoNaTela(desenho, time.cores), 280);
  }
  if (comemorar) vibrar('acerto');
}

/** Lê a Galeria do time e decide o anúncio. Só lê: as chaves vão para o aparelho quando a placa é desenhada. */
async function lerAnuncio(time: Time): Promise<Anuncio | null> {
  const trofeus = await (await servidorDaGaleria()).trofeusDoTime(time.id);
  const antes = prefs.get().trofeusAnunciados ?? [];
  return trofeuParaAnunciar(trofeus, { meuTime: time.id, anunciados: galeriaFalsaLigada() ? [] : antes, hoje: diaBrasilia() });
}

function timeDaPlaca(timeId: string | undefined): Time | undefined {
  return timeId && timeId !== ID_OUTRO ? timePorId(timeId) : undefined;
}

/** A leitura da abertura, em andamento ou pronta. */
function leituraDoTrofeu(time: Time): Promise<Anuncio | null> {
  if (leitura?.time !== time.id) {
    const anuncio = lerAnuncio(time);
    leitura = { time: time.id, anuncio };
    comemorou = false;
    gravouNestaAbertura = false;
    anuncio.catch(() => {
      if (leitura?.anuncio === anuncio) leitura = null; // sem internet: nada aparece, e a próxima Home tenta de novo
    });
  }
  return leitura.anuncio;
}

/** Há troféu novo para anunciar? Falha de rede conta como não. Não grava nada: o aviso que perder a vaga volta na próxima abertura. */
export async function haPlacaDoTrofeu(timeId: string | undefined): Promise<boolean> {
  const time = timeDaPlaca(timeId);
  if (!time) return false;
  try {
    return (await leituraDoTrofeu(time)) !== null;
  } catch {
    return false;
  }
}

/**
 * Desenha a placa em `el` (a <section data-placa-trofeu>); a Home chama depois de `haPlacaDoTrofeu` dar sim e de a vaga
 * do momento escolher este aviso. Grava o troféu como anunciado ao desenhar (fora do modo falso).
 */
export async function mostrarPlacaTrofeu(el: HTMLElement, timeId: string | undefined, saiu: () => boolean): Promise<void> {
  const time = timeDaPlaca(timeId);
  if (!time) return;
  try {
    const a = await leituraDoTrofeu(time);
    if (!a || saiu()) return;
    if (!galeriaFalsaLigada() && !gravouNestaAbertura) {
      gravouNestaAbertura = true;
      prefs.set({ trofeusAnunciados: guardarAnunciados(prefs.get().trofeusAnunciados ?? [], a.chaves) });
      registrarAviso(a.chaves.map(idDoTrofeu));
    }
    const primeira = !comemorou;
    comemorou = true;
    desenhar(el, a, time, primeira, saiu);
  } catch {
    // sem internet: nada aparece, sem aviso
  }
}

/** Só para testes e depuração: esquece a leitura da abertura. */
export function esquecerLeitura(): void {
  leitura = null;
  comemorou = false;
  gravouNestaAbertura = false;
}
