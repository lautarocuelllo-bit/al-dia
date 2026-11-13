import { useEffect, useState, type ReactNode } from 'react'
import { SignOut } from '@phosphor-icons/react'
import type { Ajustes, Tema } from '../lib/ajustes'
import type { Sesion } from '../lib/moodle'
import { enEscritorio, iniciarConElSistema, notificar } from '../lib/plataforma'

const RECORDATORIOS = [
  { valor: 0, texto: 'No avisar' },
  { valor: 1, texto: '1 hora antes' },
  { valor: 3, texto: '3 horas antes' },
  { valor: 12, texto: '12 horas antes' },
  { valor: 24, texto: '1 día antes' },
  { valor: 48, texto: '2 días antes' },
]

const TEMAS: { valor: Tema; texto: string }[] = [
  { valor: 'sistema', texto: 'Sistema' },
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
]

export function AjustesPantalla({
  sesion,
  ajustes,
  cambiar,
  cerrarSesion,
}: {
  sesion: Sesion
  ajustes: Ajustes
  cambiar: (a: Partial<Ajustes>) => void
  cerrarSesion: () => void
}) {
  const [autoinicio, setAutoinicio] = useState<boolean | null>(null)

  useEffect(() => {
    iniciarConElSistema().then(setAutoinicio).catch(() => setAutoinicio(null))
  }, [])

  return (
    <div className="space-y-5 px-4 py-4">
      <Grupo titulo="Recordatorios">
        <Fila texto="Avisarme de cada entrega">
          <select
            className="campo w-auto py-1.5"
            value={ajustes.recordatorioHoras}
            onChange={(e) => {
              const valor = Number(e.target.value)
              cambiar({ recordatorioHoras: valor })
              // Pide el permiso de notificaciones al activarlas
              if (valor) notificar('Recordatorios activados', 'Te voy a avisar antes de cada entrega.')
            }}
          >
            {RECORDATORIOS.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.texto}
              </option>
            ))}
          </select>
        </Fila>
        <Fila texto="Avisos nuevos de los profes">
          <Interruptor activo={ajustes.notificarAvisos} alCambiar={(v) => cambiar({ notificarAvisos: v })} />
        </Fila>
      </Grupo>

      <Grupo titulo="Ventana">
        <Fila texto="Tema">
          <div className="flex rounded-lg border border-borde bg-panel-2 p-0.5">
            {TEMAS.map((t) => (
              <button
                key={t.valor}
                type="button"
                onClick={() => cambiar({ tema: t.valor })}
                aria-pressed={ajustes.tema === t.valor}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-suave transition aria-pressed:bg-panel aria-pressed:text-texto aria-pressed:shadow-sm"
              >
                {t.texto}
              </button>
            ))}
          </div>
        </Fila>
        {enEscritorio && autoinicio !== null && (
          <Fila texto="Abrir al iniciar la compu">
            <Interruptor activo={autoinicio} alCambiar={(v) => iniciarConElSistema(v).then(setAutoinicio)} />
          </Fila>
        )}
      </Grupo>

      <Grupo titulo="Cuenta">
        <div className="px-3 py-2.5">
          <p className="text-sm font-medium">{sesion.nombre}</p>
          <p className="truncate text-xs text-suave">{sesion.nombreSitio}</p>
          <p className="truncate text-xs text-suave">{sesion.sitio.replace(/^https?:\/\//, '')}</p>
        </div>
        <div className="px-3 pb-3">
          <button type="button" onClick={cerrarSesion} className="boton-secundario w-full text-alerta">
            <SignOut size={16} /> Cerrar sesión
          </button>
        </div>
      </Grupo>

      <p className="pb-2 text-center text-xs text-suave">
        Al Día · Hecho por Lautaro Cuello · Genesis CodeStudio
        <br />
        Código abierto. Sin servidores propios: la app habla solo con tu campus.
      </p>
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-suave uppercase">{titulo}</h2>
      <div className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-panel">{children}</div>
    </section>
  )
}

function Fila({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-3 py-2">
      <span className="text-sm">{texto}</span>
      {children}
    </div>
  )
}

function Interruptor({ activo, alCambiar }: { activo: boolean; alCambiar: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => alCambiar(!activo)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition ${activo ? 'bg-acento' : 'bg-borde'}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${activo ? 'left-[1.125rem]' : 'left-0.5'}`} />
    </button>
  )
}
