import { useEffect, useState } from 'react'
import { useAuth } from '../lib/data'
import { isDemo, supabase } from '../lib/supabase'
import { feedUrl, getOrCreateFeedToken } from '../lib/gcal'
import { Credito } from '../components/Layout'
import { AutoField, Avatar, ConfirmButton, PageHeader, SelectorColor, useRun, useToast } from '../components/ui'
import { fotoAMiniatura } from '../lib/imagen'

export default function Ajustes() {
  const { profile, refreshProfile } = useAuth()
  const run = useRun()
  const [pass, setPass] = useState('')
  if (!profile) return null

  const save = async (patch: Record<string, unknown>) => {
    await run(supabase.from('profiles').update(patch).eq('id', profile.id))
    refreshProfile()
  }

  return (
    <>
      <PageHeader title="Ajustes" />
      <section className="panel form">
        <h3>Mi perfil</h3>
        <FotoPerfil onSave={save} />
        <label>Nombre<AutoField id="aj-nombre" value={profile.full_name} onSave={(v) => v.trim() && save({ full_name: v.trim() })} /></label>
        <p className="muted small">{profile.email} · {profile.role === 'admin' ? 'Administrador' : 'Miembro'}</p>
        <SelectorColor legend="Mi color" value={profile.color} onChange={(color) => save({ color })} />
        <form
          className="row wrap"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await run(supabase.auth.updateUser({ password: pass }), 'Contraseña actualizada')) setPass('')
          }}
        >
          <label className="grow">Nueva contraseña<input id="aj-pass" type="password" minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" /></label>
          <button className="btn btn-ghost" disabled={pass.length < 6}>Cambiar contraseña</button>
        </form>
        <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </section>

      <GoogleCalendar />

      <section className="panel">
        <h3>Instalar en el teléfono o la tablet</h3>
        <ul className="small perms">
          <li><b>iPhone / iPad:</b> abre Studio en Safari → botón Compartir → “Agregar a pantalla de inicio”.</li>
          <li><b>Android / PC con Chrome:</b> menú ⋮ → “Instalar aplicación”.</li>
        </ul>
      </section>

      <section className="panel">
        <h3>Google Fotos</h3>
        <p className="small">
          Por ahora cada toma se vincula con su enlace compartido de Google Fotos (o el de un álbum compartido) desde la pestaña
          <b> Material bruto</b> de cada video. Para que todo el equipo pueda abrirlas, el álbum o enlace debe estar compartido con
          sus cuentas.
        </p>
        <p className="small muted">
          El selector oficial de Google Fotos llegará en una etapa posterior, después de una prueba técnica: Google entrega
          enlaces temporales (unos 60 minutos) y hay que confirmar qué se puede reabrir días después y desde otra cuenta.
        </p>
      </section>
      <Credito />
    </>
  )
}

function GoogleCalendar() {
  const toast = useToast()
  const [token, setToken] = useState<string | null>(null)
  const [soloMios, setSoloMios] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getOrCreateFeedToken().then((t) => (t ? setToken(t) : setError(!isDemo)))
  }, [])

  const url = token ? feedUrl(token, soloMios) : ''
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast('Enlace copiado')
    } catch {
      toast('No se pudo copiar. Selecciona el enlace y cópialo a mano.', 'error')
    }
  }

  return (
    <section className="panel form">
      <h3>Google Calendar</h3>
      <p className="small">
        Suscríbete una vez y las grabaciones, ediciones y entregas de Studio aparecen solas en tu Google Calendar, también
        en el teléfono. Si alguien cambia una fecha en Studio, el calendario se actualiza en la siguiente sincronización de
        Google (suele tardar unas horas).
      </p>
      {isDemo ? (
        <p className="muted small">En la vista previa no hay enlace: se activa cuando la app esté conectada a la base de datos.</p>
      ) : error ? (
        <p className="form-error">No se pudo crear tu enlace de calendario. Recarga la página e inténtalo de nuevo.</p>
      ) : token ? (
        <>
          <div className="segmented">
            <button className={soloMios ? 'on' : ''} onClick={() => setSoloMios(true)}>Solo lo mío</button>
            <button className={!soloMios ? 'on' : ''} onClick={() => setSoloMios(false)}>Todo el equipo</button>
          </div>
          <div className="feed-url">
            <input id="aj-feed" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Enlace de suscripción" />
            <button className="btn btn-primary" onClick={copiar}>Copiar enlace</button>
          </div>
          <ol className="steps small">
            <li>Copia el enlace.</li>
            <li>En una computadora, abre <a href="https://calendar.google.com/calendar/r/settings/addbyurl" target="_blank" rel="noopener noreferrer">Google Calendar → Agregar calendario → Desde URL</a>.</li>
            <li>Pega el enlace y toca <b>Agregar calendario</b>. Aparecerá como “CREATEAMVE Studio” en todos tus dispositivos.</li>
          </ol>
          <p className="muted small">El enlace es personal. Si lo compartiste por error, genera uno nuevo y el anterior dejará de funcionar.</p>
          <ConfirmButton
            className="btn btn-ghost"
            label="Generar enlace nuevo"
            confirmLabel="El enlace actual dejará de funcionar. Toca otra vez"
            onConfirm={async () => {
              const t = await getOrCreateFeedToken(true)
              if (t) {
                setToken(t)
                toast('Enlace nuevo generado. Vuelve a suscribirte en Google Calendar.')
              }
            }}
          />
        </>
      ) : null}
      <p className="muted small">
        Para un evento suelto, cada fecha de un video y del Calendario tiene un botón “+ Google Calendar”.
      </p>
    </section>
  )
}

function FotoPerfil({ onSave }: { onSave: (patch: Record<string, unknown>) => Promise<void> }) {
  const { profile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!profile) return null
  const elegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      await onSave({ avatar_url: await fotoAMiniatura(file, 200) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la foto')
    }
    setBusy(false)
  }
  return (
    <div className="foto-perfil">
      <label className="foto-pick" title="Cambiar foto">
        <Avatar profile={profile} size={72} />
        <input id="aj-foto" type="file" accept="image/*" onChange={elegir} disabled={busy} hidden />
        <span className="foto-btn">{busy ? 'Cargando…' : profile.avatar_url ? 'Cambiar foto' : 'Subir mi foto'}</span>
      </label>
      {profile.avatar_url && !busy && (
        <button type="button" className="link" onClick={() => onSave({ avatar_url: null })}>Quitar foto (usar iniciales)</button>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
