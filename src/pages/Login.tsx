import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Brand, Credito } from '../components/Layout'
import { traducirError } from '../components/ui'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    let error: { message: string } | null = null
    if (mode === 'login') {
      ;({ error } = await supabase.auth.signInWithPassword({ email, password }))
    } else if (mode === 'signup') {
      const res = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
      })
      error = res.error
      if (!error && !res.data.session) setMsg({ kind: 'ok', text: 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve aquí.' })
    } else {
      ;({ error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/ajustes` }))
      if (!error) setMsg({ kind: 'ok', text: 'Si el correo existe, te llegará un enlace para crear una nueva contraseña.' })
    }
    if (error) setMsg({ kind: 'error', text: traducirError(error.message) })
    setBusy(false)
  }

  return (
    <div className="fullscreen">
      <form className="auth-card" onSubmit={submit}>
        <Brand />
        <h1>{mode === 'login' ? 'Entrar a Studio' : mode === 'signup' ? 'Crear cuenta' : 'Recuperar contraseña'}</h1>
        <p className="muted">Centro de producción audiovisual de Createamve.</p>
        {mode === 'signup' && (
          <label>
            Nombre
            <input id="login-nombre" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </label>
        )}
        <label>
          Correo
          <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        {mode !== 'reset' && (
          <label>
            Contraseña
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
        )}
        {msg && <p className={msg.kind === 'error' ? 'form-error' : 'form-ok'}>{msg.text}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
        </button>
        <div className="auth-links">
          {mode !== 'login' && <button type="button" className="link" onClick={() => setMode('login')}>Ya tengo cuenta</button>}
          {mode !== 'signup' && <button type="button" className="link" onClick={() => setMode('signup')}>Crear cuenta</button>}
          {mode !== 'reset' && <button type="button" className="link" onClick={() => setMode('reset')}>Olvidé mi contraseña</button>}
        </div>
        <Credito />
      </form>
    </div>
  )
}
