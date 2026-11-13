// Cliente de la API de Moodle: la misma que usa la app oficial de Moodle para el celular
// (servicio "moodle_mobile_app"). Docs: https://moodledev.io/docs/apis/subsystems/external
import { pedir } from './plataforma'

export type Sesion = {
  sitio: string // https://campus.ejemplo.edu.ar (sin barra final)
  token: string
  tokenPrivado?: string // sirve para abrir el campus ya logueado (autologin)
  usuarioId: number
  nombre: string
  nombreSitio: string
}

export class ErrorMoodle extends Error {
  constructor(
    message: string,
    public codigo?: string,
  ) {
    super(message)
  }
}

/** "campus.ejemplo.edu.ar/my/" → "https://campus.ejemplo.edu.ar" */
export function normalizarSitio(entrada: string) {
  let url = entrada.trim()
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  const u = new URL(url)
  // Se descarta lo que venga después de la carpeta de Moodle (/my/, /login/index.php, /course/view.php...)
  const ruta = u.pathname.replace(/\/(my|login|course|mod|user|admin|calendar|grade|message)(\/.*)?$/i, '').replace(/\/+$/, '')
  return `${u.protocol}//${u.host}${ruta}`
}

/** Configuración pública del sitio: confirma que es un Moodle y que deja entrar desde apps */
export async function configPublica(sitio: string) {
  const res = await pedir(`${sitio}/lib/ajax/service-nologin.php?info=tool_mobile_get_public_config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ index: 0, methodname: 'tool_mobile_get_public_config', args: {} }]),
  }).catch(() => {
    throw new ErrorMoodle('No se pudo conectar. Revisá la dirección del campus y tu conexión.')
  })
  const datos = await res.json().catch(() => null)
  const r = Array.isArray(datos) ? datos[0] : null
  if (!r || r.error) throw new ErrorMoodle('Esa dirección no parece ser un campus Moodle.')
  const c = r.data as {
    sitename: string
    enablemobilewebservice: number
    typeoflogin: number
    launchurl?: string
    maintenanceenabled?: number
  }
  if (!c.enablemobilewebservice) {
    throw new ErrorMoodle('Tu campus no permite entrar desde apps. Pedile al administrador que active el acceso móvil.')
  }
  if (c.maintenanceenabled) throw new ErrorMoodle('El campus está en mantenimiento. Probá más tarde.')
  return c
}

/**
 * Inicia sesión con usuario y contraseña. La contraseña va solo al campus y no se guarda:
 * se guarda el token que devuelve Moodle (en el llavero del sistema).
 */
export async function iniciarSesion(sitio: string, usuario: string, clave: string): Promise<Sesion> {
  await configPublica(sitio)
  const cuerpo = new URLSearchParams({ username: usuario.trim(), password: clave, service: 'moodle_mobile_app' })
  const res = await pedir(`${sitio}/login/token.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo.toString(),
  })
  const r = (await res.json()) as { token?: string; privatetoken?: string; error?: string; errorcode?: string }
  if (!r.token) {
    if (r.errorcode === 'invalidlogin') throw new ErrorMoodle('Usuario o contraseña incorrectos.', r.errorcode)
    throw new ErrorMoodle(r.error ?? 'No se pudo iniciar sesión.', r.errorcode)
  }
  const info = await llamar<{ userid: number; fullname: string; sitename: string }>(
    { sitio, token: r.token },
    'core_webservice_get_site_info',
  )
  return {
    sitio,
    token: r.token,
    tokenPrivado: r.privatetoken,
    usuarioId: info.userid,
    nombre: info.fullname,
    nombreSitio: info.sitename,
  }
}

// ---------- Llamadas a la API ----------

/** Moodle recibe los parámetros como formulario: lista[0]=1, objeto[clave]=valor */
function aplanar(params: Record<string, unknown>, prefijo = '', salida = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    const clave = prefijo ? `${prefijo}[${k}]` : k
    if (v === undefined || v === null) continue
    if (typeof v === 'object') aplanar(v as Record<string, unknown>, clave, salida)
    else salida.append(clave, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  return salida
}

export async function llamar<T>(
  s: Pick<Sesion, 'sitio' | 'token'>,
  funcion: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const cuerpo = aplanar(params)
  cuerpo.set('wstoken', s.token)
  cuerpo.set('wsfunction', funcion)
  const res = await pedir(`${s.sitio}/webservice/rest/server.php?moodlewsrestformat=json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo.toString(),
  })
  const r = await res.json()
  if (r && typeof r === 'object' && 'exception' in r) {
    if (r.errorcode === 'invalidtoken' || r.errorcode === 'accessexception') {
      throw new ErrorMoodle('Tu sesión venció. Volvé a iniciar sesión.', 'sesion')
    }
    throw new ErrorMoodle(r.message ?? 'Error del campus', r.errorcode)
  }
  return r as T
}

// ---------- Datos que usa la app ----------

export type Curso = { id: number; nombre: string; corto: string }

export type Pendiente = {
  id: number
  titulo: string
  curso: Curso
  modulo: string // assign, quiz, forum, ...
  instancia: number
  vence: number // segundos (unix)
  atrasada: boolean
  url: string
  accion?: string // "Agregar entrega", "Intentar cuestionario ahora"...
  descripcion: string
}

type EventoMoodle = {
  id: number
  name: string
  activityname?: string
  modulename?: string
  instance?: number
  timesort: number
  overdue?: boolean
  url: string
  description?: string
  course?: { id: number; fullname: string; shortname: string }
  action?: { name: string; url: string; actionable: boolean }
}

const DIA = 24 * 60 * 60

/** Lo mismo que la "Línea de tiempo" del panel: actividades con algo por hacer, incluidas las atrasadas */
export async function pendientes(s: Sesion): Promise<Pendiente[]> {
  const ahora = Math.floor(Date.now() / 1000)
  const r = await llamar<{ events: EventoMoodle[] }>(s, 'core_calendar_get_action_events_by_timesort', {
    timesortfrom: ahora - 30 * DIA,
    timesortto: ahora + 60 * DIA,
    limitnum: 50,
    limittononsuspendedevents: true,
  })
  return r.events
    .filter((e) => e.action?.actionable !== false)
    .map((e) => ({
      id: e.id,
      titulo: e.activityname ?? e.name,
      curso: { id: e.course?.id ?? 0, nombre: e.course?.fullname ?? '', corto: e.course?.shortname ?? '' },
      modulo: e.modulename ?? '',
      instancia: e.instance ?? 0,
      vence: e.timesort,
      atrasada: e.overdue ?? e.timesort < ahora,
      url: e.url,
      accion: e.action?.name,
      descripcion: e.description ?? '',
    }))
    .sort((a, b) => a.vence - b.vence)
}

export type Archivo = { nombre: string; url: string; tamano: number; tipo: string }

export type DetalleTarea = {
  consigna: string // HTML del campus
  archivos: Archivo[]
  cierre?: number // fecha límite con atraso permitido (cutoffdate)
  entregada?: boolean
}

type ArchivoMoodle = { filename: string; fileurl: string; filesize: number; mimetype?: string }

/** Las URLs de archivos del campus necesitan el token para descargarse */
export function urlDeArchivo(s: Sesion, url: string) {
  const u = new URL(url)
  u.pathname = u.pathname.replace('/pluginfile.php', '/webservice/pluginfile.php')
  u.searchParams.set('token', s.token)
  return u.toString()
}

/** Consigna y archivos de una tarea (mod_assign). Para otros tipos se usa la descripción del evento */
export async function detalleTarea(s: Sesion, p: Pendiente): Promise<DetalleTarea> {
  if (p.modulo !== 'assign') return { consigna: p.descripcion, archivos: [] }
  const r = await llamar<{
    courses: {
      assignments: {
        id: number
        intro?: string
        introfiles?: ArchivoMoodle[]
        introattachments?: ArchivoMoodle[]
        cutoffdate?: number
      }[]
    }[]
  }>(s, 'mod_assign_get_assignments', { courseids: [p.curso.id] })
  const tarea = r.courses.flatMap((c) => c.assignments).find((a) => a.id === p.instancia)
  if (!tarea) return { consigna: p.descripcion, archivos: [] }

  let entregada: boolean | undefined
  try {
    const estado = await llamar<{ lastattempt?: { submission?: { status: string } } }>(
      s,
      'mod_assign_get_submission_status',
      { assignid: tarea.id },
    )
    entregada = estado.lastattempt?.submission?.status === 'submitted'
  } catch {
    // Si el campus no deja ver el estado, se omite
  }

  return {
    consigna: tarea.intro ?? p.descripcion,
    archivos: [...(tarea.introattachments ?? []), ...(tarea.introfiles ?? [])].map((f) => ({
      nombre: f.filename,
      url: urlDeArchivo(s, f.fileurl),
      tamano: f.filesize,
      tipo: f.mimetype ?? '',
    })),
    cierre: tarea.cutoffdate || undefined,
    entregada,
  }
}

export type Aviso = {
  id: number
  titulo: string
  texto: string // HTML
  fecha: number
  leido: boolean
  url?: string
  autor?: string
}

/** Notificaciones del campus (avisos de los profes, entregas calificadas, mensajes de foros) */
export async function avisos(s: Sesion): Promise<{ avisos: Aviso[]; sinLeer: number }> {
  const r = await llamar<{
    notifications: {
      id: number
      subject: string
      smallmessage?: string
      fullmessagehtml?: string
      timecreated: number
      read: boolean
      contexturl?: string
      userfromfullname?: string
    }[]
    unreadcount: number
  }>(s, 'message_popup_get_popup_notifications', { useridto: s.usuarioId, newestfirst: true, limit: 30, offset: 0 })
  return {
    sinLeer: r.unreadcount,
    avisos: r.notifications.map((n) => ({
      id: n.id,
      titulo: n.subject,
      texto: n.fullmessagehtml || n.smallmessage || '',
      fecha: n.timecreated,
      leido: n.read,
      url: n.contexturl,
      autor: n.userfromfullname,
    })),
  }
}

/** Marca el aviso como leído también en el campus */
export async function marcarLeido(s: Sesion, id: number) {
  await llamar(s, 'core_message_mark_notification_read', { notificationid: id })
}

/**
 * URL que abre el campus ya logueado (como hace la app oficial). Moodle limita cuántas veces se puede pedir,
 * así que si falla se abre la URL normal y el navegador pide iniciar sesión.
 */
export async function urlConSesion(s: Sesion, destino: string) {
  if (!s.tokenPrivado) return destino
  try {
    const r = await llamar<{ key: string; autologinurl: string }>(s, 'tool_mobile_get_autologin_key', {
      privatetoken: s.tokenPrivado,
    })
    const u = new URL(r.autologinurl)
    u.searchParams.set('userid', String(s.usuarioId))
    u.searchParams.set('key', r.key)
    u.searchParams.set('urltogo', destino)
    return u.toString()
  } catch {
    return destino
  }
}
