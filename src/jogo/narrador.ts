// Narrador de rádio de domingo. Zoeira só com o time e com a situação,
// nunca com pessoas, grupos, corpo, origem, religião ou orientação.
// {time} vira o nome do time do jogador.

import type { ResultadoCobranca, ResultadoDefesa, ResultadoPartida } from './penaltis';

const sortear = (lista: string[]) => lista[Math.floor(Math.random() * lista.length)];
const preencher = (frase: string, time: string) => frase.replaceAll('{time}', time);

const FRASES = {
  gol: [
    'GOOOOOL! Bola pra um lado, goleiro pro outro!',
    'É REDE! A torcida do {time} vai à loucura!',
    'Bateu com categoria! Sem chance pro goleiro!',
    'Gol! Deslocou o goleiro, que foi comprar pão!',
  ],
  angulo: [
    'NO ÂNGULO! Tirou teia de aranha da gaveta!',
    'Onde a coruja dorme! Que pintura!',
    'Na forquilha! O goleiro só ficou olhando!',
  ],
  cavadinha: [
    'É CAVADINHAAAA! Que categoria, que deboche!',
    'CAVADINHA! O goleiro pulou e a bola foi passear!',
    'Que ousadia! Cavadinha com assinatura do {time}!',
  ],
  defendida: [
    'Pegou! O goleiro tava com o almoço pago!',
    'Defendeu! Bateu na mão do goleiro!',
    'Espalmou! Hoje o goleiro tá inspirado!',
  ],
  fraca: [
    'Bateu fraquinho, o goleiro agradece!',
    'Isso foi passe pro goleiro?',
    'Rolou devagarzinho… o goleiro nem sujou o uniforme!',
  ],
  fora: [
    'Isolou! Foi pra Marte, a bola tá orbitando!',
    'Pra fora! Alguém busca a bola no estacionamento!',
    'Mandou pra arquibancada! Brinde pra torcida!',
  ],
  trave: [
    'NA TRAVE! Tremeu o estádio inteiro!',
    'Carimbou a trave! Faltou um dedinho!',
  ],
  defesa: [
    'QUE DEFESA! O goleiro do {time} fechou o gol!',
    'Pegou! Leu o batedor como jornal de domingo!',
    'Voou e pegou! A torcida do {time} canta seu nome!',
  ],
  sofrido: [
    'Gol deles… Pulou pro lado errado!',
    'Não deu! Bola num canto, goleiro no outro!',
    'Entrou… O batedor nem olhou pro goleiro!',
  ],
  maquinaFora: [
    'Isolou! O batedor deles tremeu!',
    'Pra fora! Sentiu a pressão da torcida do {time}!',
  ],
  vitoria: [
    'ACABOU! Vitória do {time}! Pode mandar no grupo!',
    'É campeão da disputa! O {time} subiu no placar!',
  ],
  empate: ['Empate! Ninguém dorme tranquilo hoje.', 'Deu empate… dá pra fazer melhor, hein?'],
  derrota: [
    'Perdeu! Mas os pontos já foram pro {time}. Vai de novo?',
    'Derrota… A torcida do {time} quer revanche!',
  ],
};

export function narrarCobranca(r: ResultadoCobranca, time: string): string {
  let lista: string[];
  if (r.desfecho === 'gol') lista = r.cavadinha ? FRASES.cavadinha : r.angulo ? FRASES.angulo : FRASES.gol;
  else if (r.desfecho === 'defesa') lista = r.fraca ? FRASES.fraca : FRASES.defendida;
  else lista = r.desfecho === 'trave' ? FRASES.trave : FRASES.fora;
  return preencher(sortear(lista), time);
}

export function narrarDefesa(r: ResultadoDefesa, time: string): string {
  const lista = r.desfecho === 'defesa' ? FRASES.defesa : r.desfecho === 'fora' ? FRASES.maquinaFora : FRASES.sofrido;
  return preencher(sortear(lista), time);
}

export function narrarFinal(r: ResultadoPartida, time: string): string {
  const lista = r.venceu ? FRASES.vitoria : r.empate ? FRASES.empate : FRASES.derrota;
  return preencher(sortear(lista), time);
}
