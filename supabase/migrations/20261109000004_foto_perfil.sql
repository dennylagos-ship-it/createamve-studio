-- Foto de perfil de cada integrante (miniatura pequeña guardada como data URL).
-- Si está vacía, la app muestra las iniciales con el color de la persona.
alter table public.profiles add column if not exists avatar_url text;
