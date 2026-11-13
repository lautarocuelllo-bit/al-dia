import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowSquareOut, CalendarBlank, CheckCircle, DownloadSimple, Paperclip, WarningCircle } from '@phosphor-icons/react'
import { detalleTarea, urlConSesion, urlDeArchivo } from '../lib/moodle'
import type { DetalleTarea, Pendiente, Sesion } from '../lib/moodle'
import { abrirEnNavegador } from '../lib/plataforma'
import { formatoFecha, relativo, tamanoArchivo } from '../lib/tiempo'
import { Girando, HtmlCampus, Materia, NotaError } from './ui'

export function Detalle({ sesion, p, volver }: { sesion: Sesion; p: Pendiente; volver: () => void }) {
  const [detalle, setDetalle] = useState<DetalleTarea | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [abriendo, setAbriendo] = useState(false)

  useEffect(() => {
    let vigente = true
    detalleTarea(sesion, p)
      .then((d) => vigente && setDetalle(d))
      .catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudo cargar la tarea.'))
    return () => {
      vigente = false
    }
  }, [sesion, p])

  // Volver con Escape
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && volver()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [volver])

  const arreglarUrl = useCallback((u: string) => urlDeArchivo(sesion, u), [sesion])

  async function abrirEnCampus() {
    setAbriendo(true)
    await abrirEnNavegador(await urlConSesion(sesion, p.url))
    setAbriendo(false)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-borde px-1.5 py-1.5">
        <button type="button" onClick={volver} className="boton-icono" aria-label="Volver">
          <ArrowLeft size={16} />
        </button>
        <span className="truncate text-sm text-suave">Pendientes</span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <Materia id={p.curso.id} nombre={p.curso.nombre} />
          <h1 className="seleccionable mt-1 text-lg leading-snug font-semibold tracking-tight">{p.titulo}</h1>
        </div>

        <div
          className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm ${
            p.atrasada ? 'bg-alerta-fondo text-alerta' : 'bg-panel-2'
          }`}
        >
          {p.atrasada ? <WarningCircle size={18} className="mt-0.5 shrink-0" /> : <CalendarBlank size={18} className="mt-0.5 shrink-0 text-suave" />}
          <div>
            <p className="font-medium first-letter:uppercase">{formatoFecha(p.vence)}</p>
            <p className={p.atrasada ? '' : 'text-suave'}>
              {p.atrasada ? `Venció ${relativo(p.vence)}` : `Vence ${relativo(p.vence)}`}
              {detalle?.cierre && detalle.cierre > p.vence && ` · se acepta hasta el ${formatoFecha(detalle.cierre)}`}
            </p>
          </div>
        </div>

        {detalle?.entregada && (
          <p className="flex items-center gap-2 rounded-xl bg-acento-fondo px-3 py-2.5 text-sm text-acento">
            <CheckCircle size={18} weight="fill" /> Ya la entregaste.
          </p>
        )}

        <NotaError>{error}</NotaError>

        <section>
          <h2 className="etiqueta">Consigna</h2>
          {detalle ? (
            <HtmlCampus html={detalle.consigna} arreglarUrl={arreglarUrl} />
          ) : !error ? (
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-panel-2" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-panel-2" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-panel-2" />
            </div>
          ) : null}
        </section>

        {!!detalle?.archivos.length && (
          <section>
            <h2 className="etiqueta">Archivos del profe</h2>
            <ul className="overflow-hidden rounded-xl border border-borde bg-panel">
              {detalle.archivos.map((a) => (
                <li key={a.url} className="border-b border-borde last:border-0">
                  <button
                    type="button"
                    onClick={() => abrirEnNavegador(a.url)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-panel-2"
                  >
                    <Paperclip size={16} className="shrink-0 text-suave" />
                    <span className="min-w-0 flex-1 truncate text-sm">{a.nombre}</span>
                    <span className="text-xs text-suave tabular-nums">{tamanoArchivo(a.tamano)}</span>
                    <DownloadSimple size={15} className="shrink-0 text-suave" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="border-t border-borde p-3">
        <button type="button" onClick={abrirEnCampus} className="boton-primario w-full" disabled={abriendo}>
          {abriendo ? <Girando /> : <ArrowSquareOut size={16} />}
          {p.accion ? `${p.accion} en el campus` : 'Abrir en el campus'}
        </button>
      </div>
    </div>
  )
}
