-- staging_gt.uso_gemini ganha o código de cada tentativa que falhou (ex.: "429,429,503"), para separar
-- cota (429) de sobrecarga (503) na reavaliação dos robôs do Gemini (docs/proximos-passos.md, item 9).
-- Só cria uma coluna nula; nada é apagado nem renomeado, e as linhas antigas ficam sem código.

alter table staging_gt.uso_gemini add column if not exists codigos text;
comment on column staging_gt.uso_gemini.codigos is 'Código de cada tentativa que falhou, separado por vírgula: 429, 503, outro HTTP, rede ou formato.';
