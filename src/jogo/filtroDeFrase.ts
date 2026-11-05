// Filtro da frase própria do card (docs/jogo.md 14.6): o mesmo do apelido (`normalizar_apelido` e `apelido_bloqueado`,
// em supabase/migrations/20261019000000_base.sql, com a lista de `public.palavras_bloqueadas` de todas as migrações),
// mais as palavras proibidas da seção 7 que faltam nela. Roda só no aparelho: a frase nunca vai para o servidor.
// A lista não fica escrita aqui: só a marca de cada palavra (tamanho + hash), para nenhum palavrão nem nome de pessoa
// entrar no código ou no bundle. `filtroDeFrase.test.ts` refaz as marcas a partir das migrações e confere uma por uma;
// palavra nova numa migração faz o teste falhar e mostrar a marca que falta.

/** Tamanho máximo da frase própria, em letras (cada emoji conta como uma). */
export const FRASE_MAX = 60;

/** Marca de uma palavra já normalizada: o tamanho e dois hashes de 32 bits (FNV-1a e djb2). */
export function marca(p: string): string {
  let a = 0x811c9dc5;
  let b = 5381;
  for (let i = 0; i < p.length; i++) {
    const c = p.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = (Math.imul(b, 33) + c) >>> 0;
  }
  return `${p.length}:${a.toString(36).padStart(7, '0')}${b.toString(36).padStart(7, '0')}`;
}

/** As palavras de `public.palavras_bloqueadas` (todas as migrações), em marca. */
export const MARCAS_BLOQUEADAS: ReadonlySet<string> = new Set([
  '10:025b20w1k8v7q6', '10:05gb01w1gy2ago', '10:0bc9zct1jyeyx3', '10:0cm1rl90f63wgj', '10:0es1rig1d5i268', '10:0fuoehf0v8tn73',
  '10:0hxen2y0vb9eje', '10:0iclgch1pwqydn', '10:0l48uwj0p0ggdh', '10:0mb4o9t17awy1b', '10:0o95d0w1jwxvrc', '10:0qsp8m012cqlo2',
  '10:0rggp8p0smq00p', '10:0rxmlsz1i8pb6p', '10:0sdriev0503v5z', '10:0sr8imf1720ei1', '10:11wap4619enwji', '10:137d6p00p70rt8',
  '10:18c49ug1sssoxo', '10:1j5z0u51uwmvm5', '10:1jjtas004msgho', '10:1jxmxg50zajtlh', '10:1lyferm0ipfaxk', '10:1necqex0i4lzph',
  '10:1o1wkvw1h0mg8o', '10:1qi8jvr1r967dn', '10:1qlebkr1olb01h', '10:1rpub4h193t42x', '10:1s80if80hzc6om', '10:1scuc8e1etklr0',
  '10:1x70qv80ks87as', '10:1xr60mm1w3mnni', '11:00040vz05ogolv', '11:00jhdvv0sr68of', '11:00rfqut0g8dxk3', '11:021eek10qyo6q7',
  '11:02t1q0c0r5cms4', '11:05x25s90ssat4r', '11:06svso31k9f5jp', '11:06tsx8j13d2q6t', '11:0bsz99h0dcumaf', '11:0hexso701uanfb',
  '11:0ih3mvw1ovtsaq', '11:0kd6rqx1hnjhpz', '11:0lht42e0ayh1hu', '11:0n2eysg1pvkaig', '11:0njttu01ww4944', '11:0uu8mqh0ho4fjd',
  '11:0ygqi110raph1h', '11:0ync8ub1me3yi9', '11:10t3v4c0i7w50a', '11:122d40a0ljs2ao', '11:12u8pnu0lg641u', '11:14ktjr80b62u40',
  '11:15315px1bts3ax', '11:184gmin0b6shpz', '11:190f3jy0qqitt0', '11:1dgm3ae188gz5u', '11:1djh8r21or0rzi', '11:1f0cmvz103wz2f',
  '11:1f5pb2m1qm785m', '11:1idfabx1wpdj8p', '11:1ign9sy1e3gw5a', '11:1sd77xh0m8s7g7', '11:1u704nb01nbxer', '11:1wus4341pvr606',
  '11:1y3bgh70p5lm6t', '11:1y8zdr302823i3', '12:04fihqa1oyyjyy', '12:04tinyh0tcu029', '12:04x1i6502scr3p', '12:05apsrx0ajt93t',
  '12:05g36g31wr7bv7', '12:06y2peq03lij5c', '12:07pp4zl047mc3d', '12:07rjcj70qmyg2h', '12:07yr8p9046ws6j', '12:0bt9zlb18yj9gb',
  '12:0etljpo0sbxxzk', '12:0g4ekbx1o9fmap', '12:0ha0vvm0qhp5ou', '12:0j2onak18w4ek0', '12:0qv13940dozbd6', '12:0t3blsx088ormz',
  '12:0veupnv0oarpqj', '12:0wru5tp027rlhh', '12:0zl5hkc1tg62ge', '12:13omh681848874', '12:13p0ify0zp7tqi', '12:147d0vc1mqk19o',
  '12:15312m10b8jfm9', '12:162hk1r0kyq6k3', '12:176vs9v0k2rx8l', '12:1bqafmu12r4esg', '12:1cc8lsa1but2tq', '12:1gaokce08s465w',
  '12:1hkenju1snko70', '12:1mqxlgw0ld570i', '12:1olt8b61emqmnc', '12:1qd50d40tap2qk', '12:1s45ked0mjq3pf', '12:1sl17sw04t2fwk',
  '12:1wnqft20ntk62e', '12:1xdw0x80l2nx2i', '12:1yfkjzp0juaxhh', '13:064amkf0wg1znv', '13:0amkk5812yztos', '13:0e10xjj1xw8nt9',
  '13:0ecg7ff1y7sxs7', '13:0fg3fl515t2cjh', '13:0r2yfkc0ab2b5o', '13:0ryojf218ams1o', '13:0vehn1412q444e', '13:0wloudw0db16i4',
  '13:0ydxmb814740zw', '13:11xxz400umd3be', '13:127s4320mp5y92', '13:12wp4h60akef96', '13:133avj81mwl3fs', '13:13tl2hw1am5rn0',
  '13:17v8dvn1ururmt', '13:1ax5r3u1t53vt8', '13:1cs0jk01wcnytk', '13:1l88jy50hfshnl', '13:1m1bpk61q86886', '13:1moc2ak18dk1vk',
  '13:1nj7xas1sm4h6i', '13:1qli8610w3k5n1', '13:1twfrvt18l6qkl', '13:1urk89j08wsq7v', '13:1ybeqka1t4qp8k', '14:00oe69q0ljrybo',
  '14:0ebr59802dhl0q', '14:0hv4lqw063fxyk', '14:0ofns0m1qy7n32', '14:0qdn0xa1mxh7qs', '14:0qvqlz11ceasxf', '14:0t2z7v51hw5zxx',
  '14:0x7ddbc1044rb2', '14:10ylxyl1uwcccp', '14:15wbgxt1czt98z', '14:17rmfk90erc30n', '14:1cscyf70azyh7n', '14:1i88w2s12k7a1y',
  '14:1jw7r6l18tup7f', '14:1o5wdts1inpldq', '14:1pkzich1xfbz4x', '14:1wwqgm50urtwpp', '15:086f2l917gbjtj', '15:09e8px90bffze7',
  '15:0m362ej1278v4b', '15:0ruc57l1e6nv1z', '15:0u7u02w1imxci0', '15:0uuo8cm1w1wyr8', '15:1a85b2303jfv8l', '15:1jb47ad0zsumpl',
  '15:1jcxt9p0m9rlot', '16:03ucf880p7k0jk', '16:0byke3a1vcp1lq', '16:0hio8gv0dkjhd5', '16:0k8n8ho0kcond6', '16:0lr3ixu12v2d9s',
  '16:1a9cluc1d8n4xy', '16:1ggx9kv03m9n0t', '17:0ds4oo8099aia4', '17:18b49ir06d67vd', '18:0d4nwe11la27jd', '18:0zxlks50d0d8sf',
  '19:0cugh8n08rpwut', '19:1ipy82r0711523', '19:1qa7qup11l13qp', '2:0l4rfxh003ho59', '3:0n2rauk0377bji', '3:0qtpyjg03773nk',
  '3:0s5qr5q0377fpy', '3:0z1td2w0377kt0', '3:1c2kin20377ejg', '3:1fc3q8l03776zj', '4:05jqs850ykquk3', '4:0f74zul0ykl4nx',
  '4:0flty2x0ykhllr', '4:0hq4guw0ykf29w', '4:0zmlmab0ykpgct', '4:13ig1zx0ykpgcf', '4:1achh5k0ykeypw', '4:1fcbu2d0ykng8n',
  '4:1kvnxu10ykp2p7', '4:1o9w8wm0ykwv4q', '4:1suj1sn0yko9xr', '5:0hbll4504abxit', '5:0og8q0o0491y7o', '5:0ykunl604leuok',
  '5:19jtg9v04k0i8j', '5:19x2mwg04f2he6', '5:1b1tk5q04lhxlk', '5:1ghy8c404k7zd8', '5:1ohagc1048ct3b', '5:1os2wyf04heg89',
  '5:1qi9ao2047dm4c', '6:07f8gta1w80mlm', '6:0ap3dks1vwrneq', '6:0dk39oj1vyu6s9', '6:0dn85c500lf7cd', '6:0dnly100609vx8',
  '6:10gd8b903nwjgp', '6:110cfp703nwjgb', '6:17ba8vy0b2jsiw', '6:17r6zbp1vuloer', '6:195io4l1v89ux9', '6:19l8sz21vux5cu',
  '6:1a7bihd02dsgfv', '6:1dcy6rv03hijd7', '6:1e8cthh04ei8up', '6:1o8tgxt05rs6ub', '6:1s2d7w11yftl07', '6:1u49dr509nhtg7',
  '6:1v1ahix05bvyr7', '6:1xt6ign05bvyqt', '6:1yn7d2g1vniq2e', '7:01hn4hh0gmjnbz', '7:034sj1u0nnp6hi', '7:038gh1y0k5uhqu',
  '7:075tm3d14h517n', '7:09at6oh1waz9ix', '7:0bxmjgu02vypx8', '7:0crctnh1ms6yan', '7:0nt14nb0ykg89f', '7:0qrcnod0npb7e3',
  '7:0rum4pd1dkku1t', '7:0sjq8ut1ia15mr', '7:0ukp0ks176ldri', '7:0xgjjpy17obmja', '7:10hi54900nxjbz', '7:10uwxrl1dol11b',
  '7:11e6p8c1oimzec', '7:11p5dba1084cku', '7:12fbp5g1uolkj4', '7:12ml8x805twmq0', '7:1324be61oimzeq', '7:155t53f0rvddff',
  '7:1b1jvo512lm6jx', '7:1edlzu919d87z3', '7:1fwkvi90tinwv9', '7:1nlr7gd17hvs27', '7:1omzx8f0t7x6er', '7:1sen8161rryw4a',
  '7:1te1ddb0vonrvh', '7:1xe5muf1k7c9dn', '7:1xsp6e60nvapq6', '7:1ynpjkq0usvihw', '8:02cymu50zre6y5', '8:0688sm9189pqn7',
  '8:087jqf50q5rkbx', '8:08suerd0pycfb1', '8:0cfz0o01b340qy', '8:0iqw1jk00makvw', '8:0onxzo10en0zhb', '8:0uie4dq07hl0gc',
  '8:14lwiwm0ljddnu', '8:189auc81sk3tf4', '8:18ek3ei03i5gzm', '8:1g21bk006jtyt4', '8:1pg2wga148w1om', '8:1uo0g8m1qty56w',
  '8:1x38atz144uvwn', '9:02kq82x0yo1wij', '9:0ahbe6j01gzj4x', '9:0dpgd4h1ik6pu5', '9:0gv3zv81cbh5ro', '9:0j3iz631sjxpv9',
  '9:0kw64p616cf64q', '9:0qgv4h817it7ng', '9:0ql58ve0igvmcc', '9:0s4sqn217it7n2', '9:0tba7oq0afpvlw', '9:0tlnoes1euy4hs',
  '9:0ubgtmy1u738j4', '9:0z9jff41447478', '9:0zhbw0f0nu9tvl', '9:13mxyld0oez29f', '9:1751u7k0iiku22', '9:17qi30u0iecbh8',
  '9:1a8z18e1syno88', '9:1eep3mk1ihgcww', '9:1eztp9m1uxisj0', '9:1fjawo80ixoxn8', '9:1gzctda0g15200', '9:1jt18cd15ved4r',
  '9:1lnp79l1fz6b8t', '9:1me0htb0awz69l', '9:1oy3tix1y64fj5', '9:1rzmzhb1gqpkv1',
]);

/** As palavras proibidas da seção 7 que faltam na lista do apelido: só bloqueiam inteiras ("bancada" passa). */
export const MARCAS_INTEIRAS: ReadonlySet<string> = new Set(['7:017nisi0gmjnc0', '4:18t8ypp0ykeapf', '8:1jcjqy20m0ca0m', '5:1m7acai0477pei', '13:0nzg6zn0irs3y3', '5:00b5mm404b3oly', '3:0i0tgik0377h34']);

const tamanhos = (marcas: ReadonlySet<string>) => [...new Set([...marcas].map((m) => Number(m.split(':')[0])))];
const LONGOS = tamanhos(MARCAS_BLOQUEADAS).filter((t) => t > 4);

/** Igual a `normalizar_apelido`: minúsculas, sem acento, 0→o 1→i 3→e 4→a 5→s 7→t @→a $→s, o resto vira espaço. */
export function normalizarFrase(texto: string): string {
  const troca: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => troca[c])
    .replace(/[^a-z ]/g, ' ');
}

/**
 * Igual a `apelido_bloqueado`: palavra de até 4 letras só bloqueia inteira ("cu" não pega "Curitiba"); palavra
 * mais longa bloqueia em qualquer lugar, mesmo com espaços no meio ("p o r r a"). As da seção 7 só inteiras.
 */
export function fraseBloqueada(texto: string, bloqueadas: ReadonlySet<string> = MARCAS_BLOQUEADAS, inteiras: ReadonlySet<string> = MARCAS_INTEIRAS): boolean {
  const n = normalizarFrase(texto);
  const palavras = n.split(' ').filter(Boolean);
  if (palavras.some((p) => p.length <= 4 && bloqueadas.has(marca(p)))) return true;
  if (palavras.some((p, i) => inteiras.has(marca(p)) || (i > 0 && inteiras.has(marca(`${palavras[i - 1]} ${p}`))))) return true;
  const junto = palavras.join('');
  const longos = bloqueadas === MARCAS_BLOQUEADAS ? LONGOS : tamanhos(bloqueadas).filter((t) => t > 4);
  return longos.some((t) => {
    for (let i = 0; i + t <= junto.length; i++) if (bloqueadas.has(marca(junto.slice(i, i + t)))) return true;
    return false;
  });
}

/** Letras como o contador mostra: cada emoji ou letra acentuada conta uma. */
export const letrasDaFrase = (texto: string): number => [...texto.normalize('NFC')].length;

/** Espaços repetidos viram um e as pontas somem. */
export const limparFrase = (texto: string): string => texto.replace(/\s+/g, ' ').trim();

export type FrasePropria = { ok: true; frase: string } | { ok: false; motivo: 'vazia' | 'longa' | 'filtro' };

/** Confere a frase própria antes de "Pôr no card". */
export function conferirFrasePropria(texto: string): FrasePropria {
  const frase = limparFrase(texto);
  if (!frase) return { ok: false, motivo: 'vazia' };
  if (letrasDaFrase(frase) > FRASE_MAX) return { ok: false, motivo: 'longa' };
  if (fraseBloqueada(frase)) return { ok: false, motivo: 'filtro' };
  return { ok: true, frase };
}

/** Textos da folha "Escrever minha frase" (docs/jogo.md 14.6). */
export const TEXTOS_DA_FRASE = {
  titulo: 'Escrever minha frase',
  regra: 'Sem palavrão nem nome de pessoa',
  privacidade: 'Fica só no seu aparelho. O jogo não guarda nem mostra pra ninguém: só quem receber o card vê.',
  barrada: 'Essa frase não passou no filtro. Tenta outra, falando do time ou do lance.',
  usarNarrador: 'Usar a do narrador',
  porNoCard: 'Pôr no card',
} as const;
