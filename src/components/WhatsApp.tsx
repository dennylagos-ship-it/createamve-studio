import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PLANTILLAS, numeroValido, waLink } from '../lib/whatsapp'
import { supabase } from '../lib/supabase'
import { Modal, useRun } from './ui'
import type { Client, Video } from '../lib/types'

/** Botón "WhatsApp" que abre un mensaje preparado para el cliente. */
export function WhatsAppButton({ client, video, className = 'btn btn-wa' }: { client: Client; video?: Video; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <WaIcon /> WhatsApp
      </button>
      {open && <WhatsAppModal client={client} video={video} onClose={() => setOpen(false)} />}
    </>
  )
}

function WhatsAppModal({ client, video, onClose }: { client: Client; video?: Video; onClose: () => void }) {
  const run = useRun()
  const opciones = PLANTILLAS.filter((p) => (video ? p.disponible?.(video) ?? true : p.id === 'libre'))
  const [plantilla, setPlantilla] = useState(opciones[0]?.id ?? 'libre')
  const [texto, setTexto] = useState(() => (opciones[0] ?? PLANTILLAS[PLANTILLAS.length - 1]).texto(client, video))
  const [registrar, setRegistrar] = useState(!!video)
  const tieneNumero = numeroValido(client.whatsapp)

  const elegir = (id: string) => {
    setPlantilla(id)
    setTexto(PLANTILLAS.find((p) => p.id === id)!.texto(client, video))
  }

  const alAbrir = () => {
    if (registrar && video) {
      const nombre = PLANTILLAS.find((p) => p.id === plantilla)?.label ?? 'Mensaje'
      run(supabase.from('comments').insert({ video_id: video.id, body: `📱 WhatsApp al cliente (${nombre.toLowerCase()}):\n${texto}` }))
    }
    onClose()
  }

  return (
    <Modal title={`WhatsApp a ${client.name}`} onClose={onClose}>
      {!tieneNumero ? (
        <div className="form">
          <p>Este cliente aún no tiene número de WhatsApp.</p>
          <p className="muted small">Agrégalo en la ficha del cliente → <b>Ficha creativa</b> → WhatsApp, con código de país (ej. +58 414 1234567).</p>
          <Link className="btn btn-primary" to={`/clientes/${client.id}#ficha`} onClick={onClose}>Ir a la ficha del cliente</Link>
        </div>
      ) : (
        <div className="form">
          {opciones.length > 1 && (
            <div className="chips">
              {opciones.map((p) => (
                <button key={p.id} type="button" className={`chip plain${plantilla === p.id ? ' on' : ''}`} onClick={() => elegir(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <label>
            Mensaje (puedes editarlo antes de enviar)
            <textarea id="wa-texto" rows={9} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
          {video && (
            <label className="check">
              <input id="wa-registrar" type="checkbox" checked={registrar} onChange={(e) => setRegistrar(e.target.checked)} />
              Guardar este mensaje en los comentarios del video
            </label>
          )}
          <p className="muted small">Se abre WhatsApp con el mensaje listo para {client.whatsapp}. El envío lo confirmas tú en WhatsApp.</p>
          <a className="btn btn-wa btn-block" href={waLink(client.whatsapp, texto)} target="_blank" rel="noopener noreferrer" onClick={alAbrir}>
            <WaIcon /> Abrir WhatsApp
          </a>
        </div>
      )}
    </Modal>
  )
}

export function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2m0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2m4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3" />
    </svg>
  )
}
