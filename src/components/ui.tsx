import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ESTADOS, estadoInfo, progreso } from '../lib/status'
import type { EstadoVideo, Profile, Video } from '../lib/types'
import { fmtDay, initials, pad2 } from '../lib/format'
import { useStudio } from '../lib/data'

/* ───────── Avisos ───────── */

type Toast = { id: number; text: string; kind: 'ok' | 'error' }
const ToastCtx = createContext<(text: string, kind?: 'ok' | 'error') => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 2600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

/** Ejecuta una operación de Supabase y avisa si falla. */
export function useRun() {
  const toast = useToast()
  return useCallback(
    async <T = unknown,>(p: PromiseLike<{ error: { message: string } | null; data?: unknown }>, ok?: string) => {
      const res = await p
      if (res.error) {
        toast(traducirError(res.error.message), 'error')
        return null
      }
      if (ok) toast(ok)
      return (res.data ?? true) as T | true
    },
    [toast],
  )
}

export function traducirError(msg: string) {
  if (/schema cache|column .* does not exist/i.test(msg)) return 'Falta actualizar la base de datos en Supabase (hay un SQL pendiente). Avísale a Denny.'
  if (/row-level security/i.test(msg)) return 'No tienes permiso para hacer eso. Pide a un administrador que lo haga.'
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  if (/User already registered/i.test(msg)) return 'Ese correo ya tiene cuenta. Inicia sesión.'
  if (/Password should be/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.'
  if (/Email not confirmed/i.test(msg)) return 'Confirma tu correo con el enlace que te enviamos y vuelve a entrar.'
  return msg
}

/* ───────── Piezas visuales ───────── */

export function StatusPill({ status }: { status: EstadoVideo }) {
  const e = estadoInfo(status)
  return <span className={`pill tone-${e.tone}`}>{e.short}</span>
}

export function Avatar({ profile, size = 28 }: { profile?: Profile; size?: number }) {
  if (!profile) return null
  return (
    <span
      className="avatar"
      title={profile.full_name}
      style={{ width: size, height: size, fontSize: size * 0.42, background: profile.color }}
    >
      {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials(profile.full_name)}
    </span>
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <span className="progress" aria-label={`Progreso ${value}%`}>
      <span style={{ width: `${value}%` }} />
    </span>
  )
}

export function StatusSelect({
  value,
  onChange,
  id,
  compact,
}: {
  value: EstadoVideo
  onChange: (s: EstadoVideo) => void
  id?: string
  compact?: boolean
}) {
  return (
    <select
      id={id}
      className={`status-select tone-${estadoInfo(value).tone}${compact ? ' compact' : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value as EstadoVideo)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Estado de producción"
    >
      {ESTADOS.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  )
}

export function VideoCard({ video, showClient = true, draggable }: { video: Video; showClient?: boolean; draggable?: boolean }) {
  const { clientById, assigneesOf, profileById, batches } = useStudio()
  const client = clientById(video.client_id)
  const batch = batches.find((b) => b.id === video.batch_id)
  const asg = assigneesOf(video.id)
  // En la tarjeta basta el primer nombre; el nombre completo queda en el detalle del video.
  const nombre = (id: string) => profileById(id)?.full_name?.trim().split(/\s+/)[0]
  const rec = asg.filter((a) => a.kind === 'grabacion').map((a) => nombre(a.user_id)).filter(Boolean)
  const edi = asg.filter((a) => a.kind === 'edicion').map((a) => nombre(a.user_id)).filter(Boolean)
  const nextDate = video.status === 'por_grabar' || video.status === 'idea' ? video.record_date : video.status === 'entregado' ? null : video.due_date

  return (
    <Link
      to={`/videos/${video.id}`}
      className="video-card"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/video-id', video.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      <span className="vc-thumb" style={{ background: client?.color ?? 'var(--amarillo)' }}>
        {client?.logo_url ? <img src={client.logo_url} alt="" /> : <span>{pad2(video.number)}</span>}
      </span>
      <span className="vc-body">
        {showClient && <span className="vc-client">{client?.name ?? 'Cliente'}{batch ? ` · ${batch.name}` : ''}</span>}
        <span className="vc-title">
          <span className="vc-num">Video {pad2(video.number)}</span> {video.title}
        </span>
        <span className="vc-meta">
          {rec.length > 0 && <span title="Grabación">🎥 {rec.join(', ')}</span>}
          {edi.length > 0 && <span title="Edición">✂️ {edi.join(', ')}</span>}
          {rec.length === 0 && edi.length === 0 && <span className="muted">Sin responsables</span>}
        </span>
        <span className="vc-foot">
          <StatusPill status={video.status} />
          {nextDate && <span className="vc-date">{fmtDay(nextDate)}</span>}
          <Progress value={progreso(video.status)} />
        </span>
      </span>
    </Link>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('input, textarea, select')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

/** Confirmación dentro de la página (sin confirm() nativo). */
export function ConfirmButton({
  label,
  confirmLabel = '¿Seguro? Toca de nuevo',
  onConfirm,
  className = 'btn btn-danger-ghost',
}: {
  label: string
  confirmLabel?: string
  onConfirm: () => void
  className?: string
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      type="button"
      className={className + (armed ? ' armed' : '')}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? confirmLabel : label}
    </button>
  )
}

/**
 * Campo de texto que guarda solo al salir (blur) o tras una pausa al escribir,
 * para que dos personas editando no se pisen a cada tecla.
 */
export function AutoField({
  value,
  onSave,
  multiline,
  placeholder,
  id,
  rows = 4,
  className,
}: {
  value: string
  onSave: (v: string) => unknown
  multiline?: boolean
  placeholder?: string
  id?: string
  rows?: number
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  const [state, setState] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle')
  const focused = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Si otro dispositivo cambia el valor y aquí no se está editando, se actualiza.
  useEffect(() => {
    if (!focused.current && state !== 'dirty') setDraft(value)
  }, [value, state])

  const save = async (v: string) => {
    clearTimeout(timer.current)
    if (v === value) {
      setState('idle')
      return
    }
    setState('saving')
    await onSave(v)
    setState('saved')
    setTimeout(() => setState((s) => (s === 'saved' ? 'idle' : s)), 1500)
  }

  const common = {
    id,
    value: draft,
    placeholder,
    className,
    onFocus: () => (focused.current = true),
    onBlur: () => {
      focused.current = false
      save(draft)
    },
    onChange: (e: { target: { value: string } }) => {
      setDraft(e.target.value)
      setState('dirty')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => save(e.target.value), 1500)
    },
  }
  return (
    <span className="autofield">
      {multiline ? <textarea rows={rows} {...common} /> : <input {...common} />}
      <span className={`save-state s-${state}`} aria-live="polite">
        {state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardado' : state === 'dirty' ? 'Sin guardar' : ''}
      </span>
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  )
}

export function Spinner() {
  return <div className="spinner" aria-label="Cargando" />
}

/* ───────── Selector de color ───────── */

/* Paleta pensada para el fondo oscuro de la app: todos los tonos se leen bien
   como borde y texto de la insignia del cliente. Los 8 primeros son los originales. */
export const COLORES = [
  '#FFC400', '#FF9A00', '#F2202B', '#B46CFF', '#3D8BFF', '#22C6C6', '#2BD47D', '#FF6FB5',
  '#FFE066', '#C6F432', '#7BE495', '#0FA37F', '#00B8FF', '#8FA8FF', '#A08CFF', '#E040FB',
  '#FF4D8D', '#FF6B4A', '#FF8A3D', '#D4A017', '#C68B59', '#F4C7A1', '#9AA0A6', '#FFFFFF',
]

export function SelectorColor({ legend, value, onChange }: { legend: string; value: string; onChange: (color: string) => void }) {
  const libre = !COLORES.includes(value.toUpperCase())
  const input = useRef<HTMLInputElement>(null)
  const cb = useRef(onChange)
  cb.current = onChange

  /* El evento nativo "change" solo se dispara al cerrar el selector del sistema,
     así no guardamos en cada movimiento mientras se arrastra. */
  useEffect(() => {
    const el = input.current
    if (!el) return
    const h = () => cb.current(el.value.toUpperCase())
    el.addEventListener('change', h)
    return () => el.removeEventListener('change', h)
  }, [])

  return (
    <fieldset className="colors">
      <legend>{legend}</legend>
      {COLORES.map((c) => (
        <button type="button" key={c} className={c === value.toUpperCase() ? 'on' : ''} style={{ background: c }} onClick={() => onChange(c)} aria-label={`Color ${c}`} title={c} />
      ))}
      <label className={`color-libre${libre ? ' on' : ''}`} title="Elegir cualquier color" style={libre ? { background: value } : undefined}>
        <input ref={input} type="color" defaultValue={libre ? value : '#FFC400'} aria-label="Elegir cualquier color" />
        {!libre && <span aria-hidden="true">+</span>}
      </label>
    </fieldset>
  )
}
