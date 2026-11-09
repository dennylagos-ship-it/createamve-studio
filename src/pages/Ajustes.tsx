import { useState } from 'react'
import { useAuth } from '../lib/data'
import { supabase } from '../lib/supabase'
import { COLORES } from './Clientes'
import { AutoField, PageHeader, useRun } from '../components/ui'

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
        <label>Nombre<AutoField id="aj-nombre" value={profile.full_name} onSave={(v) => v.trim() && save({ full_name: v.trim() })} /></label>
        <p className="muted small">{profile.email} · {profile.role === 'admin' ? 'Administrador' : 'Miembro'}</p>
        <fieldset className="colors">
          <legend>Mi color</legend>
          {COLORES.map((c) => (
            <button type="button" key={c} className={c === profile.color ? 'on' : ''} style={{ background: c }} onClick={() => save({ color: c })} aria-label={`Color ${c}`} />
          ))}
        </fieldset>
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
    </>
  )
}
