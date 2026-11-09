import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStudio } from '../lib/data'
import { supabase } from '../lib/supabase'
import { Empty, Modal, PageHeader, useRun } from '../components/ui'
import { ClientBadge } from './Inicio'

export const COLORES = ['#FFC400', '#FF9A00', '#F2202B', '#B46CFF', '#3D8BFF', '#22C6C6', '#2BD47D', '#FF6FB5']

export default function Clientes() {
  const { clients, videos, batches } = useStudio()
  const [showArchived, setShowArchived] = useState(false)
  const [creating, setCreating] = useState(false)
  const list = clients.filter((c) => c.archived === showArchived)

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Cada cliente con sus lotes, videos, guiones y material."
        actions={<button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nuevo cliente</button>}
      />
      <div className="toolbar">
        <div className="segmented">
          <button className={!showArchived ? 'on' : ''} onClick={() => setShowArchived(false)}>Activos</button>
          <button className={showArchived ? 'on' : ''} onClick={() => setShowArchived(true)}>Archivados</button>
        </div>
      </div>
      {list.length === 0 ? (
        <Empty title={showArchived ? 'No hay clientes archivados' : 'Aún no hay clientes'}>
          {!showArchived && 'Crea el primero con el botón “Nuevo cliente”.'}
        </Empty>
      ) : (
        <div className="client-grid">
          {list.map((c) => {
            const vs = videos.filter((v) => v.client_id === c.id)
            const activos = vs.filter((v) => v.status !== 'entregado').length
            const lotes = batches.filter((b) => b.client_id === c.id && !b.archived).length
            return (
              <Link key={c.id} to={`/clientes/${c.id}`} className="client-card">
                <ClientBadge name={c.name} color={c.color} logo={c.logo_url} size={52} />
                <span className="cc-body">
                  <b>{c.name}</b>
                  {c.description && <small className="clamp-2">{c.description}</small>}
                  <span className="cc-stats">
                    <span><b>{activos}</b> activos</span>
                    <span><b>{vs.length - activos}</b> entregados</span>
                    <span><b>{lotes}</b> lotes</span>
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
      {creating && <NuevoCliente onClose={() => setCreating(false)} />}
    </>
  )
}

function NuevoCliente({ onClose }: { onClose: () => void }) {
  const run = useRun()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORES[0])
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await run(supabase.from('clients').insert({ name: name.trim(), description, color }).select('id').single(), 'Cliente creado')
    setBusy(false)
    if (res && res !== true) nav(`/clientes/${(res as { id: string }).id}`)
  }

  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Nombre comercial
          <input id="nc-nombre" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Luna Cuero" />
        </label>
        <label>
          Descripción
          <textarea id="nc-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué vende, a quién le habla…" />
        </label>
        <fieldset className="colors">
          <legend>Color de identificación</legend>
          {COLORES.map((c) => (
            <button type="button" key={c} className={c === color ? 'on' : ''} style={{ background: c }} onClick={() => setColor(c)} aria-label={`Color ${c}`} />
          ))}
        </fieldset>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy || !name.trim()}>Crear cliente</button>
        </div>
      </form>
    </Modal>
  )
}
