// Convite "Defende sua cidade também?" (docs/jogo.md, seção 3): aparece no resultado da 1ª partida de qualquer
// jogo, uma vez por aparelho. "Agora não" só fecha; o lembrete semanal fica na Home.

import '../estilos/cidade.css';
import { irPara, type Rota } from '../app';
import { prefs } from '../estado';
import { diaBrasilia } from '../servidor/tempo';
import { minhaCidade } from '../servidor/cidade';

/** Pode convidar? Só se este aparelho ainda não viu o convite. */
export const podeConvidarCidade = (visto: string | undefined = prefs.get().cidadeConvite): boolean => !visto;

/**
 * Põe o convite em `el` depois da partida. `voltarPara` é a tela de onde a pessoa veio ao fechar a escolha
 * (o resultado não se refaz, então vai para a Home).
 */
export async function convidarParaCidade(el: HTMLElement | null, voltarPara: Rota = { tela: 'inicio' }): Promise<void> {
  if (!el || !podeConvidarCidade() || !prefs.get().time) return;
  try {
    // Quem já tem cidade (escolheu em outro aparelho) não precisa do convite.
    if (await minhaCidade()) {
      prefs.set({ cidadeConvite: diaBrasilia() });
      return;
    }
  } catch {
    return; // sem conexão: tenta na próxima partida
  }
  if (!el.isConnected || !podeConvidarCidade()) return;
  prefs.set({ cidadeConvite: diaBrasilia() });
  el.innerHTML = `<section class="convite-cidade" aria-label="Sua cidade">
    <p class="rotulo">📍 Defende sua cidade também?</p>
    <p>Escolhe a sua cidade e seus pontos somam também pra ela e pro seu estado. Seu apelido não aparece junto.</p>
    <div class="dupla">
      <button class="botao" type="button" data-acao="cidade-sim">Escolher a cidade</button>
      <button class="botao botao-sec" type="button" data-acao="cidade-nao">Agora não</button>
    </div>
  </section>`;
  el.querySelector('[data-acao="cidade-nao"]')!.addEventListener('click', () => (el.innerHTML = ''));
  el.querySelector('[data-acao="cidade-sim"]')!.addEventListener('click', () => irPara({ tela: 'cidade', depois: voltarPara }));
}
