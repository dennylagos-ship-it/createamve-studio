import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, StudioProvider, useAuth, useStudio } from './lib/data'
import { isConfigured, isDemo, supabase } from './lib/supabase'
import { resetDemo } from './lib/mock'

// En la vista previa (dentro de un marco) no hay rutas reales: se navega en memoria.
const Router = isDemo ? MemoryRouter : BrowserRouter
import { Spinner, ToastProvider } from './components/ui'
import Layout, { Brand } from './components/Layout'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import Clientes from './pages/Clientes'
import ClienteDetalle from './pages/ClienteDetalle'
import Produccion from './pages/Produccion'
import VideoDetalle from './pages/VideoDetalle'
import Ideas from './pages/Ideas'
import Calendario from './pages/Calendario'
import Equipo from './pages/Equipo'
import Ajustes from './pages/Ajustes'

export default function App() {
  if (!isConfigured) return <SinConfigurar />
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          {isDemo && <DemoBanner />}
          <Gate />
        </Router>
      </AuthProvider>
    </ToastProvider>
  )
}

function Gate() {
  const { session, profile, loading } = useAuth()
  if (loading) return <FullScreen><Spinner /></FullScreen>
  if (!session) return <Login />
  if (!profile) return <FullScreen><Spinner /></FullScreen>
  if (!profile.active) return <Pendiente />
  return (
    <StudioProvider>
      <Ready>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/:id" element={<ClienteDetalle />} />
            <Route path="produccion" element={<Produccion />} />
            <Route path="videos/:id" element={<VideoDetalle />} />
            <Route path="ideas" element={<Ideas />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="equipo" element={<Equipo />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Ready>
    </StudioProvider>
  )
}

function Ready({ children }: { children: React.ReactNode }) {
  const { ready } = useStudio()
  if (!ready) return <FullScreen><Spinner /></FullScreen>
  return <>{children}</>
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="fullscreen">{children}</div>
}

function Pendiente() {
  const { profile, refreshProfile } = useAuth()
  return (
    <FullScreen>
      <div className="auth-card">
        <Brand />
        <h1>Tu cuenta espera aprobación</h1>
        <p>
          Entraste como <b>{profile?.email}</b>, pero aún no formas parte del equipo. Pide a un administrador que te
          active desde <b>Equipo</b> o que te invite con este correo.
        </p>
        <div className="row">
          <button className="btn btn-primary" onClick={refreshProfile}>Ya me activaron</button>
          <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
        </div>
      </div>
    </FullScreen>
  )
}

function SinConfigurar() {
  return (
    <div className="fullscreen">
      <div className="auth-card">
        <Brand />
        <h1>Falta conectar la base de datos</h1>
        <p>
          Crea el archivo <code>.env.local</code> con <code>VITE_SUPABASE_URL</code> y{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> (ver <code>.env.example</code> y el README) y vuelve a iniciar la app.
        </p>
      </div>
    </div>
  )
}

function DemoBanner() {
  return (
    <div className="banner demo">
      Vista previa con datos de ejemplo. Los cambios se guardan solo en este navegador.{' '}
      <button className="link" onClick={() => resetDemo()}>Restablecer ejemplo</button>
    </div>
  )
}
