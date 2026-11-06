// Placa "Troféu novo na Galeria" da Home (docs/jogo.md, seção 5, "Telas aprovadas em 05/11/2026", item Home).
// Lazy: a Home só leva a <section data-placa-trofeu hidden> vazia e um import() deste arquivo; texto, SVG e CSS
// ficam aqui. Lê a Galeria do time do coração uma vez por abertura do app; mostra o troféu mais novo que este
// aparelho ainda não anunciou (a conta está em jogo/galeria.ts). Papel picado e vibração só na primeira vez.
// Sem urgência (seção 13): nada de "corre", contagem ou "volte".

import '../estilos/placaTrofeu.css';
import { esc, irPara } from '../app';
import { ID_OUTRO, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
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

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function desenhar(el: HTMLElement, a: Anuncio, time: Time, comemorar: boolean, saiu: () => boolean): void {
  const t = a.trofeu;
  const nome = NOME_DO_TROFEU[t.trofeu] + (t.serie === 'b' ? ' · Série B' : '');
  const outros = textoDosOutros(a.outros);
  el.innerHTML = `<div class="placa-trofeu-miolo">
    <div class="placa placa-trofeu filete" style="--c1:${time.cores[0]};--c2:${time.cores[1]}">
      <span class="faixa">Troféu novo na Galeria</span>
      <div class="placa-trofeu-corpo">
        <div class="placa-trofeu-desenho" data-desenho>${svgDoTrofeu(t.trofeu, time.cores, nome)}</div>
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
  // Direto no toque, sem await antes, para o iPhone não perder o gesto de compartilhar.
  el.querySelector('[data-acao="mandar-trofeu"]')!.addEventListener('click', () => mandarTrofeuNoGrupo(t, time));
  if (comemorar && !semMovimento()) {
    const desenho = el.querySelector('[data-desenho]')!;
    window.setTimeout(() => !saiu() && papelPicadoNaTela(desenho, time.cores), 280);
  }
  if (comemorar) vibrar('acerto');
}

/** Lê a Galeria do time e decide o anúncio (grava as chaves no aparelho, fora do modo falso). */
async function lerAnuncio(time: Time): Promise<Anuncio | null> {
  const trofeus = await (await servidorDaGaleria()).trofeusDoTime(time.id);
  const falsa = galeriaFalsaLigada();
  const antes = prefs.get().trofeusAnunciados ?? [];
  const a = trofeuParaAnunciar(trofeus, { meuTime: time.id, anunciados: falsa ? [] : antes, hoje: diaBrasilia() });
  if (a && !falsa) prefs.set({ trofeusAnunciados: guardarAnunciados(antes, a.chaves) });
  return a;
}

/** Chamada pela Home depois de desenhar. `el` é a <section data-placa-trofeu hidden>; `timeId` o time do coração. */
export async function mostrarPlacaTrofeu(el: HTMLElement, timeId: string | undefined, saiu: () => boolean): Promise<void> {
  const time = timeId && timeId !== ID_OUTRO ? timePorId(timeId) : undefined;
  if (!time) return;
  if (leitura?.time !== time.id) {
    const anuncio = lerAnuncio(time);
    leitura = { time: time.id, anuncio };
    comemorou = false;
    anuncio.catch(() => {
      if (leitura?.anuncio === anuncio) leitura = null; // sem internet: nada aparece, e a próxima Home tenta de novo
    });
  }
  try {
    const a = await leitura.anuncio;
    if (!a || saiu()) return;
    // Gravado como anunciado assim que foi lido: se a pessoa saiu antes de ver, a placa ainda aparece nesta abertura.
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
}
