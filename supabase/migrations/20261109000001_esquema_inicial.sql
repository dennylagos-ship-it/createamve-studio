-- CREATEAMVE Studio · esquema inicial
-- Cliente → lote → video → guion → clips → responsables → estado → entrega.
-- Sin módulo de Pagos: no hay tablas financieras.

create extension if not exists pgcrypto;

-- ───────────────────────── Tipos ─────────────────────────
create type public.rol_equipo as enum ('admin', 'miembro');
create type public.estado_video as enum (
  'idea', 'por_grabar', 'grabado', 'en_edicion', 'editado', 'en_correcciones', 'entregado'
);
create type public.tipo_asignacion as enum ('grabacion', 'edicion', 'revision');
create type public.fuente_material as enum ('google_photos_link', 'photos_picker', 'drive', 'upload', 'otro');
create type public.tipo_material as enum ('clip', 'foto', 'audio', 'logo', 'referencia', 'otro');
create type public.estado_idea as enum ('abierta', 'convertida', 'descartada');
create type public.estado_entrega as enum ('enviado', 'con_correcciones', 'aprobado');

-- ───────────────────────── Equipo ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  role public.rol_equipo not null default 'miembro',
  active boolean not null default false,
  color text not null default '#FFC400',
  created_at timestamptz not null default now()
);

-- Correos autorizados a entrar al equipo. Quien se registre sin invitación
-- queda inactivo hasta que un admin lo active.
create table public.team_invites (
  email text primary key,
  role public.rol_equipo not null default 'miembro',
  full_name text,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and role = 'admin');
$$;

-- Crea el perfil al registrarse. La primera cuenta es admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.team_invites;
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  select * into inv from public.team_invites where lower(email) = lower(new.email);

  insert into public.profiles (id, full_name, email, role, active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), inv.full_name, split_part(new.email, '@', 1)),
    new.email,
    case when first_user then 'admin' else coalesce(inv.role, 'miembro') end,
    first_user or inv.email is not null
  );

  if inv.email is not null then
    delete from public.team_invites where email = inv.email;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un miembro no puede cambiarse el rol ni activarse a sí mismo.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and (new.role <> old.role or new.active <> old.active) then
    raise exception 'Solo un administrador puede cambiar roles o activar cuentas';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ───────────────────────── Clientes y lotes ─────────────────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  logo_url text,
  description text not null default '',
  creative_guide text not null default '',
  notes text not null default '',
  contact text not null default '',
  color text not null default '#FFC400',
  archived boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  start_date date,
  end_date date,
  position integer not null default 0,
  archived boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.batches (client_id);

-- ───────────────────────── Ideas ─────────────────────────
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  summary text not null default '',
  notes text not null default '',
  reference_links text[] not null default '{}',
  status public.estado_idea not null default 'abierta',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.ideas (client_id);

-- ───────────────────────── Videos ─────────────────────────
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  batch_id uuid references public.batches (id) on delete set null,
  idea_id uuid references public.ideas (id) on delete set null,
  number integer not null default 1,
  title text not null default 'Video sin título',
  brief text not null default '',
  script text not null default '',
  shot_list text not null default '',
  notes text not null default '',
  status public.estado_video not null default 'por_grabar',
  record_date date,
  edit_date date,
  due_date date,
  final_url text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.videos (client_id);
create index on public.videos (batch_id);
create index on public.videos (status);

create table public.video_assignments (
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.tipo_asignacion not null,
  primary key (video_id, user_id, kind)
);
create index on public.video_assignments (user_id);

create table public.video_status_history (
  id bigint generated always as identity primary key,
  video_id uuid not null references public.videos (id) on delete cascade,
  from_status public.estado_video,
  to_status public.estado_video not null,
  user_id uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index on public.video_status_history (video_id, created_at);

create table public.video_tasks (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  label text not null,
  done boolean not null default false,
  position integer not null default 0,
  done_by uuid references public.profiles (id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.video_tasks (video_id);

-- ───────────────────────── Material bruto ─────────────────────────
-- Un material puede estar en varios videos sin duplicarse (video_assets).
-- Nunca se guardan tokens de acceso aquí.
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  source public.fuente_material not null default 'google_photos_link',
  kind public.tipo_material not null default 'clip',
  name text not null default '',
  external_url text,
  storage_path text,
  mime_type text,
  metadata jsonb not null default '{}',
  link_status text not null default 'sin_revisar' check (link_status in ('sin_revisar', 'ok', 'roto')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.video_assets (
  video_id uuid not null references public.videos (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  position integer not null default 0,
  label text not null default '',
  note text not null default '',
  usage text not null default '',
  added_by uuid references public.profiles (id) on delete set null default auth.uid(),
  added_at timestamptz not null default now(),
  primary key (video_id, asset_id)
);
create index on public.video_assets (asset_id);

-- ───────────────────────── Entregas y comentarios ─────────────────────────
create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  version text not null default 'v1',
  url text,
  notes text not null default '',
  status public.estado_entrega not null default 'enviado',
  delivered_at date not null default current_date,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.deliverables (video_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index on public.comments (video_id);

-- ───────────────────────── Triggers ─────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();
create trigger videos_touch before update on public.videos
  for each row execute function public.touch_updated_at();

-- Historial de estados automático: queda quién y cuándo, sin borrar nada
-- cuando un video vuelve atrás por correcciones.
create or replace function public.log_video_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.video_status_history (video_id, from_status, to_status, user_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.video_status_history (video_id, from_status, to_status, user_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger videos_status_log after insert or update of status on public.videos
  for each row execute function public.log_video_status();

-- Al convertir una idea en video, marcar la idea como convertida.
create or replace function public.mark_idea_converted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.idea_id is not null then
    update public.ideas set status = 'convertida' where id = new.idea_id and status = 'abierta';
  end if;
  return new;
end;
$$;

create trigger videos_idea_converted after insert on public.videos
  for each row execute function public.mark_idea_converted();

-- ───────────────────────── Seguridad (RLS) ─────────────────────────
-- Miembros activos leen y editan el trabajo de producción.
-- Solo admins borran clientes, lotes y videos, y gestionan el equipo.
alter table public.profiles enable row level security;
alter table public.team_invites enable row level security;
alter table public.clients enable row level security;
alter table public.batches enable row level security;
alter table public.ideas enable row level security;
alter table public.videos enable row level security;
alter table public.video_assignments enable row level security;
alter table public.video_status_history enable row level security;
alter table public.video_tasks enable row level security;
alter table public.assets enable row level security;
alter table public.video_assets enable row level security;
alter table public.deliverables enable row level security;
alter table public.comments enable row level security;

create policy "perfil propio o equipo" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_member()));
create policy "editar perfil propio o admin" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

create policy "admins ven invitaciones" on public.team_invites for select to authenticated
  using ((select public.is_admin()));
create policy "admins crean invitaciones" on public.team_invites for insert to authenticated
  with check ((select public.is_admin()));
create policy "admins borran invitaciones" on public.team_invites for delete to authenticated
  using ((select public.is_admin()));

-- Tablas de producción: leer/crear/editar = miembro.
do $$
declare t text;
begin
  foreach t in array array['clients','batches','ideas','videos','video_assignments','video_tasks',
                           'assets','video_assets','deliverables','comments'] loop
    execute format('create policy "equipo lee" on public.%I for select to authenticated using ((select public.is_member()))', t);
    execute format('create policy "equipo crea" on public.%I for insert to authenticated with check ((select public.is_member()))', t);
    execute format('create policy "equipo edita" on public.%I for update to authenticated using ((select public.is_member())) with check ((select public.is_member()))', t);
  end loop;
  -- Borrado libre para piezas de trabajo dentro de un video.
  foreach t in array array['ideas','video_assignments','video_tasks','assets','video_assets','deliverables'] loop
    execute format('create policy "equipo borra" on public.%I for delete to authenticated using ((select public.is_member()))', t);
  end loop;
  -- Borrado restringido a admins.
  foreach t in array array['clients','batches','videos'] loop
    execute format('create policy "admin borra" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end $$;

create policy "autor borra su comentario" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

create policy "equipo lee historial" on public.video_status_history for select to authenticated
  using ((select public.is_member()));
create policy "equipo anota historial" on public.video_status_history for update to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));

-- ───────────────────────── Tiempo real ─────────────────────────
alter publication supabase_realtime add table
  public.clients, public.batches, public.ideas, public.videos, public.video_assignments,
  public.video_tasks, public.assets, public.video_assets, public.deliverables,
  public.comments, public.video_status_history, public.profiles;
