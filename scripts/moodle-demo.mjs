// Moodle de mentira para desarrollar y sacar capturas sin un campus real.
//   node scripts/moodle-demo.mjs      → http://localhost:8099 (usuario: demo, contraseña: demo)
// Implementa solo las funciones de la API que usa la app, con datos inventados.
import http from 'node:http'

const PUERTO = Number(process.env.PUERTO ?? 8099)
const SITIO = `http://localhost:${PUERTO}`
const TOKEN = 'token-demo'
const ahora = () => Math.floor(Date.now() / 1000)
const H = 3600
const D = 24 * H

const cursos = [
  { id: 11, fullname: 'Programación II', shortname: 'Programación II' },
  { id: 12, fullname: 'Base de Datos II', shortname: 'Base de Datos II' },
  { id: 13, fullname: 'Modelado de Software', shortname: 'Modelado' },
  { id: 14, fullname: 'Análisis Matemático', shortname: 'Análisis' },
  { id: 15, fullname: 'Inglés Técnico II', shortname: 'Inglés II' },
]
const curso = (id) => cursos.find((c) => c.id === id)

/** Fecha a una hora fija (23:59 o la indicada) dentro de N días */
function el(dias, horas = 23, minutos = 59) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  d.setHours(horas, minutos, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

function tareas() {
  return [
    { id: 101, cmid: 501, curso: 12, name: 'TP 3: Normalización hasta 3FN', modulo: 'assign', vence: el(-2), accion: 'Agregar entrega' },
    { id: 102, cmid: 502, curso: 11, name: 'Práctica 6: Árboles AVL en Dart', modulo: 'assign', vence: ahora() + 5 * H, accion: 'Agregar entrega' },
    { id: 103, cmid: 503, curso: 14, name: 'Trabajo Integrador 3', modulo: 'assign', vence: el(1, 21, 0), accion: 'Agregar entrega' },
    { id: 104, cmid: 504, curso: 15, name: 'Quiz Unit 5: Passive voice', modulo: 'quiz', vence: el(3, 20, 0), accion: 'Intentar cuestionario ahora' },
    { id: 105, cmid: 505, curso: 13, name: 'Diagrama de casos de uso del sistema de turnos', modulo: 'assign', vence: el(5), accion: 'Agregar entrega' },
    { id: 106, cmid: 506, curso: 11, name: 'Proyecto final: entrega del avance', modulo: 'assign', vence: el(12), accion: 'Agregar entrega' },
  ]
}

const consignas = {
  101: '<p>Normalizar hasta <strong>tercera forma normal</strong> el esquema del archivo adjunto.</p><ul><li>Justificar cada dependencia funcional.</li><li>Entregar un PDF con el esquema final.</li></ul>',
  102: '<p>Implementar un <strong>árbol AVL</strong> en Dart con inserción, eliminación y rotaciones.</p><ol><li>Clase <code>NodoAVL</code> con altura.</li><li>Métodos <code>insertar</code> y <code>eliminar</code>.</li><li>Pruebas con los casos del apunte.</li></ol><p>Entregar el repositorio comprimido. Ver la <a href="https://dart.dev/language">guía del lenguaje</a>.</p>',
  103: '<p>Resolver los ejercicios de la Unidad 3: límites y continuidad. Entrega obligatoria.</p>',
  105: '<p>Modelar los casos de uso del sistema de turnos del consultorio. Incluir actores, relaciones <em>include</em> y <em>extend</em>.</p>',
  106: '<p>Subir el avance del proyecto final con el README actualizado.</p>',
}

const avisos = [
  { id: 9003, subject: 'Cambio de fecha del parcial de Base de Datos II', small: 'El parcial pasa al miércoles 25.', html: '<p>Buenas a todos: el parcial pasa al <strong>miércoles 25</strong> en el horario habitual.</p>', autor: 'Prof. Gómez', hace: 3 * H, read: false },
  { id: 9002, subject: 'Se calificó tu entrega: TP 2 Consultas SQL', small: 'Tu entrega fue calificada: 9.', html: '<p>Tu entrega fue calificada: <strong>9</strong>. Muy buen trabajo con las subconsultas.</p>', autor: 'Prof. Gómez', hace: 26 * H, read: false },
  { id: 9001, subject: 'Material nuevo: apunte de Dart', small: 'Ya está el apunte de fundamentos de Dart.', html: '<p>Ya está subido el apunte de fundamentos de Dart en la sección Material de estudio.</p>', autor: 'Prof. Ruiz', hace: 4 * D, read: true },
]

const funciones = {
  core_webservice_get_site_info: () => ({
    sitename: 'Campus de demostración',
    username: 'demo',
    fullname: 'Estudiante Demo',
    userid: 7,
    siteurl: SITIO,
    release: '4.5',
  }),
  core_calendar_get_action_events_by_timesort: () => ({
    events: tareas().map((t) => ({
      id: t.id + 1000,
      name: `${t.name} vence`,
      activityname: t.name,
      modulename: t.modulo,
      instance: t.id,
      timesort: t.vence,
      overdue: t.vence < ahora(),
      url: `${SITIO}/mod/${t.modulo}/view.php?id=${t.cmid}`,
      description: consignas[t.id] ?? '',
      course: curso(t.curso),
      action: { name: t.accion, url: `${SITIO}/mod/${t.modulo}/view.php?id=${t.cmid}`, actionable: true },
    })),
  }),
  mod_assign_get_assignments: (p) => ({
    courses: cursos
      .filter((c) => String(c.id) === p['courseids[0]'])
      .map((c) => ({
        id: c.id,
        assignments: tareas()
          .filter((t) => t.curso === c.id && t.modulo === 'assign')
          .map((t) => ({
            id: t.id,
            cmid: t.cmid,
            name: t.name,
            duedate: t.vence,
            cutoffdate: t.id === 101 ? el(2) : 0,
            intro: consignas[t.id] ?? '',
            introattachments:
              t.id === 101
                ? [{ filename: 'esquema-ventas.pdf', fileurl: `${SITIO}/pluginfile.php/1/mod_assign/intro/esquema-ventas.pdf`, filesize: 184320, mimetype: 'application/pdf' }]
                : t.id === 102
                  ? [{ filename: 'casos-de-prueba.txt', fileurl: `${SITIO}/pluginfile.php/1/mod_assign/intro/casos.txt`, filesize: 2048, mimetype: 'text/plain' }]
                  : [],
          })),
      })),
  }),
  mod_assign_get_submission_status: (p) => ({
    lastattempt: { submission: { status: p.assignid === '105' ? 'submitted' : 'new' } },
  }),
  message_popup_get_popup_notifications: () => ({
    unreadcount: avisos.filter((a) => !a.read).length,
    notifications: avisos.map((a) => ({
      id: a.id,
      subject: a.subject,
      smallmessage: a.small,
      fullmessagehtml: a.html,
      timecreated: ahora() - a.hace,
      read: a.read,
      contexturl: `${SITIO}/mod/forum/view.php?id=1`,
      userfromfullname: a.autor,
    })),
  }),
  core_message_mark_notification_read: (p) => {
    const a = avisos.find((x) => String(x.id) === p.notificationid)
    if (a) a.read = true
    return { notificationid: Number(p.notificationid), warnings: [] }
  },
  tool_mobile_get_autologin_key: () => {
    throw Object.assign(new Error('Solo en sitios con HTTPS'), { errorcode: 'httpsrequired' })
  },
}

function leerCuerpo(req) {
  return new Promise((ok) => {
    let datos = ''
    req.on('data', (c) => (datos += c))
    req.on('end', () => ok(datos))
  })
}

const servidor = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.end()
  const url = new URL(req.url, SITIO)
  const json = (o, estado = 200) => {
    res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(o))
  }
  const cuerpo = await leerCuerpo(req)

  if (url.pathname === '/lib/ajax/service-nologin.php') {
    return json([{ error: false, data: { sitename: 'Campus de demostración', enablemobilewebservice: 1, typeoflogin: 1, maintenanceenabled: 0 } }])
  }
  if (url.pathname === '/login/token.php') {
    const p = new URLSearchParams(cuerpo)
    if (p.get('username') === 'demo' && p.get('password') === 'demo') return json({ token: TOKEN, privatetoken: 'privado-demo' })
    return json({ error: 'Datos de acceso inválidos. Por favor, inténtelo otra vez.', errorcode: 'invalidlogin' })
  }
  if (url.pathname === '/webservice/rest/server.php') {
    const p = Object.fromEntries(new URLSearchParams(cuerpo))
    if (p.wstoken !== TOKEN) return json({ exception: 'moodle_exception', errorcode: 'invalidtoken', message: 'Token inválido' })
    const f = funciones[p.wsfunction]
    if (!f) return json({ exception: 'dml_missing_record_exception', errorcode: 'invalidrecord', message: `No existe ${p.wsfunction}` })
    try {
      return json(f(p))
    } catch (e) {
      return json({ exception: 'moodle_exception', errorcode: e.errorcode, message: e.message })
    }
  }
  res.writeHead(404).end('No encontrado')
})

servidor.listen(PUERTO, () => console.log(`Moodle de demostración en ${SITIO} (usuario demo / contraseña demo)`))
