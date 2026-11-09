import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudio } from '../lib/data'
import { addDays, diaSemana, nombreMes, startOfWeek, toDay, today } from '../lib/format'
import { PageHeader, StatusPill } from '../components/ui'
import { gcalLink } from '../lib/gcal'
import type { Video } from '../lib/types'

type Evento = { v: Video; kind: 'Grabación' | 'Edición' | 'Entrega'; tone: string }

export default function Calendario() {
  const { videos, clientById, assigneesOf, profiles } = useStudio()
  const [inicio, setInicio] = useState(() => startOfWeek(new Date()))
  const [resp, setResp] = useState('')
  const [tipo, setTipo] = useState('')
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i))
  const hoy = today()

  const eventos = (d: string): Evento[] =>
    videos
      .filter((v) => !resp || assigneesOf(v.id).some((a) => a.user_id === resp))
      .flatMap((v) => [
        v.record_date === d ? ({ v, kind: 'Grabación', tone: 'rojo' } as Evento) : null,
        v.edit_date === d ? ({ v, kind: 'Edición', tone: 'azul' } as Evento) : null,
        v.due_date === d ? ({ v, kind: 'Entrega', tone: 'verde' } as Evento) : null,
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
          <option value="">Grabación, edición y entrega</option>
          <option value="Grabación">Solo grabaciones</option>
          <option value="Edición">Solo ediciones</option>
          <option value="Entrega">Solo entregas</option>
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
                    <span className="event-kind">{e.kind}</span>
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
                      href={gcalLink({ title: `${e.kind} · ${clientById(e.v.client_id)?.name ?? ''} · ${e.v.title}`, date: key })}
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
