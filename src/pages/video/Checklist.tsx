import { useState } from 'react'
import { useStudio, useVideoRows } from '../../lib/data'
import { setStatus } from '../../lib/actions'
import { HITOS, estadoInfo, hitoCumplido } from '../../lib/status'
import { fmtDateTime } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { Avatar, StatusPill, useRun } from '../../components/ui'
import type { StatusChange, Video, VideoTask } from '../../lib/types'

export default function Checklist({ video }: { video: Video }) {
  const run = useRun()
  const { profileById } = useStudio()
  const history = useVideoRows<StatusChange>('video_status_history', video.id, { col: 'created_at', asc: false })
  const tasks = useVideoRows<VideoTask>('video_tasks', video.id, { col: 'position' })
  const [nueva, setNueva] = useState('')

  const fechaHito = (estado: string) => history.rows.find((h) => h.to_status === estado)

  const toggleHito = (i: number) => {
    const h = HITOS[i]
    const done = hitoCumplido(video.status, h.reached)
    run(setStatus(video.id, done ? h.previous : h.reached), done ? `Regresado a ${estadoInfo(h.previous).short}` : `${h.label} ✓`)
  }

  return (
    <div className="detail-grid">
      <section className="panel">
        <h3>Etapas de producción</h3>
        <p className="muted small">Cada casilla cambia el estado del video, así la ficha y el tablero siempre coinciden.</p>
        <ul className="milestones">
          {HITOS.map((h, i) => {
            const done = hitoCumplido(video.status, h.reached)
            const rec = done ? fechaHito(h.reached) : undefined
            return (
              <li key={h.label} className={done ? 'done' : ''}>
                <label className="check big">
                  <input type="checkbox" checked={done} onChange={() => toggleHito(i)} />
                  <span>{h.label}</span>
                </label>
                {rec && <small className="muted">{profileById(rec.user_id)?.full_name ?? 'Alguien'} · {fmtDateTime(rec.created_at)}</small>}
              </li>
            )
          })}
        </ul>
        {(video.status === 'editado' || video.status === 'entregado') && (
          <button className="btn btn-ghost" onClick={() => run(setStatus(video.id, 'en_correcciones'), 'Enviado a correcciones')}>
            El cliente pidió cambios → En correcciones
          </button>
        )}
        {video.status === 'en_correcciones' && (
          <button className="btn btn-primary" onClick={() => run(setStatus(video.id, 'editado'), 'Correcciones listas')}>
            Correcciones listas → Editado
          </button>
        )}

        <h3 className="mt">Tareas extra</h3>
        <ul className="tasks">
          {tasks.rows.map((t) => (
            <li key={t.id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={async () => {
                    const { data } = await supabase.auth.getUser()
                    run(supabase.from('video_tasks').update({ done: !t.done, done_by: !t.done ? data.user?.id : null, done_at: !t.done ? new Date().toISOString() : null }).eq('id', t.id))
                  }}
                />
                <span className={t.done ? 'strike' : ''}>{t.label}</span>
              </label>
              <button className="icon-btn" aria-label="Borrar tarea" onClick={() => run(supabase.from('video_tasks').delete().eq('id', t.id))}>✕</button>
            </li>
          ))}
        </ul>
        <form
          className="quick-add"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!nueva.trim()) return
            if (await run(supabase.from('video_tasks').insert({ video_id: video.id, label: nueva.trim(), position: tasks.rows.length }))) setNueva('')
          }}
        >
          <input id="t-nueva" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Ej. Comprar props, pedir música, subtítulos…" />
          <button className="btn btn-primary" disabled={!nueva.trim()}>Agregar</button>
        </form>
      </section>

      <aside className="panel side">
        <h3>Historial</h3>
        <ul className="history">
          {history.rows.map((h) => (
            <li key={h.id}>
              <Avatar profile={profileById(h.user_id)} size={24} />
              <div>
                <p>
                  <b>{profileById(h.user_id)?.full_name ?? 'Sistema'}</b>{' '}
                  {h.from_status ? <>cambió de <StatusPill status={h.from_status} /> a</> : 'creó el video en'} <StatusPill status={h.to_status} />
                </p>
                <small className="muted">{fmtDateTime(h.created_at)}</small>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
