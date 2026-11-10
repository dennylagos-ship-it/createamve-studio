export type Rol = 'admin' | 'miembro'
export type EstadoVideo =
  | 'idea' | 'por_grabar' | 'grabado' | 'en_edicion' | 'editado' | 'en_correcciones' | 'entregado'
export type TipoAsignacion = 'grabacion' | 'edicion' | 'revision'
export type FuenteMaterial = 'google_photos_link' | 'photos_picker' | 'drive' | 'upload' | 'otro'
export type TipoMaterial = 'clip' | 'foto' | 'audio' | 'logo' | 'referencia' | 'otro'
export type EstadoIdea = 'abierta' | 'convertida' | 'descartada'
export type EstadoEntrega = 'enviado' | 'con_correcciones' | 'aprobado'

export interface Profile {
  id: string
  full_name: string
  email: string | null
  role: Rol
  active: boolean
  color: string
  avatar_url?: string | null
  created_at: string
}

export interface Invite {
  email: string
  role: Rol
  full_name: string | null
  created_at: string
}

export interface Client {
  id: string
  name: string
  logo_url: string | null
  description: string
  creative_guide: string
  notes: string
  contact: string
  whatsapp: string
  color: string
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Batch {
  id: string
  client_id: string
  name: string
  start_date: string | null
  end_date: string | null
  photos_album_url: string | null
  position: number
  archived: boolean
  created_at: string
}

export interface Idea {
  id: string
  client_id: string | null
  title: string
  summary: string
  notes: string
  reference_links: string[]
  status: EstadoIdea
  created_by: string | null
  created_at: string
}

export interface Video {
  id: string
  client_id: string
  batch_id: string | null
  idea_id: string | null
  number: number
  title: string
  brief: string
  script: string
  shot_list: string
  notes: string
  status: EstadoVideo
  record_date: string | null
  edit_date: string | null
  due_date: string | null
  final_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Assignment {
  video_id: string
  user_id: string
  kind: TipoAsignacion
}

export interface StatusChange {
  id: number
  video_id: string
  from_status: EstadoVideo | null
  to_status: EstadoVideo
  user_id: string | null
  note: string | null
  created_at: string
}

export interface VideoTask {
  id: string
  video_id: string
  label: string
  done: boolean
  position: number
  done_by: string | null
  done_at: string | null
}

export interface Asset {
  id: string
  source: FuenteMaterial
  kind: TipoMaterial
  name: string
  external_url: string | null
  storage_path: string | null
  mime_type: string | null
  metadata: Record<string, unknown>
  link_status: 'sin_revisar' | 'ok' | 'roto'
  created_by: string | null
  created_at: string
}

export interface VideoAsset {
  video_id: string
  asset_id: string
  position: number
  label: string
  note: string
  usage: string
  added_at: string
}

export interface Deliverable {
  id: string
  video_id: string
  version: string
  url: string | null
  notes: string
  status: EstadoEntrega
  delivered_at: string
  created_by: string | null
  created_at: string
}

export interface Comment {
  id: string
  video_id: string
  author_id: string | null
  body: string
  created_at: string
}
