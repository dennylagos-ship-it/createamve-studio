import type { EstadoVideo, TipoAsignacion, TipoMaterial } from './types'

export const ESTADOS: { id: EstadoVideo; label: string; short: string; tone: string }[] = [
  { id: 'idea', label: 'Idea / guion', short: 'Idea', tone: 'violeta' },
  { id: 'por_grabar', label: 'Por grabar', short: 'Por grabar', tone: 'rojo' },
  { id: 'grabado', label: 'Grabado', short: 'Grabado', tone: 'amarillo' },
  { id: 'en_edicion', label: 'En edición', short: 'En edición', tone: 'azul' },
  { id: 'editado', label: 'Editado (por revisar)', short: 'Editado', tone: 'cian' },
  { id: 'en_correcciones', label: 'En correcciones', short: 'Correcciones', tone: 'naranja' },
  { id: 'entregado', label: 'Entregado', short: 'Entregado', tone: 'verde' },
]

export const estadoInfo = (s: EstadoVideo) => ESTADOS.find((e) => e.id === s) ?? ESTADOS[1]
export const estadoIndex = (s: EstadoVideo) => ESTADOS.findIndex((e) => e.id === s)

/**
 * El checklist no es un dato aparte: cada hito equivale a haber llegado a un estado.
 * Marcar un hito mueve el estado; desmarcarlo lo regresa al estado anterior.
 * Así ficha y tablero nunca se contradicen.
 */
export const HITOS: { label: string; reached: EstadoVideo; previous: EstadoVideo }[] = [
  { label: 'Guion aprobado', reached: 'por_grabar', previous: 'idea' },
  { label: 'Grabación realizada', reached: 'grabado', previous: 'por_grabar' },
  { label: 'Edición iniciada', reached: 'en_edicion', previous: 'grabado' },
  { label: 'Edición finalizada', reached: 'editado', previous: 'en_edicion' },
  { label: 'Entregado', reached: 'entregado', previous: 'editado' },
]

/** Un video en correcciones ya pasó por "editado"; cuenta como editado para el checklist. */
export function hitoCumplido(status: EstadoVideo, reached: EstadoVideo) {
  const idx = status === 'en_correcciones' ? estadoIndex('editado') : estadoIndex(status)
  return idx >= estadoIndex(reached)
}

export function progreso(status: EstadoVideo) {
  const done = HITOS.filter((h) => hitoCumplido(status, h.reached)).length
  return Math.round((done / HITOS.length) * 100)
}

export const ASIGNACIONES: { id: TipoAsignacion; label: string }[] = [
  { id: 'grabacion', label: 'Grabación' },
  { id: 'edicion', label: 'Edición' },
  { id: 'revision', label: 'Revisión / entrega' },
]

/** Estados en los que cada responsable tiene trabajo pendiente ("Mis pendientes"). */
export const PENDIENTE_POR_ROL: Record<TipoAsignacion, EstadoVideo[]> = {
  grabacion: ['idea', 'por_grabar'],
  edicion: ['grabado', 'en_edicion', 'en_correcciones'],
  revision: ['editado'],
}

export const TIPOS_MATERIAL: { id: TipoMaterial; label: string }[] = [
  { id: 'clip', label: 'Clip' },
  { id: 'foto', label: 'Foto' },
  { id: 'audio', label: 'Audio' },
  { id: 'logo', label: 'Logo' },
  { id: 'referencia', label: 'Referencia' },
  { id: 'otro', label: 'Otro' },
]
