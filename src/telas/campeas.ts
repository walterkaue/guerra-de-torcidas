// "Campeãs" de Ranking > Cidades (docs/jogo.md, seção 5, "Telas aprovadas em 05/11/2026"): botão do estado (abre no
// da sua cidade; sem cidade, SP), "Mais vezes campeã", a linha da sua cidade (só se ela já ganhou) e a lista por
// semana. Só cidade com 5+ jogadores chega aqui (o servidor garante) e nunca ao lado de apelido.
// Só leitura (servidorDaGaleria); baixa sob demanda, quando a sub-aba abre.

import '../estilos/trofeus.css';
import '../estilos/galeria.css';
import { esc } from '../app';
import { galeriaEmPreTemporada, resumirCampeas, textoCampea, type CampeaDeEstado } from '../jogo/galeria';
import { servidorDaGaleria } from '../servidor/galeria';
import { aoTocarNoEstado, estado, placa } from './blocos';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export function desenharCampeas(el: HTMLElement): () => void {
  let saiu = false;
  let geracao = 0;
  let uf: string | null = null;
  let codigoMeu: number | null = null;
  let aberta: HTMLDialogElement | null = null;

  el.innerHTML = `<div class="gal-campeas">
      <button type="button" class="gal-time" data-camp-uf aria-haspopup="dialog" hidden></button>
      <div class="gal-campeas" data-camp-corpo aria-live="polite"></div>
    </div>`;
  const botaoUf = el.querySelector<HTMLButtonElement>('[data-camp-uf]')!;
  const corpo = el.querySelector<HTMLElement>('[data-camp-corpo]')!;

  function pintarBotao(): void {
    botaoUf.hidden = uf === null;
    if (uf === null) return;
    botaoUf.innerHTML = `<span class="gal-time-nome">${esc(uf)}<small>Estado</small></span><span class="gal-troca" aria-hidden="true">Trocar</span>`;
    botaoUf.setAttribute('aria-label', `Estado ${uf}. Trocar de estado`);
  }

  function pintar(linhas: CampeaDeEstado[]): void {
    if (!linhas.length) {
      corpo.innerHTML = estado('vazio', 'Nenhuma campeã nesse estado ainda.');
      return;
    }
    const r = resumirCampeas(linhas, codigoMeu);
    const mais = r.maisVezes.map((c) => `<p class="gal-campea">${esc(c.nome)}<small>${esc(textoCampea(c.vezes))}</small></p>`).join('');
    const minha = r.minha ? `<p class="gal-texto">Sua cidade, ${esc(r.minha.nome)}: ${esc(textoCampea(r.minha.vezes))}.</p>` : '';
    const semanas = r.semanas
      .map((s) => `<div class="gal-semana"><span>${esc(s.data)}</span><span>${esc(s.nome)}</span></div>`)
      .join('');
    corpo.innerHTML = `${placa(mais + minha, { titulo: 'Mais vezes campeã', filete: true })}
      ${placa(`<div class="gal-lista">${semanas}</div>`, { titulo: 'Semana a semana' })}`;
  }

  async function carregar(): Promise<void> {
    const g = ++geracao;
    const velha = () => saiu || g !== geracao;
    corpo.innerHTML = estado('carregando', 'Buscando as campeãs…');
    try {
      const api = await servidorDaGaleria();
      if (galeriaEmPreTemporada(await api.temporadas())) {
        if (velha()) return;
        botaoUf.hidden = true;
        corpo.innerHTML = estado('vazio', 'As campeãs de estado começam no lançamento.');
        return;
      }
      if (uf === null) {
        // Sem sessão ou sem cidade, não é erro: abre em SP.
        const cidade = await api.minhaCidade().catch(() => null);
        codigoMeu = cidade?.codigo ?? null;
        uf = cidade?.uf ?? 'SP';
      }
      const linhas = await api.campeasDoEstado(uf);
      if (velha()) return;
      pintarBotao();
      pintar(linhas);
    } catch {
      if (velha()) return;
      corpo.innerHTML = estado('erro', 'Sem conexão com a tabela agora.');
      aoTocarNoEstado(corpo, () => void carregar());
    }
  }

  function folhaDeEstados(): void {
    const d = document.createElement('dialog');
    d.className = 'ficha-lance gal-folha';
    d.setAttribute('aria-label', 'Escolha um estado');
    d.innerHTML = `<div class="ficha-corpo">
        <h2 class="gal-folha-titulo">Escolha um estado</h2>
        <ul class="gal-times gal-ufs">${UFS.map(
          (u) => `<li><button type="button" class="gal-opcao" data-camp-escolher="${u}"${u === uf ? ' aria-current="true"' : ''}>${u}</button></li>`,
        ).join('')}</ul>
        <button type="button" class="botao botao-sec" data-fechar>Fechar</button>
      </div>`;
    el.append(d);
    d.addEventListener('close', () => {
      d.remove();
      if (aberta === d) aberta = null;
    });
    d.addEventListener('click', (e) => {
      if (e.target === d) d.close();
    });
    d.querySelector('[data-fechar]')!.addEventListener('click', () => d.close());
    aberta = d;
    if (typeof d.showModal === 'function') d.showModal();
    else d.setAttribute('open', '');
  }

  const clicou = (e: Event) => {
    const alvo = e.target as HTMLElement;
    const escolhida = alvo.closest<HTMLElement>('[data-camp-escolher]')?.dataset.campEscolher;
    if (escolhida) {
      aberta?.close();
      if (escolhida !== uf) {
        uf = escolhida;
        void carregar();
      }
      return;
    }
    if (alvo.closest('[data-camp-uf]')) folhaDeEstados();
  };
  el.addEventListener('click', clicou);
  void carregar();

  return () => {
    saiu = true;
    geracao++;
    el.removeEventListener('click', clicou);
    aberta?.close();
  };
}
