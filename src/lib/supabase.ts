import { createClient } from '@supabase/supabase-js'
import { mockSupabase } from './mock'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Vista previa sin base de datos, con datos de ejemplo en memoria. */
export const isDemo = import.meta.env.VITE_DEMO === '1'
export const isConfigured = isDemo || Boolean(url && key)

const makeClient = () =>
  createClient(url || 'http://localhost:54321', key || 'sin-configurar', {
    auth: { persistSession: true, autoRefreshToken: true },
  })

export const supabase: ReturnType<typeof makeClient> = isDemo ? mockSupabase : makeClient()
