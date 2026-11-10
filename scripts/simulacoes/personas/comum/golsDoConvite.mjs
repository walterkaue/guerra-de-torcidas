// Os gols de quem chamou no convite dos Lances (C03C08, docs/jogos/lances.md "Desafio dos Lances"): o telão e a fita
// que o link ?l= mostra. Cada persona confere o que é dela: o Zé, que as faixas continuam na tela e nada pula quando o
// desenho chega; o Seu Antônio, que nada anda sozinho e "Próximo gol" troca o quadro; a Bia, que com economia de dados
// nada baixa sozinho; a Duda, que sem apelido sai "de quem te chamou".
import { esperar } from './jogar.mjs';

const LINK = '/?homeFalsa&lancesFalsos&l=abcdefgh&chamouTime=flamengo';
const caixa = (p, sel) => p.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; }).catch(() => null);

/** O link de Lances: o convite com o telão e a fita. `limpar`: aparelho novo (quem ainda não tem time). */
export async function abrirConviteComGols(s, { extra = '', esperarPor = '[data-fita]', limpar = true } = {}) {
  const p = s.page;
  if (limpar) {
    await p.goto(s.endereco('/?homeFalsa&lancesFalsos'), { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => localStorage.clear()).catch(() => {});
  }
  const ms = await s.abrir(`${LINK}${extra}`, { esperarPor, limiteMs: 20000, rotulo: 'link de Lances até a fita dos gols' });
  if ((await p.locator('[data-fita] [data-casa]').count()) !== 3)
    s.achado({ regra: 'fita-ausente', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: 'O convite de Lances com tentativas não mostrou as 3 casas da fita.' });
  return ms;
}

/** Zé (360×740, fonte 130%): as faixas e o "Outro time" na tela, sem rolar, antes e depois do desenho; nada pula. */
export async function conferirFaixasComTelao(s) {
  const p = s.page;
  await abrirConviteComGols(s, { esperarPor: '[data-faixa-time]' });
  const antes = await caixa(p, '[data-faixa-time]');
  await p.locator('.telao-canvas').waitFor({ state: 'attached', timeout: 15000 }).catch(() =>
    s.achado({ regra: 'telao-nao-chegou', gravidade: 'atrapalha', tipo: 'erro', oQue: 'O desenho do telão não chegou em 15 s no convite de Lances.', talvezSimulador: true }),
  );
  await esperar(600);
  const depois = await caixa(p, '[data-faixa-time]');
  if (antes && depois && Math.abs(depois.top - antes.top) > 2)
    s.achado({ regra: 'convite-pulou', gravidade: 'atrapalha', tipo: 'layout', oQue: `As faixas pularam ${depois.top - antes.top} px quando o desenho do telão chegou.` });
  const vh = p.viewportSize().height;
  for (const [sel, nome] of [['[data-faixa-time]', 'as faixas de time'], ['[data-acao="outro-time"]', 'o "Outro time"']]) {
    const c = await caixa(p, sel);
    if (!c || c.bottom > vh)
      s.achado({ regra: 'faixas-fora-da-tela', gravidade: 'bloqueia', tipo: 'regra do jogo.md', oQue: `Com o telão, ${nome} termina em y=${c?.bottom} numa tela de ${vh} px: precisa rolar.` });
  }
}

/** Seu Antônio (movimento reduzido): o quadro final do 1º gol, nada anda sozinho e "Próximo gol" troca o quadro. */
export async function conferirTelaoParado(s) {
  const p = s.page;
  await abrirConviteComGols(s, { limpar: false });
  await p.locator('.telao-canvas').waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
  await esperar(500);
  const modo = await p.locator('[data-telao]').getAttribute('data-modo').catch(() => null);
  if (modo !== 'parado') s.achado({ regra: 'telao-andou', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: `Com movimento reduzido o telão está em modo "${modo}" (esperado "parado").` });
  await s.conferirParado('o telão dos gols de quem chamou');
  const botao = p.locator('[data-telao] .telao-botao');
  const texto = (await botao.textContent().catch(() => '')) ?? '';
  if (!/próximo gol/i.test(texto)) s.achado({ regra: 'sem-proximo-gol', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: `Parado, o botão do telão diz "${texto}" (esperado "Próximo gol", com 2 gols).` });
  const tarja = () => p.locator('[data-telao] [data-tarja]').textContent().catch(() => '');
  const antes = await tarja();
  await s.tocar(botao);
  const depois = await tarja();
  if (antes === depois) s.achado({ regra: 'proximo-gol-nao-trocou', gravidade: 'atrapalha', tipo: 'erro', oQue: `"Próximo gol" não trocou o quadro (a tarja continuou "${depois}").` });
  await s.conferirParado('o telão depois do "Próximo gol"');
}

/** Bia (economia de dados): nada baixa nem anda sozinho; o toque em "Ver os gols" traz o quadro parado. */
export async function conferirTelaoSemDados(s) {
  const p = s.page;
  await abrirConviteComGols(s);
  await esperar(3000);
  const modo = await p.locator('[data-telao]').getAttribute('data-modo').catch(() => null);
  if (modo !== 'sob_demanda') s.achado({ regra: 'telao-economia', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: `Com economia de dados o telão está em modo "${modo}" (esperado "sob_demanda").` });
  if (await p.locator('.telao-canvas').count()) s.achado({ regra: 'telao-baixou-sozinho', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: 'Com economia de dados o desenho do telão baixou sem toque.' });
  await s.tocar(p.locator('[data-telao-botao]'));
  await p.locator('.telao-canvas').waitFor({ state: 'attached', timeout: 15000 }).catch(() =>
    s.achado({ regra: 'ver-os-gols-nao-abriu', gravidade: 'atrapalha', tipo: 'erro', oQue: '"Ver os gols" não trouxe o desenho em 15 s.', talvezSimulador: true }),
  );
  await esperar(500);
  await s.conferirParado('o telão com economia de dados');
}

/** Duda (menos de 16): quem chamou sem apelido aparece como "quem te chamou", sem "do"/"da" na frente. */
export async function conferirTelaoSemApelido(s) {
  const p = s.page;
  await abrirConviteComGols(s, { extra: '&chamouSemApelido' });
  await p.locator('.telao-canvas').waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
  const rotulo = (await p.locator('.telao-canvas').getAttribute('aria-label').catch(() => '')) ?? '';
  if (!/de quem te chamou/.test(rotulo))
    s.achado({ regra: 'sem-apelido', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: `Sem apelido, o telão diz "${rotulo}" (esperado "de quem te chamou").` });
  const texto = (await p.locator('[data-placa]').innerText().catch(() => '')) ?? '';
  if (/Zé da Geral|Camisa10/.test(texto + rotulo) || /\b(do|da) quem\b/i.test(texto + rotulo))
    s.achado({ regra: 'apelido-no-convite', gravidade: 'bloqueia', tipo: 'regra do jogo.md', oQue: `Desafio sem apelido mostrou nome ou artigo na placa: "${texto.slice(0, 160)}".` });
}
