// Aba Perfil (docs/visual.md, seção 3.1): crachá com a carreira, posição na semana, recordes, Conquistas e
// ajustes. Só a própria pessoa vê: nenhuma lista de outras pessoas, e tudo vem do que o servidor já calcula.
// Baixa sob demanda: não pesa no JS inicial da Home.

import '../estilos/perfil.css';
import '../estilos/cidade.css';
import { esc, irPara, type Rota } from '../app';
import { ID_OUTRO, corDeTexto, timePorId } from '../dados/times';
import { faixaDoAparelho, prefs } from '../estado';
import { rodadaEmFoco } from '../jogo/cravaTela';
import { ordinalRodada } from '../jogo/crava';
import { podeVerPush } from '../jogo/faixaEtaria';
import { nomeNoCracha } from '../jogo/perfil';
import type { PosicaoSemana } from '../jogo/posicao';
import { meusRecordes, minhaPosicaoMinigame, minhaPosicaoSemana, type MinigameDoRecorde } from '../servidor/api';
import { jogosDoCrava, minhaPosicaoCrava } from '../servidor/crava';
import { semanaBrasilia } from '../servidor/tempo';
import { montarAparelhos } from './aparelhosLigados';
import { aoTocarNoEstado, cabecalhoTela, estado, faixa, numero, placa, posicaoHtml, selo } from './blocos';
import { carregarCarreiraPerfil } from './carreira';
import { lancesUnificados } from './corte';
import { estadoDoAviso, painelDoAviso } from './convitePush';
import { icone } from './icones';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';
import { NOME_DO_NIVEL, escolha, escolherQualidade, qualidade } from './qualidade';
import { vibrar } from './toque';
import { minhaCidade } from '../servidor/cidade';
import { rotuloDaCidade } from '../jogo/cidade';

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
  prova: 'Prova',
  dia: 'Time do Dia',
  crava: 'Crava',
  lances: 'Lances',
};

export function telaPerfil(root: HTMLElement, _rota: Rota): () => void {
  const { apelido, nivelNoCard, semVibracao } = prefs.get();
  // Lances unificados (jogo.md 14.7): a partir do corte, posição e recorde dos pênaltis são os dos Lances (o
  // servidor junta os dois), então o Perfil mostra só "Lances".
  const unificada = lancesUnificados();
  const time = timePorId(prefs.get().time);
  const dono = time ?? timePorId(ID_OUTRO)!;
  let saiu = false;

  // Destaque do cabeçalho: o apelido; sem apelido (ou sem time), o convite para escolher.
  const destaque = !time
    ? `<button class="perfil-destaque convite" type="button" data-acao="trocar">Escolha seu time ${icone('lapis')}</button>`
    : apelido
      ? `<p class="perfil-destaque">${esc(apelido)}</p>`
      : `<button class="perfil-destaque convite" type="button" data-acao="apelido">Escolha seu apelido ${icone('lapis')}</button>`;

  root.innerHTML = `
    <main class="tela perfil"
      style="--c1:${dono.cores[0]};--c2:${dono.cores[1]};--txt:${corDeTexto(dono.cores[0])}">
      ${cabecalhoTela({ titulo: 'Perfil' })}

      <section class="perfil-cab placa filete" aria-label="Seu crachá">
        <span class="avatar avatar-g" aria-hidden="true">${icone('pessoa')}</span>
        <div class="perfil-nomes">
          ${destaque}
          ${
            time
              ? `<p class="perfil-time">${esc(nomeNoCracha(undefined, time))}
                  <button class="link-mini" type="button" data-acao="trocar">trocar</button></p>`
              : ''
          }
        </div>
      </section>

      <section class="placa perfil-bloco" aria-label="Sua cidade">
        ${faixa('Cidade')}
        <p class="cidade-perfil" data-cidade aria-live="polite">Buscando…</p>
      </section>

      ${
        time
          ? `<section class="placa" data-carreira aria-label="Sua carreira" hidden></section>

      <section class="placa" aria-label="Na semana">
        ${faixa('Na semana')}
        <div data-semana aria-live="polite">${estado('carregando', 'Buscando suas posições…')}</div>
      </section>

      <section class="placa" aria-label="Recordes">
        ${faixa('Recordes')}
        <div data-recordes aria-live="polite">${estado('carregando', 'Buscando seus recordes…')}</div>
      </section>`
          : placa(estado('vazio', 'Escolhe o time pra ver sua carreira, sua posição e seus recordes.', { acao: 'Escolher meu time' }), {
              attrs: 'data-sem-time',
            })
      }

      <section class="placa perfil-bloco" aria-label="Outros aparelhos">
        ${faixa('Aparelhos ligados')}
        ${time ? '<div data-aparelhos></div><button class="ajuste" type="button" data-acao="outro-aparelho">Jogar em outro aparelho</button>' : '<p class="vazio">Escolhe o time pra ligar outro aparelho.</p>'}
        <button class="ajuste" type="button" data-acao="entrar-codigo">Entrar com código de outro aparelho</button>
      </section>

      <section class="placa perfil-bloco" aria-label="Aquecimento">
        ${faixa('Aquecimento')}
        ${prefs.get().aquecimento?.aquecido ? '<p class="perfil-selo">' + selo('Aquecido', 'ouro') + '</p>' : ''}
        <button class="ajuste" type="button" data-acao="aquecimento">Rever aquecimento</button>
      </section>

      <button class="perfil-atalho" type="button" data-acao="conquistas">${icone('trofeu')} Conquistas</button>

      <section class="placa perfil-bloco" aria-label="Ajustes">
        ${faixa('Ajustes')}
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
  const semTime = root.querySelector('[data-sem-time]');
  if (semTime) aoTocarNoEstado(semTime, () => irPara({ tela: 'times', depois: 'perfil' }));
  // "Escolha seu apelido" usa o campo e o filtro de sempre, na escolha do time.
  root.querySelector('[data-acao="apelido"]')?.addEventListener('click', () => irPara({ tela: 'times', depois: 'perfil', apelido: true }));
  root.querySelector('[data-acao="outro-aparelho"]')?.addEventListener('click', () => irPara({ tela: 'outroAparelho' }));
  root.querySelector('[data-acao="entrar-codigo"]')?.addEventListener('click', () => irPara({ tela: 'entrar', de: 'perfil' }));
  const elAparelhos = root.querySelector<HTMLElement>('[data-aparelhos]');
  if (elAparelhos) montarAparelhos(elAparelhos, () => saiu);
  root.querySelector('[data-acao="aquecimento"]')?.addEventListener('click', () => irPara({ tela: 'aquecimento', depois: aqui }));
  root.querySelector('[data-acao="conquistas"]')?.addEventListener('click', () => irPara({ tela: 'ranking', aba: 'conquistas' }));
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

  void carregarCidade(root.querySelector<HTMLElement>('[data-cidade]')!);

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

  /** "Sua cidade: Caraguatatuba · SP  trocar", ou o convite para escolher. */
  async function carregarCidade(el: HTMLElement): Promise<void> {
    const irParaEscolha = () => irPara({ tela: 'cidade', depois: aqui });
    try {
      const c = await minhaCidade();
      if (saiu) return;
      el.innerHTML = c
        ? `Sua cidade: <strong>${esc(rotuloDaCidade(c.nome, c.uf))}</strong> <button class="link-mini" type="button" data-acao="cidade">trocar</button>`
        : '<button class="ajuste" type="button" data-acao="cidade">Escolher sua cidade</button>';
    } catch {
      if (saiu) return;
      el.innerHTML = 'Não consegui ver sua cidade agora. <button class="link-mini" type="button" data-acao="cidade-de-novo">tentar de novo</button>';
      el.querySelector('[data-acao="cidade-de-novo"]')!.addEventListener('click', () => void carregarCidade(el));
      return;
    }
    el.querySelector('[data-acao="cidade"]')!.addEventListener('click', irParaEscolha);
  }

  /** Erro com "Tentar de novo", que refaz a mesma busca. */
  function semConexao(el: HTMLElement, tentar: () => void): void {
    el.innerHTML = estado('erro', 'Sem conexão com o placar agora.');
    aoTocarNoEstado(el, () => {
      el.innerHTML = estado('carregando', 'Buscando…');
      tentar();
    });
  }

  /** Posição como número grande ("3º de 4"); quem ainda não pontuou ali vê um traço. */
  const posicao = (p: Pick<PosicaoSemana, 'posicao' | 'total'> | null, rotulo: string, tom?: 'destaque') =>
    p?.posicao ? numero(posicaoHtml(p.posicao, p.total), rotulo, tom) : numero('—', rotulo, 'apagado');

  async function carregarSemana(el: HTMLElement): Promise<void> {
    try {
      const api = await servidor();
      const nada = () => null;
      const [geral, penaltis, prova, dia, lances, jogos] = await Promise.all([
        api.minhaPosicaoSemana(semanaBrasilia()),
        api.minhaPosicaoMinigame('penaltis').catch(nada),
        api.minhaPosicaoMinigame('prova').catch(nada),
        api.minhaPosicaoMinigame('dia').catch(nada),
        api.minhaPosicaoMinigame('lances').catch(nada),
        api.jogosDoCrava().catch(() => []),
      ]);
      const rodada = rodadaEmFoco(jogos, new Date());
      const crava = rodada === null ? null : await api.minhaPosicaoCrava(rodada).catch(nada);
      if (saiu) return;
      el.innerHTML = `
        <div class="numeros dois">
          ${posicao(geral, 'Geral na semana', 'destaque')}
          ${geral?.posicao ? numero(geral.pontos.toLocaleString('pt-BR'), geral.pontos === 1 ? 'ponto' : 'pontos') : numero('0', 'pontos', 'apagado')}
        </div>
        <div class="numeros tres">
          ${unificada ? '' : posicao(penaltis, 'Pênaltis')}
          ${posicao(prova, 'Prova')}
          ${posicao(dia, 'Time do Dia hoje')}
          ${posicao(lances, 'Lances')}
          ${rodada === null ? '' : posicao(crava, `Crava ${ordinalRodada(rodada)}`)}
        </div>`;
    } catch {
      if (!saiu) semConexao(el, () => void carregarSemana(el));
    }
  }

  async function carregarRecordes(el: HTMLElement): Promise<void> {
    try {
      const recordes = await (await servidor()).meusRecordes();
      if (saiu) return;
      el.innerHTML = `<div class="numeros tres">${(Object.keys(NOME_DO_RECORDE) as MinigameDoRecorde[])
        .filter((m) => !(unificada && m === 'penaltis'))
        .map((m) => {
          const r = recordes[m];
          return r === null || r === undefined
            ? numero('—', NOME_DO_RECORDE[m], 'apagado')
            : numero(`${r.toLocaleString('pt-BR')}<small>pts</small>`, NOME_DO_RECORDE[m]);
        })
        .join('')}</div>`;
    } catch {
      if (!saiu) semConexao(el, () => void carregarRecordes(el));
    }
  }

  return () => {
    saiu = true;
  };
}
