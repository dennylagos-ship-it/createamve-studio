import { addDays, parseDay, toDay } from './format'
import { supabase, isDemo } from './supabase'

/** Enlace "Agregar a Google Calendar" para un evento de día completo. */
export function gcalLink(o: { title: string; date: string; details?: string }) {
  const start = o.date.replaceAll('-', '')
  const end = toDay(addDays(parseDay(o.date), 1)).replaceAll('-', '')
  const p = new URLSearchParams({ action: 'TEMPLATE', text: o.title, dates: `${start}/${end}`, details: o.details ?? '' })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

/** URL del feed .ics personal (Edge Function "calendario"). */
export function feedUrl(token: string, soloMios: boolean) {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  return `${base}/functions/v1/calendario?token=${token}${soloMios ? '&solo=mios' : ''}`
}

export async function getOrCreateFeedToken(regenerate = false): Promise<string | null> {
  if (isDemo) return null
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return null
  if (regenerate) {
    const { data } = await supabase.from('calendar_feeds').update({ token: crypto.randomUUID() }).eq('user_id', u.user.id).select('token').maybeSingle()
    if (data) return (data as { token: string }).token
  }
  const { data } = await supabase.from('calendar_feeds').select('token').maybeSingle()
  if (data) return (data as { token: string }).token
  const ins = await supabase.from('calendar_feeds').insert({}).select('token').single()
  return ins.data ? (ins.data as { token: string }).token : null
}
