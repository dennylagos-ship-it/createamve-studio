-- Publicación programada: cuando la agencia publica el video por el cliente.
-- Solo si publish_by_us = true se usan fecha/hora (publish_at). El pendiente se
-- cierra al marcar "Publicado" (published_at), con el enlace del post opcional.
alter table public.videos
  add column if not exists publish_by_us boolean not null default false,
  add column if not exists publish_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists published_url text;

-- Para buscar rápido las publicaciones que siguen pendientes.
create index if not exists videos_publicacion_pendiente_idx on public.videos (publish_at)
  where publish_by_us and published_at is null;
