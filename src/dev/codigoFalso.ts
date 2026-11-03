// Só em desenvolvimento (npm run dev, com ?codigoFalso na URL): imita o servidor do código do torcedor no próprio
// navegador, para conferir as telas sem banco nem login. Nunca entra no build de produção (import atrás de
// import.meta.env.DEV).
// &cenario= escolhe o que acontece ao entrar com o código: pronto (padrão), escolher (times diferentes),
// erro=codigo_invalido, erro=muitas_tentativas ou erro=entrada_falhou (qualquer erro= vale).
// &expira=30 faz o código valer 30 s, para ver o vencimento.

import { ALFABETO, TAMANHO_CODIGO } from '../jogo/codigoTorcedor';
import type { Aparelho } from '../jogo/aparelhos';
import { guardarFaixa, prefs } from '../estado';
import { ErroServidor, type CodigoGerado, type StatusDoCodigo } from '../servidor/api';
import type { ResultadoEntrada } from '../servidor/torcedor';

const params = new URLSearchParams(location.search);
const cenario = params.get('cenario') ?? 'pronto';
const espera = <T>(v: T, ms = 250) => new Promise<T>((ok) => setTimeout(() => ok(v), ms));

const MIN = 60_000;
const agora = Date.now();
let aparelhos: Aparelho[] = [
  { id: 'a1', criado_em: new Date(agora - 2 * 86_400_000).toISOString(), usado_em: new Date(agora).toISOString(), user_agent: navigator.userAgent, este: true },
  {
    id: 'a2',
    criado_em: new Date(agora - 5 * 86_400_000).toISOString(),
    usado_em: new Date(agora - 26 * 60 * 60_000).toISOString(),
    user_agent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36',
    este: false,
  },
  {
    id: 'a3',
    criado_em: new Date(agora - 30 * 86_400_000).toISOString(),
    usado_em: new Date(agora - 10 * 86_400_000).toISOString(),
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0',
    este: false,
  },
];

let geradoEm = 0;

export async function gerarCodigo(): Promise<CodigoGerado> {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO; i++) codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  geradoEm = Date.now();
  const validade = Number(params.get('expira')) > 0 ? Number(params.get('expira')) * 1000 : 10 * MIN;
  return espera({ codigo, expiraEm: new Date(geradoEm + validade).toISOString() });
}

/** 'usado' uns 12 s depois de gerar o código: é quando o "outro aparelho" entra. */
export async function statusDoCodigo(): Promise<StatusDoCodigo> {
  if (!geradoEm) return espera(null, 100);
  const usado = Date.now() - geradoEm > 12_000;
  if (usado && !aparelhos.some((a) => a.id === 'a4')) {
    aparelhos = [
      ...aparelhos,
      { id: 'a4', criado_em: new Date().toISOString(), usado_em: new Date().toISOString(), user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1', este: false },
    ];
  }
  return espera(usado ? 'usado' : 'ativo', 100);
}

export const meusAparelhos = (): Promise<Aparelho[]> => espera([...aparelhos]);

export async function desconectarAparelho(id: string): Promise<void> {
  await espera(null);
  aparelhos = aparelhos.filter((a) => a.id !== id);
}

/** No cenário escolher, o outro aparelho "escolheu o time dele" ao juntar: o time deste aparelho muda. */
export async function puxarTorcedor(_forcar = false): Promise<boolean> {
  await espera(null, 150);
  if (cenario !== 'escolher' || prefs.get().time === 'palmeiras') return false;
  prefs.set({ time: 'palmeiras', sincronizado: 'palmeiras|' });
  return true;
}

export async function entrarComCodigo(_codigo: string, time?: string): Promise<ResultadoEntrada> {
  await espera(null, 600);
  if (cenario.startsWith('erro=')) throw new ErroServidor(cenario.slice(5));
  const meu = prefs.get().time;
  if (cenario === 'escolher' && !time) return { etapa: 'escolher_time', timeDono: 'palmeiras', timeSeu: meu ?? 'flamengo' };
  const fica = time ?? meu ?? 'corinthians';
  prefs.set({ time: fica, sincronizado: `${fica}|` });
  if (!prefs.get().faixa) guardarFaixa('18_mais');
  return { etapa: 'pronto' };
}
