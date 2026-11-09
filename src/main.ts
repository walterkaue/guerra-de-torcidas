import './style.css';
import './estilos/blocos.css';
import './estilos/inicio.css';
import './estilos/resultado.css';
import './estilos/palpites.css';
import './estilos/prova.css';
import './estilos/timeDoDia.css';
import './estilos/lances.css';
import './estilos/protecao.css';
import { desafioDoLink, desafioLancesDoLink, desafioProvaDoLink, iniciarApp, irPara, linkDoTimeDoDia, registrarTela, type Rota } from './app';
import { faixaDoAparelho, prefs } from './estado';
import { timePorId } from './dados/times';
import { ROTA_ENTRAR, codigoDoEndereco } from './jogo/codigoTorcedor';
import { itemDoEndereco } from './jogo/enderecoDoLance';
import { comecaPelaEscolha } from './jogo/primeiroAcesso';
import { quandoSairDaConta } from './servidor/api';
import { contar } from './servidor/funil';
import { apoioLiberado, telaApoio } from './telas/apoio';
import { telaInicio } from './telas/inicio';
import { ligarAvisoDeSaida } from './telas/saida';
import { telaTriagem } from './telas/triagem';
import { telaTimes } from './telas/times';
import { telaRanking } from './telas/ranking';
import { telaFeedback } from './telas/feedback';
import { telaCarregando, telaSemRede } from './telas/esqueleto';
import { registrarServiceWorker } from './pwa';
import { ligarToqueDosBotoes } from './telas/toque';
import { depoisDoConvite, segurarParaOConvite } from './telas/primeiraTela';

registrarServiceWorker();
ligarToqueDosBotoes();
ligarAvisoDeSaida();

type Tela = Parameters<typeof registrarTela>[1];

/**
 * Tela que só baixa o código quando abre: as telas de jogo (cenas, bonecos, palpites) são mais da
 * metade do JS, e a Home abre mais rápido no 3G sem elas. Enquanto baixa, mostra o esqueleto da tela;
 * sem rede, oferece tentar de novo. Depois que a Home abre, `preaquecer` baixa tudo por trás.
 */
function sobDemanda(rotulo: string, carregar: () => Promise<Tela>): Tela {
  return (root, rota) => {
    let limpar: (() => void) | undefined;
    let saiu = false;
    const tentar = () => {
      root.innerHTML = telaCarregando(rotulo);
      carregar().then(
        (tela) => {
          if (saiu) return;
          const fim = tela(root, rota);
          if (typeof fim === 'function') limpar = fim;
        },
        () => {
          if (saiu) return;
          root.innerHTML = telaSemRede();
          root.querySelector('[data-tentar]')?.addEventListener('click', tentar);
          root.querySelector('[data-inicio]')?.addEventListener('click', () => irPara({ tela: 'inicio' }));
        },
      );
    };
    tentar();
    return () => {
      saiu = true;
      limpar?.();
    };
  };
}

const TELAS_DE_JOGO = {
  partida: () => import('./telas/partida').then((m) => m.telaPartida as Tela),
  resultado: () => import('./telas/resultado').then((m) => m.telaResultado as Tela),
  palpites: () => import('./telas/palpites').then((m) => m.telaPalpites as Tela),
  prova: () => import('./telas/prova').then((m) => m.telaProva as Tela),
  provaResultado: () => import('./telas/provaResultado').then((m) => m.telaProvaResultado as Tela),
  timeDoDia: () => import('./telas/timeDoDia').then((m) => m.telaTimeDoDia as Tela),
  lances: () => import('./telas/lances').then((m) => m.telaLances as Tela),
  aquecimento: () => import('./telas/aquecimento').then((m) => m.telaAquecimento as Tela),
};

registrarTela('inicio', telaInicio);
registrarTela('times', telaTimes);
registrarTela('ranking', telaRanking);
registrarTela('feedback', telaFeedback);
registrarTela('triagem', telaTriagem);
registrarTela('partida', sobDemanda('Entrando em campo…', TELAS_DE_JOGO.partida));
registrarTela('resultado', sobDemanda('Fechando o placar…', TELAS_DE_JOGO.resultado));
registrarTela('palpites', sobDemanda('Abrindo os palpites…', TELAS_DE_JOGO.palpites));
registrarTela('prova', sobDemanda('Chamando a Prova…', TELAS_DE_JOGO.prova));
registrarTela('provaResultado', sobDemanda('Fechando o placar…', TELAS_DE_JOGO.provaResultado));
registrarTela('timeDoDia', sobDemanda('Escondendo o time…', TELAS_DE_JOGO.timeDoDia));
registrarTela('lances', sobDemanda('Abrindo os Lances…', TELAS_DE_JOGO.lances));
registrarTela('aquecimento', sobDemanda('Preparando o aquecimento…', TELAS_DE_JOGO.aquecimento));
// Painel do administrador e Casa do [time]: só baixam quando alguém abre (#admin, #casa ou #casa/<id>).
registrarTela('admin', sobDemanda('Carregando o painel…', () => import('./telas/admin').then((m) => m.telaAdmin as Tela)));
// Aba Perfil e Termos e privacidade (#termos): só baixam quando alguém abre.
registrarTela('perfil', sobDemanda('Abrindo seu perfil…', () => import('./telas/perfil').then((m) => m.telaPerfil as Tela)));
registrarTela('outroAparelho', sobDemanda('Sorteando o código…', () => import('./telas/outroAparelho').then((m) => m.telaOutroAparelho as Tela)));
registrarTela('entrar', sobDemanda('Abrindo a entrada…', () => import('./telas/entrarComCodigo').then((m) => m.telaEntrarComCodigo as Tela)));
registrarTela('cidade', sobDemanda('Abrindo as cidades…', () => import('./telas/cidade').then((m) => m.telaCidade as Tela)));
registrarTela('termos', sobDemanda('Abrindo os termos…', () => import('./telas/termos').then((m) => m.telaTermos as Tela)));
// Apoie o jogo (#apoie): atrás do interruptor de src/config/apoio.ts e só para 18+.
registrarTela('apoie', telaApoio);
registrarTela('casa', sobDemanda('Abrindo a Casa…', () => import('./telas/casa/tela').then((m) => m.telaCasa as Tela)));
// Vestiário do boneco montável (#vestiario): só baixa quando alguém abre.
registrarTela('vestiario', sobDemanda('Abrindo o vestiário…', () => import('./telas/vestiario/tela').then((m) => m.telaVestiario as Tela)));

/**
 * Baixa as telas de jogo por trás, com o navegador ocioso, para o toque em "Jogar" abrir na hora.
 * Quem ligou a economia de dados só baixa o que abrir. Quem chegou por link de desafio vê o convite antes.
 */
function preaquecer(): void {
  const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conexao?.saveData) return;
  const ocioso = (fn: () => void) =>
    'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500);
  // O aquecimento só interessa a quem ainda não viu (ele abre logo depois de escolher o time).
  const jaViuOAquecimento = !!prefs.get().aquecimento?.visto;
  void depoisDoConvite().then(() =>
    ocioso(() =>
      Object.entries(TELAS_DE_JOGO).forEach(([nome, carregar]) => {
        if (nome !== 'aquecimento' || !jaViuOAquecimento) void carregar().catch(() => {});
      }),
    ),
  );
}

/** Rota do endereço: #admin, #apoie, #termos, #vestiario, #casa, #casa/<id>, #lance/<id> e #disputa/<id>. */
function rotaDoHash(): Rota | undefined {
  if (location.hash === '#admin') return { tela: 'admin' };
  if (location.hash === '#termos') return { tela: 'termos' };
  if (location.hash === '#cidade') return { tela: 'cidade' };
  if (location.hash === '#vestiario') return { tela: 'vestiario' };
  if (/^#entrar(\/|$)/.test(location.hash)) {
    // Link do QR: o código sai do endereço e do histórico na hora; a pessoa toca em "Entrar".
    let codigo: string | undefined;
    try {
      codigo = codigoDoEndereco(location.hash) ?? undefined;
    } catch {
      codigo = undefined;
    }
    history.replaceState(null, '', `${location.pathname}${location.search}#${ROTA_ENTRAR}`);
    return { tela: 'entrar', codigo };
  }
  if (location.hash === '#apoie') {
    if (apoioLiberado()) return { tela: 'apoie' };
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    return { tela: 'inicio' };
  }
  const casa = /^#casa(?:\/([a-z-]+))?$/.exec(location.hash);
  if (casa) return { tela: 'casa', id: casa[1] };
  // Link do card da medalha (#lance/<id> ou #disputa/<id>): abre a ficha do lance. O endereço volta a ficar limpo,
  // para recarregar a página não reabrir a ficha; sem time, passa antes pela escolha (a ficha fica para depois).
  // Endereço quebrado vai à Home; id que saiu do catálogo abre a tela dos Lances sem ficha (é ela quem confere).
  // Antes do corte (até 07/11) a tela antiga não tem ficha: o link abre os Lances.
  if (/^#(lance|disputa)\//.test(location.hash)) {
    const item = itemDoEndereco(location.hash);
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    if (!item) return { tela: 'inicio' };
    return prefs.get().time ? { tela: 'lances', lance: item } : { tela: 'times', depois: 'lances', lance: item };
  }
  return undefined;
}

// Quem já jogava antes da triagem responde nesta visita; quem chegou agora, antes da 1ª partida (app.ts).
const jaJoga = !!prefs.get().time;
// Link compartilhado com ?time=flamengo já sugere o time de quem mandou.
const timeDoLink = new URLSearchParams(location.search).get('time');
if (!prefs.get().time && timePorId(timeDoLink)) prefs.set({ time: timeDoLink! });

const app = document.querySelector<HTMLDivElement>('#app');
if (import.meta.env.DEV && app && new URLSearchParams(location.search).has('vitrineBoneco')) {
  // Vitrine do boneco montável (só em desenvolvimento): no lugar do app inteiro, sem servidor nem rotas.
  void import('./dev/vitrineBoneco').then((m) => m.montarVitrine(app));
} else if (app) {
  iniciarApp(app);
  // Aparelho que perdeu a conta (desconectado em outro aparelho ou conta apagada): volta à escolha do time, com aviso.
  quandoSairDaConta(() => irPara({ tela: 'times', depois: 'inicio' }));
  // Funil do X1: o link que abriu o jogo, contado uma vez por carga (antes de rotaDoHash limpar o endereço).
  {
    const x1d = desafioDoLink();
    const x1l = desafioLancesDoLink();
    const x1p = desafioProvaDoLink();
    const hashLance = /^#(lance|disputa)\//.exec(location.hash);
    if (x1d) contar({ ev: 'abriu', tipo: 'x1_penaltis', x1: x1d });
    else if (x1l) contar({ ev: 'abriu', tipo: 'x1_lances', x1: x1l });
    else if (x1p) contar({ ev: 'abriu', tipo: 'x1_prova', x1: x1p });
    else if (hashLance && itemDoEndereco(location.hash)) contar({ ev: 'abriu', tipo: hashLance[1] as 'lance' | 'disputa' });
  }
  // ?dia (link do card do Time do Dia) abre direto no jogo; sem time escolhido, passa antes pela escolha.
  const dia = linkDoTimeDoDia() || (import.meta.env.DEV && new URLSearchParams(location.search).has('diaFalso'));
  const entrada: Rota =
    rotaDoHash() ??
    (dia
      ? prefs.get().time
        ? { tela: 'timeDoDia' }
        : { tela: 'times', depois: 'timeDoDia' }
      : { tela: 'inicio' });
  const semTriagem = entrada.tela === 'admin' || entrada.tela === 'termos' || entrada.tela === 'entrar';
  // Primeiro acesso (docs/jogo.md 14.8): quem é novo começa pela escolha do time; a triagem e o aquecimento vêm
  // logo depois dela (times.ts), e só então a Home. Link de desafio segue direto para o convite na Home.
  const comDesafio = !!(desafioDoLink() || desafioProvaDoLink() || desafioLancesDoLink());
  // No 4G ruim, o convite vem antes do resto da Home e das telas de jogo (telas/primeiraTela.ts).
  // Só quando a entrada é a Home, onde o convite mora (#termos, #perfil e companhia não seguram nada).
  if (comDesafio && entrada.tela === 'inicio') segurarParaOConvite();
  // Só em desenvolvimento: ?vestiarioFalso liga a fonte falsa e abre o vestiário (src/dev/vestiarioFalso.ts).
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('vestiarioFalso'))
    void import('./dev/vestiarioFalso').then((m) => {
      m.ligarVestiarioFalso(new URLSearchParams(location.search));
      irPara({ tela: 'vestiario' });
    });
  // Só em desenvolvimento: ?resultadoFalso=<cenário> abre o resultado com dados de mentira (src/dev/resultadoFalso.ts).
  else if (import.meta.env.DEV && new URLSearchParams(location.search).has('resultadoFalso'))
    void import('./dev/resultadoFalso').then((m) => m.abrirResultadoFalso(new URLSearchParams(location.search).get('resultadoFalso')));
  else if (comecaPelaEscolha({ jaTinhaTime: jaJoga, tela: entrada.tela, comDesafio })) irPara({ tela: 'times', depois: 'inicio', primeira: true });
  else irPara(jaJoga && !faixaDoAparelho() && !semTriagem ? { tela: 'triagem', depois: entrada } : entrada);
  // Só em desenvolvimento: ?cardFalso abre a tela "Seu card" com dados de mentira (src/dev/cardFalso.ts).
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('cardFalso')) void import('./dev/cardFalso').then((m) => m.abrirCardFalso(document.body));
  if (document.readyState === 'complete') preaquecer();
  else window.addEventListener('load', preaquecer, { once: true });
  window.addEventListener('hashchange', () => {
    const rota = rotaDoHash();
    if (rota) irPara(rota);
  });
}
