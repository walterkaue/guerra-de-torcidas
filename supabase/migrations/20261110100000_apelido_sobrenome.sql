-- Sobrenome ou apelido de jogador famoso no apelido passa junto com outro nome (decisão de 10/11/2026;
-- docs/jogo.md, seção 4, "Apelido"). Só o nome do jogador, ou o nome completo dele, continua barrado.
--
-- O que muda:
--   - public.palavras_bloqueadas ganha a coluna famoso:
--       null      = palavra ofensiva (palavrão, ofensa, aposta). Segue exatamente como antes.
--       'palavra' = uma palavra só, como o jogador é chamado (sobrenome ou apelido: "ceni", "gabigol").
--                   Barra só quando o apelido inteiro é essa palavra, disfarçada ou não. Disfarce que não conta como
--                   outro nome: maiúscula, acento, espaço, sinal, número (como enfeite ou no lugar de letra, até
--                   misturado: "C3ni 01"), @ e $ ("@neymar"), letra repetida ("Neymarr"), a palavra repetida
--                   ("Ceni Ceni"), letra solta, artigo, "do/da/dos/das/de" e "Jr/Júnior" ("O Ceni", "Neymar Júnior",
--                   "De Arrascaeta"). "Kauê Ceni", "Ceni do Kauê" e "Zé Gabigol" passam: têm outro nome.
--       'nome'    = duas ou mais palavras juntas, o nome pelo qual o jogador é conhecido ("rogerioceni",
--                   "gabrielbarbosa", "vinijr"). Barra em qualquer lugar, com os mesmos disfarces de letra:
--                   "Rogério Ceni", "rogerio ceni 10", "RogérioCeni" e "Rogério 10 Ceni" continuam barrados.
--   - apelido_bloqueado(p) passa a ler a coluna (mesma assinatura, mesmo security definer e search_path '').
--
-- O que não muda: salvar_torcedor, o código do torcedor, apelidos_filtrados e a regra dos 16+ chamam a mesma função.
-- Nenhum apelido ou desafio gravado é tocado. A frase própria do card (src/jogo/filtroDeFrase.ts, só no aparelho)
-- continua barrando nome de jogador em qualquer lugar.
--
-- Toda entrada de 20261106100000_apelidos_famosos.sql (a única migração que acrescentou jogadores) é marcada abaixo,
-- uma por uma, e esta acrescenta nomes completos que faltavam; src/dados/apelidosFamosos.test.ts confere que nenhuma
-- ficou de fora nem em duas listas.
-- Palavra acrescentada à mão no painel fica com famoso null, ou seja, com o critério rígido das ofensas.

alter table public.palavras_bloqueadas
  add column famoso text null check (famoso in ('palavra', 'nome'));

comment on column public.palavras_bloqueadas.famoso is
  'null = ofensa (critério de sempre); palavra = jogador por uma palavra, barra só o apelido inteiro; nome = nome completo, barra em qualquer lugar.';

-- Uma palavra só: sobrenome ou apelido pelo qual o jogador é chamado.
update public.palavras_bloqueadas set famoso = 'palavra' where palavra in (
  -- Seleção Brasileira atual
  'neymar', 'rodrygo', 'raphinha', 'endrick', 'casemiro', 'bremer', 'richarlison',
  -- ídolos da Seleção e do futebol brasileiro
  'pele', 'garrincha', 'zico', 'zagallo', 'jairzinho', 'rivelino', 'rivellino', 'romario', 'bebeto', 'ronaldinho',
  'rivaldo', 'cafu', 'dunga', 'taffarel', 'kaka', 'robinho', 'vampeta', 'ceni',
  -- Flamengo
  'arrascaeta', 'gabigol',
  -- Corinthians
  'tevez',
  -- São Paulo
  'calleri', 'ferraresi', 'arboleda', 'toloi',
  -- Santos
  'rollheiser',
  -- Vasco
  'vegetti', 'bellini',
  -- Botafogo
  'savarino', 'seedorf', 'quarentinha',
  -- Fluminense
  'soteldo', 'canobbio', 'cavalieri',
  -- Grêmio
  'villasanti', 'braithwaite', 'kannemann', 'geromel',
  -- Internacional
  'carbonero', 'bernabei', 'dalessandro', 'guinazu', 'abbondanzieri', 'carpegiani',
  -- Cruzeiro
  'chulapa',
  -- Atlético-MG
  'lyanco', 'deyverson',
  -- Athletico-PR
  'viveros', 'zapelli', 'mastriani', 'benavidez', 'kleberson',
  -- Vitória
  'kayzer', 'petkovic',
  -- Mirassol
  'negueba', 'shaylon',
  -- Bragantino
  'alerrandro', 'borbas',
  -- Chapecoense
  'follmann', 'ruschel',
  -- Coritiba
  'pachequinho', 'keirrison', 'aristizabal', 'puskas',
  -- Remo
  'papelin'
);

-- Duas ou mais palavras juntas: o nome pelo qual o jogador é conhecido.
update public.palavras_bloqueadas set famoso = 'nome' where palavra in (
  -- Seleção Brasileira atual
  'neymarjr', 'vinijr', 'viniciusjunior', 'viniciusjr', 'brunoguimaraes', 'lucaspaqueta', 'gabrielmartinelli',
  'matheuscunha', 'igorthiago', 'luishenrique', 'luizhenrique', 'gabrielmagalhaes', 'alexsandro', 'douglassantos',
  'leopereira', 'alissonbecker', 'edersonmoraes', 'gabrieljesus',
  -- ídolos da Seleção e do futebol brasileiro
  'edsonarantes', 'ronaldinhogaucho', 'ronaldofenomeno', 'robertocarlos', 'adrianoimperador', 'juninhopernambucano',
  'paulorobertofalcao', 'rogerioceni',
  -- estrangeiros que todo mundo conhece
  'cristianoronaldo', 'lionelmessi', 'leomessi',
  -- Flamengo
  'giorgiodearrascaeta', 'pedroguilherme', 'brunohenrique', 'evertoncebolinha', 'nicolasdelacruz', 'erickpulgar',
  'gabrielbarbosa', 'diegoribas', 'diegoalves', 'filipeluis', 'willianarao', 'rodrigocaio',
  -- Palmeiras
  'vitorroque', 'flacolopez', 'gustavogomez', 'raphaelveiga', 'estevaowillian', 'ademirdaguia', 'alexdesouza',
  'jorgevaldivia', 'zeroberto', 'felipemelo',
  -- Corinthians
  'yurialberto', 'memphisdepay', 'rodrigogarro', 'hugosouza', 'andrecarrillo', 'carlostevez', 'marceloramos',
  'marcelinhocarioca', 'alexandrepato',
  -- São Paulo
  'jonathancalleri', 'lucasmoura', 'telesantana', 'rafaeltoloi', 'diegolugano',
  -- Santos
  'thiagomaia', 'gabrielbrazao', 'luanperes', 'philippecoutinho', 'carlosalbertotorres', 'marcosleonardo',
  'paulohenriqueganso',
  -- Vasco
  'hugomoura', 'robertodinamite', 'nunomoreira', 'moacirbarbosa', 'ademirdemenezes', 'maurogalvao',
  -- Botafogo
  'niltonsantos', 'igorjesus', 'marlonfreitas', 'thiagoalmada', 'alextelles', 'renanlodi', 'arthurcabral',
  'tiquinhosoares', 'locoabreu', 'helenodefreitas',
  -- Fluminense
  'johnkennedy', 'germancano', 'lucianoacosta', 'marcelovieira', 'samuelxavier', 'thiagosilva', 'thiagoneves',
  'renatogaucho', 'diegocavalieri', 'darioconca', 'jhonarias',
  -- Grêmio
  'carlosvinicius', 'cristianpavon', 'pedrogeromel', 'paulonunes', 'luissuarez', 'diegocosta', 'marcelgrohe',
  'mariojardel', 'luanvieira', 'douglascosta',
  -- Internacional
  'alanpatrick', 'ennervalencia', 'sergiorochet', 'luizadriano', 'eliasfigueroa', 'rafaelsobis',
  -- Cruzeiro
  'kaiojorge', 'gabrielveron', 'matheuspereira', 'rafaelcabral', 'dirceulopes', 'wilsonpiazza', 'aloisiochulapa',
  'ricardogoulart', 'evertonribeiro',
  -- Atlético-MG
  'gustavoscarpa', 'junioralonso', 'diegotardelli', 'alanfranco', 'gabrielmenino', 'guilhermearana',
  'eduardovargas', 'toninhocerezo', 'dadamaravilha',
  -- Athletico-PR
  'kevinviveros', 'brunozapelli', 'leogodoy', 'alexsantana', 'alexmineiro', 'marcelocirino', 'paulobaier',
  'thiagoheleno',
  -- Bahia
  'jeanlucas', 'davidduarte', 'erickpulga', 'luchorodriguez', 'ninoparaiba', 'lucasverissimo', 'willianjose',
  'marcelolomba', 'michelaraujo', 'caulysouza',
  -- Vitória
  'renatokayzer', 'gustavomosquito', 'wellingtonrato', 'ramonmenezes', 'netobaiano', 'andrecatimba',
  -- Mirassol
  'chicokim', 'danielborges',
  -- Bragantino
  'jhonjhon', 'lucasevangelista', 'thiagoborbas', 'isidropitta', 'eduardosasha', 'juninhocapixaba',
  -- Chapecoense
  'jacksonfollmann', 'alanruschel', 'brunorangel', 'helioneto',
  -- Coritiba
  'rodrigomoledo', 'brenolopes', 'tiagoadan', 'dirceukruger', 'gustavopuskas',
  -- Remo
  'urigeller', 'eduardoramos'
);

-- Nome completo de jogador que estava na lista só por uma palavra (revisão de segurança de 10/11/2026). Antes a palavra
-- barrava em qualquer lugar; com 'palavra' barrando só o apelido inteiro, "Mané Garrincha" ou "Walter Kannemann"
-- passariam. Só os nomes completos mais conhecidos; "Neymar Júnior" e "De Arrascaeta" a função já barra.
insert into public.palavras_bloqueadas (palavra) values
  ('reipele'), ('manegarrincha'), ('mariozagallo'), ('robertorivelino'), ('claudiotaffarel'), ('vinijunior'),
  ('rodrygogoes'), ('gleisonbremer'), ('giorgiandearrascaeta'), ('clarenceseedorf'), ('dejanpetkovic'),
  ('ferencpuskas'), ('andresdalessandro'), ('pabloguinazu'), ('patoabbondanzieri'), ('paulocesarcarpegiani'),
  ('walterkannemann'), ('martinbraithwaite'), ('mathiasvillasanti'), ('pablovegetti'), ('jeffersonsavarino'),
  ('yefersonsoteldo'), ('agustincanobbio'), ('robertarboleda'), ('nahuelferraresi'), ('benjaminrollheiser'),
  ('johancarbonero'), ('alexandrobernabei')
on conflict (palavra) do nothing;

update public.palavras_bloqueadas set famoso = 'nome' where palavra in (
  'reipele', 'manegarrincha', 'mariozagallo', 'robertorivelino', 'claudiotaffarel', 'vinijunior',
  'rodrygogoes', 'gleisonbremer', 'giorgiandearrascaeta', 'clarenceseedorf', 'dejanpetkovic',
  'ferencpuskas', 'andresdalessandro', 'pabloguinazu', 'patoabbondanzieri', 'paulocesarcarpegiani',
  'walterkannemann', 'martinbraithwaite', 'mathiasvillasanti', 'pablovegetti', 'jeffersonsavarino',
  'yefersonsoteldo', 'agustincanobbio', 'robertarboleda', 'nahuelferraresi', 'benjaminrollheiser',
  'johancarbonero', 'alexandrobernabei'
);

-- Ofensa (famoso null): igual a 20261019000000_base.sql. Até 4 letras só como palavra inteira ("cu" não pega
-- "Curitiba"); mais longa em qualquer lugar, mesmo com espaços no meio ("p o r r a").
--
-- Jogador (famoso 'palavra' ou 'nome'): o apelido vira só letras (minúsculas, sem acento), e os números e sinais que
-- parecem letra (0 1 3 4 5 7 @ $) viram O I E A S T maiúsculos, que tanto valem pela letra ("C3ni") quanto podem ser
-- enfeite ("Ceni 01"); todo o resto (espaço, sinal, outros números, emoji) some. A palavra da lista vira um padrão
-- (coluna padrao, calculada pelo banco) em que cada letra pode se repetir e ter enfeite depois:
--   "ceni" -> c+[OIEAST]*[eE]+[OIEAST]*n+[OIEAST]*[iI]+[OIEAST]*
--   - 'palavra': o apelido inteiro tem de ser o padrão, uma vez ou repetido ("Ceni", "Ceni Ceni"). Confere também o
--     apelido sem as letras soltas, artigos, "do/da/dos/das/de" e "Jr/Júnior" ("O Ceni", "Neymar Júnior"); só nessa
--     conferência, porque "N e y m a r" segue barrado pela primeira.
--   - 'nome': o padrão em qualquer lugar do apelido.
-- O padrão só usa as letras a-z da palavra (duas iguais seguidas valem uma: "calleri" pega "Caleri"): palavra com
-- outro caractere nunca vira expressão inválida, e palavra sem letra fica com padrão vazio e não barra nada.
--
-- Custo: compilar o padrão de cada palavra a cada apelido custaria ~250 compilações por chamada. Antes do padrão vem
-- um teste barato com o esqueleto (coluna esqueleto: só as letras que número ou sinal nenhum imita, ou seja, sem o, i,
-- e, a, s, t, e sem repetição): 'palavra' só é candidata se o apelido não tem letra fora do esqueleto dela; 'nome', se
-- o esqueleto dela aparece no do apelido. Toda palavra que o padrão barraria passa nesse teste (conferido em
-- src/dados/apelidosFamosos.test.ts); quase nenhuma outra passa.
alter table public.palavras_bloqueadas
  add column padrao text generated always as (
    replace(replace(replace(replace(replace(replace(
      regexp_replace(regexp_replace(regexp_replace(palavra, '[^a-z]', '', 'g'), '([a-z])\1+', '\1', 'g'),
        '([a-z])', '\1+[OIEAST]*', 'g'),
      'o+', '[oO]+'), 'i+', '[iI]+'), 'e+', '[eE]+'), 'a+', '[aA]+'), 's+', '[sS]+'), 't+', '[tT]+')
  ) stored,
  add column esqueleto text generated always as (
    regexp_replace(regexp_replace(regexp_replace(palavra, '[^a-z]', '', 'g'), '[oieast]', '', 'g'), '([a-z])\1+', '\1', 'g')
  ) stored;

comment on column public.palavras_bloqueadas.padrao is
  'Padrão de jogador feito da palavra (calculado pelo banco); só vale para famoso palavra ou nome.';
comment on column public.palavras_bloqueadas.esqueleto is
  'Letras da palavra sem o, i, e, a, s, t e sem repetição (calculado pelo banco); filtro barato antes do padrão.';

create or replace function public.apelido_bloqueado(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select
      public.normalizar_apelido(p) as texto,
      regexp_replace(translate(lower(extensions.unaccent(coalesce(p, ''))), '013457@$', 'OIEASTAS'),
        '[^a-zOIEAST]', '', 'g') as jogador,
      regexp_replace(translate(
        regexp_replace(lower(extensions.unaccent(coalesce(p, ''))),
          '(^|[^a-z0-9@$])(os|as|dos|das|do|da|de|jr|junior|[a-z])(?=[^a-z0-9@$]|$)', '\1', 'g'),
        '013457@$', 'OIEASTAS'), '[^a-zOIEAST]', '', 'g') as jogador_sem_enfeite
  ),
  -- materialized: calcula o apelido uma vez, e não uma vez por linha da lista.
  n as materialized (
    select base.*,
      regexp_replace(regexp_replace(base.jogador, '[oieastOIEAST]', '', 'g'), '([a-z])\1+', '\1', 'g') as esqueleto,
      regexp_replace(regexp_replace(base.jogador_sem_enfeite, '[oieastOIEAST]', '', 'g'), '([a-z])\1+', '\1', 'g')
        as esqueleto_sem_enfeite
    from base
  )
  select exists (
    select 1
    from public.palavras_bloqueadas b, n
    where case
      when b.famoso is not null and b.padrao = '' then false
      when b.famoso = 'palavra' then
        case when b.esqueleto = '' or (n.esqueleto <> '' and translate(n.esqueleto, b.esqueleto, '') = '')
          then n.jogador ~ ('^[OIEAST]*(' || b.padrao || ')+$') else false end
        or case when b.esqueleto = ''
            or (n.esqueleto_sem_enfeite <> '' and translate(n.esqueleto_sem_enfeite, b.esqueleto, '') = '')
          then n.jogador_sem_enfeite ~ ('^[OIEAST]*(' || b.padrao || ')+$') else false end
      when b.famoso = 'nome' then
        case when position(b.esqueleto in n.esqueleto) > 0 then n.jogador ~ b.padrao else false end
      when char_length(b.palavra) <= 4
        then (' ' || regexp_replace(n.texto, ' +', ' ', 'g') || ' ') like ('% ' || b.palavra || ' %')
      else replace(n.texto, ' ', '') like ('%' || b.palavra || '%')
    end
  );
$$;

revoke execute on function public.apelido_bloqueado(text) from public, anon, authenticated;
