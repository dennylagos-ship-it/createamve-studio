import { useEffect, useState } from 'react'
import { useAuth, useStudio } from '../lib/data'
import { supabase } from '../lib/supabase'
import { PENDIENTE_POR_ROL } from '../lib/status'
import { Avatar, ConfirmButton, PageHeader, useRun } from '../components/ui'
import type { Invite, Rol } from '../lib/types'

export default function Equipo() {
  const { profiles, videos, assignments } = useStudio()
  const { profile } = useAuth()
  const run = useRun()
  const isAdmin = profile?.role === 'admin'
  const [invites, setInvites] = useState<Invite[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Rol>('miembro')

  const loadInvites = () => {
    if (isAdmin) supabase.from('team_invites').select('*').order('created_at').then(({ data }) => setInvites((data ?? []) as Invite[]))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadInvites, [isAdmin])

  const pendientes = (uid: string) =>
    videos.filter((v) => assignments.some((a) => a.video_id === v.id && a.user_id === uid && PENDIENTE_POR_ROL[a.kind].includes(v.status))).length

  const activos = profiles.filter((p) => p.active)
  const solicitudes = profiles.filter((p) => !p.active)

  return (
    <>
      <PageHeader title="Equipo" subtitle={`${activos.length} persona${activos.length === 1 ? '' : 's'} en el equipo`} />
      <section className="panel">
        <ul className="team">
          {activos.map((p) => (
            <li key={p.id}>
              <Avatar profile={p} size={40} />
              <div className="grow">
                <b>{p.full_name}</b> {p.id === profile?.id && <span className="muted">(tú)</span>}
                <p className="muted small">{p.email} · {pendientes(p.id)} pendiente{pendientes(p.id) === 1 ? '' : 's'}</p>
              </div>
              {isAdmin && p.id !== profile?.id ? (
                <>
                  <select value={p.role} onChange={(e) => run(supabase.from('profiles').update({ role: e.target.value }).eq('id', p.id), 'Rol actualizado')} aria-label={`Rol de ${p.full_name}`}>
                    <option value="admin">Administrador</option>
                    <option value="miembro">Miembro</option>
                  </select>
                  <ConfirmButton label="Desactivar" onConfirm={() => run(supabase.from('profiles').update({ active: false }).eq('id', p.id), 'Cuenta desactivada')} />
                </>
              ) : (
                <span className="pill">{p.role === 'admin' ? 'Administrador' : 'Miembro'}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && (
        <>
          {solicitudes.length > 0 && (
            <section className="panel">
              <h3>Esperando aprobación</h3>
              <ul className="team">
                {solicitudes.map((p) => (
                  <li key={p.id}>
                    <Avatar profile={p} size={40} />
                    <div className="grow"><b>{p.full_name}</b><p className="muted small">{p.email}</p></div>
                    <button className="btn btn-primary" onClick={() => run(supabase.from('profiles').update({ active: true }).eq('id', p.id), `${p.full_name} ya es parte del equipo`)}>Aprobar</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel">
            <h3>Invitar a alguien</h3>
            <p className="muted small">
              Agrega su correo. Cuando cree su cuenta en Studio con ese correo, entrará directo al equipo. Comparte con esa persona el enlace de la app.
            </p>
            <form
              className="form row wrap"
              onSubmit={async (e) => {
                e.preventDefault()
                if (await run(supabase.from('team_invites').insert({ email: email.trim().toLowerCase(), full_name: name.trim() || null, role }), 'Invitación guardada')) {
                  setEmail('')
                  setName('')
                  loadInvites()
                }
              }}
            >
              <label className="grow">Correo<input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="grow">Nombre<input id="inv-nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Anahí" /></label>
              <label>Rol
                <select id="inv-rol" value={role} onChange={(e) => setRole(e.target.value as Rol)}>
                  <option value="miembro">Miembro</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              <button className="btn btn-primary">Invitar</button>
            </form>
            {invites.length > 0 && (
              <ul className="team">
                {invites.map((i) => (
                  <li key={i.email}>
                    <div className="grow"><b>{i.full_name || i.email}</b><p className="muted small">{i.email} · aún no crea su cuenta</p></div>
                    <button className="btn btn-ghost" onClick={async () => { await run(supabase.from('team_invites').delete().eq('email', i.email)); loadInvites() }}>Cancelar</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      <section className="panel">
        <h3>Permisos</h3>
        <ul className="small perms">
          <li><b>Miembros:</b> ven todo, crean y editan videos, guiones, ideas, material, estados y entregas.</li>
          <li><b>Administradores:</b> además gestionan el equipo y pueden eliminar clientes, lotes y videos.</li>
        </ul>
      </section>
    </>
  )
}
