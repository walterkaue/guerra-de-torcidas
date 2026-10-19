import './style.css';
import './estilos/inicio.css';
import './estilos/resultado.css';
import { iniciarApp, irPara, registrarTela } from './app';
import { prefs } from './estado';
import { timePorId } from './dados/times';
import { telaInicio } from './telas/inicio';
import { telaTimes } from './telas/times';
import { telaPartida } from './telas/partida';
import { telaResultado } from './telas/resultado';
import { telaRanking } from './telas/ranking';

registrarTela('inicio', telaInicio);
registrarTela('times', telaTimes);
registrarTela('partida', telaPartida);
registrarTela('resultado', telaResultado);
registrarTela('ranking', telaRanking);

// Link compartilhado com ?time=flamengo já sugere o time de quem mandou.
const timeDoLink = new URLSearchParams(location.search).get('time');
if (!prefs.get().time && timePorId(timeDoLink)) prefs.set({ time: timeDoLink! });

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  iniciarApp(app);
  irPara({ tela: 'inicio' });
}
