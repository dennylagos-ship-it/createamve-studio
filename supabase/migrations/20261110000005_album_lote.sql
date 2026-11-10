-- Álbum compartido de Google Fotos de cada lote.
-- Se pega una vez en el lote y todos sus videos lo muestran en "Material bruto".
alter table public.batches add column if not exists photos_album_url text;
