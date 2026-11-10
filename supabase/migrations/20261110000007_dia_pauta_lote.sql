-- Día de pauta del lote: el día en que se graban juntos los videos del lote.
-- Los videos nuevos del lote toman esa fecha de grabación; si uno se graba otro
-- día, se cambia a mano en su ficha y deja de seguir al lote.
alter table public.batches add column if not exists shoot_date date;
