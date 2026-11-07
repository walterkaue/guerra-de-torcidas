// Sessão de uma persona num aparelho: abre o navegador com a guarda de rede, dá os toques e arrastes do jeito
// da persona, tira print de cada passo e roda as conferências automáticas. As jornadas (personas/*.mjs) só
// falam com esta classe.

import { chromium, webkit, firefox } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { opcoesDoContexto, scriptDoAparelho } from './aparelhos.mjs';
import { ligarGuarda, scriptDaGuarda, resumoDaRede, conferirGuarda } from './rede.mjs';
import { conferirNaPagina, carregandoNaPagina, movimentoNaPagina, focoNaPagina } from './conferencias.mjs';
import { PROIBIDAS, URGENCIA, SO_18, AVISO_FIXO } from './textos.mjs';

const MOTORES = { chromium, webkit, firefox };
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Gerador com semente, para o "toque impreciso" de cada persona sair igual em toda rodada. */
function gerador(semente) {
  let s = semente >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// Compartilhar nativo de celular: o Playwright não tem a folha do sistema. No aparelho de toque, o simulador põe
// um navigator.share que só anota o que iria (texto, link, arquivos), para a jornada conferir o card.
const SCRIPT_COMPARTILHAR = `(() => {
  window.__simCompartilhados = [];
  const anotar = async (d) => {
    const arquivos = d && d.files ? [...d.files].map((f) => ({ nome: f.name, tipo: f.type, bytes: f.size })) : [];
    window.__simCompartilhados.push({ quando: Date.now(), titulo: d && d.title, texto: d && d.text, url: d && d.url, arquivos });
  };
  try {
    Object.defineProperty(navigator, 'share', { configurable: true, value: anotar });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  } catch {}
})();`;

// Tarefas longas (Chromium tem longtask; nos outros a lista fica vazia).
const SCRIPT_TAREFAS_LONGAS = `(() => {
  window.__simLongas = [];
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__simLongas.push({ ini: e.startTime, dur: e.duration }); })
      .observe({ type: 'longtask', buffered: true });
  } catch {}
})();`;

export class Sessao {
  /**
   * @param {object} o
   *  persona: { id, nome, menor?, toque: { erroPx, demoraMs }, gesto: { escalaForca, duracaoMs, tremorPx } }
   *  aparelho: entrada de APARELHOS (com .id)
   *  corte: 'antes' | 'depois'
   *  modo: 'dev' | 'producao'
   *  origem: http://127.0.0.1:porta (dev) ou https://torcida.kauewalter.com.br
   *  pasta: onde ficam prints e resultado desta sessão
   *  raizPrints: prints/simulacoes/<rodada> (para caminhos relativos no relatório)
   *  famosos: lista de nomes normalizados (textos.mjs)
   */
  constructor(o) {
    Object.assign(this, o);
    this.passos = [];
    this.achados = [];
    this.metricas = [];
    this.naoSimulaveis = [];
    this.rede = [];
    this.console = [];
    this.n = 0;
    this.offlineAgora = false;
    this.ultimoEndereco = '';
    this.sorteio = gerador([...`${o.persona.id}:${o.aparelho.id}`].reduce((s, c) => s * 31 + c.charCodeAt(0), 7));
    mkdirSync(this.pasta, { recursive: true });
  }

  get page() {
    return this.pagina;
  }

  get ehChromium() {
    return this.aparelho.navegador === 'chromium';
  }

  async iniciar() {
    const motor = MOTORES[this.aparelho.navegador];
    this.navegador = await motor.launch({ headless: true });
    this.contexto = await this.navegador.newContext(opcoesDoContexto(this.aparelho));
    await ligarGuarda(this.contexto, { modo: this.modo, origemLocal: this.origem, origemSite: this.modo === 'producao' ? this.origem : undefined, registro: this.rede });
    await this.contexto.addInitScript(scriptDaGuarda(this.modo));
    await this.contexto.addInitScript(scriptDoAparelho(this.aparelho));
    await this.contexto.addInitScript(SCRIPT_TAREFAS_LONGAS);
    if (this.aparelho.toque) await this.contexto.addInitScript(SCRIPT_COMPARTILHAR);
    this.contexto.on('page', (p) => this._vigiar(p));
    this.pagina = await this.contexto.newPage();
    await this._emular();
    return this;
  }

  /** Popups (WhatsApp, link externo): anota e fecha. A guarda já bloqueou a rede deles. */
  _vigiar(p) {
    if (this.pagina && p !== this.pagina && this.modo === 'producao' && !this.abasMantidas?.has(p)) {
      this.abas = this.abas ?? [];
      this.abas.push(p.url());
      p.close().catch(() => {});
      return;
    }
    if (this.pagina && p !== this.pagina) {
      p.waitForEvent('framenavigated', { timeout: 3000 })
        .catch(() => {})
        .then(() => {
          this.abas = this.abas ?? [];
          this.abas.push(p.url());
          if (!this.manterAbas && !this.abasMantidas?.has(p)) p.close().catch(() => {});
        });
      return;
    }
    p.on('console', (m) => {
      const tipo = m.type();
      if (tipo !== 'error' && tipo !== 'warning') return;
      this.console.push({ passo: this.n, tipo, texto: m.text().slice(0, 300), url: m.location()?.url ?? '' });
    });
    p.on('pageerror', (e) => this.console.push({ passo: this.n, tipo: 'exceção', texto: String(e?.message ?? e).slice(0, 300) }));
    p.on('requestfailed', (r) => {
      const url = r.url();
      if (this.rede.some((e) => e.url === url.slice(0, 300) && e.decisao === 'bloqueada')) return;
      if (this.offlineAgora) return;
      this.console.push({ passo: this.n, tipo: 'requisição falhou', texto: `${r.method()} ${url.slice(0, 200)} (${r.failure()?.errorText ?? '?'})` });
    });
    // Bytes recebidos por tipo (encoded), em todos os navegadores: base do "JS baixado" na rodada no ar.
    p.on('requestfinished', async (r) => {
      const t = await r.sizes().catch(() => null);
      if (!t) return;
      this.bytes = this.bytes ?? {};
      const tipo = r.resourceType();
      this.bytes[tipo] = (this.bytes[tipo] ?? 0) + t.responseBodySize;
      this.bytes.total = (this.bytes.total ?? 0) + t.responseBodySize + t.responseHeadersSize;
    });
    p.on('download', async (d) => {
      const nome = d.suggestedFilename();
      const destino = join(this.pasta, `download-${this.n}-${nome}`);
      await d.saveAs(destino).catch(() => {});
      this.downloads = this.downloads ?? [];
      this.downloads.push({ passo: this.n, nome, arquivo: relative(this.raizPrints, destino) });
    });
  }

  async _emular() {
    if (!this.ehChromium) return;
    this.cdp = await this.contexto.newCDPSession(this.pagina);
    if (this.aparelho.cpu) await this.cdp.send('Emulation.setCPUThrottlingRate', { rate: this.aparelho.cpu });
    await this._aplicarRede();
  }

  async _aplicarRede() {
    if (!this.cdp) return;
    await this.cdp.send('Network.enable');
    const r = this.aparelho.rede;
    await this.cdp.send('Network.emulateNetworkConditions', {
      offline: this.offlineAgora,
      latency: r ? r.latencia : 0,
      downloadThroughput: r ? (r.descidaKbps * 1000) / 8 : -1,
      uploadThroughput: r ? (r.subidaKbps * 1000) / 8 : -1,
    });
  }

  /** Endereço com as flags; a sessão põe ?corte= sozinha. Ex.: s.endereco('/?homeFalsa&cenario=dia#lances') */
  endereco(caminho) {
    const u = new URL(caminho, this.origem);
    if (this.modo === 'dev' && this.corte && !u.searchParams.has('corte')) u.searchParams.set('corte', this.corte);
    return u.toString().replace(/=(&|#|$)/g, '$1'); // ?homeFalsa em vez de ?homeFalsa=
  }

  /** Abre um endereço e mede quanto demorou até `esperarPor` (seletor ou texto) aparecer. */
  async abrir(caminho, { esperarPor, limiteMs = 10000, rotulo } = {}) {
    const url = this.endereco(caminho);
    this.ultimoEndereco = url;
    const t0 = Date.now();
    await this.pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (esperarPor) {
      const alvo = typeof esperarPor === 'string' ? this.pagina.locator(esperarPor).first() : esperarPor;
      try {
        await alvo.waitFor({ state: 'visible', timeout: limiteMs });
        this.medir(rotulo ?? `abrir ${caminho}`, Date.now() - t0, limiteMs);
      } catch {
        this.medir(rotulo ?? `abrir ${caminho}`, Date.now() - t0, limiteMs, true);
        this.achado({ regra: 'carregamento-lento', gravidade: 'bloqueia', tipo: 'desempenho', oQue: `Carregamento não saiu em ${limiteMs / 1000} s (esperando ${typeof esperarPor === 'string' ? esperarPor : 'o elemento'}).`, sugestao: 'Ver o que segura a primeira tela.' });
      }
    } else await this.pagina.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
    return Date.now() - t0;
  }

  /** Um passo da jornada: roda, espera assentar, tira print e confere. */
  async passo(nome, fn, opcoes = {}) {
    this.n++;
    const t0 = Date.now();
    let erro = null;
    try {
      await Promise.race([fn ? fn() : null, esperar(opcoes.limiteMs ?? 60000).then(() => { throw new Error('passo passou de 60 s'); })]);
    } catch (e) {
      erro = e;
      this.achado({
        regra: 'passo-falhou',
        gravidade: 'atrapalha',
        tipo: 'erro',
        oQue: `O passo "${nome}" não completou: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`,
        sugestao: 'Conferir no print se é o jogo ou o seletor do simulador.',
        talvezSimulador: true,
      });
    }
    const ms = Date.now() - t0;
    await this.conferir(nome, opcoes);
    this.passos[this.passos.length - 1].ms = ms;
    this.passos[this.passos.length - 1].erro = erro ? String(erro.message ?? erro).slice(0, 200) : null;
    return !erro;
  }

  /** Print + conferências automáticas da tela atual. */
  async conferir(nome, opcoes = {}) {
    const p = this.pagina;
    // Carregamento: espera até 10 s; se não sair, é achado.
    const t0 = Date.now();
    let carregando = 0;
    while (Date.now() - t0 < 10000) {
      carregando = await p.evaluate(carregandoNaPagina).catch(() => 0);
      if (!carregando) break;
      await esperar(400);
    }
    await esperar(opcoes.assentarMs ?? 350);
    const arquivo = join(this.pasta, `${String(this.n).padStart(2, '0')}-${nome.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 50)}.png`);
    await p.screenshot({ path: arquivo, fullPage: !!opcoes.paginaInteira, timeout: 20000 }).catch(() => {});
    const print = relative(this.raizPrints, arquivo).replaceAll('\\', '/');
    const tela = opcoes.tela ?? (await p.evaluate(() => location.hash || '#inicio').catch(() => '?'));
    this.passos.push({ n: this.n, nome, tela, url: p.url(), print });
    this._printAtual = print;
    this._telaAtual = tela;
    if (carregando)
      this.achado({ regra: 'carregamento-preso', gravidade: 'bloqueia', tipo: 'erro', oQue: 'Indicador de carregamento ainda na tela depois de 10 s.', sugestao: 'Pôr tempo limite e mensagem de erro com "Tentar de novo".' });

    // Erros do console desde o passo anterior.
    for (const c of this.console.filter((c) => !c.visto)) {
      c.visto = true;
      const bloqueio =
        /ERR_BLOCKED_BY_CLIENT|blockedbyclient|registration blocked by Playwright|ERR_INTERNET_DISCONNECTED|Load failed|NetworkError|Failed to fetch|fetch failed|simulador-sem-banco|AuthRetryableFetchError|turnstile|Cross-Origin Request Blocked/i.test(c.texto) ||
        (this.offlineAgora && /network|rede|offline|fetch/i.test(c.texto));
      this.achado({
        regra: c.tipo === 'exceção' ? 'excecao' : c.tipo === 'requisição falhou' ? 'requisicao-falhou' : `console-${c.tipo}`,
        gravidade: c.tipo === 'exceção' ? 'atrapalha' : 'detalhe',
        tipo: 'erro',
        oQue: `${c.tipo === 'exceção' ? 'Exceção na página' : c.tipo === 'requisição falhou' ? 'Requisição falhou' : c.tipo === 'error' ? 'Erro no console' : 'Aviso no console'}: ${c.texto}`,
        chave: c.texto.replace(/\d+/g, 'N').slice(0, 120),
        sugestao: bloqueio ? 'Provável efeito do bloqueio de rede do simulador.' : 'Ver a pilha no console do navegador.',
        talvezSimulador: bloqueio,
      });
    }

    const r = await p
      .evaluate(conferirNaPagina, {
        proibidas: PROIBIDAS,
        urgencia: URGENCIA,
        so18: SO_18,
        avisoFixo: AVISO_FIXO,
        menor: !!this.persona.menor,
        fichaFactual: !!opcoes.fichaFactual,
        famosos: this.famosos,
        principalNaDobra: !!opcoes.principalNaDobra || this.aparelho.id === 'iphone-se',
      })
      .catch((e) => ({ achados: [], erro: String(e?.message ?? e) }));
    for (const a of r.achados ?? []) this.achado(a);

    // Depois de rolar até o fim: o que a barra de baixo cobre no fim da página.
    if (!opcoes.semRolar && (r.altura ?? 0) > this.aparelho.altura + 40) {
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)).catch(() => {});
      await esperar(250);
      const fim = await p.evaluate(conferirNaPagina, { proibidas: [], urgencia: [], so18: [], avisoFixo: AVISO_FIXO, famosos: [], parcial: true }).catch(() => ({ achados: [] }));
      for (const a of fim.achados ?? []) if (a.regra === 'coberto') this.achado({ ...a, oQue: a.oQue + ' (no fim da página)' });
      await p.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    }

    if (opcoes.axe !== false && this.modo === 'dev') await this._axe();
  }

  async _axe() {
    try {
      const res = await new AxeBuilder({ page: this.pagina })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('canvas')
        .analyze();
      for (const v of res.violations) {
        const contraste = v.id === 'color-contrast';
        const nos = v.nodes.slice(0, 4).map((n) => {
          const d = n.any?.[0]?.data;
          const extra = contraste && d ? ` ${d.contrastRatio}:1 (${d.fgColor} em ${d.bgColor}, ${d.fontSize})` : '';
          return `${n.target.join(' ')}${extra}`;
        });
        const pior = contraste ? Math.min(...v.nodes.map((n) => n.any?.[0]?.data?.contrastRatio ?? 9)) : null;
        this.achado({
          regra: `axe-${v.id}`,
          gravidade: contraste ? (pior < 3 ? 'atrapalha' : 'detalhe') : v.impact === 'critical' || v.impact === 'serious' ? 'atrapalha' : 'detalhe',
          tipo: contraste ? 'regra do jogo.md' : 'acessibilidade',
          oQue: `${contraste ? 'Contraste abaixo de 4,5:1' : v.help} (${v.nodes.length} elemento(s)).`,
          chave: v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | '),
          amostras: nos,
          sugestao: contraste ? 'Escurecer o texto ou clarear o fundo até 4,5:1.' : `Ver ${v.helpUrl}`,
        });
      }
    } catch (e) {
      this.achado({ regra: 'axe-falhou', gravidade: 'detalhe', tipo: 'acessibilidade', oQue: `O axe não rodou: ${String(e?.message ?? e).slice(0, 120)}`, talvezSimulador: true });
    }
  }

  /** Achado manual da jornada (ou automático). Campos: regra, gravidade, tipo, oQue, sugestao, chave?, amostras?, talvezSimulador? */
  achado(a) {
    const chave = `${a.regra}|${this._telaAtual ?? ''}|${a.chave ?? a.oQue}`;
    const igual = this.achados.find((x) => x._chave === chave);
    if (igual) {
      igual.vezes++;
      return igual;
    }
    const novo = {
      _chave: chave,
      persona: this.persona.nome,
      personaId: this.persona.id,
      aparelho: this.aparelho.nome,
      aparelhoId: this.aparelho.id,
      navegador: this.aparelho.navegador,
      corte: this.corte,
      modo: this.modo,
      passo: this.n,
      tela: this._telaAtual ?? '?',
      print: this._printAtual ?? '',
      reproduzir: this.ultimoEndereco,
      vezes: 1,
      ...a,
    };
    this.achados.push(novo);
    return novo;
  }

  /** Passo que precisa do servidor de verdade: anota em vez de liberar a rede. */
  naoSimulavel(tela, motivo) {
    this.naoSimulaveis.push({ passo: this.n, tela, motivo, persona: this.persona.nome, aparelho: this.aparelho.nome });
  }

  medir(rotulo, ms, limiteMs, estourou = false, extra) {
    this.metricas.push({ rotulo, ms, limiteMs: limiteMs ?? null, estourou: estourou || (limiteMs != null && ms > limiteMs), passo: this.n, ...(extra ? { extra } : {}) });
  }

  // ---- Toques e gestos ---------------------------------------------------------------------------------

  _alvo(alvo) {
    if (typeof alvo === 'string') return this.pagina.locator(alvo).first();
    return alvo;
  }

  /**
   * Toca num elemento como a persona: com erro de mira (persona.toque.erroPx) e demora para decidir.
   * Confere se a tela mudou; se não mudou, anota "botão que não responde" (a menos que semMudancaOk).
   */
  async tocar(alvo, { semMudancaOk = false, precisao, timeout = 8000, rotulo } = {}) {
    const loc = this._alvo(alvo);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.scrollIntoViewIfNeeded({ timeout }).catch(() => {});
    const caixa = await loc.boundingBox();
    if (!caixa) throw new Error('alvo sem caixa');
    const erro = precisao ?? this.persona.toque?.erroPx ?? 0;
    const dx = (this.sorteio() * 2 - 1) * Math.min(erro, caixa.width / 2);
    const dy = (this.sorteio() * 2 - 1) * Math.min(erro, caixa.height / 2);
    const x = caixa.x + caixa.width / 2 + dx;
    const y = caixa.y + caixa.height / 2 + dy;
    if (this.persona.toque?.demoraMs) await esperar(this.persona.toque.demoraMs);
    const antes = await this._assinatura();
    if (this.aparelho.toque) await this.pagina.touchscreen.tap(x, y);
    else await this.pagina.mouse.click(x, y);
    if (semMudancaOk) return true;
    for (let i = 0; i < 8; i++) {
      await esperar(250);
      if ((await this._assinatura()) !== antes) return true;
    }
    this.achado({
      regra: 'nao-responde',
      gravidade: 'atrapalha',
      tipo: 'erro',
      oQue: `Toque em ${rotulo ?? (await loc.innerText().catch(() => 'elemento')).replace(/\s+/g, ' ').slice(0, 40)} não mudou nada na tela em 2 s.`,
      sugestao: 'Dar retorno imediato ao toque (estado de carregando ou mensagem).',
      talvezSimulador: erro > 0,
    });
    return false;
  }

  async _assinatura() {
    return this.pagina
      .evaluate(() => `${location.href}|${document.body.innerHTML.length}|${(document.body.innerText || '').length}|${document.querySelectorAll('*').length}`)
      .catch(() => String(Math.random()));
  }

  /** Dois toques rápidos (toque duplo nervoso). */
  async tocarDuplo(alvo, intervaloMs = 90) {
    const loc = this._alvo(alvo);
    const c = await loc.boundingBox();
    if (!c) throw new Error('alvo sem caixa');
    const x = c.x + c.width / 2;
    const y = c.y + c.height / 2;
    for (let i = 0; i < 2; i++) {
      if (this.aparelho.toque) await this.pagina.touchscreen.tap(x, y);
      else await this.pagina.mouse.click(x, y);
      await esperar(intervaloMs);
    }
  }

  /**
   * Arraste com o dedo (ou mouse). `de` e `para` são frações [x, y] da caixa do alvo (ex.: canvas) ou pontos {x, y}.
   * O jeito da persona entra aqui: persona.gesto.escalaForca estica ou encolhe o arraste a partir de `de`,
   * duracaoMs e tremorPx deixam o dedo lento e trêmulo, e `curva` dobra o último terço (efeito).
   * Devolve as tarefas longas que aconteceram durante o arraste (só Chromium).
   */
  async arrastar(alvo, de, para, { duracaoMs, passos = 14, curva = 0, semEscala = false } = {}) {
    const caixa = alvo ? await this._alvo(alvo).boundingBox() : { x: 0, y: 0, width: this.aparelho.largura, height: this.aparelho.altura };
    if (!caixa) throw new Error('alvo do arraste sem caixa');
    const ponto = (v) => (Array.isArray(v) ? { x: caixa.x + v[0] * caixa.width, y: caixa.y + v[1] * caixa.height } : v);
    const a = ponto(de);
    let b = ponto(para);
    const g = this.persona.gesto ?? {};
    if (!semEscala && g.escalaForca && g.escalaForca !== 1) b = { x: a.x + (b.x - a.x) * g.escalaForca, y: a.y + (b.y - a.y) * g.escalaForca };
    const dur = duracaoMs ?? g.duracaoMs ?? 260;
    const tremor = g.tremorPx ?? 0;
    const pts = [];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    for (let i = 1; i <= passos; i++) {
      const t = i / passos;
      const dobra = t > 2 / 3 ? curva * ((t - 2 / 3) * 3) ** 2 : 0;
      const tr = tremor ? (this.sorteio() * 2 - 1) * tremor : 0;
      pts.push({ x: a.x + (b.x - a.x) * t + nx * (dobra + tr), y: a.y + (b.y - a.y) * t + ny * (dobra + tr) });
    }
    const t0 = await this.pagina.evaluate(() => performance.now()).catch(() => 0);
    if (this.cdp && this.aparelho.toque) {
      const toque = (p) => [{ x: p.x, y: p.y, radiusX: 6, radiusY: 6, force: 1, id: 1 }];
      await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: toque(a) });
      for (const p of pts) {
        await esperar(dur / passos);
        await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: toque(p) });
      }
      await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await this.pagina.mouse.move(a.x, a.y);
      await this.pagina.mouse.down();
      for (const p of pts) {
        await esperar(dur / passos);
        await this.pagina.mouse.move(p.x, p.y);
      }
      await this.pagina.mouse.up();
    }
    const t1 = await this.pagina.evaluate(() => performance.now()).catch(() => 0);
    const longas = await this.pagina.evaluate(([i, f]) => (window.__simLongas || []).filter((e) => e.ini + e.dur >= i && e.ini <= f), [t0, t1]).catch(() => []);
    return { longas, de: a, para: b };
  }

  /** Tecla (Rafa): 'Tab', 'Shift+Tab', 'Enter', 'Escape', 'ArrowRight'… Devolve o foco depois da tecla. */
  async tecla(k, vezes = 1) {
    let foco = null;
    for (let i = 0; i < vezes; i++) {
      await this.pagina.keyboard.press(k);
      await esperar(120);
      foco = await this.foco();
    }
    return foco;
  }

  async foco() {
    return this.pagina.evaluate(focoNaPagina).catch(() => ({ desc: '?', visivel: false }));
  }

  /** Percorre a tela com Tab e anota foco invisível e ordem estranha (pulo para cima). */
  async percorrerComTab(maximo = 25) {
    const ordem = [];
    for (let i = 0; i < maximo; i++) {
      const f = await this.tecla('Tab');
      if (!f || f.desc === '(nada)') continue;
      if (ordem.length && ordem[0].desc === f.desc && ordem[0].topo === f.topo) break; // deu a volta
      ordem.push(f);
    }
    const invisiveis = ordem.filter((f) => !f.visivel);
    if (invisiveis.length)
      this.achado({ regra: 'foco-invisivel', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: `${invisiveis.length} de ${ordem.length} paradas do Tab sem foco visível.`, chave: invisiveis.slice(0, 3).map((f) => f.desc).join(' | '), amostras: invisiveis.slice(0, 6).map((f) => f.desc), sugestao: 'Dar :focus-visible com contorno claro a esses elementos.' });
    let pulos = 0;
    for (let i = 1; i < ordem.length; i++) if (ordem[i].topo < ordem[i - 1].topo - 80) pulos++;
    if (pulos > 1)
      this.achado({ regra: 'ordem-do-tab', gravidade: 'detalhe', tipo: 'acessibilidade', oQue: `O Tab volta para cima ${pulos} vezes no meio da tela.`, chave: ordem.map((f) => f.desc).slice(0, 4).join(' > '), amostras: ordem.map((f) => `${f.desc} (y=${f.topo})`).slice(0, 12), sugestao: 'Deixar a ordem do HTML igual à ordem visual.' });
    return ordem;
  }

  /** Movimento reduzido: nada pode se mexer. Compara animações e canvas em dois instantes. */
  async conferirParado(onde, { intervaloMs = 900 } = {}) {
    const a = await this.pagina.evaluate(movimentoNaPagina).catch(() => ({ anims: [], canvas: [] }));
    await esperar(intervaloMs);
    const b = await this.pagina.evaluate(movimentoNaPagina).catch(() => ({ anims: [], canvas: [] }));
    const mexeu = b.canvas.some((h, i) => h !== null && a.canvas[i] !== undefined && h !== a.canvas[i]);
    const anims = [...new Set(b.anims)];
    if (anims.length || mexeu)
      this.achado({
        regra: 'movimento-reduzido',
        gravidade: 'atrapalha',
        tipo: 'acessibilidade',
        oQue: `Com movimento reduzido ligado, ${onde} ainda se mexe: ${[mexeu ? 'canvas mudou sozinho' : null, ...anims.slice(0, 4)].filter(Boolean).join('; ')}.`,
        chave: onde + ':' + anims.slice(0, 3).join(','),
        amostras: anims.slice(0, 8),
        sugestao: 'Desligar a animação em @media (prefers-reduced-motion: reduce) e no código do canvas.',
      });
    return { anims, mexeu };
  }

  /** O bloco cabe inteiro na tela quando chega nele (ex.: Carreira no Perfil em 390×844). */
  async conferirCabeNaTela(alvo, nome) {
    const loc = this._alvo(alvo);
    const c = await loc.boundingBox();
    if (!c) {
      this.achado({ regra: 'bloco-ausente', gravidade: 'atrapalha', tipo: 'layout', oQue: `${nome} não apareceu.`, talvezSimulador: true });
      return false;
    }
    const vh = this.pagina.viewportSize().height;
    const inteiro = c.y >= 0 && c.y + c.height <= vh;
    if (!inteiro)
      this.achado({ regra: 'bloco-cortado', gravidade: c.height > vh ? 'atrapalha' : 'detalhe', tipo: 'regra do jogo.md', oQue: `${nome} não cabe inteiro na tela de ${this.pagina.viewportSize().width}×${vh}: começa em y=${Math.round(c.y)} e tem ${Math.round(c.height)} px.`, chave: nome, sugestao: 'Compactar o bloco ou subir ele na tela.' });
    return inteiro;
  }

  async offline(sim) {
    this.offlineAgora = sim;
    await this.contexto.setOffline(sim);
    if (this.cdp) await this._aplicarRede();
  }

  /** Gira ou dobra o aparelho (troca o tamanho da tela). */
  async tamanho(largura, altura) {
    await this.pagina.setViewportSize({ width: largura, height: altura });
    await esperar(400);
  }

  async compartilhados() {
    return this.pagina.evaluate(() => window.__simCompartilhados || []).catch(() => []);
  }

  /** localStorage do aparelho (para semear histórico antes de abrir). Use antes de abrir(): roda em toda página. */
  async semear(chaves) {
    await this.contexto.addInitScript((kv) => {
      try {
        if (localStorage.getItem('__simSemeado')) return;
        for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        localStorage.setItem('__simSemeado', '1');
      } catch {}
    }, chaves);
  }

  esperar(ms) {
    return esperar(ms);
  }

  /** Segunda aba no mesmo aparelho (Rafa). Fica aberta e é vigiada como a primeira. Devolve a Page. */
  async novaAba(caminho) {
    this.abasMantidas = this.abasMantidas ?? new Set();
    const espera = this.contexto.waitForEvent('page');
    const pNova = this.contexto.newPage();
    this.abasMantidas.add(await espera);
    const p = await pNova;
    p.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') this.console.push({ passo: this.n, tipo: m.type(), texto: '[2ª aba] ' + m.text().slice(0, 280) });
    });
    p.on('pageerror', (e) => this.console.push({ passo: this.n, tipo: 'exceção', texto: '[2ª aba] ' + String(e?.message ?? e).slice(0, 280) }));
    if (caminho) await p.goto(this.endereco(caminho), { waitUntil: 'domcontentloaded' });
    return p;
  }

  /** Troca a aba ativa da sessão (prints e conferências passam a ser dela). */
  usarAba(p) {
    this.pagina = p;
  }

  /** Peso baixado até agora (Resource Timing): JS, CSS, fontes, imagens e total, em kB transferidos. */
  async pesoBaixado() {
    return this.pagina
      .evaluate(() => {
        const r = { js: 0, css: 0, fonte: 0, imagem: 0, outro: 0, total: 0, arquivosJs: 0 };
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) r.total += nav.transferSize || 0;
        for (const e of performance.getEntriesByType('resource')) {
          const t = e.transferSize || 0;
          r.total += t;
          const n = e.name.split('?')[0];
          if (e.initiatorType === 'script' || /\.(m?js|ts)$/.test(n)) { r.js += t; r.arquivosJs++; }
          else if (/\.css$/.test(n) || e.initiatorType === 'css' && !/\.(woff2?|ttf|png|svg|webp|jpg)$/.test(n)) r.css += t;
          else if (/\.(woff2?|ttf|otf)$/.test(n)) r.fonte += t;
          else if (/\.(png|svg|webp|jpe?g|gif|avif|ico)$/.test(n)) r.imagem += t;
          else r.outro += t;
        }
        for (const k of Object.keys(r)) if (k !== 'arquivosJs') r[k] = Math.round(r[k] / 102.4) / 10;
        return r;
      })
      .catch(() => null);
  }

  async encerrar() {
    const furos = conferirGuarda(this.rede);
    const resultado = {
      persona: this.persona.nome,
      personaId: this.persona.id,
      aparelho: this.aparelho.nome,
      aparelhoId: this.aparelho.id,
      navegador: this.aparelho.navegador,
      corte: this.corte,
      modo: this.modo,
      passos: this.passos,
      achados: this.achados.map(({ _chave, ...a }) => a),
      metricas: this.metricas,
      naoSimulaveis: this.naoSimulaveis,
      downloads: this.downloads ?? [],
      abas: this.abas ?? [],
      compartilhados: await this.compartilhados(),
      bytes: this.bytes ?? {},
      rede: resumoDaRede(this.rede),
      redeDetalhe: this.rede.filter((e) => e.decisao === 'bloqueada' || this.modo === 'producao').slice(0, 400),
      furos,
    };
    writeFileSync(join(this.pasta, 'resultado.json'), JSON.stringify(resultado, null, 2));
    await this.navegador?.close().catch(() => {});
    return resultado;
  }
}
