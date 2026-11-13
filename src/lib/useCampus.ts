import { useCallback, useEffect, useRef, useState } from 'react'
import { avisos as pedirAvisos, ErrorMoodle, iniciarSesion, marcarLeido, pendientes as pedirPendientes } from './moodle'
import type { Aviso, Pendiente, Sesion } from './moodle'
import { borrarSecreto, guardarSecreto, leerSecreto, notificar } from './plataforma'
import { leerAjustes } from './ajustes'
import { formatoHora, relativo } from './tiempo'

const CADA_CUANTO = 15 * 60 * 1000 // se actualiza sola cada 15 minutos
const CLAVE_NOTIFICADOS = 'aldia-notificados'
const CLAVE_ULTIMO_AVISO = 'aldia-ultimo-aviso'

type Estado = {
  cargandoSesion: boolean
  sesion: Sesion | null
  pendientes: Pendiente[]
  avisos: Aviso[]
  sinLeer: number
  actualizado: number | null
  actualizando: boolean
  error: string | null
}

function leerSet(clave: string) {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(clave) ?? '[]'))
  } catch {
    return new Set<string>()
  }
}

/** Recordatorios: una notificación por tarea cuando entra en la ventana de anticipación elegida */
async function recordar(lista: Pendiente[]) {
  const { recordatorioHoras } = leerAjustes()
  if (!recordatorioHoras) return
  const ahora = Date.now()
  const hechos = leerSet(CLAVE_NOTIFICADOS)
  for (const p of lista) {
    const vence = p.vence * 1000
    const clave = `${p.id}-${p.vence}`
    if (p.atrasada || hechos.has(clave) || vence - ahora > recordatorioHoras * 36e5) continue
    hechos.add(clave)
    await notificar(`${p.titulo}`, `${p.curso.corto || p.curso.nombre} · vence ${relativo(p.vence)} (${formatoHora(p.vence)})`)
  }
  // Solo se guardan las de tareas que siguen pendientes, para que la lista no crezca para siempre
  const vigentes = new Set(lista.map((p) => `${p.id}-${p.vence}`))
  localStorage.setItem(CLAVE_NOTIFICADOS, JSON.stringify([...hechos].filter((h) => vigentes.has(h))))
}

/** Avisos nuevos del campus desde la última vez */
async function notificarAvisos(lista: Aviso[]) {
  if (!leerAjustes().notificarAvisos || !lista.length) return
  const ultimo = Number(localStorage.getItem(CLAVE_ULTIMO_AVISO) ?? 0)
  const nuevos = lista.filter((a) => a.id > ultimo && !a.leido)
  localStorage.setItem(CLAVE_ULTIMO_AVISO, String(Math.max(ultimo, ...lista.map((a) => a.id))))
  // La primera vez no se notifica todo el historial
  if (!ultimo) return
  for (const a of nuevos.slice(0, 3)) await notificar(a.autor ? `Aviso de ${a.autor}` : 'Aviso del campus', a.titulo)
}

export function useCampus() {
  const [e, setE] = useState<Estado>({
    cargandoSesion: true,
    sesion: null,
    pendientes: [],
    avisos: [],
    sinLeer: 0,
    actualizado: null,
    actualizando: false,
    error: null,
  })
  const sesionRef = useRef<Sesion | null>(null)

  const cerrarSesion = useCallback(async () => {
    await borrarSecreto()
    localStorage.removeItem(CLAVE_NOTIFICADOS)
    localStorage.removeItem(CLAVE_ULTIMO_AVISO)
    sesionRef.current = null
    setE((x) => ({ ...x, sesion: null, pendientes: [], avisos: [], sinLeer: 0, actualizado: null, error: null }))
  }, [])

  const actualizar = useCallback(async () => {
    const s = sesionRef.current
    if (!s) return
    setE((x) => ({ ...x, actualizando: true }))
    try {
      const [lista, av] = await Promise.all([pedirPendientes(s), pedirAvisos(s).catch(() => null)])
      setE((x) => ({
        ...x,
        pendientes: lista,
        avisos: av?.avisos ?? x.avisos,
        sinLeer: av?.sinLeer ?? x.sinLeer,
        actualizado: Date.now(),
        actualizando: false,
        error: null,
      }))
      await recordar(lista)
      if (av) await notificarAvisos(av.avisos)
    } catch (err) {
      if (err instanceof ErrorMoodle && err.codigo === 'sesion') return cerrarSesion()
      setE((x) => ({
        ...x,
        actualizando: false,
        error: err instanceof Error ? err.message : 'No se pudo actualizar. Revisá tu conexión.',
      }))
    }
  }, [cerrarSesion])

  const entrar = useCallback(
    async (sitio: string, usuario: string, clave: string) => {
      const s = await iniciarSesion(sitio, usuario, clave)
      await guardarSecreto(JSON.stringify(s))
      localStorage.setItem('aldia-ultimo-sitio', sitio)
      sesionRef.current = s
      setE((x) => ({ ...x, sesion: s }))
      await actualizar()
    },
    [actualizar],
  )

  // Al abrir: sesión guardada en el llavero
  useEffect(() => {
    leerSecreto()
      .then((guardada) => {
        const s = guardada ? (JSON.parse(guardada) as Sesion) : null
        sesionRef.current = s
        setE((x) => ({ ...x, sesion: s, cargandoSesion: false }))
        if (s) actualizar()
      })
      .catch(() => setE((x) => ({ ...x, cargandoSesion: false })))
  }, [actualizar])

  // Se actualiza sola cada 15 minutos y al volver a la ventana (si pasaron más de 2 minutos)
  useEffect(() => {
    if (!e.sesion) return
    const id = setInterval(actualizar, CADA_CUANTO)
    const alVolver = () => {
      if (document.visibilityState === 'visible' && Date.now() - (e.actualizado ?? 0) > 2 * 60 * 1000) actualizar()
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', alVolver)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', alVolver)
    }
  }, [e.sesion, e.actualizado, actualizar])

  const marcarAvisoLeido = useCallback((id: number) => {
    const s = sesionRef.current
    setE((x) => ({
      ...x,
      avisos: x.avisos.map((a) => (a.id === id ? { ...a, leido: true } : a)),
      sinLeer: Math.max(0, x.sinLeer - (x.avisos.some((a) => a.id === id && !a.leido) ? 1 : 0)),
    }))
    if (s) marcarLeido(s, id).catch(() => {})
  }, [])

  return { ...e, entrar, actualizar, cerrarSesion, marcarAvisoLeido }
}
