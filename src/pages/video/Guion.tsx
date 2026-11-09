import { useState } from 'react'
import { updateVideo } from '../../lib/actions'
import { AutoField, useRun, useToast } from '../../components/ui'
import type { Video } from '../../lib/types'

export default function Guion({ video }: { video: Video }) {
  const run = useRun()
  const toast = useToast()
  const [lectura, setLectura] = useState(false)
  const [size, setSize] = useState(26)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(video.script)
      toast('Guion copiado')
    } catch {
      toast('No se pudo copiar. Mantén presionado el texto para copiarlo.', 'error')
    }
  }

  return (
    <div className="detail-grid">
      <section className="panel form script">
        <div className="panel-head">
          <h3>Guion</h3>
          <div className="row">
            <button className="btn btn-ghost" onClick={copiar} disabled={!video.script}>Copiar</button>
            <button className="btn btn-primary" onClick={() => setLectura(true)} disabled={!video.script}>Modo grabación</button>
          </div>
        </div>
        <AutoField
          id="v-guion"
          multiline
          rows={18}
          className="script-area"
          value={video.script}
          placeholder={'HOOK (0-3 s)\n…\n\nDESARROLLO\n…\n\nCIERRE / CTA\n…'}
          onSave={(v) => run(updateVideo(video.id, { script: v }))}
        />
      </section>
      <aside className="panel form side">
        <h3>Shot list</h3>
        <p className="muted small">Una toma por línea. Ej.: “Producto completo”, “Macro del labio”.</p>
        <AutoField
          id="v-shots"
          multiline
          rows={12}
          value={video.shot_list}
          placeholder={'Producto completo sobre mesa\nAplicación en labios\nMacro del labio\nPrueba con agua'}
          onSave={(v) => run(updateVideo(video.id, { shot_list: v }))}
        />
      </aside>

      {lectura && (
        <div className="reader" role="dialog" aria-label="Guion en modo grabación">
          <div className="reader-bar">
            <b>{video.title}</b>
            <span className="row">
              <button className="btn btn-ghost" onClick={() => setSize((s) => Math.max(16, s - 4))} aria-label="Letra más pequeña">A−</button>
              <button className="btn btn-ghost" onClick={() => setSize((s) => Math.min(56, s + 4))} aria-label="Letra más grande">A+</button>
              <button className="btn btn-primary" onClick={() => setLectura(false)}>Cerrar</button>
            </span>
          </div>
          <div className="reader-text" style={{ fontSize: size }}>{video.script}</div>
          {video.shot_list && (
            <div className="reader-shots">
              <h4>Tomas</h4>
              <ol>{video.shot_list.split('\n').filter((l) => l.trim()).map((l, i) => <li key={i}>{l}</li>)}</ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
