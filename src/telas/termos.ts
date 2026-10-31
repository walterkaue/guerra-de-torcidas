// Termos e privacidade (#termos, docs/jogo.md, seção 13): texto em revisão e o botão "Apagar meus dados".

import '../estilos/termos.css';
import { irPara, type Rota } from '../app';
import texto from '../dados/termos.md?raw';
import { limparAparelho } from '../estado';
import { DATA_DA_VERSAO, termosEmHtml } from '../jogo/termos';
import { apagarMeusDados, ErroServidor } from '../servidor/api';
import { cancelarInscricaoDoAparelho } from './convitePush';

const AVISO_APAGAR =
  'Isso apaga seus pontos, partidas e preferências deste aparelho. Os pontos que já foram para a torcida na semana continuam no placar.';

export function telaTermos(root: HTMLElement, rota: Rota): void {
  if (location.hash !== '#termos') history.replaceState(null, '', `${location.pathname}${location.search}#termos`);
  const limparEndereco = () => history.replaceState(null, '', `${location.pathname}${location.search}`);

  root.innerHTML = `
    <main class="tela termos">
      <header class="cabecalho">
        <button class="voltar" type="button" aria-label="Voltar">‹</button>
        <h2 class="titulo-placar">Termos e privacidade</h2>
      </header>
      <p class="termos-versao rotulo">Versão em revisão · ${DATA_DA_VERSAO}</p>
      <article class="termos-texto">${termosEmHtml(texto)}</article>
      <section class="termos-apagar" aria-label="Seus dados">
        <button class="botao botao-sec" type="button" data-acao="apagar" aria-haspopup="dialog">Apagar meus dados</button>
      </section>
      <div class="folha" data-folha role="dialog" aria-modal="true" aria-describedby="apagar-aviso" aria-label="Apagar meus dados" hidden>
        <div class="folha-caixa">
          <p id="apagar-aviso">${AVISO_APAGAR}</p>
          <p class="termos-erro" role="alert" hidden></p>
          <button class="botao" type="button" data-acao="confirmar">Apagar</button>
          <button class="botao botao-sec" type="button" data-acao="ficar">Voltar</button>
        </div>
      </div>
    </main>`;

  root.querySelector('.voltar')!.addEventListener('click', () => {
    limparEndereco();
    irPara((rota.tela === 'termos' && rota.de) || { tela: 'inicio' });
  });

  const abrir = root.querySelector<HTMLButtonElement>('[data-acao="apagar"]')!;
  const folha = root.querySelector<HTMLElement>('[data-folha]')!;
  const confirmar = root.querySelector<HTMLButtonElement>('[data-acao="confirmar"]')!;
  const ficar = root.querySelector<HTMLButtonElement>('[data-acao="ficar"]')!;
  const erro = root.querySelector<HTMLElement>('.termos-erro')!;

  if (rota.tela === 'termos' && rota.apagar) abrir.scrollIntoView({ block: 'center' });

  const fechar = () => {
    folha.hidden = true;
    erro.hidden = true;
    abrir.focus();
  };
  abrir.addEventListener('click', () => {
    folha.hidden = false;
    ficar.focus();
  });
  ficar.addEventListener('click', fechar);

  confirmar.addEventListener('click', async () => {
    confirmar.disabled = ficar.disabled = true;
    confirmar.textContent = 'Apagando…';
    erro.hidden = true;
    try {
      await apagarMeusDados();
    } catch (e) {
      erro.textContent =
        e instanceof ErroServidor && e.codigo === 'conta_nao_anonima'
          ? 'Esta conta não é anônima e não se apaga por aqui.'
          : 'Não deu pra apagar agora. Confere a internet e tenta de novo.';
      erro.hidden = false;
      confirmar.disabled = ficar.disabled = false;
      confirmar.textContent = 'Apagar';
      return;
    }
    await cancelarInscricaoDoAparelho();
    limparAparelho();
    limparEndereco();
    irPara({ tela: 'times', depois: 'inicio' });
  });
}
