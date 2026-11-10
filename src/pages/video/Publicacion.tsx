import { useState } from 'react'
import { updateVideo } from '../../lib/actions'
import { useStudio } from '../../lib/data'
import { fmtDateTime, isUrl, pad2 } from '../../lib/format'
import { gcalLink } from '../../lib/gcal'
import { PUBLICACION_INFO, estadoPublicacion, toLocalInput, useAhora } from '../../lib/publicacion'
import { ConfirmButton, useRun } from '../../components/ui'
import type { Video } from '../../lib/types'

/** Opción "Nosotros lo publicamos": fecha y hora, aviso y cierre con "Publicado". */
export default function Publicacion({ video }: { video: Video }) {
  const { clientById } = useStudio()
  const run = useRun()
  const ahora = useAhora()
  const [enlace, setEnlace] = useState('')
  const estado = estadoPublicacion(video, ahora)
  const info = estado ? PUBLICACION_INFO[estado] : null
  const save = (patch: Partial<Video>, ok?: string) => run(updateVideo(video.id, patch), ok)
  const cliente = clientById(video.client_id)?.name ?? ''
  const enlaceMalo = enlace.trim() !== '' && !isUrl(enlace)

  return (
    <div className="publicacion">
      <label className="check">
        <input
          id="v-publica-agencia"
          type="checkbox"
          checked={video.publish_by_us}
          onChange={(e) => save({ publish_by_us: e.target.checked })}
        />
        Nosotros lo publicamos
      </label>

      {video.publish_by_us && (
        <>
          {info && <span className={`pill tone-${info.tone}`}>{info.label}</span>}

          {!video.published_at && (
            <>
              <label>
                Fecha y hora de publicación
                <input
                  id="v-publish_at"
                  type="datetime-local"
                  value={toLocalInput(video.publish_at)}
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v) return save({ publish_at: null })
                    const d = new Date(v)
                    if (!Number.isNaN(d.getTime())) save({ publish_at: d.toISOString() })
                  }}
                />
              </label>
              {video.publish_at && (
                <a
                  className="gcal"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={gcalLink({
                    title: `Publicar · ${cliente} · ${video.title}`,
                    date: video.publish_at,
                    start: video.publish_at,
                    details: `Video ${pad2(video.number)}`,
                  })}
                >
                  + Google Calendar
                </a>
              )}

              <form
                className="publicar-form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (enlaceMalo) return
                  const ok = await save(
                    { published_at: new Date().toISOString(), published_url: enlace.trim() || null },
                    'Marcado como publicado',
                  )
                  if (ok) setEnlace('')
                }}
              >
                <label>
                  Enlace del post (opcional)
                  <input
                    id="v-published_url"
                    type="url"
                    inputMode="url"
                    placeholder="https://www.instagram.com/reel/…"
                    value={enlace}
                    onChange={(e) => setEnlace(e.target.value)}
                  />
                </label>
                {enlaceMalo && <span className="small error-text">Pega un enlace completo (https://…).</span>}
                <button className="btn btn-primary" disabled={enlaceMalo}>✓ Marcar “Publicado”</button>
              </form>
            </>
          )}

          {video.published_at && (
            <div className="publicado">
              <p className="small">Publicado el {fmtDateTime(video.published_at)}.</p>
              {video.published_url ? (
                <a href={video.published_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                  Ver el post ↗
                </a>
              ) : (
                <EnlaceTardio onSave={(url) => save({ published_url: url }, 'Enlace guardado')} />
              )}
              <ConfirmButton
                className="btn btn-ghost small"
                label="Deshacer “Publicado”"
                confirmLabel="Vuelve a quedar pendiente. Toca otra vez"
                onConfirm={() => save({ published_at: null, published_url: null })}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Para guardar el enlace del post si al marcarlo todavía no se tenía. */
function EnlaceTardio({ onSave }: { onSave: (url: string) => void }) {
  const [url, setUrl] = useState('')
  const valido = isUrl(url)
  return (
    <form
      className="quick-add"
      onSubmit={(e) => {
        e.preventDefault()
        if (valido) onSave(url.trim())
      }}
    >
      <input id="v-published_url_tarde" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enlace del post" aria-label="Enlace del post" />
      <button className="btn btn-ghost" disabled={!valido}>Guardar</button>
    </form>
  )
}
