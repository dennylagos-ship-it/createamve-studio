import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth, useStudio } from '../lib/data'
import { Avatar } from './ui'

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
      <img src={`${import.meta.env.BASE_URL}frontino.webp`} alt="" width={22} height={22} />
      <span>
        © {new Date().getFullYear()} Createamve · Desarrollado por <b>Frontino Software Solutions</b>
      </span>
    </p>
  )
}

export function Brand() {
  return (
    <span className="brand">
      <img src="/logo-negativo.webp" alt="" width={40} height={40} />
      <span>
        <b>CREATEAMVE</b>
        <i>Studio</i>
      </span>
    </span>
  )
}

export default function Layout() {
  const { profile } = useAuth()
  const { online, error } = useStudio()
  const [q, setQ] = useState('')
  const [more, setMore] = useState(false)
  const nav = useNavigate()

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    nav(`/produccion?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <nav>
          {NAV.map(({ to, label, icon: I, end }) => (
            <NavLink key={to} to={to} end={end}>
              <I /> {label}
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

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Navegación principal">
        {NAV.slice(0, 4).map(({ to, label, icon: I, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setMore(false)}>
            <I />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className={more ? 'active' : ''} onClick={() => setMore((m) => !m)} aria-expanded={more}>
          <IconMore />
          <span>Más</span>
        </button>
        {more && (
          <div className="more-sheet" onClick={() => setMore(false)}>
            <NavLink to="/calendario"><IconCal /> Calendario</NavLink>
            <NavLink to="/equipo"><IconTeam /> Equipo</NavLink>
            <NavLink to="/ajustes"><IconGear /> Ajustes</NavLink>
          </div>
        )}
      </nav>
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
function IconMore() { return <Svg d="M5 12h.01M12 12h.01M19 12h.01" /> }
