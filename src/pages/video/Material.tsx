import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudio, useVideoRows } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { TIPOS_MATERIAL } from '../../lib/status'
import { isGooglePhotos, isUrl, pad2 } from '../../lib/format'
import { Empty, Modal, Spinner, useRun, useToast } from '../../components/ui'
import type { Asset, FuenteMaterial, TipoMaterial, Video, VideoAsset } from '../../lib/types'

type Row = VideoAsset & { asset: Asset }

const ICONO: Record<TipoMaterial, string> = { clip: '🎞️', foto: '🖼️', audio: '🎙️', logo: '🔖', referencia: '📌', otro: '📎' }
const WATCH = ['assets']

function fuenteDe(url: string): FuenteMaterial {
  if (isGooglePhotos(url)) return 'google_photos_link'
  if (/drive\.google\.com|docs\.google\.com/i.test(url)) return 'drive'
  return 'otro'
}
const FUENTE_LABEL: Record<FuenteMaterial, string> = {
  google_photos_link: 'Google Fotos',
  photos_picker: 'Google Fotos (selector)',
  drive: 'Google Drive',
  upload: 'Archivo subido',
  otro: 'Enlace externo',
}

export default function Material({ video }: { video: Video }) {
  const { rows, loading, error } = useVideoRows<Row>('video_assets', video.id, { col: 'position' }, '*, asset:assets(*)', WATCH)
  const run = useRun()
  const [filtro, setFiltro] = useState<TipoMaterial | ''>('')
  const [adding, setAdding] = useState(false)
  const [linking, setLinking] = useState(false)
  const [abrir, setAbrir] = useState<Row | null>(null)
  const [shared, setShared] = useState<Record<string, string[]>>({})
  const { videos, batches } = useStudio()
  const lote = batches.find((b) => b.id === video.batch_id)

  // ¿Qué tomas también están vinculadas a otros videos? (muchos-a-muchos)
  const assetIds = rows.map((r) => r.asset_id).join(',')
  useEffect(() => {
    if (!assetIds) return setShared({})
    supabase
      .from('video_assets')
      .select('asset_id, video_id')
      .in('asset_id', assetIds.split(','))
      .neq('video_id', video.id)
      .then(({ data }) => {
        const m: Record<string, string[]> = {}
        for (const r of (data ?? []) as { asset_id: string; video_id: string }[]) (m[r.asset_id] ??= []).push(r.video_id)
        setShared(m)
      })
  }, [assetIds, video.id])

  const list = rows.filter((r) => r.asset && (!filtro || r.asset.kind === filtro))
  const counts = useMemo(() => {
    const c: Partial<Record<TipoMaterial, number>> = {}
    for (const r of rows) if (r.asset) c[r.asset.kind] = (c[r.asset.kind] ?? 0) + 1
    return c
  }, [rows])

  const move = async (idx: number, dir: -1 | 1) => {
    const a = list[idx]
    const b = list[idx + dir]
    if (!a || !b) return
    await run(supabase.from('video_assets').update({ position: b.position }).eq('video_id', video.id).eq('asset_id', a.asset_id))
    await run(supabase.from('video_assets').update({ position: a.position }).eq('video_id', video.id).eq('asset_id', b.asset_id))
  }

  const quitar = async (r: Row) => {
    const ok = await run(supabase.from('video_assets').delete().eq('video_id', video.id).eq('asset_id', r.asset_id), 'Quitado de este video')
    // Si ningún otro video usa la referencia, se borra el registro (el original en Google Fotos no se toca).
    if (ok && !shared[r.asset_id]?.length) await supabase.from('assets').delete().eq('id', r.asset_id)
  }

  const nextPos = rows.reduce((m, r) => Math.max(m, r.position), 0) + 1

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h3>Material bruto para editar</h3>
          <p className="muted small">Las tomas originales de este video, en orden de uso. Los archivos siguen en Google Fotos; aquí se guarda el vínculo, el nombre y la nota.</p>
        </div>
        <div className="row">
          <button className="btn btn-ghost" onClick={() => setLinking(true)}>Reusar de otro video</button>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Agregar tomas</button>
        </div>
      </header>

      {lote?.photos_album_url ? (
        <div className="album-banner">
          <span aria-hidden="true">📷</span>
          <div className="grow">
            <b>Álbum del lote "{lote.name}"</b>
            <p className="muted small">Todas las tomas del lote en Google Fotos. Se abre si tu cuenta tiene acceso al álbum.</p>
          </div>
          <a className="btn btn-primary" href={lote.photos_album_url} target="_blank" rel="noopener noreferrer">Abrir álbum</a>
        </div>
      ) : lote ? (
        <p className="muted small">
          Consejo: pega el álbum compartido de Google Fotos en el lote "{lote.name}" (ficha del cliente → ✎ del lote) y aparecerá aquí en todos sus videos.
        </p>
      ) : null}

      {rows.length > 0 && (
        <div className="segmented wrap">
          <button className={!filtro ? 'on' : ''} onClick={() => setFiltro('')}>Todo ({rows.length})</button>
          {TIPOS_MATERIAL.filter((t) => counts[t.id]).map((t) => (
            <button key={t.id} className={filtro === t.id ? 'on' : ''} onClick={() => setFiltro(t.id)}>
              {t.label} ({counts[t.id]})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <p className="form-error">No se pudo cargar el material: {error}</p>
      ) : rows.length === 0 ? (
        <Empty title="Aún no hay tomas vinculadas">
          Pega los enlaces de Google Fotos de las tomas que se usarán en este video. Puedes pegar varios a la vez, uno por línea.
        </Empty>
      ) : (
        <ol className="assets">
          {list.map((r, i) => (
            <AssetRow
              key={r.asset_id}
              r={r}
              n={i + 1}
              onUp={i > 0 ? () => move(i, -1) : undefined}
              onDown={i < list.length - 1 ? () => move(i, 1) : undefined}
              onOpen={() => setAbrir(r)}
              onRemove={() => quitar(r)}
              usedIn={(shared[r.asset_id] ?? []).map((id) => videos.find((v) => v.id === id)).filter((v): v is Video => !!v)}
            />
          ))}
        </ol>
      )}

      {adding && <AgregarTomas video={video} startPos={nextPos} existing={rows.length} onClose={() => setAdding(false)} />}
      {linking && <ReusarMaterial video={video} startPos={nextPos} already={rows.map((r) => r.asset_id)} onClose={() => setLinking(false)} />}
      {abrir && <AbrirExterno r={abrir} onClose={() => setAbrir(null)} />}
    </section>
  )
}

function AssetRow({
  r, n, onUp, onDown, onOpen, onRemove, usedIn,
}: {
  r: Row; n: number; onUp?: () => void; onDown?: () => void; onOpen: () => void; onRemove: () => void; usedIn: Video[]
}) {
  const run = useRun()
  const [edit, setEdit] = useState(false)
  const [label, setLabel] = useState(r.label)
  const [note, setNote] = useState(r.note)
  const [url, setUrl] = useState(r.asset.external_url ?? '')
  const [kind, setKind] = useState<TipoMaterial>(r.asset.kind)
  const a = r.asset

  const guardar = async () => {
    await run(supabase.from('video_assets').update({ label, note }).eq('video_id', r.video_id).eq('asset_id', r.asset_id))
    const patch: Partial<Asset> = { kind }
    if (url !== (a.external_url ?? '')) {
      Object.assign(patch, { external_url: url.trim() || null, source: fuenteDe(url), link_status: 'sin_revisar' })
    }
    await run(supabase.from('assets').update(patch).eq('id', a.id), 'Toma actualizada')
    setEdit(false)
  }

  return (
    <li className={`asset${a.link_status === 'roto' ? ' broken' : ''}`}>
      <span className="asset-thumb" aria-hidden="true">
        <span>{ICONO[a.kind]}</span>
        <small>{pad2(n)}</small>
      </span>
      <div className="asset-body">
        {edit ? (
          <div className="form compact">
            <div className="row">
              <label className="grow">Nombre<input id={`as-l-${a.id}`} value={label} onChange={(e) => setLabel(e.target.value)} /></label>
              <label>Tipo
                <select id={`as-k-${a.id}`} value={kind} onChange={(e) => setKind(e.target.value as TipoMaterial)}>
                  {TIPOS_MATERIAL.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
            </div>
            <label>Nota<input id={`as-n-${a.id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="toma macro, aplicación labial, voz, repetir…" /></label>
            <label>Enlace<input id={`as-u-${a.id}`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://photos.app.goo.gl/…" /></label>
            <div className="row">
              <button className="btn btn-primary" onClick={guardar}>Guardar</button>
              <button className="btn btn-ghost" onClick={() => setEdit(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <p className="asset-title">{r.label || a.name || `Toma ${pad2(n)}`}</p>
            {r.note && <p className="asset-note">{r.note}</p>}
            <p className="asset-meta">
              <span>{FUENTE_LABEL[a.source]}</span>
              {a.link_status === 'roto' && <span className="pill tone-rojo">Enlace roto</span>}
              {a.link_status === 'ok' && <span className="pill tone-verde">Verificado</span>}
              {usedIn.length > 0 && (
                <span>
                  También en: {usedIn.map((v, i) => <span key={v.id}>{i > 0 && ', '}<Link to={`/videos/${v.id}#material`}>Video {pad2(v.number)}</Link></span>)}
                </span>
              )}
            </p>
          </>
        )}
      </div>
      {!edit && (
        <div className="asset-actions">
          <button className="btn btn-primary" onClick={onOpen} disabled={!a.external_url}>Abrir</button>
          <button className="icon-btn" onClick={onUp} disabled={!onUp} aria-label="Subir">↑</button>
          <button className="icon-btn" onClick={onDown} disabled={!onDown} aria-label="Bajar">↓</button>
          <button className="icon-btn" onClick={() => setEdit(true)} aria-label="Editar">✎</button>
          <button className="icon-btn" onClick={onRemove} aria-label="Quitar de este video" title="Quitar de este video">✕</button>
        </div>
      )}
    </li>
  )
}

function AbrirExterno({ r, onClose }: { r: Row; onClose: () => void }) {
  const run = useRun()
  const a = r.asset
  const marcar = async (s: 'ok' | 'roto') => {
    await run(supabase.from('assets').update({ link_status: s }).eq('id', a.id), s === 'ok' ? 'Marcado como verificado' : 'Marcado como roto')
    onClose()
  }
  return (
    <Modal title={r.label || a.name || 'Toma'} onClose={onClose}>
      <div className="form">
        <p>
          Este material está en <b>{FUENTE_LABEL[a.source]}</b>, fuera de Studio. Se abrirá en una pestaña nueva y solo se verá si tu
          cuenta tiene acceso al enlace o al álbum compartido.
        </p>
        {a.link_status === 'roto' && <p className="form-error">Alguien marcó este enlace como roto. Puedes reemplazarlo con ✎.</p>}
        <a className="btn btn-primary btn-block" href={a.external_url ?? '#'} target="_blank" rel="noopener noreferrer">Abrir en {FUENTE_LABEL[a.source]}</a>
        <p className="muted small">¿Se abrió bien?</p>
        <div className="row">
          <button className="btn btn-ghost" onClick={() => marcar('ok')}>Sí, funciona</button>
          <button className="btn btn-danger-ghost" onClick={() => marcar('roto')}>No abre / sin permiso</button>
        </div>
      </div>
    </Modal>
  )
}

function AgregarTomas({ video, startPos, existing, onClose }: { video: Video; startPos: number; existing: number; onClose: () => void }) {
  const run = useRun()
  const toast = useToast()
  const [texto, setTexto] = useState('')
  const [kind, setKind] = useState<TipoMaterial>('clip')
  const [prefijo, setPrefijo] = useState('Clip')
  const [busy, setBusy] = useState(false)

  const lineas = texto.split(/\s+/).map((l) => l.trim()).filter(Boolean)
  const validas = lineas.filter(isUrl)
  const invalidas = lineas.length - validas.length

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validas.length) return
    setBusy(true)
    const assets = validas.map((url, i) => ({
      source: fuenteDe(url),
      kind,
      name: `${prefijo} ${pad2(existing + i + 1)}`,
      external_url: url,
    }))
    const res = await run(supabase.from('assets').insert(assets).select('id'))
    if (res && res !== true) {
      const ids = (res as { id: string }[]).map((x) => x.id)
      const links = ids.map((asset_id, i) => ({
        video_id: video.id,
        asset_id,
        position: startPos + i,
        label: `${prefijo} ${pad2(existing + i + 1)}`,
      }))
      if (await run(supabase.from('video_assets').insert(links))) {
        toast(`${ids.length} toma${ids.length === 1 ? '' : 's'} vinculada${ids.length === 1 ? '' : 's'} a este video`)
        onClose()
      }
    }
    setBusy(false)
  }

  return (
    <Modal title="Agregar tomas" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Enlaces (uno por línea)
          <textarea
            id="at-links"
            rows={7}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'https://photos.app.goo.gl/abc123\nhttps://photos.app.goo.gl/def456\n…'}
          />
        </label>
        <div className="row">
          <label>Tipo
            <select id="at-tipo" value={kind} onChange={(e) => {
              const k = e.target.value as TipoMaterial
              setKind(k)
              setPrefijo(TIPOS_MATERIAL.find((t) => t.id === k)!.label)
            }}>
              {TIPOS_MATERIAL.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="grow">Nombre base<input id="at-prefijo" value={prefijo} onChange={(e) => setPrefijo(e.target.value)} /></label>
        </div>
        <p className="muted small">
          {validas.length > 0
            ? `Se agregarán ${validas.length}: ${prefijo} ${pad2(existing + 1)}${validas.length > 1 ? ` a ${prefijo} ${pad2(existing + validas.length)}` : ''}.`
            : 'En Google Fotos: abre la toma → Compartir → Crear enlace, y pégalo aquí. También sirve el enlace de un álbum compartido.'}
          {invalidas > 0 && <span className="form-error"> {invalidas} línea{invalidas > 1 ? 's' : ''} no es un enlace y se ignorará.</span>}
        </p>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy || !validas.length}>Vincular {validas.length || ''}</button>
        </div>
      </form>
    </Modal>
  )
}

function ReusarMaterial({ video, startPos, already, onClose }: { video: Video; startPos: number; already: string[]; onClose: () => void }) {
  const { videos } = useStudio()
  const run = useRun()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [sel, setSel] = useState<string[]>([])
  const otros = videos.filter((v) => v.client_id === video.client_id && v.id !== video.id)

  useEffect(() => {
    if (!otros.length) return setRows([])
    supabase
      .from('video_assets')
      .select('*, asset:assets(*)')
      .in('video_id', otros.map((v) => v.id))
      .order('position')
      .then(({ data }) => setRows(((data ?? []) as Row[]).filter((r) => r.asset && !already.includes(r.asset_id))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const unique = rows ? [...new Map(rows.map((r) => [r.asset_id, r])).values()] : []
  const submit = async () => {
    const links = sel.map((asset_id, i) => {
      const src = unique.find((r) => r.asset_id === asset_id)!
      return { video_id: video.id, asset_id, position: startPos + i, label: src.label, note: src.note }
    })
    if (await run(supabase.from('video_assets').insert(links), `${links.length} vinculada${links.length === 1 ? '' : 's'} sin duplicar`)) onClose()
  }

  return (
    <Modal title="Reusar material de otro video" onClose={onClose}>
      <div className="form">
        <p className="muted small">La misma toma queda vinculada a los dos videos, sin copiarla.</p>
        {rows === null ? <Spinner /> : unique.length === 0 ? <p>No hay otras tomas de este cliente para reusar.</p> : (
          <ul className="pick-list">
            {unique.map((r) => {
              const v = videos.find((x) => x.id === r.video_id)
              const on = sel.includes(r.asset_id)
              return (
                <li key={r.asset_id}>
                  <label className="check">
                    <input type="checkbox" checked={on} onChange={() => setSel((s) => (on ? s.filter((x) => x !== r.asset_id) : [...s, r.asset_id]))} />
                    {ICONO[r.asset.kind]} {r.label || r.asset.name} <span className="muted">· Video {pad2(v?.number ?? 0)} {v?.title}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!sel.length} onClick={submit}>Vincular {sel.length || ''}</button>
        </div>
      </div>
    </Modal>
  )
}
