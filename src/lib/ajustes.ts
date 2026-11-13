import { useCallback, useEffect, useState } from 'react'

export type Tema = 'sistema' | 'claro' | 'oscuro'

export type Ajustes = {
  /** Horas de anticipación del recordatorio (0 = sin recordatorios) */
  recordatorioHoras: number
  notificarAvisos: boolean
  tema: Tema
  siempreVisible: boolean
}

const CLAVE = 'aldia-ajustes'
const PREDETERMINADOS: Ajustes = { recordatorioHoras: 24, notificarAvisos: true, tema: 'sistema', siempreVisible: false }

export function leerAjustes(): Ajustes {
  try {
    return { ...PREDETERMINADOS, ...JSON.parse(localStorage.getItem(CLAVE) ?? '{}') }
  } catch {
    return PREDETERMINADOS
  }
}

export function useAjustes() {
  const [ajustes, setAjustes] = useState(leerAjustes)

  const cambiar = useCallback((parcial: Partial<Ajustes>) => {
    setAjustes((a) => {
      const nuevo = { ...a, ...parcial }
      try {
        localStorage.setItem(CLAVE, JSON.stringify(nuevo))
      } catch {
        // Sin almacenamiento el ajuste dura hasta cerrar la app
      }
      return nuevo
    })
  }, [])

  // Tema: claro u oscuro según el sistema, salvo que se elija uno
  useEffect(() => {
    const raiz = document.documentElement
    const medio = window.matchMedia('(prefers-color-scheme: dark)')
    const aplicar = () => {
      const oscuro = ajustes.tema === 'oscuro' || (ajustes.tema === 'sistema' && medio.matches)
      raiz.classList.toggle('dark', oscuro)
    }
    aplicar()
    medio.addEventListener('change', aplicar)
    return () => medio.removeEventListener('change', aplicar)
  }, [ajustes.tema])

  return { ajustes, cambiar }
}
