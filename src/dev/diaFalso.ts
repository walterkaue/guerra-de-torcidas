// Só em desenvolvimento (npm run dev, com ?diaFalso na URL): imita a função "time-do-dia" do servidor
// no próprio navegador, com os clubes do dados/clubes-do-dia.csv (mesmo os de rascunho), para
// conferir a tela sem banco nem login. ?diaFalso=flamengo escolhe o secreto; sem valor, sorteia.
// Recarregar a página recomeça o dia. Nunca entra no build de produção (import atrás de import.meta.env.DEV).

import csv from '../../dados/clubes-do-dia.csv?raw';
import {
  TENTATIVAS,
  acabou,
  pontosDoDia,
  tentar,
  type ClubeDoDia,
  type Cor,
  type Divisao,
} from '../jogo/timeDoDia';
import { ErroServidor, type EstadoDoDia, type RespostaDoDia } from '../servidor/api';
import { diaBrasilia } from '../servidor/tempo';

// Todas as colunas do CSV vêm entre aspas.
const campos = (linha: string) => [...linha.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'));
const [cab, ...linhas] = csv.trim().split(/\r?\n/);
const nomes = cab.split(',');
const CLUBES: ClubeDoDia[] = linhas.map((l) => {
  const v = Object.fromEntries(campos(l).map((x, i) => [nomes[i], x]));
  return {
    id: v.id,
    nome: v.nome,
    uf: v.uf,
    fundacao: Number(v.fundacao),
    titulos: Number(v.titulos_brasileirao),
    divisao: v.divisao_2026 as Divisao,
    cores: [v.cor1 as Cor, v.cor2 as Cor],
    capital: v.capital === 'capital',
  };
});

const pedido = new URLSearchParams(location.search).get('diaFalso');
const secreto = CLUBES.find((c) => c.id === pedido) ?? CLUBES[Math.floor(Math.random() * CLUBES.length)];
const chutes: string[] = [];
const espera = () => new Promise((ok) => setTimeout(ok, 250));

function montar(): EstadoDoDia {
  const tentativas = chutes.map((id) => tentar(CLUBES.find((c) => c.id === id)!, secreto));
  const acertou = tentativas.some((t) => t.acertou);
  const fim = acabou(tentativas.length, acertou);
  const amanha = new Date();
  amanha.setHours(24, 0, 0, 0);
  return {
    pronto: true,
    dia: diaBrasilia(),
    numero: 7,
    tentativas,
    maxTentativas: TENTATIVAS,
    fim,
    acertou,
    pontos: acertou ? pontosDoDia(tentativas.length) : 0,
    secreto: fim ? { id: secreto.id, nome: secreto.nome } : null,
    desempenho: fim ? { posicao: 3, total: 14, recorde: acertou ? pontosDoDia(tentativas.length) : 85, novoRecorde: acertou } : null,
    sequencia: fim ? 3 : 2,
    proximoEm: amanha.toISOString(),
  };
}

export async function estadoDoDia(): Promise<RespostaDoDia> {
  await espera();
  const clubes = CLUBES.map((c) => ({ id: c.id, nome: c.nome, uf: c.uf })).sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR'),
  );
  return { ...montar(), clubes };
}

export async function tentarClube(_dia: string, clube: string): Promise<EstadoDoDia> {
  await espera();
  const atual = montar();
  if (atual.fim) throw new ErroServidor('dia_jogado');
  if (chutes.includes(clube)) throw new ErroServidor('clube_repetido');
  if (!CLUBES.some((c) => c.id === clube)) throw new ErroServidor('clube_invalido');
  chutes.push(clube);
  return montar();
}
