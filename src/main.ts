import './style.css';
import './estilos/inicio.css';
import './estilos/resultado.css';
import './estilos/palpites.css';
import './estilos/prova.css';
import './estilos/timeDoDia.css';
import './estilos/lances.css';
import './estilos/protecao.css';
import { iniciarApp, irPara, linkDoTimeDoDia, registrarTela, type Rota } from './app';
import { faixaDoAparelho, prefs } from './estado';
import { timePorId } from './dados/times';
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
// Painel do administrador e Casa do [time]: só baixam quando alguém abre (#admin, #casa ou #casa/<id>).
registrarTela('admin', sobDemanda('Carregando o painel…', () => import('./telas/admin').then((m) => m.telaAdmin as Tela)));
// Termos e privacidade (#termos): só baixa quando alguém abre.
registrarTela('termos', sobDemanda('Abrindo os termos…', () => import('./telas/termos').then((m) => m.telaTermos as Tela)));
// Apoie o jogo (#apoie): atrás do interruptor de src/config/apoio.ts e só para 18+.
registrarTela('apoie', telaApoio);
registrarTela('casa', sobDemanda('Abrindo a Casa…', () => import('./telas/casa/tela').then((m) => m.telaCasa as Tela)));

/**
 * Baixa as telas de jogo por trás, com o navegador ocioso, para o toque em "Jogar" abrir na hora.
 * Quem ligou a economia de dados só baixa o que abrir.
 */
function preaquecer(): void {
  const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conexao?.saveData) return;
  const ocioso = (fn: () => void) =>
    'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500);
  ocioso(() => Object.values(TELAS_DE_JOGO).forEach((carregar) => void carregar().catch(() => {})));
}

/** Rota do endereço: #admin, #apoie, #termos, #casa e #casa/<id>. */
function rotaDoHash(): Rota | undefined {
  if (location.hash === '#admin') return { tela: 'admin' };
  if (location.hash === '#termos') return { tela: 'termos' };
  if (location.hash === '#apoie') {
    if (apoioLiberado()) return { tela: 'apoie' };
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    return { tela: 'inicio' };
  }
  const casa = /^#casa(?:\/([a-z-]+))?$/.exec(location.hash);
  if (casa) return { tela: 'casa', id: casa[1] };
  return undefined;
}

// Quem já jogava antes da triagem responde nesta visita; quem chegou agora, antes da 1ª partida (app.ts).
const jaJoga = !!prefs.get().time;
// Link compartilhado com ?time=flamengo já sugere o time de quem mandou.
const timeDoLink = new URLSearchParams(location.search).get('time');
if (!prefs.get().time && timePorId(timeDoLink)) prefs.set({ time: timeDoLink! });

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  iniciarApp(app);
  // ?dia (link do card do Time do Dia) abre direto no jogo; sem time escolhido, passa antes pela escolha.
  const dia = linkDoTimeDoDia() || (import.meta.env.DEV && new URLSearchParams(location.search).has('diaFalso'));
  const entrada: Rota =
    rotaDoHash() ??
    (dia
      ? prefs.get().time
        ? { tela: 'timeDoDia' }
        : { tela: 'times', depois: 'timeDoDia' }
      : { tela: 'inicio' });
  const semTriagem = entrada.tela === 'admin' || entrada.tela === 'termos';
  irPara(jaJoga && !faixaDoAparelho() && !semTriagem ? { tela: 'triagem', depois: entrada } : entrada);
  if (document.readyState === 'complete') preaquecer();
  else window.addEventListener('load', preaquecer, { once: true });
  window.addEventListener('hashchange', () => {
    const rota = rotaDoHash();
    if (rota) irPara(rota);
  });
}
