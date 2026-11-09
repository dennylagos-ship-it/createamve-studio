import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Assignment, Batch, Client, Idea, Profile, Video } from './types'

/* ───────────── Sesión ───────────── */

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthCtx = createContext<AuthState>({ session: null, profile: null, loading: true, refreshProfile: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
    setProfile((data as unknown as Profile) ?? null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // Evita llamadas a Supabase dentro del callback (puede bloquear la sesión).
      setTimeout(() => loadProfile(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const value = useMemo(
    () => ({ session, profile, loading, refreshProfile: () => loadProfile(session) }),
    [session, profile, loading, loadProfile],
  )
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

/* ───────────── Datos compartidos del estudio ───────────── */

interface StudioState {
  ready: boolean
  error: string | null
  online: boolean
  profiles: Profile[]
  clients: Client[]
  batches: Batch[]
  videos: Video[]
  assignments: Assignment[]
  ideas: Idea[]
  reload: () => void
  profileById: (id: string | null | undefined) => Profile | undefined
  clientById: (id: string | null | undefined) => Client | undefined
  assigneesOf: (videoId: string) => Assignment[]
}

const StudioCtx = createContext<StudioState | null>(null)

type TableName = 'profiles' | 'clients' | 'batches' | 'videos' | 'video_assignments' | 'ideas'

const ORDER: Record<TableName, { col: string; asc: boolean } | null> = {
  profiles: { col: 'full_name', asc: true },
  clients: { col: 'name', asc: true },
  batches: { col: 'created_at', asc: false },
  videos: { col: 'number', asc: true },
  video_assignments: null,
  ideas: { col: 'created_at', asc: false },
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    profiles: [] as Profile[],
    clients: [] as Client[],
    batches: [] as Batch[],
    videos: [] as Video[],
    video_assignments: [] as Assignment[],
    ideas: [] as Idea[],
  })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const timers = useRef<Partial<Record<TableName, ReturnType<typeof setTimeout>>>>({})

  const fetchTable = useCallback(async (t: TableName) => {
    let q = supabase.from(t).select('*')
    const o = ORDER[t]
    if (o) q = q.order(o.col, { ascending: o.asc })
    const { data, error: err } = await q
    if (err) throw new Error(err.message)
    setState((s) => ({ ...s, [t]: data ?? [] }))
  }, [])

  const loadAll = useCallback(async () => {
    try {
      await Promise.all((Object.keys(ORDER) as TableName[]).map(fetchTable))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos')
    } finally {
      setReady(true)
    }
  }, [fetchTable])

  useEffect(() => {
    loadAll()
    // Tiempo real: cuando otro dispositivo cambia algo, se recarga esa tabla.
    const channel = supabase.channel('studio-core')
    for (const t of Object.keys(ORDER) as TableName[]) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => {
        clearTimeout(timers.current[t])
        timers.current[t] = setTimeout(() => fetchTable(t).catch(() => {}), 150)
      })
    }
    channel.subscribe()

    const goOnline = () => {
      setOnline(true)
      loadAll()
    }
    const goOffline = () => setOnline(false)
    const onVisible = () => document.visibilityState === 'visible' && loadAll()
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadAll, fetchTable])

  const value = useMemo<StudioState>(() => {
    const pMap = new Map(state.profiles.map((p) => [p.id, p]))
    const cMap = new Map(state.clients.map((c) => [c.id, c]))
    const aMap = new Map<string, Assignment[]>()
    for (const a of state.video_assignments) {
      const list = aMap.get(a.video_id) ?? []
      list.push(a)
      aMap.set(a.video_id, list)
    }
    return {
      ready,
      error,
      online,
      profiles: state.profiles,
      clients: state.clients,
      batches: state.batches,
      videos: state.videos,
      assignments: state.video_assignments,
      ideas: state.ideas,
      reload: loadAll,
      profileById: (id) => (id ? pMap.get(id) : undefined),
      clientById: (id) => (id ? cMap.get(id) : undefined),
      assigneesOf: (vid) => aMap.get(vid) ?? [],
    }
  }, [state, ready, error, online, loadAll])

  return <StudioCtx.Provider value={value}>{children}</StudioCtx.Provider>
}

export function useStudio() {
  const s = useContext(StudioCtx)
  if (!s) throw new Error('useStudio fuera de StudioProvider')
  return s
}

/** Lee filas de una tabla filtradas por video y se mantiene al día en tiempo real. */
export function useVideoRows<T>(
  table: string,
  videoId: string | undefined,
  order: { col: string; asc?: boolean },
  select = '*',
  alsoWatch: string[] = [],
) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!videoId) return
    const { data, error: err } = await supabase
      .from(table)
      .select(select)
      .eq('video_id', videoId)
      .order(order.col, { ascending: order.asc ?? true })
    if (err) setError(err.message)
    else {
      setError(null)
      setRows((data ?? []) as T[])
    }
    setLoading(false)
  }, [table, videoId, order.col, order.asc, select])

  useEffect(() => {
    if (!videoId) return
    load()
    const ch = supabase.channel(`${table}-${videoId}`)
    // Sin filtro: los borrados no llegan filtrados por video_id. Con un equipo pequeño, recargar es barato.
    for (const t of [table, ...alsoWatch]) ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => load())
    ch.subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, videoId, load, alsoWatch.join(',')])

  return { rows, loading, error, reload: load, setRows }
}
