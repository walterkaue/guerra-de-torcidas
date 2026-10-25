// Casa do [time] (docs/casa.md): índice dos clubes (#casa) e a página de cada um (#casa/<id>).
// Vitrine, não minigame: nenhum ponto, XP ou selo. Entra por import() dinâmico, fora do bundle inicial.
// Bloco sem dado revisado some (a tela nunca quebra por falta de dado).

import '../../estilos/casa.css';
import { esc, irPara, type Rota } from '../../app';
import { CASAS } from '../../dados/casa/dados.gerado';
import type { CasaDoClube } from '../../dados/casa/tipos';
import { ID_OUTRO, TIMES, corDeTexto, timePorId, type Time } from '../../dados/times';
import { svgEstadio, svgManto, svgTaca } from './desenhos';
import {
  dataBR,
  dataDosRecordes,
  montarPrateleiras,
  nomeDaCasa,
  nomeDoEstadio,
  numeroBR,
  rotuloDaFonte,
  separarMantos,
  totalDeTitulos,
} from './logica';

const EMAIL_ERRO = 'contato@kauewalter.com.br';
const NOTA_CURTA =
  'Projeto independente e gratuito, sem vínculo com clubes, atletas ou entidades. Nomes e números são fatos históricos, com fonte. Marcas e símbolos oficiais pertencem aos donos.';
const NOTA_COMPLETA =
  'Este é um projeto gratuito desenvolvido de forma independente para fins estatísticos, históricos e de entretenimento. Este site não possui vínculo oficial, patrocínio ou associação comercial com os clubes de futebol citados, atletas ou suas respectivas federações organizadoras. Todas as marcas e identidades visuais oficiais pertencem aos seus respectivos proprietários.';

const coresDoTime = (t: Time) =>
  `--c1:${t.cores[0]};--c2:${t.cores[1]};--c3:${t.cor3 ?? t.cores[1]};--txt:${corDeTexto(t.cores[0])}`;

/** Deixa o endereço da Casa no link (dá para mandar no grupo) sem disparar navegação. */
function marcarEndereco(hash: string): void {
  if (location.hash !== hash) history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

export function telaCasa(root: HTMLElement, rota: Rota): () => void {
  const id = rota.tela === 'casa' ? rota.id : undefined;
  const casa = id ? CASAS[id] : undefined;
  const time = timePorId(id);
  if (casa && time) paginaDoClube(root, casa, time);
  else indice(root);
  return () => {
    if (location.hash.startsWith('#casa')) history.replaceState(null, '', `${location.pathname}${location.search}`);
  };
}

function indice(root: HTMLElement): void {
  marcarEndereco('#casa');
  const times = TIMES.filter((t) => t.id !== ID_OUTRO);
  root.innerHTML = `
    <main class="tela casa-indice">
      <header class="cabecalho">
        <button class="voltar" type="button" aria-label="Voltar">‹</button>
        <h2>Casa dos clubes</h2>
      </header>
      <p class="nota casa-intro">Estádio, troféus, recordes e cores de cada clube da Série A, em fatos com fonte.</p>
      <div class="grade-times">
        ${times
          .map((t) => {
            const pronta = !!CASAS[t.id];
            return `<button type="button" class="cartao-time${t.cores[0].toLowerCase() === '#ffffff' ? ' clara' : ''}" data-id="${t.id}"
              style="${coresDoTime(t)}" ${pronta ? '' : 'disabled aria-disabled="true"'}>
              <span class="nome-time">${esc(t.nome)}</span>
              ${pronta ? '' : '<span class="em-breve-casa">em breve</span>'}
            </button>`;
          })
          .join('')}
      </div>
    </main>`;
  root.querySelector('.voltar')!.addEventListener('click', () => irPara({ tela: 'inicio' }));
  root.querySelectorAll<HTMLButtonElement>('.cartao-time:not([disabled])').forEach((b) =>
    b.addEventListener('click', () => irPara({ tela: 'casa', id: b.dataset.id })),
  );
}

function paginaDoClube(root: HTMLElement, casa: CasaDoClube, time: Time): void {
  marcarEndereco(`#casa/${casa.id}`);
  const [c1, c2] = time.cores;
  const blocos = [blocoEstadio(casa, c1, c2), blocoTrofeus(casa, c1, c2), blocoRecordes(casa), blocoCores(casa, time)].filter(Boolean);
  // Só o primeiro bloco nasce aberto.
  const html = blocos.map((b, i) => (i === 0 ? b.replace('<details class="bloco-casa"', '<details class="bloco-casa" open') : b)).join('');

  root.innerHTML = `
    <main class="tela casa" style="${coresDoTime(time)}">
      <header class="cabecalho">
        <button class="voltar" type="button" aria-label="Voltar para a Casa dos clubes">‹</button>
      </header>
      <div class="casa-faixa${c1.toLowerCase() === '#ffffff' ? ' clara' : ''}">
        <h2 class="casa-titulo">${esc(nomeDaCasa(time))}</h2>
        <p class="casa-sub">Fundad${time.artigo === 'a' ? 'a' : 'o'} em ${dataBR(casa.fundacao)} · ${esc(casa.cidade)} (${esc(casa.uf)})</p>
      </div>
      ${html}
      ${rodape(casa, time)}
    </main>`;
  root.querySelector('.voltar')!.addEventListener('click', () => irPara({ tela: 'casa' }));
}

function blocoEstadio(casa: CasaDoClube, c1: string, c2: string): string {
  const e = casa.estadio;
  if (!e) return '';
  const linhas: [string, string][] = [];
  if (e.inauguracao) linhas.push(['Inauguração', dataBR(e.inauguracao)]);
  if (e.capacidade) linhas.push(['Capacidade', `${numeroBR(e.capacidade)} lugares`]);
  if (e.gramado) linhas.push(['Gramado', `${esc(e.gramado)} m`]);
  if (e.recorde) {
    const r = e.recorde;
    linhas.push([
      'Recorde do clube aqui',
      `${numeroBR(r.publico)} ${r.tipo === 'pagante' ? 'pagantes' : 'presentes'}${r.partida ? ` · ${esc(r.partida)}` : ''} · ${dataBR(r.data)}`,
    ]);
  }
  return `<details class="bloco-casa">
    <summary class="rotulo">Estádio</summary>
    <div class="bloco-corpo">
      ${svgEstadio(e.formato, c1, c2)}
      <p class="estadio-nome">${esc(nomeDoEstadio(e))}</p>
      <dl class="ficha">${linhas.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    </div>
  </details>`;
}

function blocoTrofeus(casa: CasaDoClube, c1: string, c2: string): string {
  const prateleiras = montarPrateleiras(casa.titulos);
  if (!prateleiras.length) return '';
  const total = totalDeTitulos(prateleiras);
  return `<details class="bloco-casa">
    <summary class="rotulo">Sala de troféus <span class="contador">${total}</span></summary>
    <div class="bloco-corpo">
      <p class="prateleira-rotulo rotulo">Na história</p>
      <ul class="prateleira">
        ${prateleiras
          .map(
            (p) => `<li class="trofeu">
              <details>
                <summary>
                  ${svgTaca(p.taca, c1, c2)}
                  <span class="trofeu-nome">${esc(p.nome)}</span>
                  <span class="trofeu-total">${p.anos.length}</span>
                </summary>
                <p class="trofeu-anos">${p.anos.join(' · ')}</p>
                ${p.notas.map((n) => `<p class="trofeu-nota">${n.ano}: ${esc(n.nota)}</p>`).join('')}
              </details>
            </li>`,
          )
          .join('')}
      </ul>
    </div>
  </details>`;
}

function blocoRecordes(casa: CasaDoClube): string {
  const { gols, jogos } = casa.recordes;
  if (!gols.length && !jogos.length && !casa.goleadas.length) return '';
  const lista = (titulo: string, itens: typeof gols, unidade: string) =>
    itens.length
      ? `<p class="prateleira-rotulo rotulo">${titulo}</p>
        <ol class="recordes">${itens
          .map((r) => `<li><span class="pos">${r.posicao}º</span><span class="quem">${esc(r.nome)}</span><span class="quanto">${numeroBR(r.valor)}</span><span class="un">${unidade}</span></li>`)
          .join('')}</ol>`
      : '';
  const ate = dataDosRecordes(casa.recordes);
  const goleadas = casa.goleadas.length
    ? `<p class="prateleira-rotulo rotulo">Maiores goleadas</p>
      <ul class="goleadas">${casa.goleadas
        .map((g) => `<li><span class="placar">${esc(g.placar)}</span><span class="contra">${esc(g.adversario)}<small>${dataBR(g.data)}${g.competicao ? ` · ${esc(g.competicao)}` : ''}</small></span></li>`)
        .join('')}</ul>`
    : '';
  return `<details class="bloco-casa">
    <summary class="rotulo">Livro de recordes</summary>
    <div class="bloco-corpo">
      ${lista('Artilheiros', gols, 'gols')}
      ${lista('Mais jogos', jogos, 'jogos')}
      ${ate ? `<p class="nota-pequena">Até ${ate} · contagem do clube</p>` : ''}
      ${goleadas}
    </div>
  </details>`;
}

function blocoCores(casa: CasaDoClube, time: Time): string {
  if (!casa.historiaCores && !casa.apelidos.length && !casa.mantos.length) return '';
  const { principal: tradicional, varal } = separarMantos(casa.mantos);
  return `<details class="bloco-casa">
    <summary class="rotulo">Cores e manto</summary>
    <div class="bloco-corpo">
      ${tradicional ? `<div class="manto-principal">${svgManto(tradicional, `Manto tradicional ${time.artigo === 'a' ? 'da' : 'do'} ${time.nome}`)}</div>` : ''}
      ${casa.historiaCores ? `<p class="historia">${esc(casa.historiaCores)}</p>` : ''}
      ${casa.apelidos.length ? `<p class="apelidos">${casa.apelidos.map((a) => `<span>${esc(a)}</span>`).join('')}</p>` : ''}
      ${
        varal.length
          ? `<p class="prateleira-rotulo rotulo">Mantos da história</p>
            <ul class="varal">${varal
              .map((m) => `<li>${svgManto(m, `Manto de ${m.periodo}`)}<span>${esc(m.periodo)}</span></li>`)
              .join('')}</ul>`
          : ''
      }
    </div>
  </details>`;
}

function rodape(casa: CasaDoClube, time: Time): string {
  const assunto = encodeURIComponent(`Erro na ${nomeDaCasa(time)}`);
  return `<footer class="casa-rodape">
    <p>Dados até ${dataBR(casa.dadosAte)}.</p>
    <details>
      <summary>Ver fontes (${casa.fontes.length})</summary>
      <ul class="fontes">${casa.fontes
        .map((f) => `<li><a href="${esc(f)}" target="_blank" rel="noopener noreferrer">${esc(rotuloDaFonte(f))}</a></li>`)
        .join('')}</ul>
    </details>
    <p>${NOTA_CURTA}</p>
    <details><summary>Nota completa</summary><p>${NOTA_COMPLETA}</p></details>
    <a class="erro-link" href="mailto:${EMAIL_ERRO}?subject=${assunto}">Achou um erro? Conta pra gente</a>
  </footer>`;
}
