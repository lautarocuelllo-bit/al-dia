import { useState } from 'react'
import { ArrowClockwise, Bell, GearSix, ListChecks } from '@phosphor-icons/react'
import { useCampus } from './lib/useCampus'
import { useAjustes } from './lib/ajustes'
import type { Pendiente } from './lib/moodle'
import { relativo } from './lib/tiempo'
import { BarraTitulo } from './components/BarraTitulo'
import { Ingresar } from './components/Ingresar'
import { Pendientes } from './components/Pendientes'
import { Detalle } from './components/Detalle'
import { Avisos } from './components/Avisos'
import { AjustesPantalla } from './components/AjustesPantalla'
import { Girando } from './components/ui'

type Pestana = 'pendientes' | 'avisos' | 'ajustes'

export function App() {
  const campus = useCampus()
  const { ajustes, cambiar } = useAjustes()
  const [pestana, setPestana] = useState<Pestana>('pendientes')
  const [seleccion, setSeleccion] = useState<Pendiente | null>(null)

  let contenido
  if (campus.cargandoSesion) {
    contenido = (
      <div className="grid h-full place-items-center text-suave">
        <Girando />
      </div>
    )
  } else if (!campus.sesion) {
    contenido = <Ingresar entrar={campus.entrar} />
  } else if (seleccion) {
    contenido = <Detalle sesion={campus.sesion} p={seleccion} volver={() => setSeleccion(null)} />
  } else {
    const atrasadas = campus.pendientes.filter((p) => p.atrasada).length
    contenido = (
      <div className="flex h-full flex-col">
        <nav className="flex items-center gap-1 border-b border-borde px-2 py-1.5" aria-label="Secciones">
          <Tab activa={pestana === 'pendientes'} onClick={() => setPestana('pendientes')} icono={<ListChecks size={16} />}>
            Pendientes
            {campus.pendientes.length > 0 && (
              <Contador alerta={atrasadas > 0}>{campus.pendientes.length}</Contador>
            )}
          </Tab>
          <Tab activa={pestana === 'avisos'} onClick={() => setPestana('avisos')} icono={<Bell size={16} />}>
            Avisos
            {campus.sinLeer > 0 && <Contador>{campus.sinLeer}</Contador>}
          </Tab>
          <div className="flex-1" />
          <button
            type="button"
            onClick={campus.actualizar}
            className="boton-icono"
            disabled={campus.actualizando}
            title={campus.actualizado ? `Actualizado ${relativo(campus.actualizado / 1000)}` : 'Actualizar'}
            aria-label="Actualizar"
          >
            <ArrowClockwise size={16} className={campus.actualizando ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setPestana('ajustes')}
            className={`boton-icono ${pestana === 'ajustes' ? 'bg-panel-2 text-texto' : ''}`}
            aria-label="Ajustes"
            aria-pressed={pestana === 'ajustes'}
          >
            <GearSix size={16} />
          </button>
        </nav>

        {campus.error && (
          <p role="alert" className="border-b border-borde bg-alerta-fondo px-4 py-2 text-xs text-alerta">
            {campus.error}
          </p>
        )}

        <main className="flex-1 overflow-y-auto">
          {pestana === 'pendientes' && (
            <Pendientes lista={campus.pendientes} cargando={campus.actualizando || !campus.actualizado} abrir={setSeleccion} />
          )}
          {pestana === 'avisos' && <Avisos sesion={campus.sesion} lista={campus.avisos} marcarLeido={campus.marcarAvisoLeido} />}
          {pestana === 'ajustes' && (
            <AjustesPantalla sesion={campus.sesion} ajustes={ajustes} cambiar={cambiar} cerrarSesion={campus.cerrarSesion} />
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-fondo">
      <BarraTitulo ajustes={ajustes} cambiar={cambiar} />
      {/* Cada pantalla tiene su propio scroll (así la lista no queda corrida al volver del detalle) */}
      <div className="min-h-0 flex-1 overflow-hidden">{contenido}</div>
    </div>
  )
}

function Tab({
  activa,
  onClick,
  icono,
  children,
}: {
  activa: boolean
  onClick: () => void
  icono: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-suave transition hover:text-texto aria-pressed:bg-panel-2 aria-pressed:text-texto"
    >
      {icono}
      {children}
    </button>
  )
}

function Contador({ children, alerta = false }: { children: React.ReactNode; alerta?: boolean }) {
  return (
    <span
      className={`min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold tabular-nums ${
        alerta ? 'bg-alerta text-white' : 'bg-acento text-sobre-acento'
      }`}
    >
      {children}
    </span>
  )
}
