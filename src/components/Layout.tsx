import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useStudio } from '../lib/data'
import { Avatar } from './ui'
import { fmtHora, fmtPublicacion, useAvisosPublicacion } from '../lib/publicacion'

const NAV = [
  { to: '/', label: 'Inicio', icon: IconHome, end: true },
  { to: '/clientes', label: 'Clientes', icon: IconUsers },
  { to: '/produccion', label: 'Producción', icon: IconPlay },
  { to: '/ideas', label: 'Ideas', icon: IconBulb },
  { to: '/calendario', label: 'Calendario', icon: IconCal },
  { to: '/equipo', label: 'Equipo', icon: IconTeam },
]

/** Crédito del desarrollador. */
export function Credito() {
  return (
    <p className="credito">
      <img src={`${import.meta.env.BASE_URL}frontino.webp`} alt="" width={26} height={26} />
      <span>
        © {new Date().getFullYear()} Createamve · Desarrollado por <b>Frontino Software Solutions</b>
      </span>
    </p>
  )
}

export function Brand() {
  return (
    <span className="brand">
      <img src="/logo-negativo.webp" alt="" width={48} height={48} />
      <span>
        <b>CREATEAMVE</b>
        <i>Studio</i>
      </span>
    </span>
  )
}

export default function Layout() {
  const { profile } = useAuth()
  const { online, error, clientById } = useStudio()
  const avisos = useAvisosPublicacion()
  const atrasadas = avisos.filter((a) => a.estado === 'atrasada').length

  // Número en el ícono de la app instalada (si el dispositivo lo permite).
  useEffect(() => {
    const n = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    try {
      if (avisos.length > 0) n.setAppBadge?.(avisos.length)?.catch(() => {})
      else n.clearAppBadge?.()?.catch(() => {})
    } catch {
      /* no soportado */
    }
  }, [avisos.length])
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  const nav = useNavigate()
  const { pathname } = useLocation()

  // El menú lateral del celular se cierra al cambiar de pantalla o con Escape.
  useEffect(() => setMenu(false), [pathname])
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('keydown', onKey)
    document.body.classList.add('menu-abierto')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('menu-abierto')
    }
  }, [menu])

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    nav(`/produccion?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="shell">
      <aside id="menu-lateral" className={`sidebar${menu ? ' open' : ''}`} aria-label="Menú">
        <div className="sidebar-head">
          <Brand />
          <button className="icon-btn menu-close" onClick={() => setMenu(false)} aria-label="Cerrar menú">
            <IconClose />
          </button>
        </div>
        <nav>
          {NAV.map(({ to, label, icon: I, end }) => (
            <NavLink key={to} to={to} end={end}>
              <I /> {label}
              {to === '/calendario' && avisos.length > 0 && (
                <span className={`nav-badge${atrasadas ? ' late' : ''}`} aria-label={`${avisos.length} publicaciones pendientes`}>
                  {avisos.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/ajustes" className="sidebar-foot">
          <IconGear /> Ajustes
        </NavLink>
        <Credito />
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMenu(true)} aria-label="Abrir menú" aria-expanded={menu} aria-controls="menu-lateral">
            <IconMenu />
            {avisos.length > 0 && <span className={`menu-dot${atrasadas ? ' late' : ''}`} aria-hidden="true" />}
          </button>
          <span className="mobile-brand">
            <Brand />
          </span>
          <form className="search" onSubmit={search} role="search">
            <IconSearch />
            <input
              id="busqueda-global"
              type="search"
              placeholder="Buscar video, guion, cliente…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          <NavLink to="/ajustes" className="me" aria-label="Mi cuenta">
            <Avatar profile={profile ?? undefined} size={34} />
            <span className="me-name">{profile?.full_name}</span>
          </NavLink>
        </header>

        {!online && <div className="banner warn">Sin conexión. Ves la última información cargada; los cambios no se guardarán hasta reconectar.</div>}
        {online && error && <div className="banner error">No se pudo sincronizar: {error}</div>}

        {avisos.length > 0 && (
          <div className={`banner publicar${atrasadas ? ' late' : ''}`} role="status">
            <span className="publicar-titulo">
              🔔 {avisos.length === 1 ? 'Publicación pendiente' : `${avisos.length} publicaciones pendientes`}
            </span>
            <ul>
              {avisos.slice(0, 3).map(({ video: v, estado }) => (
                <li key={v.id}>
                  <Link to={`/videos/${v.id}`}>
                    {estado === 'atrasada' ? (
                      <b className="late">Atrasada ({fmtPublicacion(v.publish_at!)})</b>
                    ) : (
                      <b>Hoy a las {fmtHora(v.publish_at!)}</b>
                    )}{' '}
                    {clientById(v.client_id)?.name} · {v.title}
                  </Link>
                </li>
              ))}
              {avisos.length > 3 && (
                <li>
                  <Link to="/calendario">y {avisos.length - 3} más en el calendario →</Link>
                </li>
              )}
            </ul>
          </div>
        )}

        <main className="content">
          <Outlet />
        </main>
      </div>

      {menu && <div className="drawer-backdrop" onClick={() => setMenu(false)} aria-hidden="true" />}
    </div>
  )
}

/* Íconos de trazo simple, heredan el color del texto. */
function Svg({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
function IconHome() { return <Svg d="M3 11 12 4l9 7v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> }
function IconUsers() { return <Svg d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8" /> }
function IconPlay() { return <Svg d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM10 8.5v7l6-3.5z" /> }
function IconBulb() { return <Svg d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3" /> }
function IconCal() { return <Svg d="M4 5h16v15H4zM4 10h16M9 3v4M15 3v4" /> }
function IconTeam() { return <Svg d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /> }
function IconGear() { return <Svg d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1" /> }
function IconSearch() { return <Svg d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M21 21l-4.3-4.3" /> }
function IconMenu() { return <Svg d="M4 6h16M4 12h16M4 18h16" /> }
function IconClose() { return <Svg d="M6 6l12 12M18 6 6 18" /> }
