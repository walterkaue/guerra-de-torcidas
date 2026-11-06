-- Prova de Boleiro: 20 s por pergunta, para todo mundo (decisão do Kauê em 06/11/2026).
-- Motivo: 15 s não davam para ler pergunta e alternativas com fonte grande (jornada J11 do PR #139).
-- Só muda o valor; a chave foi criada em 20261020000000_prova.sql e nenhuma migração depois mexeu nela.
update public.config_deteccao
set valor = 20,
    descricao = 'Tempo de cada pergunta da Prova de Boleiro (20 s desde 06/11/2026; era 15 s)'
where chave = 'prova_segundos';
