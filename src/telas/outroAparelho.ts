// "Jogar em outro aparelho" (docs/jogo.md, seção 14.1): mostra o código de 8 caracteres e o QR, com contador de
// 10 minutos, e fica de olho até o outro aparelho entrar. O código só vive nesta tela: não vai para console,
// armazenamento, endereço nem card.

import '../estilos/aparelhos.css';
import { esc, irPara, type Rota } from '../app';
import { AVISO_DO_CODIGO, mensagemDoCodigo, tempoRestante } from '../jogo/aparelhos';
import { formatarCodigo, linkDoCodigo } from '../jogo/codigoTorcedor';
import { svgDoQr } from '../jogo/qrSvg';
import { ErroServidor } from '../servidor/api';
import { montarAparelhos } from './aparelhosLigados';
import { servidorDoCodigo } from './codigoApi';

const CONSULTA_MS = 5000;

export function telaOutroAparelho(root: HTMLElement, _rota: Rota): () => void {
  root.innerHTML = `
    <main class="tela outro-aparelho">
      <header class="cabecalho">
        <button class="voltar" type="button" aria-label="Voltar">‹</button>
        <h2>Jogar em outro aparelho</h2>
      </header>
      <p class="campo-dica">No outro aparelho, aponta a câmera pro QR. Ou abre o Guerra de Torcidas e digita o código em "Já jogo em outro aparelho", na escolha do time, ou no Perfil. Vira o mesmo torcedor: carreira, medalhas, recordes e time.</p>

      <section class="codigo-caixa" data-caixa aria-live="polite"><p class="vazio">Sorteando o código…</p></section>
      <p class="aviso-codigo" role="note">${esc(AVISO_DO_CODIGO)}</p>
      <button class="botao botao-sec" type="button" data-acao="outro" disabled>Gerar outro</button>

      <section class="perfil-bloco" aria-label="Aparelhos ligados">
        <h3 class="rotulo">Aparelhos ligados</h3>
        <div data-aparelhos></div>
      </section>
    </main>`;

  const caixa = root.querySelector<HTMLElement>('[data-caixa]')!;
  const gerarOutro = root.querySelector<HTMLButtonElement>('[data-acao="outro"]')!;
  let saiu = false;
  /** Cada código gerado ganha um número; resposta de código antigo é ignorada. */
  let rodada = 0;
  let relogio: number | undefined;
  let consulta: number | undefined;
  let expiraEm = '';
  let ativo = false;

  const recarregarAparelhos = montarAparelhos(root.querySelector<HTMLElement>('[data-aparelhos]')!, () => saiu);

  root.querySelector('.voltar')!.addEventListener('click', () => irPara({ tela: 'perfil' }));

  function parar(): void {
    ativo = false;
    clearInterval(relogio);
    clearInterval(consulta);
    relogio = consulta = undefined;
  }

  function vencido(): void {
    parar();
    caixa.innerHTML = '<p class="codigo-pronto">Código vencido</p><p class="campo-dica">Gera outro pra entrar no outro aparelho.</p>';
  }

  async function usado(): Promise<void> {
    parar();
    // Na junção a pessoa pode ter ficado com o time do outro aparelho: busca de novo e, se mudou, avisa.
    let mudou = false;
    try {
      mudou = await (await servidorDoCodigo()).puxarTorcedor(true);
    } catch {
      // sem rede: o time se acerta na próxima sincronização
    }
    if (saiu) return;
    caixa.innerHTML = `<p class="codigo-pronto">Pronto! O outro aparelho entrou.</p>${
      mudou ? '<p class="campo-dica">Na junção, o time do outro aparelho ficou. Seu time mudou.</p><button class="botao botao-sec" type="button" data-acao="home">Ir pra Home</button>' : ''
    }`;
    caixa.querySelector('[data-acao="home"]')?.addEventListener('click', () => irPara({ tela: 'inicio' }));
    void recarregarAparelhos();
  }

  async function consultar(): Promise<void> {
    if (!ativo || document.visibilityState !== 'visible') return;
    const minha = rodada;
    try {
      const status = await (await servidorDoCodigo()).statusDoCodigo();
      if (saiu || minha !== rodada || !ativo) return;
      if (status === 'usado') void usado();
      else if (status === 'vencido') vencido();
    } catch {
      // sem rede: tenta na próxima
    }
  }

  const aoVoltarAVer = () => void consultar();
  document.addEventListener('visibilitychange', aoVoltarAVer);

  async function gerar(): Promise<void> {
    const minha = ++rodada;
    parar();
    gerarOutro.disabled = true;
    caixa.innerHTML = '<p class="vazio">Sorteando o código…</p>';
    try {
      const api = await servidorDoCodigo();
      const g = await api.gerarCodigo();
      // O QR vem de um pedaço à parte: só quem abre esta tela baixa.
      const { encode } = await import('uqr');
      if (saiu || minha !== rodada) return;
      const qr = svgDoQr(encode(linkDoCodigo(location.origin, g.codigo), { ecc: 'M', border: 0 }).data);
      expiraEm = g.expiraEm;
      caixa.innerHTML = `
        <div class="codigo-qr">${qr}</div>
        <p class="codigo-grande" aria-label="Código ${esc(g.codigo.split('').join(' '))}">${esc(formatarCodigo(g.codigo))}</p>
        <p class="codigo-tempo">Vale por <span data-tempo></span></p>`;
      ativo = true;
      const tempo = caixa.querySelector<HTMLElement>('[data-tempo]')!;
      const tique = () => {
        if (Date.parse(expiraEm) <= Date.now()) return vencido();
        tempo.textContent = tempoRestante(expiraEm);
      };
      tique();
      relogio = window.setInterval(tique, 1000);
      consulta = window.setInterval(() => void consultar(), CONSULTA_MS);
    } catch (e) {
      if (saiu || minha !== rodada) return;
      const c = e instanceof ErroServidor ? e.codigo : 'falha';
      if (c === 'saiu_da_conta') return;
      caixa.innerHTML = `<p class="erro-campo" role="alert">${esc(mensagemDoCodigo(c))}</p>`;
    }
    if (!saiu && minha === rodada) gerarOutro.disabled = false;
  }

  gerarOutro.addEventListener('click', () => void gerar());
  void gerar();

  return () => {
    saiu = true;
    parar();
    document.removeEventListener('visibilitychange', aoVoltarAVer);
  };
}
