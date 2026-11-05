-- Apelidos de jogadores famosos (docs/jogo.md, seção 3, "Apelido"): o boneco montável tem número livre de 0 a 99,
-- então "boneco + número + apelido de jogador famoso" imitaria uma pessoa real. A proteção é este filtro.
-- Só acrescenta linhas em public.palavras_bloqueadas; nenhuma coluna, tabela ou função muda.
--
-- Como a lista é lida (apelido_bloqueado, em 20261019000000_base.sql):
--   - tudo em minúsculas, sem acento e só com letras a-z (a normalização troca números por letras e o resto por espaço);
--   - palavra de até 4 letras só pega inteira; palavra longa pega em qualquer lugar, MESMO COM OS ESPAÇOS RETIRADOS.
--     Por isso nome com sobrenome entra sem espaço ("nome" + "sobrenome" juntos): com espaço na tabela nunca bateria.
--
-- Critério:
--   - Entra o que sozinho identifica um jogador famoso: apelido ou nome conhecido (Seleção atual e ídolos históricos,
--     principais nomes dos elencos da Série A 2026 e ídolos dos 20 clubes).
--   - Nome comum de gente comum NÃO entra sozinho; entra com sobrenome ou apelido conhecido.
--   - Nomes que também são de gente comum e de ídolo ficam de fora sozinhos (o PR lista as decisões).
--   - Cada entrada foi conferida contra uma lista de palavras comuns do português e contra os 5.570 municípios
--     (src/dados/apelidosFamosos.test.ts).
-- Nomes de pessoas só existem aqui, nunca em tela, comentário de código ou narrador.
-- A fonte foi pesquisa na imprensa esportiva em 05/11/2026; a lista não precisa ser perfeita, só cobrir os mais óbvios.
-- Para acrescentar mais, basta outra migração com "insert ... on conflict do nothing".

insert into public.palavras_bloqueadas (palavra) values
  -- Seleção Brasileira atual
  ('neymar'), ('neymarjr'), ('vinijr'), ('viniciusjunior'), ('viniciusjr'), ('rodrygo'), ('raphinha'),
  ('endrick'), ('casemiro'), ('brunoguimaraes'), ('lucaspaqueta'),('gabrielmartinelli'),
  ('matheuscunha'), ('igorthiago'), ('luishenrique'), ('luizhenrique'), ('gabrielmagalhaes'), ('bremer'),
  ('alexsandro'), ('douglassantos'), ('leopereira'), ('alissonbecker'), ('edersonmoraes'), ('richarlison'),
  ('gabrieljesus'),
  -- ídolos da Seleção e do futebol brasileiro
  ('pele'), ('edsonarantes'), ('garrincha'), ('zico'), ('zagallo'), ('jairzinho'), ('rivelino'), ('rivellino'),
  ('romario'), ('bebeto'), ('ronaldinho'), ('ronaldinhogaucho'), ('ronaldofenomeno'), ('rivaldo'), ('cafu'),
  ('robertocarlos'), ('dunga'), ('taffarel'), ('kaka'), ('robinho'), ('adrianoimperador'), ('vampeta'),
  ('juninhopernambucano'), ('paulorobertofalcao'), ('rogerioceni'), ('ceni'),
  -- estrangeiros que todo mundo conhece
  ('cristianoronaldo'), ('lionelmessi'), ('leomessi'),
  -- Flamengo
  ('arrascaeta'), ('giorgiodearrascaeta'), ('pedroguilherme'), ('brunohenrique'), ('evertoncebolinha'),
  ('nicolasdelacruz'), ('erickpulgar'), ('gabigol'), ('gabrielbarbosa'), ('diegoribas'), ('diegoalves'),
  ('filipeluis'), ('willianarao'), ('rodrigocaio'),
  -- Palmeiras
  ('vitorroque'), ('flacolopez'), ('gustavogomez'), ('raphaelveiga'), ('estevaowillian'), ('ademirdaguia'),
  ('alexdesouza'), ('jorgevaldivia'), ('zeroberto'), ('felipemelo'),
  -- Corinthians
  ('yurialberto'), ('memphisdepay'), ('rodrigogarro'), ('hugosouza'), ('andrecarrillo'), ('carlostevez'),
  ('tevez'), ('marceloramos'), ('marcelinhocarioca'), ('alexandrepato'),
  -- São Paulo
  ('calleri'), ('jonathancalleri'), ('ferraresi'), ('arboleda'), ('lucasmoura'), ('telesantana'),
  ('rafaeltoloi'), ('toloi'), ('diegolugano'),
  -- Santos
  ('rollheiser'), ('thiagomaia'), ('gabrielbrazao'), ('luanperes'), ('philippecoutinho'), ('carlosalbertotorres'),
  ('marcosleonardo'), ('paulohenriqueganso'),
  -- Vasco
  ('vegetti'), ('hugomoura'), ('robertodinamite'), ('nunomoreira'), ('moacirbarbosa'), ('ademirdemenezes'),
  ('bellini'), ('maurogalvao'),
  -- Botafogo
  ('niltonsantos'), ('savarino'), ('igorjesus'), ('marlonfreitas'), ('thiagoalmada'), ('alextelles'),
  ('renanlodi'), ('arthurcabral'), ('tiquinhosoares'), ('locoabreu'), ('seedorf'), ('helenodefreitas'),
  ('quarentinha'),
  -- Fluminense
  ('johnkennedy'), ('germancano'), ('lucianoacosta'), ('soteldo'), ('canobbio'), ('marcelovieira'),
  ('samuelxavier'), ('thiagosilva'), ('thiagoneves'), ('renatogaucho'), ('diegocavalieri'), ('cavalieri'),
  ('darioconca'), ('jhonarias'),
  -- Grêmio
  ('carlosvinicius'), ('villasanti'), ('cristianpavon'), ('braithwaite'), ('kannemann'), ('geromel'),
  ('pedrogeromel'), ('paulonunes'), ('luissuarez'), ('diegocosta'), ('marcelgrohe'), ('mariojardel'),
  ('luanvieira'), ('douglascosta'),
  -- Internacional
  ('alanpatrick'), ('ennervalencia'), ('sergiorochet'), ('carbonero'), ('bernabei'), ('dalessandro'),
  ('guinazu'), ('abbondanzieri'), ('luizadriano'), ('eliasfigueroa'), ('carpegiani'), ('rafaelsobis'),
  -- Cruzeiro
  ('kaiojorge'), ('gabrielveron'), ('matheuspereira'), ('rafaelcabral'), ('dirceulopes'), ('wilsonpiazza'),
  ('aloisiochulapa'), ('chulapa'), ('ricardogoulart'), ('evertonribeiro'),
  -- Atlético-MG
  ('gustavoscarpa'), ('junioralonso'), ('lyanco'), ('diegotardelli'), ('alanfranco'), ('gabrielmenino'),
  ('deyverson'), ('guilhermearana'), ('eduardovargas'), ('toninhocerezo'), ('dadamaravilha'),
  -- Athletico-PR
  ('kevinviveros'), ('viveros'), ('brunozapelli'), ('zapelli'), ('mastriani'), ('leogodoy'), ('benavidez'),
  ('alexsantana'), ('alexmineiro'), ('kleberson'), ('marcelocirino'), ('paulobaier'), ('thiagoheleno'),
  -- Bahia
  ('jeanlucas'), ('davidduarte'), ('erickpulga'), ('luchorodriguez'), ('ninoparaiba'), ('lucasverissimo'),
  ('willianjose'), ('marcelolomba'), ('michelaraujo'), ('caulysouza'),
  -- Vitória
  ('renatokayzer'), ('kayzer'), ('gustavomosquito'), ('wellingtonrato'), ('ramonmenezes'), ('petkovic'),
  ('netobaiano'), ('andrecatimba'),
  -- Mirassol
  ('chicokim'), ('negueba'), ('shaylon'), ('danielborges'),
  -- Bragantino
  ('jhonjhon'), ('lucasevangelista'), ('alerrandro'), ('thiagoborbas'), ('borbas'), ('isidropitta'),
  ('eduardosasha'), ('juninhocapixaba'),
  -- Chapecoense
  ('jacksonfollmann'), ('follmann'), ('alanruschel'), ('ruschel'), ('brunorangel'), ('helioneto'),
  -- Coritiba
  ('rodrigomoledo'), ('brenolopes'), ('tiagoadan'), ('dirceukruger'), ('pachequinho'), ('keirrison'),
  ('aristizabal'), ('gustavopuskas'), ('puskas'),
  -- Remo
  ('papelin'), ('urigeller'), ('eduardoramos')
on conflict (palavra) do nothing;
