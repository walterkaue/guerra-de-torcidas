// A ordem da função codigo-torcedor (fluxo.ts), com o Auth, o Turnstile e o banco de mentira: CAPTCHA antes de
// tudo, passe do dono antes da junção, nenhum passe sem junção, e-mail técnico só uma vez e nunca em conta real.

import { describe, expect, it } from 'vitest';
import { entrar, gerar, type Servicos } from '../functions/codigo-torcedor/fluxo';
import { emailTecnicoDe, impressaoDoCodigo } from '../functions/_shared/jogo/codigoTorcedor';

const SEGREDO = 'segredo-de-teste';

const EU = 'origem';
const DONO = 'dono';

interface Opcoes {
  captcha?: boolean | 'sem_chave';
  conferir?: { situacao: string; dono?: string | null; time_dono?: string | null; time_seu?: string | null };
  email?: string | null;
  passeFalha?: boolean;
  juntarErro?: string;
  gerarErros?: { code?: string; message?: string }[];
}

function falso(o: Opcoes = {}) {
  const chamadas: string[] = [];
  const args: Record<string, Record<string, unknown>> = {};
  let n = 0;
  const s: Servicos = {
    async captcha() {
      chamadas.push('captcha');
      return o.captcha ?? true;
    },
    async rpc(nome, a) {
      chamadas.push(nome);
      args[nome] = a;
      if (nome === 'codigo_gerar') {
        const erro = o.gerarErros?.shift();
        return erro ? { data: null, error: erro } : { data: '2026-11-03T22:10:00Z', error: null };
      }
      if (nome === 'codigo_conferir') {
        return { data: [{ dono: DONO, time_dono: 'bahia', time_seu: 'bahia', ...(o.conferir ?? { situacao: 'valido' }) }], error: null };
      }
      if (o.juntarErro) return { data: null, error: { message: o.juntarErro } };
      return { data: [{ time_id: 'bahia', apelido: null, faixa_etaria: '18_mais' }], error: null };
    },
    async emailDe() {
      chamadas.push('emailDe');
      return o.email === undefined ? null : o.email;
    },
    async darEmail(_uid, email) {
      chamadas.push(`darEmail:${email}`);
    },
    async passe(_email, dono) {
      chamadas.push('passe');
      expect(dono).toBe(DONO);
      if (o.passeFalha) throw new Error('passe não gerado');
      return 'hash-do-passe';
    },
    sortear: (k) => n++ % k,
    segredo: SEGREDO,
  };
  return { s, chamadas, args };
}

describe('gerar', () => {
  it('devolve o código e grava só a impressão dele', async () => {
    const { s, args } = falso();
    const r = await gerar(s, DONO);
    expect(r.codigo).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    expect(args.codigo_gerar).toEqual({ p_dono: DONO, p_impressao: await impressaoDoCodigo(r.codigo, SEGREDO) });
    expect(JSON.stringify(args)).not.toContain(r.codigo);
  });

  it('impressão repetida: sorteia outro código', async () => {
    const { s, chamadas } = falso({ gerarErros: [{ code: '23505' }] });
    await gerar(s, DONO);
    expect(chamadas.filter((c) => c === 'codigo_gerar')).toHaveLength(2);
  });

  it('erros do banco viram o código certo', async () => {
    await expect(gerar(falso({ gerarErros: [{ message: 'muitos_codigos' }] }).s, DONO)).rejects.toMatchObject({ status: 429, codigo: 'muitos_codigos' });
    await expect(gerar(falso({ gerarErros: [{ message: 'sem_time' }] }).s, DONO)).rejects.toMatchObject({ codigo: 'sem_time' });
  });
});

describe('entrar', () => {
  const corpo = { codigo: 'abcd-2345', captcha: 'token' };

  it('CAPTCHA recusado ou sem a chave: não confere nada (nem conta tentativa)', async () => {
    const recusado = falso({ captcha: false });
    await expect(entrar(recusado.s, EU, corpo)).rejects.toMatchObject({ status: 403, codigo: 'captcha' });
    expect(recusado.chamadas).toEqual(['captcha']);
    const semChave = falso({ captcha: 'sem_chave' });
    await expect(entrar(semChave.s, EU, corpo)).rejects.toMatchObject({ status: 503, codigo: 'captcha_indisponivel' });
    expect(semChave.chamadas).toEqual(['captcha']);
  });

  it('código com formato impossível nem chega ao banco', async () => {
    const { s, chamadas } = falso();
    await expect(entrar(s, EU, { ...corpo, codigo: 'ABCD-1O0I' })).rejects.toMatchObject({ codigo: 'codigo_invalido' });
    expect(chamadas).toEqual(['captcha']);
  });

  it('normaliza o que foi digitado e manda só a impressão', async () => {
    const { s, args } = falso();
    await entrar(s, EU, corpo);
    expect(args.codigo_conferir).toEqual({ p_usuario: EU, p_impressao: await impressaoDoCodigo('ABCD2345', SEGREDO) });
  });

  it('ordem: confere, dá o e-mail técnico, gera o passe e só então junta', async () => {
    const { s, chamadas } = falso();
    const r = await entrar(s, EU, corpo);
    expect(chamadas[0]).toBe('captcha');
    expect(chamadas[1]).toBe('codigo_conferir');
    expect(chamadas[2]).toBe('emailDe');
    expect(chamadas[3]).toBe(`darEmail:${await emailTecnicoDe(DONO, SEGREDO)}`);
    expect(chamadas.slice(4)).toEqual(['passe', 'juntar_torcedores']);
    expect(r).toEqual({ etapa: 'pronto', tokenHash: 'hash-do-passe', torcedor: { time_id: 'bahia', apelido: null, faixa_etaria: '18_mais' } });
  });

  it('dono já ligado antes: não troca o e-mail técnico', async () => {
    const { s, chamadas } = falso({ email: `t.${'a'.repeat(32)}@torcedor.invalid` });
    await entrar(s, EU, corpo);
    expect(chamadas.some((c) => c.startsWith('darEmail'))).toBe(false);
  });

  it('dono com e-mail de verdade: recusa antes do passe e da junção', async () => {
    const { s, chamadas } = falso({ email: 'kaue@exemplo.com.br' });
    await expect(entrar(s, EU, corpo)).rejects.toMatchObject({ codigo: 'conta_nao_anonima' });
    expect(chamadas).not.toContain('passe');
    expect(chamadas).not.toContain('juntar_torcedores');
  });

  it('passe falhou: nada é juntado (o aparelho fica com a conta antiga)', async () => {
    const { s, chamadas } = falso({ passeFalha: true });
    await expect(entrar(s, EU, corpo)).rejects.toThrow(/passe/);
    expect(chamadas).not.toContain('juntar_torcedores');
  });

  it('junção falhou: o passe não sai daqui', async () => {
    const { s } = falso({ juntarErro: 'codigo_invalido' });
    const erro = await entrar(s, EU, corpo).catch((e) => e);
    expect(erro).toMatchObject({ status: 400, codigo: 'codigo_invalido' });
    expect(JSON.stringify(erro)).not.toContain('hash-do-passe');
    await expect(entrar(falso({ juntarErro: 'deu pau' }).s, EU, corpo)).rejects.toThrow('juntar_torcedores falhou');
  });

  it('times diferentes sem escolha: pergunta, sem passe nem junção', async () => {
    const { s, chamadas } = falso({ conferir: { situacao: 'valido', time_dono: 'bahia', time_seu: 'remo' } });
    expect(await entrar(s, EU, corpo)).toEqual({ etapa: 'escolher_time', timeDono: 'bahia', timeSeu: 'remo' });
    expect(chamadas).toEqual(['captcha', 'codigo_conferir']);
  });

  it('times diferentes com escolha válida: junta com o time escolhido; time de fora pergunta de novo', async () => {
    const certo = falso({ conferir: { situacao: 'valido', time_dono: 'bahia', time_seu: 'remo' } });
    await entrar(certo.s, EU, { ...corpo, time: 'remo' });
    expect(certo.args.juntar_torcedores.p_time).toBe('remo');
    const fora = falso({ conferir: { situacao: 'valido', time_dono: 'bahia', time_seu: 'remo' } });
    expect((await entrar(fora.s, EU, { ...corpo, time: 'flamengo' })).etapa).toBe('escolher_time');
  });

  it('cada situação do banco vira o código certo, sem passe', async () => {
    for (const [situacao, status, codigo] of [
      ['codigo_invalido', 400, 'codigo_invalido'],
      ['muitas_tentativas', 429, 'muitas_tentativas'],
      ['pausa_geral', 429, 'pausa_geral'],
      ['proprio', 409, 'proprio'],
      ['conta_nao_anonima', 403, 'conta_nao_anonima'],
    ] as const) {
      const { s, chamadas } = falso({ conferir: { situacao } });
      await expect(entrar(s, EU, corpo)).rejects.toMatchObject({ status, codigo });
      expect(chamadas).not.toContain('passe');
    }
  });
});
