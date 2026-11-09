const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** 'YYYY-MM-DD' → Date local sin desfase de zona horaria. */
export function parseDay(d: string) {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function toDay(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const today = () => toDay(new Date())

export function fmtDay(d: string | null | undefined) {
  if (!d) return ''
  const x = parseDay(d)
  return `${dias[x.getDay()]} ${x.getDate()} ${meses[x.getMonth()]}`
}

export function fmtDateTime(iso: string) {
  const x = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${x.getDate()} ${meses[x.getMonth()]} ${x.getFullYear()}, ${p(x.getHours())}:${p(x.getMinutes())}`
}

export function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = (x.getDay() + 6) % 7 // lunes = 0
  x.setDate(x.getDate() - diff)
  return x
}

export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const diaSemana = (d: Date) => dias[d.getDay()]
export const nombreMes = (d: Date) => meses[d.getMonth()]

export const pad2 = (n: number) => String(n).padStart(2, '0')

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?'
}

export function isUrl(s: string) {
  try {
    const u = new URL(s.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export function isGooglePhotos(url: string) {
  return /(^|\.)photos\.(google|app\.goo)\.|photos\.app\.goo\.gl|goo\.gl\/photos/i.test(url)
}
