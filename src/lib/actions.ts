import { supabase } from './supabase'
import type { EstadoVideo, TipoAsignacion, Video } from './types'

/** Siguiente número de video dentro de un lote (o del cliente si no hay lote). */
export function nextNumber(videos: Video[], clientId: string, batchId: string | null) {
  const same = videos.filter((v) => v.client_id === clientId && v.batch_id === batchId)
  return same.reduce((m, v) => Math.max(m, v.number), 0) + 1
}

export async function createVideos(
  videos: Video[],
  opts: { clientId: string; batchId: string | null; titles: string[]; ideaId?: string | null; brief?: string },
) {
  // Consulta el último número en la base de datos, por si la lista local aún no se actualizó.
  let q = supabase.from('videos').select('number').eq('client_id', opts.clientId).order('number', { ascending: false }).limit(1)
  q = opts.batchId ? q.eq('batch_id', opts.batchId) : q.is('batch_id', null)
  const { data: last } = await q
  let n = Math.max(nextNumber(videos, opts.clientId, opts.batchId), ((last?.[0]?.number as number | undefined) ?? 0) + 1)
  const rows = opts.titles.map((t) => ({
    client_id: opts.clientId,
    batch_id: opts.batchId,
    idea_id: opts.ideaId ?? null,
    brief: opts.brief ?? '',
    number: n++,
    title: t.trim() || 'Video sin título',
    status: 'por_grabar' as EstadoVideo,
  }))
  return supabase.from('videos').insert(rows).select('*')
}

export const updateVideo = (id: string, patch: Partial<Video>) => supabase.from('videos').update(patch).eq('id', id)

export const setStatus = (id: string, status: EstadoVideo) => updateVideo(id, { status })

/** Reemplaza las personas asignadas a un tipo de responsabilidad. */
export async function setAssignees(videoId: string, kind: TipoAsignacion, userIds: string[]) {
  const del = await supabase.from('video_assignments').delete().eq('video_id', videoId).eq('kind', kind)
  if (del.error) return del
  if (userIds.length === 0) return del
  return supabase.from('video_assignments').insert(userIds.map((user_id) => ({ video_id: videoId, user_id, kind })))
}
