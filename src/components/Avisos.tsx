import { useCallback, useState } from 'react'
import { ArrowSquareOut, BellSimpleSlash } from '@phosphor-icons/react'
import type { Aviso, Sesion } from '../lib/moodle'
import { urlConSesion, urlDeArchivo } from '../lib/moodle'
import { abrirEnNavegador } from '../lib/plataforma'
import { formatoDia, formatoHora } from '../lib/tiempo'
import { HtmlCampus } from './ui'

export function Avisos({
  sesion,
  lista,
  marcarLeido,
}: {
  sesion: Sesion
  lista: Aviso[]
  marcarLeido: (id: number) => void
}) {
  const [abierto, setAbierto] = useState<number | null>(null)
  const arreglarUrl = useCallback((u: string) => urlDeArchivo(sesion, u), [sesion])

  if (!lista.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <BellSimpleSlash size={36} weight="duotone" className="mb-3 text-suave" />
        <p className="font-semibold">Sin avisos</p>
        <p className="mt-1 text-sm text-suave">Acá aparecen los avisos de tus profes y las notificaciones del campus.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-borde">
      {lista.map((a) => {
        const abiertoEste = abierto === a.id
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => {
                setAbierto(abiertoEste ? null : a.id)
                if (!a.leido) marcarLeido(a.id)
              }}
              className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-panel-2"
              aria-expanded={abiertoEste}
            >
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${a.leido ? 'bg-transparent' : 'bg-acento'}`} />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${a.leido ? '' : 'font-semibold'} ${abiertoEste ? '' : 'line-clamp-2'}`}>{a.titulo}</span>
                <span className="mt-0.5 block text-xs text-suave">
                  {a.autor && `${a.autor} · `}
                  {formatoDia(a.fecha)}, {formatoHora(a.fecha)}
                </span>
              </span>
            </button>
            {abiertoEste && (
              <div className="space-y-3 px-4 pb-4 pl-[2.1rem]">
                <HtmlCampus html={a.texto} arreglarUrl={arreglarUrl} />
                {a.url && (
                  <button
                    type="button"
                    onClick={async () => abrirEnNavegador(await urlConSesion(sesion, a.url!))}
                    className="boton-secundario"
                  >
                    <ArrowSquareOut size={15} /> Ver en el campus
                  </button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
