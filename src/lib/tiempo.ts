import type { Pendiente } from './moodle'

export type Grupo = { clave: string; titulo: string; items: Pendiente[] }

function inicioDelDia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Agrupa como se piensa una semana de cursada: atrasadas, hoy, mañana, esta semana, más adelante */
export function agrupar(lista: Pendiente[], ahora = new Date()): Grupo[] {
  const hoy = inicioDelDia(ahora)
  const manana = hoy + 864e5
  const pasado = manana + 864e5
  const enUnaSemana = hoy + 7 * 864e5
  const grupos: Grupo[] = [
    { clave: 'atrasadas', titulo: 'Atrasadas', items: [] },
    { clave: 'hoy', titulo: 'Hoy', items: [] },
    { clave: 'manana', titulo: 'Mañana', items: [] },
    { clave: 'semana', titulo: 'Esta semana', items: [] },
    { clave: 'despues', titulo: 'Más adelante', items: [] },
  ]
  for (const p of lista) {
    const t = p.vence * 1000
    if (t < ahora.getTime()) grupos[0].items.push(p)
    else if (t < manana) grupos[1].items.push(p)
    else if (t < pasado) grupos[2].items.push(p)
    else if (t < enUnaSemana) grupos[3].items.push(p)
    else grupos[4].items.push(p)
  }
  return grupos.filter((g) => g.items.length)
}

// Hora de 24 h (es-AR por defecto usa "a. m." / "p. m.")
const hora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const diaCorto = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
const fechaLarga = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export const formatoHora = (seg: number) => hora.format(seg * 1000)
export const formatoDia = (seg: number) => diaCorto.format(seg * 1000).replace('.', '')
export const formatoFecha = (seg: number) => fechaLarga.format(seg * 1000)

/** "en 3 h", "en 2 días", "hace 5 h" */
export function relativo(seg: number, ahora = Date.now()) {
  const dif = seg * 1000 - ahora
  const abs = Math.abs(dif)
  const min = Math.round(abs / 6e4)
  let texto: string
  if (min < 60) texto = `${Math.max(min, 1)} min`
  else if (min < 48 * 60) texto = `${Math.round(min / 60)} h`
  else texto = `${Math.round(min / (60 * 24))} días`
  return dif >= 0 ? `en ${texto}` : `hace ${texto}`
}

export function tamanoArchivo(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} MB`
}

/** Color estable por materia, para reconocerlas de un vistazo */
export function tonoDeCurso(id: number) {
  const tonos = [152, 28, 205, 340, 262, 88, 186, 8, 48, 300]
  return tonos[Math.abs(id) % tonos.length]
}
