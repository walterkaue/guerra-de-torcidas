import './style.css';
import './estilos/inicio.css';
import './estilos/resultado.css';
import './estilos/palpites.css';
import { iniciarApp, irPara, registrarTela } from './app';
import { prefs } from './estado';
import { timePorId } from './dados/times';
import { telaInicio } from './telas/inicio';
import { telaTimes } from './telas/times';
import { telaPartida } from './telas/partida';
import { telaResultado } from './telas/resultado';
import { telaRanking } from './telas/ranking';
import { telaPalpites } from './telas/palpites';
import { telaFeedback } from './telas/feedback';

registrarTela('inicio', telaInicio);
registrarTela('times', telaTimes);
registrarTela('partida', telaPartida);
registrarTela('resultado', telaResultado);
registrarTela('ranking', telaRanking);
registrarTela('palpites', telaPalpites);
registrarTela('feedback', telaFeedback);
// Painel do administrador: só baixa o código quando alguém abre #admin.
registrarTela('admin', (root) => {
  let limpar: (() => void) | undefined;
  let saiu = false;
  root.innerHTML = '<main class="tela"><p class="vazio">Carregando o painel…</p></main>';
  void import('./telas/admin').then((m) => {
    if (!saiu) limpar = m.telaAdmin(root);
  });
  return () => {
    saiu = true;
    limpar?.();
  };
});

// Link compartilhado com ?time=flamengo já sugere o time de quem mandou.
const timeDoLink = new URLSearchParams(location.search).get('time');
if (!prefs.get().time && timePorId(timeDoLink)) prefs.set({ time: timeDoLink! });

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  iniciarApp(app);
  irPara(location.hash === '#admin' ? { tela: 'admin' } : { tela: 'inicio' });
  window.addEventListener('hashchange', () => {
    if (location.hash === '#admin') irPara({ tela: 'admin' });
  });
}
