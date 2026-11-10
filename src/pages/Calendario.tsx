import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudio } from '../lib/data'
import { addDays, diaSemana, nombreMes, startOfWeek, toDay, today } from '../lib/format'
import { PageHeader, StatusPill } from '../components/ui'
import { gcalLink } from '../lib/gcal'
import { PUBLICACION_INFO, estadoPublicacion, fmtHora, useAhora } from '../lib/publicacion'
import type { Video } from '../lib/types'

type Tipo = 'Grabación' | 'Edición' | 'Entrega' | 'Publicación'
type Evento = { v: Video; kind: Tipo; label: string; tone: string; hora?: string }

export default function Calendario() {
  const { videos, clientById, assigneesOf, profiles } = useStudio()
  const [inicio, setInicio] = useState(() => startOfWeek(new Date()))
  const [resp, setResp] = useState('')
  const [tipo, setTipo] = useState('')
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i))
  const hoy = today()
  const ahora = useAhora()

  const publicacion = (v: Video, d: string): Evento | null => {
    const e = estadoPublicacion(v, ahora)
    if (!e || !v.publish_at || toDay(new Date(v.publish_at)) !== d) return null
    const label = e === 'atrasada' || e === 'publicada' ? PUBLICACION_INFO[e].label : 'Publicación'
    return { v, kind: 'Publicación', label, tone: PUBLICACION_INFO[e].tone, hora: fmtHora(v.publish_at) }
  }

  const eventos = (d: string): Evento[] =>
    videos
      .filter((v) => !resp || assigneesOf(v.id).some((a) => a.user_id === resp))
      .flatMap((v) => [
        v.record_date === d ? ({ v, kind: 'Grabación', label: 'Grabación', tone: 'rojo' } as Evento) : null,
        v.edit_date === d ? ({ v, kind: 'Edición', label: 'Edición', tone: 'azul' } as Evento) : null,
        v.due_date === d ? ({ v, kind: 'Entrega', label: 'Entrega', tone: 'verde' } as Evento) : null,
        publicacion(v, d),
      ])
      .filter((e): e is Evento => !!e && (!tipo || e.kind === tipo))

  const fin = dias[6]
  return (
    <>
      <PageHeader
        title="Calendario de producción"
        subtitle={`${inicio.getDate()} ${nombreMes(inicio)} – ${fin.getDate()} ${nombreMes(fin)} ${fin.getFullYear()}`}
        actions={
          <div className="row">
            <button className="btn btn-ghost" onClick={() => setInicio(addDays(inicio, -7))} aria-label="Semana anterior">←</button>
            <button className="btn btn-ghost" onClick={() => setInicio(startOfWeek(new Date()))}>Esta semana</button>
            <button className="btn btn-ghost" onClick={() => setInicio(addDays(inicio, 7))} aria-label="Semana siguiente">→</button>
          </div>
        }
      />
      <div className="filters">
        <select id="cal-resp" value={resp} onChange={(e) => setResp(e.target.value)} aria-label="Responsable">
          <option value="">Todo el equipo</option>
          {profiles.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <select id="cal-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          <option value="">Todo: grabación, edición, entrega y publicación</option>
          <option value="Grabación">Solo grabaciones</option>
          <option value="Edición">Solo ediciones</option>
          <option value="Entrega">Solo entregas</option>
          <option value="Publicación">Solo publicaciones</option>
        </select>
      </div>
      <div className="week">
        {dias.map((d) => {
          const key = toDay(d)
          const evs = eventos(key)
          return (
            <section key={key} className={`day${key === hoy ? ' today' : ''}`}>
              <h3>
                {diaSemana(d)} <span>{d.getDate()}</span>
              </h3>
              {evs.length === 0 && <p className="muted small">—</p>}
              {evs.map((e) => (
                <div key={e.v.id + e.kind} className={`event tone-${e.tone}`}>
                  <Link to={`/videos/${e.v.id}`} className="event-link">
                    <span className="event-kind">{e.hora ? `${e.label} · ${e.hora}` : e.label}</span>
                    <b>{clientById(e.v.client_id)?.name}</b>
                    <span>{e.v.title}</span>
                  </Link>
                  <span className="row between">
                    <StatusPill status={e.v.status} />
                    <a
                      className="gcal"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Agregar a Google Calendar"
                      aria-label="Agregar a Google Calendar"
                      href={gcalLink({
                        title: `${e.kind === 'Publicación' ? 'Publicar' : e.kind} · ${clientById(e.v.client_id)?.name ?? ''} · ${e.v.title}`,
                        date: key,
                        start: e.kind === 'Publicación' ? (e.v.publish_at ?? undefined) : undefined,
                      })}
                    >
                      + GCal
                    </a>
                  </span>
                </div>
              ))}
            </section>
          )
        })}
      </div>
      <p className="muted small">Las fechas se ponen en la pestaña Resumen de cada video. Para ver todo esto en Google Calendar de forma automática, usa el enlace de suscripción en <Link to="/ajustes">Ajustes</Link>.</p>
    </>
  )
}
