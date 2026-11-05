// Card só da medalha (docs/jogo.md 7.3, "Card de medalha"), no modelo "Telão do estádio" (card.ts): no telão, a
// medalha desenhada (bronze, prata ou ouro, com a fita nas cores do time) e "Já sou ouro / no primeiro gol de Tóquio /
// Flamengo x Liverpool (1981)"; embaixo, OURO no lugar dos pontos e o link do lance no rodapé. Nunca nome de pessoa.

import type { Medalha } from './lances';
import { FONTE, PLACAR, ROTULO, desenharModelo, quebrarTexto, type DadosBase } from './card';
import { cortarTexto } from './cardLances';
import { ADESIVO_DA_MEDALHA, MEDALHA_NO_CARD, jogoDoItem, noTitulo, quemNaMedalha, type ItemDaMedalha } from './medalhaTextos';

export interface DadosCardMedalha extends Omit<DadosBase, 'frase' | 'novoRecorde'> {
  medalha: Medalha;
  item: ItemDaMedalha;
}

/** Claro, escuro e o tom do relevo de cada medalha (o claro é o mesmo das bolinhas da interface). */
export const CORES_DA_MEDALHA: Record<Medalha, { claro: string; escuro: string; relevo: string }> = {
  ouro: { claro: '#f3d77a', escuro: '#b8901f', relevo: '#8a6a12' },
  prata: { claro: '#e6ebf0', escuro: '#9aa4ae', relevo: '#6c7680' },
  bronze: { claro: '#e0a06a', escuro: '#9a5a26', relevo: '#6f3d16' },
};

/** Quanto o telão sobe sobre a torcida para caber a medalha e 3 linhas de título. */
const TELAO_MAIOR = 70;

/** A medalha: fita em V nas cores do time, disco com borda e uma estrela em relevo. Centro em (cx, cy). */
export function desenharMedalha(
  c: CanvasRenderingContext2D,
  medalha: Medalha,
  cores: readonly [string, string],
  cx: number,
  cy: number,
  raio: number,
): void {
  const tom = CORES_DA_MEDALHA[medalha];
  c.save();
  // Fita: duas tiras que descem do alto e se encontram atrás do disco.
  const topo = cy - raio * 1.9;
  const larg = raio * 0.62;
  const tira = (de: number, ate: number, cor: string) => {
    c.fillStyle = cor;
    c.beginPath();
    c.moveTo(cx + de - larg / 2, topo);
    c.lineTo(cx + de + larg / 2, topo);
    c.lineTo(cx + ate + larg / 2, cy - raio * 0.4);
    c.lineTo(cx + ate - larg / 2, cy - raio * 0.4);
    c.closePath();
    c.fill();
    // Contorno claro: fita escura (preto, azul-marinho) não some no fundo do telão.
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = Math.max(2, raio * 0.035);
    c.stroke();
  };
  tira(-raio * 0.75, raio * 0.15, cores[1]);
  tira(raio * 0.75, -raio * 0.15, cores[0]);
  // Sombra do disco.
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath();
  c.arc(cx + raio * 0.06, cy + raio * 0.08, raio, 0, Math.PI * 2);
  c.fill();
  // Disco: borda escura, miolo com brilho em diagonal.
  c.fillStyle = tom.escuro;
  c.beginPath();
  c.arc(cx, cy, raio, 0, Math.PI * 2);
  c.fill();
  const brilho = c.createLinearGradient(cx - raio, cy - raio, cx + raio, cy + raio);
  brilho.addColorStop(0, '#ffffff');
  brilho.addColorStop(0.28, tom.claro);
  brilho.addColorStop(1, tom.escuro);
  c.fillStyle = brilho;
  c.beginPath();
  c.arc(cx, cy, raio * 0.84, 0, Math.PI * 2);
  c.fill();
  // Estrela em relevo.
  c.fillStyle = tom.relevo;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? raio * 0.22 : raio * 0.52;
    c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
  c.restore();
}

export function desenharCardMedalha(d: DadosCardMedalha): HTMLCanvasElement {
  const tom = CORES_DA_MEDALHA[d.medalha];
  return desenharModelo(
    {
      ...d,
      jogo: d.item.tipo === 'disputa' ? 'Pênaltis' : 'Lances do Jogo',
      destaque: MEDALHA_NO_CARD[d.medalha],
      quem: quemNaMedalha(d.apelido, d.paraTime),
      frase: ADESIVO_DA_MEDALHA[d.medalha],
      novoRecorde: false,
      telaoMaior: TELAO_MAIOR,
    },
    (c, { x, y, l, a }) => {
      const raio = Math.min(118, a * 0.3);
      const cxMedalha = x + raio + 8;
      desenharMedalha(c, d.medalha, d.time.cores, cxMedalha, y + a / 2 + raio * 0.45, raio);

      // Texto à direita da medalha, centrado na altura do telão.
      const tx = cxMedalha + raio + 40;
      const largura = x + l - tx;
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
      c.font = `700 48px ${FONTE}`;
      const titulo = quebrarTexto(c, noTitulo(d.item.titulo, d.item.tipo), largura);
      const linhasTitulo = titulo.length > 3 ? [...titulo.slice(0, 2), cortarTexto(c, titulo.slice(2).join(' '), largura)] : titulo;
      c.font = `700 38px ${ROTULO}`;
      const jogo = quebrarTexto(c, jogoDoItem(d.item).toUpperCase(), largura).slice(0, 2);
      const altura = 84 + linhasTitulo.length * 58 + 14 + jogo.length * 44;
      let cy = y + (a - altura) / 2;

      c.fillStyle = tom.claro;
      c.font = `400 86px ${PLACAR}`;
      c.fillText(`JÁ SOU ${MEDALHA_NO_CARD[d.medalha]}`, tx, (cy += 78), largura);
      cy += 8;
      c.fillStyle = '#ffffff';
      c.font = `700 48px ${FONTE}`;
      for (const linha of linhasTitulo) c.fillText(linha, tx, (cy += 58), largura);
      cy += 14;
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.font = `700 38px ${ROTULO}`;
      for (const linha of jogo) c.fillText(linha, tx, (cy += 44), largura);
    },
  );
}
