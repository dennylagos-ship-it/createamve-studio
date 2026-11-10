// Feed iCalendar (.ics) con grabaciones, ediciones y entregas de CREATEAMVE Studio.
// Google Calendar → Otros calendarios → "Desde URL" → pegar el enlace de Ajustes.
// Despliegue: supabase functions deploy calendario --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'

const ESTADOS: Record<string, string> = {
  idea: 'Idea', por_grabar: 'Por grabar', grabado: 'Grabado', en_edicion: 'En edición',
  editado: 'Editado', en_correcciones: 'En correcciones', entregado: 'Entregado',
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;')
const day = (d: string) => d.replaceAll('-', '')
const nextDay = (d: string) => {
  const x = new Date(`${d}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + 1)
  return x.toISOString().slice(0, 10).replaceAll('-', '')
}
// Líneas de máximo 75 octetos, como pide el estándar.
const fold = (line: string) => {
  const out: string[] = []
  let rest = line
  while (new TextEncoder().encode(rest).length > 74) {
    let cut = 74
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--
    out.push(rest.slice(0, cut))
    rest = ' ' + rest.slice(cut)
  }
  out.push(rest)
  return out.join('\r\n')
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''
  const soloMios = url.searchParams.get('solo') === 'mios'
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response('Enlace inválido', { status: 400 })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: feed } = await db.from('calendar_feeds').select('user_id').eq('token', token).maybeSingle()
  if (!feed) return new Response('Enlace no encontrado o regenerado', { status: 404 })
  const { data: me } = await db.from('profiles').select('active').eq('id', feed.user_id).maybeSingle()
  if (!me?.active) return new Response('Cuenta inactiva', { status: 403 })

  const [{ data: videos }, { data: clients }, { data: asg }, { data: profiles }] = await Promise.all([
    db.from('videos').select('id, number, title, status, record_date, edit_date, due_date, client_id, brief, publish_by_us, publish_at, published_at, published_url'),
    db.from('clients').select('id, name, archived'),
    db.from('video_assignments').select('video_id, user_id, kind'),
    db.from('profiles').select('id, full_name'),
  ])
  const cName = new Map((clients ?? []).map((c) => [c.id, c]))
  const pName = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
  const app = Deno.env.get('STUDIO_APP_URL') ?? ''

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Createamve//Studio//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${soloMios ? 'Mis producciones' : 'Producción'} · CREATEAMVE Studio`,
    'X-WR-TIMEZONE:America/Caracas', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
  ]
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'

  for (const v of videos ?? []) {
    const c = cName.get(v.client_id)
    if (!c || c.archived) continue
    const vAsg = (asg ?? []).filter((a) => a.video_id === v.id)
    const eventos = [
      { kind: 'grabacion', label: 'Grabación', date: v.record_date },
      { kind: 'edicion', label: 'Edición', date: v.edit_date },
      { kind: 'revision', label: 'Entrega', date: v.due_date },
    ]
    for (const e of eventos) {
      if (!e.date) continue
      if (soloMios && !vAsg.some((a) => a.user_id === feed.user_id && (a.kind === e.kind || e.kind === 'revision'))) continue
      const resp = vAsg.filter((a) => a.kind === e.kind).map((a) => pName.get(a.user_id)).filter(Boolean).join(', ')
      const desc = [
        `Video ${String(v.number).padStart(2, '0')} · Estado: ${ESTADOS[v.status] ?? v.status}`,
        resp ? `Responsable: ${resp}` : '',
        v.brief ?? '',
        app ? `${app}/videos/${v.id}` : '',
      ].filter(Boolean).join('\n')
      lines.push(
        'BEGIN:VEVENT',
        `UID:${v.id}-${e.kind}@createamve-studio`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${day(e.date)}`,
        `DTEND;VALUE=DATE:${nextDay(e.date)}`,
        fold(`SUMMARY:${esc(`${e.label} · ${c.name} · ${v.title}`)}`),
        fold(`DESCRIPTION:${esc(desc)}`),
        ...(app ? [fold(`URL:${app}/videos/${v.id}`)] : []),
        `STATUS:${v.status === 'entregado' && e.kind === 'revision' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      )
    }

    // Publicación programada (con hora): solo si la agencia publica el video.
    if (v.publish_by_us && v.publish_at && !soloMios) {
      const ini = new Date(v.publish_at)
      const fin = new Date(ini.getTime() + 30 * 60_000)
      const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      const desc = [
        `Video ${String(v.number).padStart(2, '0')}`,
        v.published_at ? 'Ya publicado' : 'Pendiente: marcar "Publicado" en Studio',
        v.published_url ?? '',
        app ? `${app}/videos/${v.id}` : '',
      ].filter(Boolean).join('\n')
      lines.push(
        'BEGIN:VEVENT',
        `UID:${v.id}-publicacion@createamve-studio`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${utc(ini)}`,
        `DTEND:${utc(fin)}`,
        fold(`SUMMARY:${esc(`${v.published_at ? 'Publicado' : 'Publicar'} · ${c.name} · ${v.title}`)}`),
        fold(`DESCRIPTION:${esc(desc)}`),
        ...(app ? [fold(`URL:${app}/videos/${v.id}`)] : []),
        `STATUS:${v.published_at ? 'CONFIRMED' : 'TENTATIVE'}`,
        ...(v.published_at ? [] : ['BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${esc(`Publicar ${v.title}`)}`), 'TRIGGER:PT0M', 'END:VALARM']),
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=300' },
  })
})
