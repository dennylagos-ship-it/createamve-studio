import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth, useStudio } from '../lib/data'
import { ESTADOS, PENDIENTE_POR_ROL, estadoInfo } from '../lib/status'
import { setStatus } from '../lib/actions'
import { fmtDay, pad2 } from '../lib/format'
import { Avatar, Empty, PageHeader, StatusSelect, VideoCard, useRun } from '../components/ui'
import type { EstadoVideo, Video } from '../lib/types'

export default function Produccion() {
  const { videos, clients, profiles, assignments, batches, clientById, profileById, assigneesOf } = useStudio()
  const { profile } = useAuth()
  const run = useRun()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'tablero' | 'lista'>(() => {
    try {
      return (localStorage.getItem('studio.vista') as 'tablero' | 'lista') || 'tablero'
    } catch {
      return 'tablero'
    }
  })
  const [dragOver, setDragOver] = useState<EstadoVideo | null>(null)

  const q = params.get('q') ?? ''
  const estado = params.get('estado') ?? ''
  const cliente = params.get('cliente') ?? ''
  const resp = params.get('resp') ?? ''
  const mios = params.get('mios') === '1'
  const desde = params.get('desde') ?? ''
  const hasta = params.get('hasta') ?? ''

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }
  const changeView = (v: 'tablero' | 'lista') => {
    setView(v)
    try {
      localStorage.setItem('studio.vista', v)
    } catch {
      /* sin almacenamiento local */
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return videos.filter((v) => {
      const c = clientById(v.client_id)
      if (c?.archived && !cliente) return false
      if (cliente && v.client_id !== cliente) return false
      if (estado && v.status !== estado) return false
      if (resp && !assignments.some((a) => a.video_id === v.id && a.user_id === resp)) return false
      if (mios && !assignments.some((a) => a.video_id === v.id && a.user_id === profile?.id && PENDIENTE_POR_ROL[a.kind].includes(v.status))) return false
      const fecha = v.record_date ?? v.edit_date ?? v.due_date
      if (desde && (!fecha || fecha < desde)) return false
      if (hasta && (!fecha || fecha > hasta)) return false
      if (needle) {
        const batch = batches.find((b) => b.id === v.batch_id)
        const names = assigneesOf(v.id).map((a) => profileById(a.user_id)?.full_name ?? '')
        const hay = [v.title, v.brief, v.script, v.shot_list, v.notes, c?.name, batch?.name, `video ${pad2(v.number)}`, ...names]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [videos, q, estado, cliente, resp, mios, desde, hasta, assignments, profile, clientById, batches, assigneesOf, profileById])

  const hayFiltros = q || estado || cliente || resp || mios || desde || hasta

  const drop = (status: EstadoVideo, e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
    const id = e.dataTransfer.getData('text/video-id')
    const v = videos.find((x) => x.id === id)
    if (v && v.status !== status) run(setStatus(id, status), `Movido a ${estadoInfo(status).short}`)
  }

  return (
    <>
      <PageHeader
        title="Producción"
        subtitle={`${filtered.length} video${filtered.length === 1 ? '' : 's'}${hayFiltros ? ' con los filtros actuales' : ''}`}
        actions={
          <div className="segmented">
            <button className={view === 'tablero' ? 'on' : ''} onClick={() => changeView('tablero')}>Tablero</button>
            <button className={view === 'lista' ? 'on' : ''} onClick={() => changeView('lista')}>Lista</button>
          </div>
        }
      />

      <div className="filters">
        <input id="f-q" type="search" placeholder="Buscar en títulos, guiones, notas…" value={q} onChange={(e) => set('q', e.target.value)} />
        <select id="f-cliente" value={cliente} onChange={(e) => set('cliente', e.target.value)} aria-label="Cliente">
          <option value="">Todos los clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.archived ? ' (archivado)' : ''}</option>)}
        </select>
        <select id="f-estado" value={estado} onChange={(e) => set('estado', e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select id="f-resp" value={resp} onChange={(e) => set('resp', e.target.value)} aria-label="Responsable">
          <option value="">Todo el equipo</option>
          {profiles.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <label className="date-filter">Desde<input id="f-desde" type="date" value={desde} onChange={(e) => set('desde', e.target.value)} /></label>
        <label className="date-filter">Hasta<input id="f-hasta" type="date" value={hasta} onChange={(e) => set('hasta', e.target.value)} /></label>
        <label className="check">
          <input id="f-mios" type="checkbox" checked={mios} onChange={(e) => set('mios', e.target.checked ? '1' : '')} /> Mis pendientes
        </label>
        {hayFiltros && <button className="link" onClick={() => setParams({}, { replace: true })}>Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Empty title="No hay videos que coincidan">{hayFiltros ? 'Prueba quitando algún filtro.' : <>Crea videos desde la ficha de un <Link to="/clientes">cliente</Link>.</>}</Empty>
      ) : view === 'tablero' ? (
        <div className="board">
          {ESTADOS.filter((s) => !estado || s.id === estado).map((s) => {
            const list = filtered.filter((v) => v.status === s.id)
            return (
              <div
                key={s.id}
                className={`board-col tone-${s.tone}${dragOver === s.id ? ' over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(s.id)
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => drop(s.id, e)}
              >
                <h3>{s.short} <span>({list.length})</span></h3>
                {list.map((v) => (
                  <div key={v.id} className="board-item">
                    <VideoCard video={v} draggable />
                    <StatusSelect compact value={v.status} onChange={(st) => run(setStatus(v.id, st), `Movido a ${estadoInfo(st).short}`)} />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Video</th>
                <th>Cliente</th>
                <th>Responsables</th>
                <th>Grabación</th>
                <th>Entrega</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: Video) => (
                <tr key={v.id}>
                  <td><Link to={`/videos/${v.id}`}><span className="muted">Video {pad2(v.number)}</span> {v.title}</Link></td>
                  <td>{clientById(v.client_id)?.name}</td>
                  <td className="avatars">{assigneesOf(v.id).map((a) => <Avatar key={a.user_id + a.kind} profile={profileById(a.user_id)} size={24} />)}</td>
                  <td>{fmtDay(v.record_date)}</td>
                  <td>{fmtDay(v.due_date)}</td>
                  <td><StatusSelect compact value={v.status} onChange={(st) => run(setStatus(v.id, st), `Movido a ${estadoInfo(st).short}`)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
