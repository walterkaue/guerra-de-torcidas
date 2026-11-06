// "52 semanas" de Ranking > Temporada (docs/jogo.md, seção 5, "Telas aprovadas em 05/11/2026"): a placa do seu time
// (posição, pontos, vitórias e a distância para o da frente), a janela ("10 de 52 semanas · 04/01 a 08/03/2027") e a
// lista dos 20 com uma barrinha proporcional ao líder. Na pré-temporada, o selo "Teste: zera no lançamento".
// Só leitura (servidorDaGaleria); baixa sob demanda, quando a sub-aba abre. Tocar numa linha abre a Casa do time.

import '../estilos/galeria.css';
import { esc, irPara } from '../app';
import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { TEXTO_PRE_GALERIA, fracaoDaBarra, galeriaEmPreTemporada, placaDoTime, textoDaJanela } from '../jogo/galeria';
import { servidorDaGaleria } from '../servidor/galeria';
import { aoTocarNoEstado, estado, numero, placa, posicaoHtml, selo } from './blocos';

const vitorias = (n: number) => (n > 0 ? `${n} ${n === 1 ? 'vitória' : 'vitórias'}` : '');

export function desenharSemanas52(el: HTMLElement): () => void {
  let saiu = false;
  const meuId = prefs.get().time;
  const meuTime = meuId && meuId !== ID_OUTRO ? meuId : undefined;
  el.innerHTML = `<div class="gal-52" data-s52 aria-live="polite"></div>`;
  const corpo = el.querySelector<HTMLElement>('[data-s52]')!;

  async function carregar(): Promise<void> {
    corpo.innerHTML = estado('carregando', 'Buscando as 52 semanas…');
    try {
      const api = await servidorDaGaleria();
      const [linhas, temporadas] = await Promise.all([api.ranking52(), api.temporadas()]);
      if (saiu) return;
      const pre = galeriaEmPreTemporada(temporadas);
      const seloTeste = pre ? `<div class="selos">${selo(esc(TEXTO_PRE_GALERIA.seloTeste))}</div>` : '';
      const janela = textoDaJanela(linhas.find((l) => l.semanas > 0));
      if (!janela) {
        corpo.innerHTML = `${seloTeste}${estado('vazio', 'A primeira semana fecha na segunda, 12h.')}`;
        return;
      }
      const lider = Math.max(0, ...linhas.map((l) => l.pontos));
      const eu = placaDoTime(linhas, meuTime, (id) => timePorId(id) ?? { nome: id, artigo: 'o' });
      const t = meuTime ? timePorId(meuTime) : undefined;
      const minha =
        eu && t
          ? placa(
              `<div class="numeros tres">${numero(posicaoHtml(eu.posicao, linhas.length), 'posição')}${numero(eu.pontos.toLocaleString('pt-BR'), 'pontos')}${numero(String(eu.vitorias), eu.vitorias === 1 ? 'vitória' : 'vitórias')}</div>
               <p class="gal-distancia">${esc(eu.distancia)}</p>`,
              { titulo: t.nome, filete: true, attrs: `style="--c1:${t.cores[0]};--c2:${t.cores[1]}"` },
            )
          : '';
      const lista = [...linhas]
        .sort((a, b) => a.posicao - b.posicao)
        .map((l) => {
          const time = timePorId(l.time_id);
          const nome = time?.nome ?? l.time_id;
          const vit = vitorias(l.vitorias);
          const classes = ['mini-linha', 'gal-linha'];
          if (l.posicao === 1 && l.pontos > 0) classes.push('lider');
          if (l.time_id === meuTime) classes.push('meu');
          return `<div class="${classes.join(' ')}" data-casa="${esc(l.time_id)}" role="link" tabindex="0" aria-label="Abrir a Casa ${time?.artigo === 'a' ? 'da' : 'do'} ${esc(nome)}">
            <span class="pos">${l.posicao}º</span>
            <span class="cor" style="--c1:${time?.cores[0] ?? '#666'};--c2:${time?.cores[1] ?? '#999'}" aria-hidden="true"></span>
            <span class="nome">${esc(nome)}${vit ? `<small>${vit}</small>` : ''}</span>
            <span class="valor">${l.pontos.toLocaleString('pt-BR')}</span>
            <span class="gal-barra" aria-hidden="true"><i style="--f:${fracaoDaBarra(l.pontos, lider).toFixed(3)}"></i></span>
          </div>`;
        })
        .join('');
      corpo.innerHTML = `${seloTeste}${minha}
        <p class="gal-janela">${esc(janela)}</p>
        <div class="tabela gal-lista" aria-label="Os 20 times nas 52 semanas">${lista}</div>`;
    } catch {
      if (saiu) return;
      corpo.innerHTML = estado('erro', 'Sem conexão com a tabela agora.');
      aoTocarNoEstado(corpo, () => void carregar());
    }
  }

  const clicou = (e: Event) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-casa]')?.dataset.casa;
    if (id) irPara({ tela: 'casa', id });
  };
  const tecla = (e: KeyboardEvent) => {
    if (e.key === 'Enter') clicou(e);
  };
  el.addEventListener('click', clicou);
  el.addEventListener('keydown', tecla);
  void carregar();

  return () => {
    saiu = true;
    el.removeEventListener('click', clicou);
    el.removeEventListener('keydown', tecla);
  };
}
