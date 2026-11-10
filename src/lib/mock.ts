/**
 * Modo demostración: imita el cliente de Supabase en memoria, con datos de ejemplo.
 * Solo se usa cuando VITE_DEMO=1 (vista previa sin base de datos). Nada se guarda en un servidor.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { seed, DEMO_USER_ID } from './seed'

type Row = Record<string, any>
type Db = Record<string, Row[]>
type Listener = (table: string) => void

const STORAGE_KEY = 'studio.demo.v5'
let db: Db = load()
const listeners = new Set<Listener>()

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* sin almacenamiento */
  }
  return seed()
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* sin almacenamiento */
  }
}
export function resetDemo() {
  db = seed()
  persist()
  for (const t of Object.keys(db)) listeners.forEach((l) => l(t))
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
const now = () => new Date().toISOString()
let historyId = 1000

const DEFAULTS: Record<string, () => Row> = {
  clients: () => ({ id: uid(), logo_url: null, description: '', creative_guide: '', notes: '', contact: '', whatsapp: '', color: '#FFC400', archived: false, created_by: DEMO_USER_ID, created_at: now(), updated_at: now() }),
  batches: () => ({ id: uid(), start_date: null, end_date: null, shoot_date: null, photos_album_url: null, position: 0, archived: false, created_by: DEMO_USER_ID, created_at: now() }),
  ideas: () => ({ id: uid(), client_id: null, summary: '', notes: '', reference_links: [], status: 'abierta', created_by: DEMO_USER_ID, created_at: now() }),
  videos: () => ({ id: uid(), batch_id: null, idea_id: null, number: 1, title: 'Video sin título', brief: '', script: '', shot_list: '', notes: '', status: 'por_grabar', record_date: null, edit_date: null, due_date: null, final_url: null, publish_by_us: false, publish_at: null, published_at: null, published_url: null, created_by: DEMO_USER_ID, created_at: now(), updated_at: now() }),
  video_tasks: () => ({ id: uid(), done: false, position: 0, done_by: null, done_at: null, created_at: now() }),
  assets: () => ({ id: uid(), source: 'google_photos_link', kind: 'clip', name: '', external_url: null, storage_path: null, mime_type: null, metadata: {}, link_status: 'sin_revisar', created_by: DEMO_USER_ID, created_at: now() }),
  video_assets: () => ({ position: 0, label: '', note: '', usage: '', added_by: DEMO_USER_ID, added_at: now() }),
  deliverables: () => ({ id: uid(), version: 'v1', url: null, notes: '', status: 'enviado', delivered_at: now().slice(0, 10), created_by: DEMO_USER_ID, created_at: now() }),
  comments: () => ({ id: uid(), author_id: DEMO_USER_ID, created_at: now() }),
  team_invites: () => ({ role: 'miembro', full_name: null, invited_by: DEMO_USER_ID, created_at: now() }),
  video_assignments: () => ({}),
  video_status_history: () => ({ id: historyId++, created_at: now(), user_id: DEMO_USER_ID, note: null }),
  profiles: () => ({ id: uid(), role: 'miembro', active: true, color: '#FFC400', created_at: now() }),
}

function notify(table: string) {
  persist()
  // Asíncrono, como el tiempo real de verdad.
  setTimeout(() => listeners.forEach((l) => l(table)), 30)
}

/** Lo que en la base real hacen los triggers. */
function afterWrite(table: string, op: 'insert' | 'update', row: Row, old?: Row) {
  if (table === 'videos') {
    if (op === 'insert' || old?.status !== row.status) {
      db.video_status_history.push({ ...DEFAULTS.video_status_history(), video_id: row.id, from_status: op === 'insert' ? null : old!.status, to_status: row.status })
      notify('video_status_history')
    }
    if (op === 'insert' && row.idea_id) {
      const idea = db.ideas.find((i) => i.id === row.idea_id)
      if (idea && idea.status === 'abierta') {
        idea.status = 'convertida'
        notify('ideas')
      }
    }
    if (op === 'update') row.updated_at = now()
  }
}

type Filter = (r: Row) => boolean

class Query implements PromiseLike<{ data: any; error: null | { message: string } }> {
  private filters: Filter[] = []
  private orders: { col: string; asc: boolean }[] = []
  private max: number | null = null
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: any = null
  private cols = '*'
  private returning = false
  private one: 'single' | 'maybe' | null = null

  constructor(private table: string) {}

  select(cols = '*') {
    this.cols = cols
    if (this.mode !== 'select') this.returning = true
    return this
  }
  insert(rows: Row | Row[]) {
    this.mode = 'insert'
    this.payload = Array.isArray(rows) ? rows : [rows]
    return this
  }
  update(patch: Row) {
    this.mode = 'update'
    this.payload = patch
    return this
  }
  delete() {
    this.mode = 'delete'
    return this
  }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this }
  neq(c: string, v: any) { this.filters.push((r) => r[c] !== v); return this }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.includes(r[c])); return this }
  is(c: string, v: any) { this.filters.push((r) => (r[c] ?? null) === v); return this }
  order(col: string, o?: { ascending?: boolean }) { this.orders.push({ col, asc: o?.ascending ?? true }); return this }
  limit(n: number) { this.max = n; return this }
  single() { this.one = 'single'; return this }
  maybeSingle() { this.one = 'maybe'; return this }

  private embed(r: Row) {
    // Soporta "*, alias:tabla(*)" para relaciones simples por <tabla_singular>_id.
    const m = this.cols.match(/(\w+):(\w+)\(\*\)/)
    if (!m) return { ...r }
    const [, alias, table] = m
    const fk = `${table.replace(/s$/, '')}_id`
    return { ...r, [alias]: db[table]?.find((x) => x.id === r[fk]) ?? null }
  }

  private run() {
    const t = (db[this.table] ??= [])
    let out: Row[] = []
    if (this.mode === 'insert') {
      out = this.payload.map((p: Row) => ({ ...(DEFAULTS[this.table]?.() ?? {}), ...p }))
      t.push(...out)
      out.forEach((r) => afterWrite(this.table, 'insert', r))
      notify(this.table)
    } else if (this.mode === 'update') {
      for (const r of t.filter((r) => this.filters.every((f) => f(r)))) {
        const old = { ...r }
        Object.assign(r, this.payload)
        afterWrite(this.table, 'update', r, old)
        out.push(r)
      }
      notify(this.table)
    } else if (this.mode === 'delete') {
      out = t.filter((r) => this.filters.every((f) => f(r)))
      db[this.table] = t.filter((r) => !out.includes(r))
      cascade(this.table, out)
      notify(this.table)
    } else {
      out = t.filter((r) => this.filters.every((f) => f(r)))
    }
    if (this.mode === 'select' || this.returning) {
      out = [...out]
      for (const o of [...this.orders].reverse()) {
        out.sort((a, b) => {
          const x = a[o.col] ?? ''
          const y = b[o.col] ?? ''
          const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')
          return o.asc ? c : -c
        })
      }
      if (this.max != null) out = out.slice(0, this.max)
      out = out.map((r) => this.embed(r))
    }
    const data = this.mode === 'select' || this.returning ? (this.one ? out[0] ?? null : out) : null
    if (this.one === 'single' && !data) return { data: null, error: { message: 'No se encontró el registro' } }
    return { data: structuredClone(data), error: null }
  }

  then<A = any, B = never>(ok?: ((v: any) => A | PromiseLike<A>) | null, ko?: ((e: any) => B | PromiseLike<B>) | null) {
    return new Promise<any>((res) => setTimeout(() => res(this.run()), 40)).then(ok, ko)
  }
}

function cascade(table: string, removed: Row[]) {
  const ids = removed.map((r) => r.id)
  const drop = (t: string, col: string) => {
    const before = db[t].length
    db[t] = db[t].filter((r) => !ids.includes(r[col]))
    if (db[t].length !== before) notify(t)
  }
  if (table === 'clients') {
    const vids = db.videos.filter((v) => ids.includes(v.client_id))
    drop('batches', 'client_id')
    drop('ideas', 'client_id')
    db.videos = db.videos.filter((v) => !ids.includes(v.client_id))
    cascade('videos', vids)
    notify('videos')
  }
  if (table === 'batches') {
    db.videos.forEach((v) => ids.includes(v.batch_id) && (v.batch_id = null))
    notify('videos')
  }
  if (table === 'videos') {
    for (const t of ['video_assignments', 'video_status_history', 'video_tasks', 'video_assets', 'deliverables', 'comments']) drop(t, 'video_id')
  }
  if (table === 'assets') drop('video_assets', 'asset_id')
}

class Channel {
  private tables: string[] = []
  private fn: Listener | null = null
  on(_e: string, opts: { table: string }, cb: () => void) {
    this.tables.push(opts.table)
    const prev = this.fn
    this.fn = (t) => {
      prev?.(t)
      if (t === opts.table) cb()
    }
    return this
  }
  subscribe() {
    if (this.fn) listeners.add(this.fn)
    return this
  }
  unsubscribe() {
    if (this.fn) listeners.delete(this.fn)
  }
}

const demoUser = { id: DEMO_USER_ID, email: 'freddy@createamve.demo' }
const session = { user: demoUser, access_token: 'demo' }

export const mockSupabase: any = {
  from: (t: string) => new Query(t),
  channel: () => new Channel(),
  removeChannel: (c: Channel) => c.unsubscribe(),
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: demoUser }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ data: { session }, error: null }),
    signUp: async () => ({ data: { session }, error: null }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: { user: demoUser }, error: null }),
    signOut: async () => {
      resetDemo()
      return { error: null }
    },
  },
}
