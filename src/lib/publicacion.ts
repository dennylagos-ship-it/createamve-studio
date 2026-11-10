import { useEffect, useMemo, useState } from 'react'
import { useStudio } from './data'
import { fmtDay, pad2, toDay } from './format'
import type { Video } from './types'

/**
 * Estado de la publicación de un video que publica la agencia.
 * - programada: falta más de un día.
 * - hoy: corresponde publicarlo hoy y aún no llega la hora (ya avisa).
 * - atrasada: pasó la hora y no se ha marcado "Publicado" (sigue avisando).
 * - publicada: el equipo la marcó como publicada.
 */
export type EstadoPublicacion = 'sin_fecha' | 'programada' | 'hoy' | 'atrasada' | 'publicada'

export function estadoPublicacion(v: Video, ahora = new Date()): EstadoPublicacion | null {
  if (!v.publish_by_us) return null
  if (v.published_at) return 'publicada'
  if (!v.publish_at) return 'sin_fecha'
  const t = new Date(v.publish_at)
  if (t <= ahora) return 'atrasada'
  return toDay(t) === toDay(ahora) ? 'hoy' : 'programada'
}

export const PUBLICACION_INFO: Record<EstadoPublicacion, { label: string; tone: string }> = {
  sin_fecha: { label: 'Falta fecha de publicación', tone: 'naranja' },
  programada: { label: 'Publicación programada', tone: 'violeta' },
  hoy: { label: 'Publicar hoy', tone: 'amarillo' },
  atrasada: { label: 'Publicación atrasada', tone: 'rojo' },
  publicada: { label: 'Publicado', tone: 'verde' },
}

/** Hora local HH:MM. */
export function fmtHora(iso: string) {
  const d = new Date(iso)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** "Hoy 18:30", "Mié 12 nov, 18:30". */
export function fmtPublicacion(iso: string, ahora = new Date()) {
  const d = new Date(iso)
  const dia = toDay(d) === toDay(ahora) ? 'Hoy' : fmtDay(toDay(d))
  return `${dia}, ${fmtHora(iso)}`
}

/** ISO → valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${toDay(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Reloj que se actualiza solo, para que los avisos cambien sin recargar. */
export function useAhora(cadaMs = 30_000) {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), cadaMs)
    const onVisible = () => document.visibilityState === 'visible' && setAhora(new Date())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [cadaMs])
  return ahora
}

export interface AvisoPublicacion {
  video: Video
  estado: 'hoy' | 'atrasada'
}

/** Publicaciones que necesitan atención ahora: las de hoy y las atrasadas (primero las atrasadas). */
export function useAvisosPublicacion() {
  const { videos, clients } = useStudio()
  const ahora = useAhora()
  return useMemo(() => {
    const archivado = new Set(clients.filter((c) => c.archived).map((c) => c.id))
    return videos
      .filter((v) => !archivado.has(v.client_id))
      .map((v) => ({ video: v, estado: estadoPublicacion(v, ahora) }))
      .filter((a): a is AvisoPublicacion => a.estado === 'hoy' || a.estado === 'atrasada')
      .sort((a, b) => a.video.publish_at!.localeCompare(b.video.publish_at!))
  }, [videos, clients, ahora])
}
