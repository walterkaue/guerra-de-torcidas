// Escolher a cidade (#cidade; docs/jogo.md, seção 3): lista fechada do IBGE, busca por nome sem acento.
// A lista só baixa aqui. Troca livre; os pontos já feitos ficam onde foram feitos.

import '../estilos/cidade.css';
import { esc, irPara, type Rota } from '../app';
import { buscar, indexar, rotuloDaCidade, type Indexado } from '../jogo/cidade';
import { ID_OUTRO } from '../dados/times';
import { prefs } from '../estado';
import { ErroServidor } from '../servidor/api';
import { diaBrasilia } from '../servidor/tempo';
import { baixarMunicipios, escolherCidade, minhaCidade, type CidadeEscolhida } from '../servidor/cidade';
import { avisoCurto } from './avisoCurto';
import { aoTocarNoEstado, cabecalhoTela, estado, faixa } from './blocos';

export const AVISO_DA_CIDADE =
  'Os pontos que você já fez ficam onde foram feitos. A cidade só aparece somada no ranking de cidades e estados, nunca junto do seu apelido.';

const MENSAGEM: Record<string, string> = {
  cidade_invalida: 'Essa cidade não está na lista. Escolhe outra.',
  sem_torcedor: 'Escolhe o seu time primeiro, depois volta aqui pra escolher a cidade.',
  sessao_encerrada: 'Sua sessão terminou. Abre o jogo de novo e tenta outra vez.',
  muitas_trocas: 'Você trocou de cidade muitas vezes hoje. Tenta de novo amanhã.',
};
export const mensagemDoErro = (codigo: string): string => MENSAGEM[codigo] ?? 'Não consegui gravar agora. Tenta de novo daqui a pouco.';

export function telaCidade(root: HTMLElement, rota: Rota): () => void {
  const depois: Rota = rota.tela === 'cidade' && rota.depois ? rota.depois : { tela: 'perfil' };
  // Limpa o #cidade: senão o próximo toque num link "#cidade" não muda o endereço e não abre nada.
  if (location.hash === '#cidade') history.replaceState(null, '', `${location.pathname}${location.search}`);
  let saiu = false;
  let indice: Indexado[] | null = null;
  let atual: CidadeEscolhida | null = null;
  let ocupado = false;

  root.innerHTML = `
    <main class="tela cidade">
      ${cabecalhoTela({ titulo: 'Sua cidade', voltar: true, pre: false })}
      <section class="placa" aria-label="Escolher a cidade">
        ${faixa('Defende sua cidade também?')}
        <p class="cidade-dica">Seus pontos passam a somar também para a sua cidade e o seu estado, em rankings separados.</p>
        <div data-atual aria-live="polite"></div>
        <label class="campo cidade-campo">
          <span>Procure pelo nome</span>
          <input type="search" inputmode="search" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
            enterkeyhint="search" placeholder="Ex.: Caraguatatuba" aria-controls="cidade-lista" disabled />
        </label>
        <p class="erro-campo" role="alert" data-erro hidden></p>
        <div id="cidade-lista" data-lista aria-live="polite">${estado('carregando', 'Buscando a lista de cidades…')}</div>
        <p class="cidade-aviso" role="note">${esc(AVISO_DA_CIDADE)}</p>
      </section>
      <button class="botao botao-sec" type="button" data-acao="agora-nao">Agora não</button>
    </main>`;

  const voltar = () => irPara(depois);
  root.querySelector('.voltar')!.addEventListener('click', voltar);
  root.querySelector('[data-acao="agora-nao"]')!.addEventListener('click', voltar);

  const input = root.querySelector<HTMLInputElement>('input')!;
  const elLista = root.querySelector<HTMLElement>('[data-lista]')!;
  const elAtual = root.querySelector<HTMLElement>('[data-atual]')!;
  const elErro = root.querySelector<HTMLElement>('[data-erro]')!;

  const erro = (texto: string) => {
    elErro.textContent = texto;
    elErro.hidden = !texto;
  };

  function desenharAtual(): void {
    elAtual.innerHTML = atual
      ? `<p class="cidade-atual">Sua cidade: <strong>${esc(rotuloDaCidade(atual.nome, atual.uf))}</strong>
          <button class="link-mini" type="button" data-acao="tirar">tirar</button></p>`
      : '';
    elAtual.querySelector('[data-acao="tirar"]')?.addEventListener('click', () => void gravar(null));
  }

  function desenharLista(): void {
    if (!indice) return;
    const q = input.value;
    if (q.trim().length < 2) {
      elLista.innerHTML = '<p class="vazio">Digite pelo menos 2 letras do nome.</p>';
      return;
    }
    const achadas = buscar(indice, q);
    if (!achadas.length) {
      elLista.innerHTML = '<p class="vazio">Não achei essa cidade. Confere o nome e tenta de novo.</p>';
      return;
    }
    elLista.innerHTML = `<ul class="cidade-lista">${achadas
      .map(
        (m) =>
          `<li><button type="button" class="cidade-item" data-codigo="${m[0]}"${atual?.codigo === m[0] ? ' aria-current="true"' : ''}>${esc(rotuloDaCidade(m[1], m[2]))}</button></li>`,
      )
      .join('')}</ul>`;
  }

  async function gravar(codigo: number | null): Promise<void> {
    if (ocupado) return;
    ocupado = true;
    erro('');
    root.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
    try {
      await escolherCidade(codigo);
      if (saiu) return;
      // Quem mexeu na cidade aqui não precisa do convite depois da partida.
      prefs.set({ cidadeConvite: diaBrasilia() });
      const escolhida = codigo === null ? undefined : indice?.find((i) => i.m[0] === codigo)?.m[1];
      voltar();
      // Para quem joga por "Outro time" a cidade é a única camisa (J29).
      if (escolhida) avisoCurto(prefs.get().time === ID_OUTRO ? `${escolhida} joga por você no ranking.` : `${escolhida} é sua segunda camisa.`);
    } catch (e) {
      if (saiu) return;
      ocupado = false;
      root.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = false));
      erro(mensagemDoErro(e instanceof ErroServidor ? e.codigo : 'falha'));
    }
  }

  elLista.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-codigo]');
    if (b) void gravar(Number(b.dataset.codigo));
  });
  input.addEventListener('input', desenharLista);

  async function carregar(): Promise<void> {
    elLista.innerHTML = estado('carregando', 'Buscando a lista de cidades…');
    try {
      const [lista, cidade] = await Promise.all([baixarMunicipios(), minhaCidade().catch(() => null)]);
      if (saiu) return;
      indice = indexar(lista);
      atual = cidade;
      desenharAtual();
      input.disabled = false;
      desenharLista();
    } catch {
      if (saiu) return;
      elLista.innerHTML = estado('erro', 'Não consegui abrir a lista de cidades.');
      aoTocarNoEstado(elLista, () => void carregar());
    }
  }
  void carregar();

  return () => {
    saiu = true;
  };
}
