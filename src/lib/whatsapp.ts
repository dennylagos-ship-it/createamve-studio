import { fmtDay, pad2 } from './format'
import type { Client, Video } from './types'

/** Deja solo dígitos. Si el número empieza por 0 (formato local de Venezuela), antepone 58. */
export function normalizarNumero(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = '58' + d.slice(1)
  return d
}

export const numeroValido = (raw: string) => normalizarNumero(raw).length >= 10

/** Enlace oficial de WhatsApp (abre la app en el teléfono o WhatsApp Web en la PC). */
export function waLink(numero: string, texto: string) {
  return `https://wa.me/${normalizarNumero(numero)}?text=${encodeURIComponent(texto)}`
}

export interface Plantilla {
  id: string
  label: string
  texto: (c: Client, v?: Video) => string
  disponible?: (v?: Video) => boolean
}

const saludo = (c: Client) => `Hola${c.contact ? ` ${c.contact.split(/[\s,]/)[0]}` : ''}, te escribimos de Createamve 👋`
const ref = (v: Video) => `*Video ${pad2(v.number)}: ${v.title}*`

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'guion',
    label: 'Enviar guion para aprobar',
    disponible: (v) => !!v?.script.trim(),
    texto: (c, v) => `${saludo(c)}\n\nTe compartimos el guion de ${ref(v!)} para tu aprobación:\n\n${v!.script.trim()}\n\n¿Lo aprobamos o quieres algún cambio?`,
  },
  {
    id: 'grabacion',
    label: 'Confirmar fecha de grabación',
    disponible: (v) => !!v?.record_date,
    texto: (c, v) => `${saludo(c)}\n\nTe confirmamos la grabación de ${ref(v!)} para el *${fmtDay(v!.record_date)}*. ¿Nos confirmas que está todo listo (producto, lugar y persona)?`,
  },
  {
    id: 'revision',
    label: 'Enviar video para revisión',
    disponible: (v) => !!v?.final_url,
    texto: (c, v) => `${saludo(c)}\n\n¡Ya está listo ${ref(v!)}! Puedes verlo aquí:\n${v!.final_url}\n\nCuéntanos si lo aprobamos o si quieres alguna corrección.`,
  },
  {
    id: 'entrega',
    label: 'Avisar entrega',
    disponible: (v) => !!v,
    texto: (c, v) => `${saludo(c)}\n\nTe entregamos ${ref(v!)}.${v!.final_url ? `\n\nVersión final: ${v!.final_url}` : ''}\n\n¡Gracias por confiar en nosotros!`,
  },
  {
    id: 'libre',
    label: 'Mensaje libre',
    texto: (c, v) => `${saludo(c)}\n\n${v ? `Sobre ${ref(v)}: ` : ''}`,
  },
]
