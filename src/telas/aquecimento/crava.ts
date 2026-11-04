// Estação 5 (Crava) do Aquecimento: o próximo jogo do time, placar com − e +, botão Cravar. VALE de verdade:
// grava o palpite no servidor. Se falhar (jogo começou, sem rede), mostra o erro curto e segue sem palpite.

import { esc } from '../../app';
import { corDeTexto, timePorId } from '../../dados/times';
import { PLACAR_INICIAL } from '../../jogo/aquecimento';
import { GOLS_MAX, type Placar } from '../../jogo/crava';
import { AVISO_RESENHA, horaDoJogo } from '../../jogo/cravaTela';
import { ErroServidor } from '../../servidor/api';
import { centroNoPalco, demonstrar } from './mao';
import type { Estacao } from './tipos';

export interface JogoDoAquecimento {
  id: string;
  mandante_id: string;
  visitante_id: string;
  inicio: string;
}

export interface OpcoesDoCrava {
  jogo: JogoDoAquecimento;
  /** Grava o palpite (o `cravar` do servidor, ou o de mentira do dev). */
  cravar(jogoId: string, placar: Placar): Promise<void>;
  /** Avisa a tela do fim qual foi o palpite. */
  aoCravar(jogo: JogoDoAquecimento, placar: Placar): void;
}

/** Erro curto: o que a pessoa lê quando o palpite não entra. */
export function erroDoPalpite(e: unknown): string {
  if (e instanceof ErroServidor && e.codigo === 'fechado') return 'Esse jogo já começou: seguimos sem o palpite.';
  return 'Sem conexão: seguimos sem o palpite.';
}

export function estacaoCrava({ jogo, cravar, aoCravar }: OpcoesDoCrava): Estacao {
  return (ctx) => {
    const { palco, reduzido } = ctx;
    const placar: Placar = { ...PLACAR_INICIAL };
    const lados = [
      { chave: 'm' as const, time: timePorId(jogo.mandante_id) },
      { chave: 'v' as const, time: timePorId(jogo.visitante_id) },
    ];
    const secao = document.createElement('section');
    secao.className = 'placa filete aq-crava';
    secao.innerHTML = `
      <p class="faixa">Próximo jogo · ${esc(horaDoJogo(jogo.inicio))}</p>
      <div class="aq-confronto">
        ${lados
          .map(
            ({ chave, time }) => `
          <div class="aq-lado" style="--c1:${time?.cores[0] ?? '#444'};--c2:${time?.cores[1] ?? '#888'};--txt:${corDeTexto(time?.cores[0] ?? '#444')}">
            <span class="aq-camisa" aria-hidden="true"></span>
            <strong class="aq-nome">${esc(time?.nome ?? 'Time')}</strong>
            <div class="aq-gols">
              <button type="button" class="aq-passo" data-passo="${chave}:-1" aria-label="Menos um gol do ${esc(time?.nome ?? 'time')}">−</button>
              <output data-gols="${chave}" aria-live="polite">${placar[chave]}</output>
              <button type="button" class="aq-passo" data-passo="${chave}:1" aria-label="Mais um gol do ${esc(time?.nome ?? 'time')}">+</button>
            </div>
          </div>`,
          )
          .join('<span class="aq-x" aria-hidden="true">x</span>')}
      </div>
      <button class="botao" type="button" data-cravar>Cravar</button>
      <p class="aq-erro" role="alert" hidden></p>
      <p class="aq-resenha" role="note">${esc(AVISO_RESENHA)}</p>`;
    palco.append(secao);

    const erro = secao.querySelector<HTMLElement>('.aq-erro')!;
    const botaoCravar = secao.querySelector<HTMLButtonElement>('[data-cravar]')!;
    let trava = false;
    let acabou = false;
    let tiraMao: (() => void) | null = null;

    const mostrar = () => {
      for (const { chave } of lados) secao.querySelector(`[data-gols="${chave}"]`)!.textContent = String(placar[chave]);
    };
    secao.querySelectorAll<HTMLButtonElement>('[data-passo]').forEach((b) =>
      b.addEventListener('click', () => {
        if (trava) return;
        const [chave, delta] = b.dataset.passo!.split(':') as ['m' | 'v', string];
        placar[chave] = Math.max(0, Math.min(GOLS_MAX, placar[chave] + Number(delta)));
        mostrar();
      }),
    );

    botaoCravar.addEventListener('click', async () => {
      if (trava) return;
      trava = true;
      tiraMao?.();
      secao.querySelectorAll('button').forEach((b) => (b.disabled = true));
      try {
        await cravar(jogo.id, { ...placar });
        if (acabou) return;
        aoCravar(jogo, { ...placar });
      } catch (e) {
        if (acabou) return;
        erro.textContent = erroDoPalpite(e);
        erro.hidden = false;
      }
      // Sem palpite: o erro fica na tela um pouco mais, sem o grito de "palpite feito".
      ctx.concluir(true, erro.hidden ? undefined : { semGrito: true, pausaMs: 2800 });
    });

    // A mão toca no + do mandante e depois em Cravar.
    const timer = window.setTimeout(() => {
      if (acabou || trava) return;
      const mais = secao.querySelector('[data-passo="m:1"]')!;
      tiraMao = demonstrar(palco, { tipo: 'toca', em: [centroNoPalco(palco, mais), centroNoPalco(palco, botaoCravar)] }, reduzido);
    }, 600);

    return () => {
      acabou = true;
      window.clearTimeout(timer);
      tiraMao?.();
    };
  };
}
