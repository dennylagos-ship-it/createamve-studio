/* Datos de EJEMPLO para la vista previa. No son registros reales. */
import { addDays, startOfWeek, toDay } from './format'

export const DEMO_USER_ID = 'u-freddy'

export function seed() {
  const lunes = startOfWeek(new Date())
  const d = (n: number) => toDay(addDays(lunes, n))
  const ts = (n: number, h = 10) => {
    const x = addDays(lunes, n)
    x.setHours(h, 15)
    return x.toISOString()
  }
  const t0 = ts(-7)

  const profiles = [
    { id: 'u-freddy', full_name: 'Freddy', email: 'freddy@createamve.demo', role: 'admin', active: true, color: '#FFC400', created_at: t0 },
    { id: 'u-anahi', full_name: 'Anahí', email: 'anahi@createamve.demo', role: 'miembro', active: true, color: '#FF6FB5', created_at: t0 },
    { id: 'u-cunado', full_name: 'Cuñado', email: 'cunado@createamve.demo', role: 'miembro', active: true, color: '#3D8BFF', created_at: t0 },
  ]

  const client = (id: string, name: string, color: string, description: string, creative_guide = '', contact = '', whatsapp = '') => ({
    id, name, color, description, creative_guide, logo_url: null, notes: '', contact, whatsapp, archived: false, created_by: 'u-freddy', created_at: t0, updated_at: t0,
  })
  const clients = [
    client('c-luna', 'Luna Cuero', '#B46CFF', 'Cosméticos y accesorios de cuero. Reels de producto para Instagram.', 'Tonos cálidos, fondo crema, música suave. Mostrar siempre el logo Aria al final.', 'Luna', '+58 414 0000001'),
    client('c-tinoco', 'Dra. Tinoco', '#3D8BFF', 'Clínica estética y odontológica. Contenido educativo.', '', '+58 424 0000002'),
    client('c-estilos', 'Estilos Center', '#FFC400', 'Peluquería y uñas. Antes y después, tendencias.'),
  ]

  const batches = [
    { id: 'b-luna', client_id: 'c-luna', name: `Semana del ${addDays(lunes, 0).getDate()} al ${addDays(lunes, 6).getDate()}`, start_date: d(0), end_date: d(6), position: 0, archived: false, created_by: 'u-freddy', created_at: t0 },
    { id: 'b-tinoco', client_id: 'c-tinoco', name: 'Lote educativo', start_date: d(0), end_date: d(13), position: 0, archived: false, created_by: 'u-freddy', created_at: t0 },
    { id: 'b-estilos', client_id: 'c-estilos', name: 'Colección de temporada', start_date: d(-3), end_date: d(4), position: 0, archived: false, created_by: 'u-freddy', created_at: t0 },
  ]

  const v = (id: string, client_id: string, batch_id: string, number: number, title: string, status: string, extra: Record<string, unknown> = {}) => ({
    id, client_id, batch_id, idea_id: null, number, title, status, brief: '', script: '', shot_list: '', notes: '',
    record_date: null, edit_date: null, due_date: null, final_url: null, created_by: 'u-freddy', created_at: t0, updated_at: ts(-1), ...extra,
  })

  const videos = [
    v('v-labios', 'c-luna', 'b-luna', 1, 'Kit de labios Aria Cosmetics', 'en_edicion', {
      brief: 'Presentar el kit completo y demostrar que es resistente al agua. Acordado con la clienta: mostrar los 4 tonos y cerrar con el logo Aria.',
      script: 'HOOK (0-3 s)\n“¿Labial que no se corre ni con agua? Mira esto.”\n\nDESARROLLO\nAbrimos el kit: 4 tonos, delineador y fijador.\nAplicación del tono Rubí en primer plano.\nPrueba: pasamos agua y un pañuelo… sigue intacto.\n\nCIERRE / CTA\n“Kit Aria, disponible en Luna Cuero. Escríbenos por DM.”',
      shot_list: 'Producto completo sobre mesa\nApertura del kit\nAplicación en labios\nMacro del labio\nPrueba con agua\nLogo Aria al final',
      record_date: d(-2), edit_date: d(1), due_date: d(3),
    }),
    v('v-brochas', 'c-luna', 'b-luna', 2, 'Brochas Aria', 'por_grabar', { brief: 'Para qué sirve cada brocha del set.', record_date: d(2), due_date: d(5) }),
    v('v-delineadores', 'c-luna', 'b-luna', 3, 'Delineadores', 'editado', { brief: 'Mostrar colores y aplicación.', record_date: d(-4), due_date: d(1) }),
    v('v-laser', 'c-tinoco', 'b-tinoco', 1, 'Beneficios del láser', 'por_grabar', { record_date: d(1), due_date: d(6) }),
    v('v-dental', 'c-tinoco', 'b-tinoco', 2, 'Cuidado dental', 'en_edicion', { record_date: d(-1), edit_date: d(2), due_date: d(4) }),
    v('v-reel', 'c-tinoco', 'b-tinoco', 3, 'Reel educativo: mitos', 'idea', {}),
    v('v-coleccion', 'c-estilos', 'b-estilos', 1, 'Nueva colección', 'grabado', { record_date: d(-1), edit_date: d(2), due_date: d(4) }),
    v('v-antes', 'c-estilos', 'b-estilos', 2, 'Antes y después', 'entregado', { record_date: d(-5), due_date: d(-1), final_url: 'https://drive.google.com/ejemplo' }),
  ]

  const a = (video_id: string, user_id: string, kind: string) => ({ video_id, user_id, kind })
  const video_assignments = [
    a('v-labios', 'u-freddy', 'grabacion'), a('v-labios', 'u-anahi', 'edicion'),
    a('v-brochas', 'u-freddy', 'grabacion'), a('v-brochas', 'u-anahi', 'edicion'),
    a('v-delineadores', 'u-cunado', 'grabacion'), a('v-delineadores', 'u-anahi', 'edicion'),
    a('v-laser', 'u-freddy', 'grabacion'),
    a('v-dental', 'u-cunado', 'grabacion'), a('v-dental', 'u-anahi', 'edicion'),
    a('v-coleccion', 'u-cunado', 'grabacion'), a('v-coleccion', 'u-freddy', 'edicion'),
    a('v-antes', 'u-freddy', 'grabacion'), a('v-antes', 'u-freddy', 'edicion'),
  ]

  let hid = 1
  const h = (video_id: string, from_status: string | null, to_status: string, user_id: string, day: number, hour = 10) => ({
    id: hid++, video_id, from_status, to_status, user_id, note: null, created_at: ts(day, hour),
  })
  const video_status_history = [
    h('v-labios', null, 'por_grabar', 'u-freddy', -6),
    h('v-labios', 'por_grabar', 'grabado', 'u-freddy', -2, 17),
    h('v-labios', 'grabado', 'en_edicion', 'u-anahi', -1, 9),
    ...videos.filter((x) => x.id !== 'v-labios').map((x) => h(x.id, null, x.status, 'u-freddy', -6)),
  ]

  const notas = ['Producto completo', 'Apertura del kit', 'Tono Rubí', 'Tono Coral', 'Tono Nude', 'Tono Vino', 'Aplicación labial', 'Macro del labio', 'Prueba con agua', 'Pañuelo, resultado', 'Voz en off', 'Logo Aria']
  const assets = notas.map((_n, i) => ({
    id: `as-${i + 1}`, source: 'google_photos_link', kind: i === 10 ? 'audio' : 'clip', name: `Clip ${String(i + 1).padStart(2, '0')}`,
    external_url: `https://photos.app.goo.gl/ejemplo-${i + 1}`, storage_path: null, mime_type: null, metadata: {},
    link_status: i < 3 ? 'ok' : i === 8 ? 'roto' : 'sin_revisar', created_by: 'u-freddy', created_at: ts(-2, 18),
  }))
  assets.push({ ...assets[0], id: 'as-b1', name: 'Clip 01', kind: 'clip', link_status: 'sin_revisar', external_url: 'https://photos.app.goo.gl/ejemplo-brochas' })
  const video_assets = [
    ...notas.map((nota, i) => ({
      video_id: 'v-labios', asset_id: `as-${i + 1}`, position: i + 1, label: `${i === 10 ? 'Audio' : 'Clip'} ${String(i + 1).padStart(2, '0')} · ${nota}`,
      note: i === 7 ? 'toma macro, usar en el hook' : i === 8 ? 'repetir si hay tiempo' : '', usage: '', added_by: 'u-freddy', added_at: ts(-2, 18),
    })),
    // La misma toma del logo también se usa en Brochas (muchos-a-muchos, sin duplicar).
    { video_id: 'v-brochas', asset_id: 'as-12', position: 1, label: 'Logo Aria', note: 'cierre', usage: '', added_by: 'u-freddy', added_at: ts(-1) },
  ]

  const ideas = [
    { id: 'i-1', client_id: 'c-luna', title: 'Bolsos tendencia otoño', summary: 'Mostrar 3 bolsos de cuero combinados con outfits.', notes: 'La clienta quiere esperar al nuevo stock.', reference_links: [], status: 'abierta', created_by: 'u-anahi', created_at: ts(-3) },
    { id: 'i-2', client_id: 'c-tinoco', title: '¿Duele el blanqueamiento?', summary: 'Responder preguntas frecuentes con la doctora frente a cámara.', notes: '', reference_links: [], status: 'abierta', created_by: 'u-freddy', created_at: ts(-2) },
  ]

  const comments = [
    { id: 'cm-1', video_id: 'v-labios', author_id: 'u-anahi', body: 'Ya tengo las 12 tomas ordenadas. El clip 09 salió movido, ¿se puede repetir?', created_at: ts(-1, 11) },
  ]

  const video_tasks = [
    { id: 't-1', video_id: 'v-labios', label: 'Pedir música sin copyright', done: true, position: 0, done_by: 'u-anahi', done_at: ts(-1, 12), created_at: ts(-2) },
    { id: 't-2', video_id: 'v-labios', label: 'Subtítulos', done: false, position: 1, done_by: null, done_at: null, created_at: ts(-2) },
  ]

  const deliverables = [
    { id: 'd-1', video_id: 'v-antes', version: 'v1', url: 'https://drive.google.com/ejemplo', notes: 'Primera versión', status: 'aprobado', delivered_at: d(-1), created_by: 'u-freddy', created_at: ts(-1) },
  ]

  return { profiles, team_invites: [], clients, batches, ideas, videos, video_assignments, video_status_history, video_tasks, assets, video_assets, deliverables, comments }
}
