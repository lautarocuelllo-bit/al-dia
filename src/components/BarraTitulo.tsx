import { useEffect, useState } from 'react'
import { Minus, PushPin, PushPinSlash, X } from '@phosphor-icons/react'
import { enEscritorio, ventana } from '../lib/plataforma'
import type { Ajustes } from '../lib/ajustes'

/** Barra propia (la ventana no tiene marco): se arrastra desde acá */
export function BarraTitulo({
  ajustes,
  cambiar,
}: {
  ajustes: Ajustes
  cambiar: (a: Partial<Ajustes>) => void
}) {
  const [listo, setListo] = useState(false)

  // Al abrir se aplica "siempre visible" guardado
  useEffect(() => {
    ventana().then((v) => v?.setAlwaysOnTop(ajustes.siempreVisible).then(() => setListo(true)))
  }, [ajustes.siempreVisible])

  const fijar = async () => {
    const v = await ventana()
    const nuevo = !ajustes.siempreVisible
    await v?.setAlwaysOnTop(nuevo)
    cambiar({ siempreVisible: nuevo })
  }

  return (
    <header data-tauri-drag-region className="flex h-11 shrink-0 items-center gap-2 border-b border-borde bg-panel pr-1.5 pl-3.5">
      <Logo />
      <span data-tauri-drag-region className="flex-1 text-sm font-semibold tracking-tight">
        Al Día
      </span>
      {enEscritorio && listo && (
        <div className="flex items-center">
          <button
            type="button"
            onClick={fijar}
            className={`boton-icono ${ajustes.siempreVisible ? 'text-acento' : ''}`}
            title={ajustes.siempreVisible ? 'Dejar de fijar encima de todo' : 'Fijar encima de todo'}
            aria-pressed={ajustes.siempreVisible}
          >
            {ajustes.siempreVisible ? <PushPin size={16} weight="fill" /> : <PushPinSlash size={16} />}
          </button>
          <button type="button" onClick={() => ventana().then((v) => v?.minimize())} className="boton-icono" title="Minimizar">
            <Minus size={16} />
          </button>
          {/* Cerrar la esconde: sigue en la bandeja para avisar de las entregas */}
          <button type="button" onClick={() => ventana().then((v) => v?.hide())} className="boton-icono hover:bg-alerta hover:text-white" title="Esconder (sigue en la bandeja)">
            <X size={16} />
          </button>
        </div>
      )}
    </header>
  )
}

export function Logo({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--c-acento)" />
      <path d="M9 16.5l4.5 4.5L23 11.5" fill="none" stroke="var(--c-sobre-acento)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
