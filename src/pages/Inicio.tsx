import { Link } from 'react-router-dom'
import { useAuth, useStudio } from '../lib/data'
import { PENDIENTE_POR_ROL, estadoInfo } from '../lib/status'
import { addDays, fmtDay, parseDay, today, toDay } from '../lib/format'
import { Empty, VideoCard } from '../components/ui'
import type { EstadoVideo, Video } from '../lib/types'

const COLUMNAS: { label: string; estados: EstadoVideo[]; tone: string }[] = [
  { label: 'Por grabar', estados: ['idea', 'por_grabar'], tone: 'rojo' },
  { label: 'Grabado', estados: ['grabado'], tone: 'amarillo' },
  { label: 'En edición', estados: ['en_edicion', 'en_correcciones'], tone: 'azul' },
  { label: 'Por entregar', estados: ['editado'], tone: 'cian' },
]

export default function Inicio() {
  const { profile } = useAuth()
  const { videos, assignments, clients } = useStudio()
  const hoy = today()
  const activos = videos.filter((v) => v.status !== 'entregado' && !clients.find((c) => c.id === v.client_id)?.archived)
  const entregadosSemana = videos.filter((v) => v.status === 'entregado' && v.updated_at.slice(0, 10) >= toDay(addDays(new Date(), -7)))

  const mios = activos.filter((v) =>
    assignments.some((a) => a.video_id === v.id && a.user_id === profile?.id && PENDIENTE_POR_ROL[a.kind].includes(v.status)),
  )

  const grabarHoy = activos.filter((v) => v.record_date === hoy && ['idea', 'por_grabar'].includes(v.status))
  const limite = toDay(addDays(new Date(), 7))
  const proximas = activos
    .flatMap((v) => [
      v.record_date && ['idea', 'por_grabar'].includes(v.status) ? { v, d: v.record_date, k: 'Grabación' } : null,
      v.edit_date && ['grabado', 'en_edicion'].includes(v.status) ? { v, d: v.edit_date, k: 'Edición' } : null,
      v.due_date ? { v, d: v.due_date, k: 'Entrega' } : null,
    ])
    .filter((x): x is { v: Video; d: string; k: string } => !!x && x.d <= limite)
    .sort((a, b) => a.d.localeCompare(b.d))
    .slice(0, 8)

  const count = (estados: EstadoVideo[]) => activos.filter((v) => estados.includes(v.status)).length

  return (
    <>

      <section className="stats">
        <Stat label="Videos en producción" value={activos.length} tone="violeta" to="/produccion" />
        <Stat label="Por grabar" value={count(['idea', 'por_grabar'])} tone="rojo" to="/produccion?estado=por_grabar" />
        <Stat label="En edición" value={count(['en_edicion', 'en_correcciones'])} tone="azul" to="/produccion?estado=en_edicion" />
        <Stat label="Entregados (7 días)" value={entregadosSemana.length} tone="verde" to="/produccion?estado=entregado" />
      </section>

      <div className="grid-2">
        <section className="panel">
          <header className="panel-head">
            <h2>Mis pendientes</h2>
            <Link to="/produccion?mios=1" className="see-all">Ver todos →</Link>
          </header>
          {mios.length === 0 ? (
            <Empty title="Nada pendiente para ti">Cuando te asignen grabación o edición, aparecerá aquí.</Empty>
          ) : (
            <div className="card-list">{mios.slice(0, 6).map((v) => <VideoCard key={v.id} video={v} />)}</div>
          )}
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2>Próximos 7 días</h2>
            <Link to="/calendario" className="see-all">Calendario →</Link>
          </header>
          {grabarHoy.length > 0 && <p className="today-note">🎬 Hoy se graban {grabarHoy.length} video{grabarHoy.length > 1 ? 's' : ''}.</p>}
          {proximas.length === 0 ? (
            <Empty title="Sin fechas cercanas">Asigna fechas de grabación, edición o entrega en cada video.</Empty>
          ) : (
            <ul className="agenda">
              {proximas.map(({ v, d, k }) => (
                <li key={v.id + k}>
                  <Link to={`/videos/${v.id}`}>
                    <span className={`agenda-date${d < hoy ? ' late' : d === hoy ? ' today' : ''}`}>{d === hoy ? 'Hoy' : fmtDay(d)}</span>
                    <span className="agenda-kind">{k}</span>
                    <span className="agenda-title">
                      {clients.find((c) => c.id === v.client_id)?.name} · {v.title}
                    </span>
                    <span className={`pill tone-${estadoInfo(v.status).tone}`}>{estadoInfo(v.status).short}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2>Producción activa</h2>
          <Link to="/produccion" className="see-all">Ver tablero completo →</Link>
        </header>
        {activos.length === 0 ? (
          <Empty title="Todavía no hay videos">
            Empieza creando un <Link to="/clientes">cliente</Link> y un lote con sus videos.
          </Empty>
        ) : (
          <div className="mini-board">
            {COLUMNAS.map((c) => {
              const list = activos.filter((v) => c.estados.includes(v.status))
              return (
                <div key={c.label} className={`mini-col tone-${c.tone}`}>
                  <h3>
                    {c.label} <span>({list.length})</span>
                  </h3>
                  {list.slice(0, 3).map((v) => <VideoCard key={v.id} video={v} />)}
                  {list.length > 3 && <Link className="see-all" to="/produccion">+{list.length - 3} más</Link>}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Clientes</h2>
          <Link to="/clientes" className="see-all">Ver todos →</Link>
        </header>
        <ul className="client-list">
          {clients
            .filter((c) => !c.archived)
            .slice(0, 6)
            .map((c) => {
              const n = activos.filter((v) => v.client_id === c.id).length
              return (
                <li key={c.id}>
                  <Link to={`/clientes/${c.id}`}>
                    <ClientBadge name={c.name} color={c.color} logo={c.logo_url} />
                    <span>
                      <b>{c.name}</b>
                      <small>{n} video{n === 1 ? '' : 's'} activo{n === 1 ? '' : 's'}</small>
                    </span>
                    <span className="chev">›</span>
                  </Link>
                </li>
              )
            })}
        </ul>
      </section>
    </>
  )
}

function Stat({ label, value, tone, to }: { label: string; value: number; tone: string; to: string }) {
  return (
    <Link to={to} className={`stat tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </Link>
  )
}

export function ClientBadge({ name, color, logo, size = 44 }: { name: string; color: string; logo: string | null; size?: number }) {
  return (
    <span className="client-badge" style={{ width: size, height: size, borderColor: color, color }}>
      {logo ? <img src={logo} alt="" /> : name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
    </span>
  )
}

export const isPast = (d: string) => parseDay(d) < parseDay(today())
