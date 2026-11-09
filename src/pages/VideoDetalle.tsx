import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth, useStudio } from '../lib/data'
import { setStatus, updateVideo } from '../lib/actions'
import { estadoInfo, progreso } from '../lib/status'
import { pad2 } from '../lib/format'
import { ConfirmButton, Empty, Progress, StatusSelect, useRun } from '../components/ui'
import { supabase } from '../lib/supabase'
import Resumen from './video/Resumen'
import Guion from './video/Guion'
import Material from './video/Material'
import Checklist from './video/Checklist'
import Entrega from './video/Entrega'
import { WhatsAppButton } from '../components/WhatsApp'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'guion', label: 'Guion' },
  { id: 'material', label: 'Material bruto' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'entrega', label: 'Entrega' },
] as const
type Tab = (typeof TABS)[number]['id']

export default function VideoDetalle() {
  const { id } = useParams()
  const { videos, clientById, batches } = useStudio()
  const { profile } = useAuth()
  const run = useRun()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.slice(1)
    return (TABS.find((t) => t.id === h)?.id ?? 'resumen') as Tab
  })
  const video = videos.find((v) => v.id === id)

  if (!video) return <Empty title="Video no encontrado"><Link to="/produccion">Volver a producción</Link></Empty>

  const client = clientById(video.client_id)
  const batch = batches.find((b) => b.id === video.batch_id)
  const go = (t: Tab) => {
    setTab(t)
    try {
      history.replaceState(null, '', `#${t}`)
    } catch {
      /* sin historial (vista previa) */
    }
  }

  return (
    <>
      <div className="crumbs">
        <Link to="/clientes">Clientes</Link> / <Link to={`/clientes/${client?.id}`}>{client?.name}</Link>
        {batch && <> / {batch.name}</>}
      </div>
      <div className="video-head">
        <div className="vh-title">
          <span className="vh-num">Video {pad2(video.number)}</span>
          <input
            id="video-titulo"
            className="title-input"
            defaultValue={video.title}
            key={video.title}
            aria-label="Título del video"
            onBlur={(e) => {
              const t = e.target.value.trim()
              if (t && t !== video.title) run(updateVideo(video.id, { title: t }), 'Título guardado')
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </div>
        <div className="vh-status">
          {client && <WhatsAppButton client={client} video={video} />}
          <StatusSelect id="video-estado" value={video.status} onChange={(s) => run(setStatus(video.id, s), `Estado: ${estadoInfo(s).short}`)} />
          <Progress value={progreso(video.status)} />
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => go(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <Resumen video={video} />}
      {tab === 'guion' && <Guion video={video} />}
      {tab === 'material' && <Material video={video} />}
      {tab === 'checklist' && <Checklist video={video} />}
      {tab === 'entrega' && <Entrega video={video} />}

      {profile?.role === 'admin' && tab === 'resumen' && (
        <div className="danger-zone">
          <ConfirmButton
            label="Eliminar video"
            confirmLabel="Se borra la ficha, su guion y sus vínculos. Toca otra vez"
            onConfirm={async () => {
              if (await run(supabase.from('videos').delete().eq('id', video.id), 'Video eliminado')) nav(`/clientes/${video.client_id}`)
            }}
          />
        </div>
      )}
    </>
  )
}
