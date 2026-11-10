// Convite do desafio por link (C06): a tela própria que o link ?d=, ?l= ou ?p= abre, antes da Home.
// Quem é novo escolhe a torcida tocando numa faixa (a de quem chamou ou a do rival dela) e isso já aceita o desafio;
// quem já joga encara com 1 toque. Regra completa em docs/jogos/contas.md, "Primeiro acesso". Puro: sem DOM.
// Textos neutros de gênero: "de {apelido}", nunca "do/da {apelido}" (o artigo é do time, não da pessoa).

import type { Rota } from '../app';
import { ID_OUTRO, timePorId, type Time } from '../dados/times';

export type TipoConvite = 'penaltis' | 'lances' | 'prova';

/** O link que abriu o jogo: o primeiro dos três que estiver no endereço (a mesma ordem do funil em main.ts). */
export function conviteDoLink(l: { d?: string; l?: string; p?: string }): { tipo: TipoConvite; codigo: string } | undefined {
  if (l.d) return { tipo: 'penaltis', codigo: l.d };
  if (l.l) return { tipo: 'lances', codigo: l.l };
  if (l.p) return { tipo: 'prova', codigo: l.p };
  return undefined;
}

/** O tipo do funil (`x1_*`) de cada convite. */
export const TIPO_DO_FUNIL = { penaltis: 'x1_penaltis', lances: 'x1_lances', prova: 'x1_prova' } as const satisfies Record<TipoConvite, string>;

/**
 * As faixas de time que quem é novo vê, na ordem: o time de quem chamou e o rival dele (o clássico da tabela, que não
 * é recíproco: desafio do Botafogo mostra Botafogo e Flamengo). Time sem clássico: só ele. "Outro time" ou time
 * desconhecido: nenhuma (fica só o "Escolher meu time"). Rival igual ao próprio time: uma faixa só.
 */
export function faixasDoConvite(timeDeQuemChamou: string | null | undefined): Time[] {
  const t = timePorId(timeDeQuemChamou);
  if (!t || t.id === ID_OUTRO) return [];
  const rival = t.rival && t.rival !== t.id ? timePorId(t.rival) : undefined;
  return rival && rival.id !== ID_OUTRO ? [t, rival] : [t];
}

/** Situação da placa. `buscando` enquanto o resumo não chega; `sem_rede` quando o pedido falhou. */
export type SituacaoDoConvite = 'buscando' | 'aberto' | 'vencido' | 'nao_existe' | 'sem_rede';

/** O resumo que voltou do servidor: null é código que não existe; `vencido` passou dos 7 dias. */
export function situacaoDoResumo(r: { vencido?: boolean } | null | undefined): Exclude<SituacaoDoConvite, 'buscando' | 'sem_rede'> {
  if (!r) return 'nao_existe';
  return r.vencido ? 'vencido' : 'aberto';
}

/** O aviso que toma o lugar da placa quando não há desafio para encarar. */
export function avisoDoConvite(s: SituacaoDoConvite): string | null {
  if (s === 'vencido') return 'Apitou o fim: esse desafio valia 7 dias. Bora outro!';
  if (s === 'nao_existe') return 'Esse desafio não existe mais. Bora outro!';
  if (s === 'sem_rede') return 'Sem rede: o desafio não carregou.';
  return null;
}

/**
 * Os botões da tela, do principal ao discreto (a tela desenha nessa ordem). `faixas`: as faixas de time (só quem é
 * novo, com desafio aberto); `escolher`: a lista dos times; `encarar`: quem já joga; `inicio`: "Ir pro início";
 * `tentar`: "Tentar de novo"; `outroAparelho`: "Já jogo em outro aparelho". `amarelo` é o único botão amarelo (ou
 * nenhum: com as faixas, elas são a ação).
 */
export interface AcoesDoConvite {
  faixas: boolean;
  /** "Outro time" (contornado, embaixo das faixas) ou "Escolher meu time" (sem faixas, ou com o desafio vencido). */
  escolher: 'outro_time' | 'escolher_meu_time' | null;
  encarar: boolean;
  inicio: boolean;
  tentar: boolean;
  outroAparelho: boolean;
  amarelo: 'escolher' | 'encarar' | 'inicio' | 'tentar' | null;
}

export function acoesDoConvite(situacao: SituacaoDoConvite, novo: boolean, nFaixas: number): AcoesDoConvite {
  const nada: AcoesDoConvite = { faixas: false, escolher: null, encarar: false, inicio: false, tentar: false, outroAparelho: false, amarelo: null };
  if (situacao === 'buscando') return nada;
  if (situacao === 'sem_rede') return { ...nada, tentar: true, inicio: true, amarelo: 'tentar' };
  if (situacao === 'vencido' || situacao === 'nao_existe')
    // Segue como no primeiro acesso sem link: quem é novo escolhe o time; quem já joga vai à Home.
    return novo ? { ...nada, escolher: 'escolher_meu_time', outroAparelho: true, amarelo: 'escolher' } : { ...nada, inicio: true, amarelo: 'inicio' };
  if (!novo) return { ...nada, encarar: true, inicio: true, amarelo: 'encarar' };
  if (nFaixas === 0) return { ...nada, escolher: 'escolher_meu_time', outroAparelho: true, amarelo: 'escolher' };
  return { ...nada, faixas: true, escolher: 'outro_time', outroAparelho: true };
}

/**
 * Para onde o desafio leva depois de aceito (faixa, "Encarar o desafio" ou "Bora pro jogo" da lista). A Prova vinda do
 * convite começa sozinha, com a contagem 3, 2, 1. A triagem entra no caminho por conta do irPara (precisaDaTriagem).
 */
export function destinoDoDesafio(tipo: TipoConvite, codigo: string): Rota {
  if (tipo === 'penaltis') return { tela: 'partida', desafio: codigo };
  if (tipo === 'lances') return { tela: 'lances', desafio: codigo };
  return { tela: 'prova', desafio: codigo, contagem: true };
}

/** A lista dos times aberta pelo convite ("Outro time" ou "Escolher meu time"), com o desafio junto. */
export function listaDoConvite(tipo: TipoConvite, codigo: string): Rota {
  return { tela: 'times', depois: tipo === 'penaltis' ? 'partida' : tipo, desafio: codigo, convite: true };
}

/** Desafio vencido ou que não existe, para quem é novo: a lista de sempre, sem desafio (triagem, aquecimento, Home). */
export const LISTA_SEM_DESAFIO: Rota = { tela: 'times', depois: 'inicio', primeira: true };

/**
 * A abertura pelo link. Quem já joga e ainda não respondeu a triagem passa por ela antes (como hoje); quem é novo vê
 * o convite direto: a triagem vem depois de escolher a torcida, no caminho do jogo.
 */
export function entradaDoConvite(c: { tipo: TipoConvite; codigo: string }, jaJoga: boolean, temFaixa: boolean): Rota {
  const convite: Rota = { tela: 'convite', tipo: c.tipo, codigo: c.codigo };
  return jaJoga && !temFaixa ? { tela: 'triagem', depois: convite } : convite;
}

// ---------- textos ----------

const nomeDoTime = (t: Time | undefined): string | null => (t && t.id !== ID_OUTRO ? t.nome : null);

/** Rótulo da placa: "{apelido} te desafiou" ou "Te desafiaram". */
export const rotuloDoConvite = (apelido?: string | null): string => (apelido?.trim() ? `${apelido.trim()} te desafiou` : 'Te desafiaram');

/** Pênaltis: "Zé (Flamengo) fez 96 pontos, 3 x 2 contra a máquina." Sem apelido, "Alguém"; sem time, sem parênteses. */
export function textoDoConvitePenaltis(d: { apelido?: string | null; time_id?: string | null; pontos: number; gols_jogador: number; gols_maquina: number }): string {
  const time = nomeDoTime(timePorId(d.time_id));
  return `${d.apelido?.trim() || 'Alguém'}${time ? ` (${time})` : ''} fez ${d.pontos} pontos, ${d.gols_jogador} x ${d.gols_maquina} contra a máquina.`;
}

export const COMO_PENALTIS = 'Você defende as cobranças de quem te desafiou e bate as suas. Quem fizer mais pontos ganha.';

/** Prova: "Zé (Flamengo): 6 de 8 certas, 96 pontos. Mesmas 8 perguntas, faz mais?" (o texto de antes, na Home). */
export function textoDoConviteProva(d: { apelido?: string | null; time_id?: string | null; pontos: number; resumo: string }): string {
  const time = nomeDoTime(timePorId(d.time_id));
  return `${d.apelido?.trim() || 'Alguém'}${time ? ` (${time})` : ''}: ${d.resumo}, ${d.pontos} pontos. Mesmas 8 perguntas, faz mais?`;
}

export const COMO_PROVA = '8 perguntas, 20 s cada, três erros e fora.';

export const TITULO_DA_ESCOLHA = 'Por qual torcida você entra em campo?';
export const DICA_DA_ESCOLHA = 'Os pontos vão pra torcida que você tocar. Dá pra trocar depois no Perfil.';
export const LINHA_DA_FAIXA = 'Encarar o desafio ›';

/** Quem já joga: "Você joga pelo Flamengo" / "pela Chapecoense"; em "Outro time", "Você joga pelo seu time". */
export function linhaDeQuemJaJoga(timeId: string | null | undefined): string {
  const t = timePorId(timeId);
  if (!t || t.id === ID_OUTRO) return 'Você joga pelo seu time';
  return `Você joga ${t.artigo === 'a' ? 'pela' : 'pelo'} ${t.nome}`;
}

const NO_JOGO: Record<TipoConvite, string> = { penaltis: 'nos pênaltis', lances: 'nos Lances', prova: 'na Prova' };

/**
 * A placa curta no topo da triagem, quando a pessoa vem do convite: "Desafio de Zé nos pênaltis" e "Você entra pelo
 * Flamengo. 96 pontos pra bater." `timeId` é o time que a pessoa acabou de escolher.
 */
export function placaDaTriagem(d: { tipo: TipoConvite; apelido?: string | null; pontos: number; timeId?: string | null }): { titulo: string; linha: string } {
  const t = timePorId(d.timeId);
  const entra = !t || t.id === ID_OUTRO ? 'Você entra pelo seu time.' : `Você entra ${t.artigo === 'a' ? 'pela' : 'pelo'} ${t.nome}.`;
  return {
    titulo: `Desafio de ${d.apelido?.trim() || 'alguém'} ${NO_JOGO[d.tipo]}`,
    linha: `${entra} ${d.pontos} ${d.pontos === 1 ? 'ponto' : 'pontos'} pra bater.`,
  };
}

// ---------- contagem da Prova ----------

/** A Prova vinda do convite começa sozinha: 3, 2, 1, um número por segundo, e então a 1ª pergunta. */
export const CONTAGEM = [3, 2, 1] as const;
export const CONTAGEM_PASSO_MS = 1000;
