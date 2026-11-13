// Todo lo que cambia entre la app de escritorio (Tauri) y el navegador.
// En el navegador solo se usa para desarrollar contra el Moodle simulado (scripts/moodle-demo.mjs).
import { invoke, isTauri } from '@tauri-apps/api/core'

export const enEscritorio = isTauri()

/** fetch sin CORS: en la app lo hace Rust (plugin-http); en el navegador, el fetch normal */
export async function pedir(url: string, init?: RequestInit): Promise<Response> {
  if (enEscritorio) {
    const { fetch: fetchNativo } = await import('@tauri-apps/plugin-http')
    return fetchNativo(url, init)
  }
  return fetch(url, init)
}

// ---------- Credenciales: en el llavero del sistema (Administrador de credenciales de Windows, Llavero de macOS) ----------

const CLAVE_DEV = 'aldia-sesion-dev'

export async function guardarSecreto(valor: string) {
  if (enEscritorio) return invoke('guardar_secreto', { valor })
  localStorage.setItem(CLAVE_DEV, valor)
}

export async function leerSecreto(): Promise<string | null> {
  if (enEscritorio) return invoke<string | null>('leer_secreto')
  return localStorage.getItem(CLAVE_DEV)
}

export async function borrarSecreto() {
  if (enEscritorio) return invoke('borrar_secreto')
  localStorage.removeItem(CLAVE_DEV)
}

// ---------- Abrir enlaces en el navegador ----------

export async function abrirEnNavegador(url: string) {
  if (enEscritorio) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    return openUrl(url)
  }
  window.open(url, '_blank', 'noopener')
}

// ---------- Notificaciones del sistema ----------

export async function notificar(titulo: string, cuerpo: string) {
  if (enEscritorio) {
    const n = await import('@tauri-apps/plugin-notification')
    let permitido = await n.isPermissionGranted()
    if (!permitido) permitido = (await n.requestPermission()) === 'granted'
    if (permitido) n.sendNotification({ title: titulo, body: cuerpo })
    return
  }
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') await Notification.requestPermission()
  if (Notification.permission === 'granted') new Notification(titulo, { body: cuerpo })
}

// ---------- Ventana ----------

export async function ventana() {
  if (!enEscritorio) return null
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow()
}

export async function iniciarConElSistema(activar?: boolean): Promise<boolean> {
  if (!enEscritorio) return false
  const a = await import('@tauri-apps/plugin-autostart')
  if (activar === true) await a.enable()
  if (activar === false) await a.disable()
  return a.isEnabled()
}
