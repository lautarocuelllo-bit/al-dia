import { useMemo } from 'react'
import { CaretRight, CheckCircle, Exam, FileText, ChatsCircle, ClipboardText } from '@phosphor-icons/react'
import type { Pendiente } from '../lib/moodle'
import { agrupar, formatoDia, formatoHora, relativo } from '../lib/tiempo'
import { Materia } from './ui'

const ICONOS: Record<string, typeof FileText> = { assign: FileText, quiz: Exam, forum: ChatsCircle }

export function Pendientes({
  lista,
  cargando,
  abrir,
}: {
  lista: Pendiente[]
  cargando: boolean
  abrir: (p: Pendiente) => void
}) {
  const grupos = useMemo(() => agrupar(lista), [lista])

  if (cargando && !lista.length) return <Esqueleto />

  if (!lista.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <CheckCircle size={40} weight="duotone" className="mb-3 text-acento" />
        <p className="font-semibold">Estás al día</p>
        <p className="mt-1 text-sm text-suave">No hay entregas pendientes en tus materias.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-3 py-3">
      {grupos.map((g) => (
        <section key={g.clave}>
          <h2
            className={`mb-1.5 flex items-center justify-between px-1 text-xs font-semibold tracking-wide uppercase ${
              g.clave === 'atrasadas' ? 'text-alerta' : 'text-suave'
            }`}
          >
            {g.titulo}
            <span className="font-medium tabular-nums">{g.items.length}</span>
          </h2>
          <ul className="overflow-hidden rounded-xl border border-borde bg-panel">
            {g.items.map((p) => (
              <Fila key={p.id} p={p} grupo={g.clave} abrir={abrir} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Fila({ p, grupo, abrir }: { p: Pendiente; grupo: string; abrir: (p: Pendiente) => void }) {
  const Icono = ICONOS[p.modulo] ?? ClipboardText
  const urgente = grupo === 'hoy' || grupo === 'atrasadas'
  return (
    <li className="border-b border-borde last:border-0">
      <button
        type="button"
        onClick={() => abrir(p)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-panel-2"
      >
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${
            grupo === 'atrasadas' ? 'bg-alerta-fondo text-alerta' : grupo === 'hoy' ? 'bg-pronto-fondo text-pronto' : 'bg-panel-2 text-suave'
          }`}
        >
          <Icono size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug font-medium" title={p.titulo}>
            {p.titulo}
          </span>
          <Materia id={p.curso.id} nombre={p.curso.corto || p.curso.nombre} />
        </span>
        <span className="shrink-0 text-right">
          <span className={`block text-xs font-semibold tabular-nums ${urgente ? (grupo === 'atrasadas' ? 'text-alerta' : 'text-pronto') : ''}`}>
            {grupo === 'hoy' || grupo === 'manana' ? formatoHora(p.vence) : formatoDia(p.vence)}
          </span>
          <span className="block text-[11px] text-suave">{relativo(p.vence)}</span>
        </span>
        <CaretRight size={14} className="shrink-0 text-suave" />
      </button>
    </li>
  )
}

function Esqueleto() {
  return (
    <div className="space-y-4 px-3 py-3" aria-label="Cargando">
      {[3, 2].map((n, i) => (
        <div key={i}>
          <div className="mb-2 ml-1 h-3 w-20 animate-pulse rounded bg-panel-2" />
          <div className="overflow-hidden rounded-xl border border-borde bg-panel">
            {Array.from({ length: n }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 border-b border-borde px-3 py-3 last:border-0">
                <div className="size-8 animate-pulse rounded-lg bg-panel-2" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-panel-2" />
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-panel-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
