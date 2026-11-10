-- Sobrenome ou apelido de jogador famoso no apelido passa junto com outro nome (decisão de 10/11/2026;
-- docs/jogo.md, seção 4, "Apelido"). Só o nome do jogador, ou o nome completo dele, continua barrado.
--
-- O que muda:
--   - public.palavras_bloqueadas ganha a coluna famoso:
--       null      = palavra ofensiva (palavrão, ofensa, aposta). Segue exatamente como antes.
--       'palavra' = uma palavra só, como o jogador é chamado (sobrenome ou apelido: "ceni", "gabigol").
--                   Barra só quando o apelido INTEIRO, sem espaços, é essa palavra. Compara de duas formas:
--                   (1) normalizar_apelido(p) sem espaços; (2) normalizar_apelido de p com os dígitos tirados antes,
--                   sem espaços. Assim "Ceni", "CENI", "C3ni", "ceni!!" e "Ceni 01" são barrados (número não conta
--                   como outra palavra), e "Kauê Ceni", "Ceni do Kauê" e "Zé Gabigol" passam.
--       'nome'    = duas ou mais palavras juntas, o nome pelo qual o jogador é conhecido ("rogerioceni",
--                   "gabrielbarbosa", "vinijr"). Barra em qualquer lugar, sem espaços, como antes:
--                   "Rogério Ceni", "rogerio ceni 10" e "RogérioCeni" continuam barrados.
--   - apelido_bloqueado(p) passa a ler a coluna (mesma assinatura, mesmo security definer e search_path '').
--
-- O que não muda: salvar_torcedor, o código do torcedor, apelidos_filtrados e a regra dos 16+ chamam a mesma função.
-- Nenhum apelido ou desafio gravado é tocado. A frase própria do card (src/jogo/filtroDeFrase.ts, só no aparelho)
-- continua barrando nome de jogador em qualquer lugar.
--
-- Toda entrada de 20261106100000_apelidos_famosos.sql (a única migração que acrescentou jogadores) é marcada abaixo,
-- uma por uma; src/dados/apelidosFamosos.test.ts confere que nenhuma ficou de fora nem em duas listas.
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

-- Ofensa (famoso null): até 4 letras só como palavra inteira ("cu" não pega "Curitiba"); mais longa em qualquer lugar,
-- mesmo com espaços no meio ("p o r r a"). Jogador: 'nome' em qualquer lugar sem espaços; 'palavra' só o apelido inteiro.
create or replace function public.apelido_bloqueado(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with n as (
    select
      public.normalizar_apelido(p) as texto,
      replace(public.normalizar_apelido(p), ' ', '') as junto,
      replace(public.normalizar_apelido(regexp_replace(coalesce(p, ''), '[0-9]', '', 'g')), ' ', '') as junto_sem_numero
  )
  select exists (
    select 1
    from public.palavras_bloqueadas b, n
    where case
      when b.famoso = 'palavra'
        then b.palavra = n.junto or b.palavra = n.junto_sem_numero
      when b.famoso = 'nome'
        then n.junto like ('%' || b.palavra || '%')
      when char_length(b.palavra) <= 4
        then (' ' || regexp_replace(n.texto, ' +', ' ', 'g') || ' ') like ('% ' || b.palavra || ' %')
      else n.junto like ('%' || b.palavra || '%')
    end
  );
$$;

revoke execute on function public.apelido_bloqueado(text) from public, anon, authenticated;
