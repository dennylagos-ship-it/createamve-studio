import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth, useStudio } from '../lib/data'
import { supabase } from '../lib/supabase'
import { createVideos } from '../lib/actions'
import { progreso } from '../lib/status'
import { addDays, fmtDay, parseDay, startOfWeek, toDay, nombreMes } from '../lib/format'
import { AutoField, ConfirmButton, Empty, Modal, PageHeader, Progress, VideoCard, useRun } from '../components/ui'
import { ClientBadge } from './Inicio'
import { COLORES } from './Clientes'
import { IdeaList } from './Ideas'
import type { Batch, Client } from '../lib/types'

export default function ClienteDetalle() {
  const { id } = useParams()
  const { clients, batches, videos } = useStudio()
  const { profile } = useAuth()
  const run = useRun()
  const nav = useNavigate()
  const [tab, setTab] = useState<'produccion' | 'ideas' | 'ficha'>('produccion')
  const [newBatch, setNewBatch] = useState(false)
  const [showArchivedBatches, setShowArchivedBatches] = useState(false)
  const client = clients.find((c) => c.id === id)

  if (!client) return <Empty title="Cliente no encontrado"><Link to="/clientes">Volver a clientes</Link></Empty>

  const cBatches = batches
    .filter((b) => b.client_id === client.id && b.archived === showArchivedBatches)
    .sort((a, b) => (b.start_date ?? b.created_at).localeCompare(a.start_date ?? a.created_at))
  const sueltos = videos.filter((v) => v.client_id === client.id && !v.batch_id)
  const save = (patch: Partial<Client>) => run(supabase.from('clients').update(patch).eq('id', client.id))

  return (
    <>
      <div className="crumbs"><Link to="/clientes">Clientes</Link> / {client.name}</div>
      <PageHeader
        title={client.name}
        subtitle={client.archived ? 'Cliente archivado' : client.description || 'Sin descripción'}
        actions={
          <>
            <button className="btn btn-primary" onClick={() => setNewBatch(true)}>+ Nuevo lote</button>
          </>
        }
      />

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'produccion'} onClick={() => setTab('produccion')}>Lotes y videos</button>
        <button role="tab" aria-selected={tab === 'ideas'} onClick={() => setTab('ideas')}>Ideas</button>
        <button role="tab" aria-selected={tab === 'ficha'} onClick={() => setTab('ficha')}>Ficha creativa</button>
      </div>

      {tab === 'produccion' && (
        <>
          <div className="toolbar">
            <div className="segmented">
              <button className={!showArchivedBatches ? 'on' : ''} onClick={() => setShowArchivedBatches(false)}>Lotes activos</button>
              <button className={showArchivedBatches ? 'on' : ''} onClick={() => setShowArchivedBatches(true)}>Historial</button>
            </div>
          </div>
          {cBatches.length === 0 && sueltos.length === 0 && (
            <Empty title={showArchivedBatches ? 'Sin lotes en el historial' : 'Este cliente aún no tiene lotes'}>
              {!showArchivedBatches && 'Crea un lote (por ejemplo, “Semana del 9 al 15 de noviembre”) con la cantidad de videos que necesites.'}
            </Empty>
          )}
          {cBatches.map((b) => <BatchBlock key={b.id} batch={b} />)}
          {!showArchivedBatches && sueltos.length > 0 && <BatchBlock batch={null} clientId={client.id} />}
          {!showArchivedBatches && sueltos.length === 0 && cBatches.length > 0 && (
            <QuickAddVideo clientId={client.id} batchId={null} label="+ Video sin lote" />
          )}
        </>
      )}

      {tab === 'ideas' && <IdeaList clientId={client.id} />}

      {tab === 'ficha' && (
        <section className="panel form">
          <div className="ficha-head">
            <ClientBadge name={client.name} color={client.color} logo={client.logo_url} size={64} />
            <label className="grow">
              Nombre comercial
              <AutoField id="cl-nombre" value={client.name} onSave={(v) => v.trim() && save({ name: v.trim() })} />
            </label>
          </div>
          <label>Descripción<AutoField id="cl-desc" multiline rows={2} value={client.description} onSave={(v) => save({ description: v })} /></label>
          <label>Guía creativa y línea gráfica<AutoField id="cl-guia" multiline rows={5} value={client.creative_guide} placeholder="Tono, colores, tipografías, qué evitar, cuentas de referencia…" onSave={(v) => save({ creative_guide: v })} /></label>
          <label>Notas e instrucciones del cliente<AutoField id="cl-notas" multiline rows={4} value={client.notes} onSave={(v) => save({ notes: v })} /></label>
          <label>Contacto operativo (opcional)<AutoField id="cl-contacto" value={client.contact} placeholder="Nombre y teléfono de quien aprueba" onSave={(v) => save({ contact: v })} /></label>
          <label>Logo (enlace a imagen, opcional)<AutoField id="cl-logo" value={client.logo_url ?? ''} placeholder="https://…" onSave={(v) => save({ logo_url: v.trim() || null })} /></label>
          <fieldset className="colors">
            <legend>Color de identificación</legend>
            {COLORES.map((c) => (
              <button type="button" key={c} className={c === client.color ? 'on' : ''} style={{ background: c }} onClick={() => save({ color: c })} aria-label={`Color ${c}`} />
            ))}
          </fieldset>
          <div className="danger-zone">
            <button className="btn btn-ghost" onClick={() => save({ archived: !client.archived })}>
              {client.archived ? 'Reactivar cliente' : 'Archivar cliente'}
            </button>
            {profile?.role === 'admin' && (
              <ConfirmButton
                label="Eliminar cliente"
                confirmLabel="Se borrarán sus lotes y videos. Toca otra vez"
                onConfirm={async () => {
                  if (await run(supabase.from('clients').delete().eq('id', client.id), 'Cliente eliminado')) nav('/clientes')
                }}
              />
            )}
          </div>
        </section>
      )}

      {newBatch && <NuevoLote clientId={client.id} onClose={() => setNewBatch(false)} />}
    </>
  )
}

function BatchBlock({ batch, clientId }: { batch: Batch | null; clientId?: string }) {
  const { videos } = useStudio()
  const { profile } = useAuth()
  const run = useRun()
  const [editing, setEditing] = useState(false)
  const cid = batch?.client_id ?? clientId!
  const list = videos.filter((v) => v.client_id === cid && v.batch_id === (batch?.id ?? null)).sort((a, b) => a.number - b.number)
  const avg = list.length ? Math.round(list.reduce((s, v) => s + progreso(v.status), 0) / list.length) : 0
  const entregados = list.filter((v) => v.status === 'entregado').length

  return (
    <section className="panel batch">
      <header className="panel-head">
        <div>
          <h2>{batch ? batch.name : 'Videos sin lote'}</h2>
          <p className="muted small">
            {batch?.start_date && `${fmtDay(batch.start_date)}${batch.end_date ? ` → ${fmtDay(batch.end_date)}` : ''} · `}
            {list.length} video{list.length === 1 ? '' : 's'} · {entregados} entregado{entregados === 1 ? '' : 's'}
          </p>
        </div>
        <div className="batch-progress">
          <Progress value={avg} /> <span>{avg}%</span>
          {batch && <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar lote">✎</button>}
        </div>
      </header>
      <div className="card-list cols">
        {list.map((v) => <VideoCard key={v.id} video={v} showClient={false} />)}
      </div>
      <QuickAddVideo clientId={cid} batchId={batch?.id ?? null} />
      {editing && batch && (
        <Modal title="Editar lote" onClose={() => setEditing(false)}>
          <div className="form">
            <label>Nombre<AutoField id="lote-nombre" value={batch.name} onSave={(v) => v.trim() && run(supabase.from('batches').update({ name: v.trim() }).eq('id', batch.id))} /></label>
            <div className="row">
              <label>Inicio<input id="lote-ini" type="date" value={batch.start_date ?? ''} onChange={(e) => run(supabase.from('batches').update({ start_date: e.target.value || null }).eq('id', batch.id))} /></label>
              <label>Cierre<input id="lote-fin" type="date" value={batch.end_date ?? ''} onChange={(e) => run(supabase.from('batches').update({ end_date: e.target.value || null }).eq('id', batch.id))} /></label>
            </div>
            <div className="danger-zone">
              <button className="btn btn-ghost" onClick={() => run(supabase.from('batches').update({ archived: !batch.archived }).eq('id', batch.id), batch.archived ? 'Lote reactivado' : 'Lote movido al historial').then(() => setEditing(false))}>
                {batch.archived ? 'Reactivar lote' : 'Mover al historial'}
              </button>
              {profile?.role === 'admin' && (
                <ConfirmButton label="Eliminar lote" confirmLabel="Sus videos quedarán sin lote. Toca otra vez" onConfirm={() => run(supabase.from('batches').delete().eq('id', batch.id), 'Lote eliminado')} />
              )}
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}

export function QuickAddVideo({ clientId, batchId, label = '+ Agregar video' }: { clientId: string; batchId: string | null; label?: string }) {
  const { videos } = useStudio()
  const run = useRun()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  if (!open) return <button className="btn btn-dashed" onClick={() => setOpen(true)}>{label}</button>
  return (
    <form
      className="quick-add"
      onSubmit={async (e) => {
        e.preventDefault()
        if (await run(createVideos(videos, { clientId, batchId, titles: [title] }), 'Video agregado')) {
          setTitle('')
        }
      }}
    >
      <input id={`qa-${batchId ?? clientId}`} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título tentativo del video" />
      <button className="btn btn-primary">Agregar</button>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Listo</button>
    </form>
  )
}

function NuevoLote({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { videos } = useStudio()
  const run = useRun()
  const lunes = startOfWeek(new Date())
  const domingo = addDays(lunes, 6)
  const [name, setName] = useState(`Semana del ${lunes.getDate()} al ${domingo.getDate()} de ${nombreMes(domingo)}`)
  const [start, setStart] = useState(toDay(lunes))
  const [end, setEnd] = useState(toDay(domingo))
  const [cantidad, setCantidad] = useState(3)
  const [titulos, setTitulos] = useState('')
  const [busy, setBusy] = useState(false)

  const lines = titulos.split('\n').map((t) => t.trim()).filter(Boolean)
  const total = Math.max(cantidad, lines.length)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const b = await run(
      supabase.from('batches').insert({ client_id: clientId, name: name.trim(), start_date: start || null, end_date: end || null }).select('*').single(),
    )
    if (b && b !== true) {
      const batch = b as Batch
      const titles = Array.from({ length: total }, (_, i) => lines[i] ?? '')
      if (total > 0) await run(createVideos(videos, { clientId, batchId: batch.id, titles }))
      onClose()
    }
    setBusy(false)
  }

  const setStartDate = (v: string) => {
    setStart(v)
    if (v) {
      const s = parseDay(v)
      const e = addDays(s, 6)
      setEnd(toDay(e))
      setName(`Semana del ${s.getDate()} al ${e.getDate()} de ${nombreMes(e)}`)
    }
  }

  return (
    <Modal title="Nuevo lote de producción" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Nombre del lote<input id="nl-nombre" value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <div className="row">
          <label>Inicio (opcional)<input id="nl-ini" type="date" value={start} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label>Cierre (opcional)<input id="nl-fin" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        </div>
        <label>
          ¿Cuántos videos?
          <input id="nl-cant" type="number" min={0} max={60} value={cantidad} onChange={(e) => setCantidad(Math.max(0, Number(e.target.value)))} />
        </label>
        <label>
          Títulos tentativos (uno por línea, opcional)
          <textarea id="nl-titulos" rows={4} value={titulos} onChange={(e) => setTitulos(e.target.value)} placeholder={'Kit de labios Aria\nBrochas Aria\nDelineadores'} />
        </label>
        <p className="muted small">Se crearán {total} ficha{total === 1 ? '' : 's'} de video. Luego puedes agregar más sin límite.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy || !name.trim()}>Crear lote</button>
        </div>
      </form>
    </Modal>
  )
}
