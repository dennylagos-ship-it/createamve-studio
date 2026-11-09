-- Número de WhatsApp del cliente (con código de país, ej. +58 414 1234567)
-- para escribirle desde Studio con mensajes preparados.
alter table public.clients add column whatsapp text not null default '';
