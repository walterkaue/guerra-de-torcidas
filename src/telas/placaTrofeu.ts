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

/** Uma leitura por abertura do app: voltar à Home não lê de novo. `anuncio` fica para a placa voltar se a Home redesenhar. */
let lidoDoTime: string | null = null;
let anuncio: Anuncio | null = null;

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function desenhar(el: HTMLElement, a: Anuncio, time: Time, comemorar: boolean): void {
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
  el.classList.toggle('entra', !semMovimento());
  el.querySelector('[data-acao="ver-galeria"]')!.addEventListener('click', () => irPara({ tela: 'ranking', aba: 'conquistas', sub: 'galeria' }));
  // Direto no toque, sem await antes, para o iPhone não perder o gesto de compartilhar.
  el.querySelector('[data-acao="mandar-trofeu"]')!.addEventListener('click', () => mandarTrofeuNoGrupo(t, time));
  if (comemorar && !semMovimento()) {
    const desenho = el.querySelector('[data-desenho]')!;
    window.setTimeout(() => papelPicadoNaTela(desenho, time.cores), 280);
  }
  if (comemorar) vibrar('acerto');
}

/** Chamada pela Home depois de desenhar. `el` é a <section data-placa-trofeu hidden>; `timeId` o time do coração. */
export async function mostrarPlacaTrofeu(el: HTMLElement, timeId: string | undefined, saiu: () => boolean): Promise<void> {
  const time = timeId && timeId !== ID_OUTRO ? timePorId(timeId) : undefined;
  if (!time) return;
  if (lidoDoTime === time.id) {
    // Mesma abertura: sem nova leitura. Se já anunciou algo, a placa continua, sem festa de novo.
    if (anuncio && !saiu()) desenhar(el, anuncio, time, false);
    return;
  }
  lidoDoTime = time.id;
  anuncio = null;
  try {
    const trofeus = await (await servidorDaGaleria()).trofeusDoTime(time.id);
    if (saiu()) {
      lidoDoTime = null; // saiu antes de ver: a próxima Home lê de novo
      return;
    }
    const falsa = galeriaFalsaLigada();
    const antes = prefs.get().trofeusAnunciados ?? [];
    const a = trofeuParaAnunciar(trofeus, { meuTime: time.id, anunciados: falsa ? [] : antes, hoje: diaBrasilia() });
    if (!a) return;
    anuncio = a;
    if (!falsa) prefs.set({ trofeusAnunciados: guardarAnunciados(antes, a.chaves) });
    desenhar(el, a, time, true);
  } catch {
    // sem internet: nada aparece, sem aviso
  }
}

/** Só para testes e depuração: esquece a leitura da abertura. */
export function esquecerLeitura(): void {
  lidoDoTime = null;
  anuncio = null;
}
