// Aba Perfil (docs/visual.md, seção 3.1): crachá com a carreira, posição na semana, recordes, Conquistas e
// ajustes. Só a própria pessoa vê: nenhuma lista de outras pessoas, e tudo vem do que o servidor já calcula.
// Baixa sob demanda: não pesa no JS inicial da Home.

import '../estilos/perfil.css';
import { esc, irPara, type Rota } from '../app';
import { ID_OUTRO, corDeTexto, timePorId } from '../dados/times';
import { faixaDoAparelho, prefs } from '../estado';
import { rodadaEmFoco } from '../jogo/cravaTela';
import { ordinalRodada } from '../jogo/crava';
import { podeVerPush } from '../jogo/faixaEtaria';
import { linhaDaPosicao, linhaDoRecorde, nomeNoCracha } from '../jogo/perfil';
import type { PosicaoSemana } from '../jogo/posicao';
import { meusRecordes, minhaPosicaoMinigame, minhaPosicaoSemana, type MinigameDoRecorde } from '../servidor/api';
import { jogosDoCrava, minhaPosicaoCrava } from '../servidor/crava';
import { semanaBrasilia } from '../servidor/tempo';
import { carregarCarreiraPerfil } from './carreira';
import { estadoDoAviso, painelDoAviso } from './convitePush';
import { icone } from './icones';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';
import { NOME_DO_NIVEL, escolha, escolherQualidade, qualidade } from './qualidade';
import { vibrar } from './toque';

const SERVIDOR = { minhaPosicaoSemana, minhaPosicaoMinigame, minhaPosicaoCrava, jogosDoCrava, meusRecordes };
// Em desenvolvimento, ?homeFalsa troca o servidor por um de mentira (src/dev/homeFalsa.ts).
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa');
const servidor = (): Promise<typeof SERVIDOR> => (FALSA ? import('../dev/homeFalsa') : Promise.resolve(SERVIDOR));

/** "Gráficos: automático (Média)" ou "Gráficos: Leve". */
function rotuloGraficos(): string {
  const nivel = NOME_DO_NIVEL[qualidade().nivel];
  return `${icone('grafico')} Gráficos: ${escolha() === 'auto' ? `automático (${nivel})` : nivel}`;
}

const NOME_DO_RECORDE: Record<MinigameDoRecorde, string> = {
  penaltis: 'Pênaltis',
  prova: 'Prova de Boleiro',
  dia: 'Time do Dia',
  crava: 'Crava a Rodada',
};

const linha = (rotulo: string, valor: string) => `<div class="perfil-linha"><dt>${rotulo}</dt><dd>${valor}</dd></div>`;

export function telaPerfil(root: HTMLElement, _rota: Rota): () => void {
  const { apelido, nivelNoCard, semVibracao } = prefs.get();
  const time = timePorId(prefs.get().time);
  const dono = time ?? timePorId(ID_OUTRO)!;
  let saiu = false;

  root.innerHTML = `
    <main class="tela perfil">
      <header class="cabecalho"><h2 class="titulo-placar">Perfil</h2></header>

      <section class="cracha" aria-label="Seu crachá"
        style="--c1:${dono.cores[0]};--c2:${dono.cores[1]};--txt:${corDeTexto(dono.cores[0])}">
        <div class="cracha-topo">
          <span class="avatar" aria-hidden="true">${icone('pessoa')}</span>
          <div class="cracha-nomes">
            <p class="cracha-nome">${esc(nomeNoCracha(apelido, time))}</p>
            ${time ? `<p class="rotulo cracha-time">${esc(time.id === ID_OUTRO ? 'Outro time' : time.nome)}</p>` : ''}
          </div>
          ${time ? '<button class="link-trocar" type="button" data-acao="trocar">trocar</button>' : ''}
        </div>
        ${
          !time
            ? '<button class="botao botao-sec" type="button" data-acao="trocar">Escolher meu time</button>'
            : apelido
              ? ''
              : '<button class="botao botao-sec" type="button" data-acao="apelido">Escolher apelido</button>'
        }
        <div class="carreira" data-carreira aria-label="Sua carreira" hidden></div>
      </section>

      ${
        time
          ? `<section class="perfil-bloco" aria-label="Na semana">
        <h3 class="rotulo">Na semana</h3>
        <dl data-semana aria-live="polite"><p class="vazio">Carregando…</p></dl>
      </section>

      <section class="perfil-bloco" aria-label="Recordes">
        <h3 class="rotulo">Recordes</h3>
        <dl data-recordes aria-live="polite"><p class="vazio">Carregando…</p></dl>
      </section>`
          : '<p class="vazio">Escolhe o time pra ver sua carreira, sua posição e seus recordes.</p>'
      }

      <p class="perfil-atalho" aria-disabled="true">${icone('trofeu')} Conquistas <span class="em-breve">em breve</span></p>

      <section class="perfil-bloco" aria-label="Ajustes">
        <h3 class="rotulo">Ajustes</h3>
        <button class="ajuste" type="button" data-acao="graficos" aria-live="polite">${rotuloGraficos()}</button>
        <label class="ajuste">Vibração
          <input class="chave" type="checkbox" role="switch" data-vibracao${semVibracao ? '' : ' checked'}>
        </label>
        <label class="ajuste">Mostrar meu nível nos cards
          <input class="chave" type="checkbox" role="switch" data-nivel-card${nivelNoCard ? ' checked' : ''}>
        </label>
        ${
          podeVerPush(faixaDoAparelho())
            ? `<button class="ajuste" type="button" data-acao="aviso" aria-expanded="false">Aviso de domingo <span data-aviso></span></button>
        <div data-painel-push></div>`
            : ''
        }
        <button class="ajuste" type="button" data-acao="termos">Termos e privacidade</button>
        <button class="ajuste" type="button" data-acao="apagar">Apagar meus dados</button>
      </section>

      ${barraNavegacao('perfil')}
    </main>`;
  ligarBarraNavegacao(root);

  const aqui: Rota = { tela: 'perfil' };
  root.querySelectorAll('[data-acao="trocar"]').forEach((b) =>
    b.addEventListener('click', () => irPara({ tela: 'times', depois: 'perfil' })),
  );
  // "Escolher apelido" usa o campo e o filtro de sempre, na escolha do time.
  root.querySelector('[data-acao="apelido"]')?.addEventListener('click', () => irPara({ tela: 'times', depois: 'perfil', apelido: true }));
  root.querySelector('[data-acao="termos"]')?.addEventListener('click', () => irPara({ tela: 'termos', de: aqui }));
  root.querySelector('[data-acao="apagar"]')?.addEventListener('click', () => irPara({ tela: 'termos', de: aqui, apagar: true }));

  // Gráficos: toque troca automático → alta → média → leve → automático (telas/qualidade.ts).
  const elGraficos = root.querySelector<HTMLButtonElement>('[data-acao="graficos"]')!;
  elGraficos.addEventListener('click', () => {
    const ordem = ['auto', 'alta', 'media', 'leve'] as const;
    escolherQualidade(ordem[(ordem.indexOf(escolha()) + 1) % ordem.length]);
    elGraficos.innerHTML = rotuloGraficos();
  });

  root.querySelector<HTMLInputElement>('[data-vibracao]')!.addEventListener('change', (e) => {
    prefs.set({ semVibracao: !(e.target as HTMLInputElement).checked });
    vibrar('leve');
  });
  root.querySelector<HTMLInputElement>('[data-nivel-card]')!.addEventListener('change', (e) =>
    prefs.set({ nivelNoCard: (e.target as HTMLInputElement).checked }),
  );

  // Aviso de domingo: o mesmo painel do sininho da Home.
  const elAviso = root.querySelector<HTMLButtonElement>('[data-acao="aviso"]');
  if (elAviso) {
    const painel = root.querySelector<HTMLElement>('[data-painel-push]')!;
    const texto = root.querySelector<HTMLElement>('[data-aviso]')!;
    const acender = (ligado: boolean) => (texto.textContent = ligado ? 'ligado' : 'desligado');
    void estadoDoAviso().then((e) => !saiu && acender(e === 'ligado'));
    elAviso.addEventListener('click', () => {
      const abrir = !painel.innerHTML.trim();
      elAviso.setAttribute('aria-expanded', String(abrir));
      if (abrir) void painelDoAviso(painel, acender);
      else painel.innerHTML = '';
    });
  }

  // Sem time ainda, não cria login só para isso.
  if (time) {
    carregarCarreiraPerfil(
      root.querySelector<HTMLElement>('[data-carreira]')!,
      () => saiu,
      FALSA ? () => import('../dev/homeFalsa').then((m) => m.minhaCarreira()) : undefined,
    );
    void carregarSemana(root.querySelector<HTMLElement>('[data-semana]')!);
    void carregarRecordes(root.querySelector<HTMLElement>('[data-recordes]')!);
  }

  async function carregarSemana(el: HTMLElement): Promise<void> {
    try {
      const api = await servidor();
      const nada = () => null;
      const [geral, penaltis, prova, dia, jogos] = await Promise.all([
        api.minhaPosicaoSemana(semanaBrasilia()),
        api.minhaPosicaoMinigame('penaltis').catch(nada),
        api.minhaPosicaoMinigame('prova').catch(nada),
        api.minhaPosicaoMinigame('dia').catch(nada),
        api.jogosDoCrava().catch(() => []),
      ]);
      const rodada = rodadaEmFoco(jogos, new Date());
      const crava = rodada === null ? null : await api.minhaPosicaoCrava(rodada).catch(nada);
      if (saiu) return;
      const comPontos = (p: PosicaoSemana | null) =>
        p?.posicao ? `${linhaDaPosicao(p)} · ${linhaDoRecorde(p.pontos)}` : linhaDaPosicao(p);
      el.innerHTML = [
        linha('Geral', comPontos(geral)),
        linha('Pênaltis', linhaDaPosicao(penaltis)),
        linha('Prova de Boleiro', linhaDaPosicao(prova)),
        linha('Time do Dia, hoje', linhaDaPosicao(dia)),
        ...(rodada === null ? [] : [linha(`Crava, ${ordinalRodada(rodada)} rodada`, linhaDaPosicao(crava))]),
      ].join('');
    } catch {
      if (!saiu) el.innerHTML = '<p class="vazio">Sem conexão com o placar agora.</p>';
    }
  }

  async function carregarRecordes(el: HTMLElement): Promise<void> {
    try {
      const recordes = await (await servidor()).meusRecordes();
      if (saiu) return;
      el.innerHTML = (Object.keys(NOME_DO_RECORDE) as MinigameDoRecorde[])
        .map((m) => linha(NOME_DO_RECORDE[m], linhaDoRecorde(recordes[m])))
        .join('');
    } catch {
      if (!saiu) el.innerHTML = '<p class="vazio">Sem conexão com o placar agora.</p>';
    }
  }

  return () => {
    saiu = true;
  };
}
