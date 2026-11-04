// Tela de "carregando" enquanto o código de uma tela baixa (docs/visual.md, "Carregando").
// Em vez de um texto solto numa tela vazia, que na internet lenta parece travado, mostra o
// formato da tela (cabeçalho e blocos) com um brilho passando e a bola girando. Só CSS.

import { estado } from './blocos';
import { icone } from './icones';

export function telaCarregando(rotulo: string): string {
  return `<main class="tela esqueleto" aria-busy="true">
    <div class="esq-cabecalho"><span class="esq esq-voltar"></span><span class="esq esq-titulo"></span></div>
    <span class="esq esq-bloco grande"></span>
    <span class="esq esq-bloco"></span>
    <span class="esq esq-bloco"></span>
    <p class="esq-rotulo" role="status"><span class="esq-bola">${icone('bola')}</span>${rotulo}</p>
  </main>`;
}

/** Quando o código da tela não baixou (sem rede no meio do caminho). */
export function telaSemRede(): string {
  // O botão do estado carrega data-tentar: quem chama (main.ts) liga o clique pelos dois ganchos.
  const erro = estado('erro', 'Sem conexão pra abrir essa tela agora.', { acao: 'Tentar de novo' }).replace(
    'data-estado-acao',
    'data-estado-acao data-tentar',
  );
  return `<main class="tela esqueleto sem-rede">
    ${erro}
    <button class="botao-linha" type="button" data-inicio>Voltar pro início</button>
  </main>`;
}
