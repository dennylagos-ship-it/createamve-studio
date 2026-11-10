import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useStudio, useVideoRows } from '../../lib/data'
import { setAssignees, updateVideo } from '../../lib/actions'
import { ASIGNACIONES } from '../../lib/status'
import { fmtDateTime, fmtDay, pad2 } from '../../lib/format'
import { gcalLink } from '../../lib/gcal'
import { supabase } from '../../lib/supabase'
import Publicacion from './Publicacion'
import { AutoField, Avatar, ConfirmButton, useRun } from '../../components/ui'
import type { Comment, TipoAsignacion, Video } from '../../lib/types'

export default function Resumen({ video }: { video: Video }) {
  const { batches, ideas, profiles, assigneesOf, clientById, profileById } = useStudio()
  const run = useRun()
  const save = (patch: Partial<Video>) => run(updateVideo(video.id, patch))
  const idea = ideas.find((i) => i.id === video.idea_id)
  const clientBatches = batches.filter((b) => b.client_id === video.client_id)
  const pauta = batches.find((b) => b.id === video.batch_id)?.shoot_date ?? null
  const asg = assigneesOf(video.id)
  const team = profiles.filter((p) => p.active)

  const toggle = (kind: TipoAsignacion, userId: string) => {
    const current = asg.filter((a) => a.kind === kind).map((a) => a.user_id)
    const next = current.includes(userId) ? current.filter((x) => x !== userId) : [...current, userId]
    run(setAssignees(video.id, kind, next))
  }

  return (
    <div className="detail-grid">
      <section className="panel form">
        <label>
          Idea, brief o acuerdo con el cliente
          <AutoField id="v-brief" multiline rows={5} value={video.brief} placeholder="Qué debe comunicar este Reel, qué se acordó, referencias…" onSave={(v) => save({ brief: v })} />
        </label>
        {idea && (
          <p className="muted small">
            Viene de la idea <Link to={`/ideas#${idea.id}`}>“{idea.title}”</Link>.
          </p>
        )}
        <label>
          Notas de producción
          <AutoField id="v-notas" multiline rows={4} value={video.notes} placeholder="Locación, vestuario, props, música…" onSave={(v) => save({ notes: v })} />
        </label>
      </section>

      <aside className="panel side">
        <h3>Responsables</h3>
        {ASIGNACIONES.map((k) => {
          const ids = asg.filter((a) => a.kind === k.id).map((a) => a.user_id)
          return (
            <div key={k.id} className="assign">
              <span className="assign-label">{k.label}</span>
              <div className="chips">
                {team.map((p) => (
                  <button key={p.id} type="button" className={`chip${ids.includes(p.id) ? ' on' : ''}`} onClick={() => toggle(k.id, p.id)} aria-pressed={ids.includes(p.id)}>
                    <Avatar profile={p} size={20} /> {p.full_name}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        <h3>Fechas</h3>
        <div className="dates">
          {(
            [
              ['record_date', 'Grabación', 'grabacion'],
              ['edit_date', 'Edición', 'edicion'],
              ['due_date', 'Entrega', 'revision'],
            ] as const
          ).map(([campo, label, kind]) => {
            const fecha = video[campo]
            const resp = asg.filter((a) => a.kind === kind).map((a) => profileById(a.user_id)?.full_name).filter(Boolean).join(', ')
            return (
              <div key={campo} className="date-row">
                <label>
                  {label}
                  <input id={`v-${campo}`} type="date" value={fecha ?? ''} onChange={(e) => save({ [campo]: e.target.value || null })} />
                </label>
                {campo === 'record_date' && pauta && (
                  fecha === pauta ? (
                    <span className="muted small">🎬 Día de pauta del lote</span>
                  ) : (
                    <span className="small">
                      <span className="muted">Distinto a la pauta del lote ({fmtDay(pauta)}). </span>
                      <button type="button" className="link-btn" onClick={() => save({ record_date: pauta })}>Volver a la pauta</button>
                    </span>
                  )
                )}
                {fecha && (
                  <a
                    className="gcal"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Agregar este evento a Google Calendar"
                    href={gcalLink({
                      title: `${label} · ${clientById(video.client_id)?.name ?? ''} · ${video.title}`,
                      date: fecha,
                      details: [`Video ${pad2(video.number)}`, resp && `Responsable: ${resp}`, video.brief].filter(Boolean).join('\n'),
                    })}
                  >
                    + Google Calendar
                  </a>
                )}
              </div>
            )
          })}
        </div>

        <h3>Publicación</h3>
        <Publicacion video={video} />

        <h3>Lote</h3>
        <select id="v-lote" value={video.batch_id ?? ''} onChange={(e) => save({ batch_id: e.target.value || null })}>
          <option value="">Sin lote</option>
          {clientBatches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </aside>

      <Comentarios videoId={video.id} />
    </div>
  )
}

function Comentarios({ videoId }: { videoId: string }) {
  const { rows } = useVideoRows<Comment>('comments', videoId, { col: 'created_at' })
  const { profileById } = useStudio()
  const { profile } = useAuth()
  const run = useRun()
  const [body, setBody] = useState('')

  return (
    <section className="panel comments">
      <h3>Comentarios y correcciones</h3>
      {rows.length === 0 && <p className="muted small">Sin comentarios todavía.</p>}
      <ul>
        {rows.map((c) => {
          const a = profileById(c.author_id)
          return (
            <li key={c.id}>
              <Avatar profile={a} size={28} />
              <div>
                <p className="c-meta"><b>{a?.full_name ?? 'Alguien'}</b> · {fmtDateTime(c.created_at)}</p>
                <p className="c-body">{c.body}</p>
              </div>
              {(c.author_id === profile?.id || profile?.role === 'admin') && (
                <ConfirmButton className="icon-btn" label="✕" confirmLabel="¿Borrar?" onConfirm={() => run(supabase.from('comments').delete().eq('id', c.id))} />
              )}
            </li>
          )
        })}
      </ul>
      <form
        className="quick-add"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!body.trim()) return
          if (await run(supabase.from('comments').insert({ video_id: videoId, body: body.trim() }))) setBody('')
        }}
      >
        <input id="c-nuevo" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe un comentario o una corrección del cliente…" />
        <button className="btn btn-primary" disabled={!body.trim()}>Enviar</button>
      </form>
    </section>
  )
}
