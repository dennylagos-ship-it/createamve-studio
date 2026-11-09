import { useState } from 'react'
import { useStudio, useVideoRows } from '../../lib/data'
import { setStatus, updateVideo } from '../../lib/actions'
import { fmtDay, isUrl, today } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { AutoField, ConfirmButton, Empty, useRun } from '../../components/ui'
import type { Deliverable, EstadoEntrega, Video } from '../../lib/types'

const ESTADOS_ENTREGA: { id: EstadoEntrega; label: string; tone: string }[] = [
  { id: 'enviado', label: 'Enviado al cliente', tone: 'azul' },
  { id: 'con_correcciones', label: 'Con correcciones', tone: 'naranja' },
  { id: 'aprobado', label: 'Aprobado', tone: 'verde' },
]

export default function Entrega({ video }: { video: Video }) {
  const run = useRun()
  const { profileById } = useStudio()
  const { rows } = useVideoRows<Deliverable>('deliverables', video.id, { col: 'created_at', asc: false })
  const [version, setVersion] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = version.trim() || `v${rows.length + 1}`
    const ok = await run(
      supabase.from('deliverables').insert({ video_id: video.id, version: v, url: url.trim() || null, notes, delivered_at: today() }),
      'Entrega registrada',
    )
    if (ok) {
      if (url.trim()) await run(updateVideo(video.id, { final_url: url.trim() }))
      if (video.status !== 'entregado') await run(setStatus(video.id, 'entregado'))
      setVersion('')
      setUrl('')
      setNotes('')
    }
  }

  const cambiarEstado = async (d: Deliverable, s: EstadoEntrega) => {
    await run(supabase.from('deliverables').update({ status: s }).eq('id', d.id))
    if (s === 'con_correcciones') await run(setStatus(video.id, 'en_correcciones'), 'Video enviado a correcciones')
  }

  return (
    <div className="detail-grid">
      <section className="panel form">
        <h3>Versión final</h3>
        <label>
          Enlace del video final (Drive, WeTransfer, Instagram…)
          <AutoField id="e-final" value={video.final_url ?? ''} placeholder="https://…" onSave={(v) => run(updateVideo(video.id, { final_url: v.trim() || null }))} />
        </label>
        {video.final_url && isUrl(video.final_url) && (
          <a className="btn btn-ghost" href={video.final_url} target="_blank" rel="noopener noreferrer">Abrir versión final ↗</a>
        )}

        <h3 className="mt">Registrar una entrega</h3>
        <form className="form" onSubmit={registrar}>
          <div className="row">
            <label>Versión<input id="e-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder={`v${rows.length + 1}`} /></label>
            <label className="grow">Enlace<input id="e-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></label>
          </div>
          <label>Notas<input id="e-notas" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Qué cambió en esta versión" /></label>
          <button className="btn btn-primary">Registrar entrega</button>
        </form>
      </section>

      <aside className="panel side">
        <h3>Historial de entregas</h3>
        {rows.length === 0 ? (
          <Empty title="Sin entregas">Cuando envíes una versión al cliente, regístrala aquí.</Empty>
        ) : (
          <ul className="deliveries">
            {rows.map((d) => (
              <li key={d.id}>
                <div className="row between">
                  <b>{d.version}</b>
                  <small className="muted">{fmtDay(d.delivered_at)} · {profileById(d.created_by)?.full_name}</small>
                </div>
                {d.notes && <p className="small">{d.notes}</p>}
                {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="small">Abrir ↗</a>}
                <div className="row between">
                  <select
                    className={`status-select compact tone-${ESTADOS_ENTREGA.find((x) => x.id === d.status)?.tone}`}
                    value={d.status}
                    onChange={(e) => cambiarEstado(d, e.target.value as EstadoEntrega)}
                    aria-label="Estado de la entrega"
                  >
                    {ESTADOS_ENTREGA.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <ConfirmButton className="icon-btn" label="✕" confirmLabel="¿Borrar?" onConfirm={() => run(supabase.from('deliverables').delete().eq('id', d.id))} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
