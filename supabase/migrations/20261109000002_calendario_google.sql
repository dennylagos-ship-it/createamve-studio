-- Suscripción de Google Calendar (o Apple/Outlook) a las fechas de producción.
-- Cada persona tiene un enlace secreto propio; puede regenerarlo si se filtra.

create table public.calendar_feeds (
  user_id uuid primary key references public.profiles (id) on delete cascade default auth.uid(),
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;

create policy "cada quien ve su enlace" on public.calendar_feeds for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_member()));
create policy "cada quien crea su enlace" on public.calendar_feeds for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()));
create policy "cada quien regenera su enlace" on public.calendar_feeds for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
