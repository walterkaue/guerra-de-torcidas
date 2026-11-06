// Termos e privacidade (#termos, docs/jogo.md, seção 13): texto em revisão e os botões "Ver meus dados" e
// "Apagar meus dados".

import '../estilos/termos.css';
import { esc, irPara, type Rota } from '../app';
import { timePorId } from '../dados/times';
import texto from '../dados/termos.md?raw';
import { limparAparelho, prefs } from '../estado';
import { linhasDosMeusDados, NADA_GUARDADO, resumoDaMensagem, type MeusDados } from '../jogo/meusDados';
import { DATA_DA_VERSAO, termosEmHtml } from '../jogo/termos';
import { apagarMeusDados, ErroServidor, verMeusDados } from '../servidor/api';
import { cancelarInscricaoDoAparelho } from './convitePush';
import { cabecalhoTela, estado, faixa } from './blocos';

/** Ficha do "Ver meus dados": só leitura, do que o servidor devolveu. */
function htmlDosMeusDados(d: MeusDados | null): string {
  const linhas = linhasDosMeusDados(d, (id) => timePorId(id)?.nome ?? id);
  if (!linhas.length) return `<p>${NADA_GUARDADO}</p>`;
  const mensagens = (d?.mensagens ?? []).map(resumoDaMensagem);
  return `<p>O que o servidor guarda deste aparelho:</p>
    <dl class="termos-fichas">${linhas.map((l) => `<div><dt>${esc(l.rotulo)}</dt><dd>${esc(l.valor)}</dd></div>`).join('')}</dl>
    ${mensagens
      .map(
        (m) =>
          `<div class="termos-mensagem"><p class="rotulo">${esc(m.cabeca)}</p><p>${esc(m.texto)}</p>${m.junto ? `<p><small>${esc(m.junto)}</small></p>` : ''}</div>`,
      )
      .join('')}
    <p><small>As escolhas deste aparelho (som, gráficos, o que já viu) ficam só nele e não vão para o servidor.</small></p>`;
}

const AVISO_APAGAR =
  'Isso apaga seus pontos, partidas e preferências deste aparelho. Os pontos que já foram para a torcida na semana continuam no placar.';

export function telaTermos(root: HTMLElement, rota: Rota): void {
  if (location.hash !== '#termos') history.replaceState(null, '', `${location.pathname}${location.search}#termos`);
  const limparEndereco = () => history.replaceState(null, '', `${location.pathname}${location.search}`);
  // Abriu a página: a faixa "Os Termos mudaram" da Home some.
  prefs.set({ termosVistos: DATA_DA_VERSAO });

  root.innerHTML = `
    <main class="tela termos">
      ${cabecalhoTela({ titulo: 'Termos e privacidade', voltar: true, pre: false })}
      <p class="termos-versao rotulo">Versão em revisão · ${DATA_DA_VERSAO}</p>
      <article class="termos-texto">${termosEmHtml(texto)}</article>
      <section class="termos-apagar placa" aria-label="Seus dados">
        ${faixa('Seus dados')}
        <div class="dupla">
          <button class="botao-linha" type="button" data-acao="ver" aria-expanded="false" aria-controls="meus-dados">Ver meus dados</button>
          <button class="botao-linha" type="button" data-acao="apagar" aria-haspopup="dialog">Apagar meus dados</button>
        </div>
        <div class="termos-dados" id="meus-dados" aria-live="polite" hidden></div>
      </section>
      <button class="botao botao-sec termos-fechar" type="button" data-acao="fechar">Fechar</button>
      <div class="folha" data-folha role="dialog" aria-modal="true" aria-describedby="apagar-aviso" aria-label="Apagar meus dados" hidden>
        <div class="folha-caixa">
          <p id="apagar-aviso">${AVISO_APAGAR}</p>
          <p class="termos-erro" role="alert" hidden></p>
          <button class="botao" type="button" data-acao="ficar">Voltar</button>
          <button class="botao botao-perigo" type="button" data-acao="confirmar">Apagar</button>
        </div>
      </div>
    </main>`;

  // O "Fechar" do fim faz o mesmo que a seta do topo: quem leu até o fim não precisa subir tudo.
  const sair = () => {
    limparEndereco();
    irPara((rota.tela === 'termos' && rota.de) || { tela: 'inicio' });
  };
  root.querySelector('.voltar')!.addEventListener('click', sair);
  root.querySelector('[data-acao="fechar"]')!.addEventListener('click', sair);

  const abrir = root.querySelector<HTMLButtonElement>('[data-acao="apagar"]')!;
  const folha = root.querySelector<HTMLElement>('[data-folha]')!;
  const confirmar = root.querySelector<HTMLButtonElement>('[data-acao="confirmar"]')!;
  const ficar = root.querySelector<HTMLButtonElement>('[data-acao="ficar"]')!;
  const erro = root.querySelector<HTMLElement>('.termos-erro')!;

  if (rota.tela === 'termos' && rota.apagar) abrir.scrollIntoView({ block: 'center' });

  const ver = root.querySelector<HTMLButtonElement>('[data-acao="ver"]')!;
  const dados = root.querySelector<HTMLElement>('.termos-dados')!;
  const mostrarDados = async () => {
    if (!dados.hidden) {
      dados.hidden = true;
      ver.setAttribute('aria-expanded', 'false');
      return;
    }
    dados.hidden = false;
    ver.setAttribute('aria-expanded', 'true');
    ver.disabled = true;
    dados.innerHTML = estado('carregando', 'Buscando no servidor…');
    try {
      dados.innerHTML = htmlDosMeusDados(await verMeusDados());
    } catch {
      dados.innerHTML = estado('erro', 'Não deu pra buscar agora.', { detalhe: 'Confere a internet e toca em Ver meus dados de novo.', acao: '' });
    }
    ver.disabled = false;
  };
  ver.addEventListener('click', mostrarDados);
  // Veio do "Ver meus dados" do Perfil: já abre a ficha, sem rolar a página até o fim (J18).
  if (rota.tela === 'termos' && rota.ver) {
    ver.scrollIntoView({ block: 'center' });
    void mostrarDados();
  }

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
