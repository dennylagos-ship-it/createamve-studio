import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStudio } from '../lib/data'
import { supabase } from '../lib/supabase'
import { createVideos } from '../lib/actions'
import { fmtDateTime, isUrl } from '../lib/format'
import { AutoField, ConfirmButton, Empty, Modal, PageHeader, useRun } from '../components/ui'
import type { EstadoIdea, Idea, Video } from '../lib/types'

export default function Ideas() {
  return (
    <>
      <PageHeader title="Banco de ideas" subtitle="Ideas y títulos tentativos, antes de convertirlos en videos." />
      <IdeaList />
    </>
  )
}

const ESTADO_LABEL: Record<EstadoIdea, string> = { abierta: 'Abiertas', convertida: 'Convertidas', descartada: 'Descartadas' }

export function IdeaList({ clientId }: { clientId?: string }) {
  const { ideas, clients, clientById, profileById } = useStudio()
  const run = useRun()
  const [estado, setEstado] = useState<EstadoIdea>('abierta')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [nueva, setNueva] = useState(false)
  const [convertir, setConvertir] = useState<Idea | null>(null)
  const [abierta, setAbierta] = useState<string | null>(() => window.location.hash.slice(1) || null)

  const cid = clientId ?? filtroCliente
  const list = ideas.filter((i) => i.status === estado && (!cid || i.client_id === cid))

  return (
    <>
      <div className="toolbar">
        <div className="segmented">
          {(Object.keys(ESTADO_LABEL) as EstadoIdea[]).map((s) => (
            <button key={s} className={estado === s ? 'on' : ''} onClick={() => setEstado(s)}>{ESTADO_LABEL[s]}</button>
          ))}
        </div>
        {!clientId && (
          <select id="i-cliente" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} aria-label="Cliente">
            <option value="">Todos los clientes</option>
            {clients.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <button className="btn btn-primary" onClick={() => setNueva(true)}>+ Nueva idea</button>
      </div>

      {list.length === 0 ? (
        <Empty title={`No hay ideas ${ESTADO_LABEL[estado].toLowerCase()}`}>{estado === 'abierta' && 'Anota aquí lo que se habló con el cliente aunque todavía no tenga fecha.'}</Empty>
      ) : (
        <div className="idea-grid">
          {list.map((i) => {
            const open = abierta === i.id
            return (
              <article key={i.id} id={i.id} className={`idea${open ? ' open' : ''}`}>
                <button className="idea-head" onClick={() => setAbierta(open ? null : i.id)} aria-expanded={open}>
                  <span className="muted small">{clientById(i.client_id)?.name ?? 'Sin cliente'}</span>
                  <b>{i.title}</b>
                  {!open && i.summary && <span className="clamp-2 small">{i.summary}</span>}
                </button>
                {open && (
                  <div className="form compact">
                    <label>Título<AutoField id={`i-t-${i.id}`} value={i.title} onSave={(v) => v.trim() && run(supabase.from('ideas').update({ title: v.trim() }).eq('id', i.id))} /></label>
                    <label>Resumen<AutoField id={`i-s-${i.id}`} multiline rows={3} value={i.summary} onSave={(v) => run(supabase.from('ideas').update({ summary: v }).eq('id', i.id))} /></label>
                    <label>Notas de lo conversado<AutoField id={`i-n-${i.id}`} multiline rows={4} value={i.notes} onSave={(v) => run(supabase.from('ideas').update({ notes: v }).eq('id', i.id))} /></label>
                    <label>
                      Referencias (un enlace por línea)
                      <AutoField
                        id={`i-r-${i.id}`}
                        multiline
                        rows={2}
                        value={i.reference_links.join('\n')}
                        onSave={(v) => run(supabase.from('ideas').update({ reference_links: v.split('\n').map((x) => x.trim()).filter(Boolean) }).eq('id', i.id))}
                      />
                    </label>
                    {i.reference_links.filter(isUrl).length > 0 && (
                      <ul className="refs">{i.reference_links.filter(isUrl).map((u) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer">{u}</a></li>)}</ul>
                    )}
                    <p className="muted small">{profileById(i.created_by)?.full_name ?? 'Alguien'} · {fmtDateTime(i.created_at)}</p>
                    <div className="row">
                      {i.status === 'abierta' && (
                        <>
                          <button className="btn btn-primary" onClick={() => setConvertir(i)} disabled={!i.client_id}>Convertir en video</button>
                          <button className="btn btn-ghost" onClick={() => run(supabase.from('ideas').update({ status: 'descartada' }).eq('id', i.id), 'Idea descartada')}>Descartar</button>
                        </>
                      )}
                      {i.status !== 'abierta' && (
                        <button className="btn btn-ghost" onClick={() => run(supabase.from('ideas').update({ status: 'abierta' }).eq('id', i.id), 'Idea reabierta')}>Reabrir</button>
                      )}
                      <ConfirmButton label="Borrar" onConfirm={() => run(supabase.from('ideas').delete().eq('id', i.id), 'Idea borrada')} />
                    </div>
                    {!i.client_id && <p className="muted small">Asigna un cliente para poder convertirla en video.</p>}
                    <VideosDeIdea ideaId={i.id} />
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {nueva && <NuevaIdea clientId={cid || undefined} onClose={() => setNueva(false)} />}
      {convertir && <ConvertirIdea idea={convertir} onClose={() => setConvertir(null)} />}
    </>
  )
}

function VideosDeIdea({ ideaId }: { ideaId: string }) {
  const { videos } = useStudio()
  const vs = videos.filter((v: Video) => v.idea_id === ideaId)
  if (!vs.length) return null
  return (
    <p className="small">
      Videos creados: {vs.map((v, k) => <span key={v.id}>{k > 0 && ', '}<Link to={`/videos/${v.id}`}>{v.title}</Link></span>)}
    </p>
  )
}

function NuevaIdea({ clientId, onClose }: { clientId?: string; onClose: () => void }) {
  const { clients } = useStudio()
  const run = useRun()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [cid, setCid] = useState(clientId ?? '')
  return (
    <Modal title="Nueva idea" onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (await run(supabase.from('ideas').insert({ title: title.trim(), summary, client_id: cid || null }), 'Idea guardada')) onClose()
        }}
      >
        <label>Título tentativo<input id="ni-titulo" value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
        <label>Resumen<textarea id="ni-resumen" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} /></label>
        <label>
          Cliente
          <select id="ni-cliente" value={cid} onChange={(e) => setCid(e.target.value)}>
            <option value="">Sin cliente todavía</option>
            {clients.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!title.trim()}>Guardar idea</button>
        </div>
      </form>
    </Modal>
  )
}

function ConvertirIdea({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const { batches, videos } = useStudio()
  const run = useRun()
  const nav = useNavigate()
  const lotes = batches.filter((b) => b.client_id === idea.client_id && !b.archived)
  const [batchId, setBatchId] = useState(lotes[0]?.id ?? '')

  const submit = async () => {
    const brief = [idea.summary, idea.notes, idea.reference_links.length ? `Referencias:\n${idea.reference_links.join('\n')}` : '']
      .filter(Boolean)
      .join('\n\n')
    const res = await run(createVideos(videos, { clientId: idea.client_id!, batchId: batchId || null, titles: [idea.title], ideaId: idea.id, brief }), 'Video creado desde la idea')
    if (res && res !== true) nav(`/videos/${(res as Video[])[0].id}`)
  }

  return (
    <Modal title="Convertir en video" onClose={onClose}>
      <div className="form">
        <p>Se crea una ficha de video con el título y el texto de la idea. La idea original se conserva.</p>
        <label>
          Lote
          <select id="ci-lote" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Sin lote</option>
            {lotes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>Crear video</button>
        </div>
      </div>
    </Modal>
  )
}
