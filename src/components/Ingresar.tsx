import { useState, type FormEvent } from 'react'
import { Eye, EyeSlash, LockKey } from '@phosphor-icons/react'
import { normalizarSitio } from '../lib/moodle'
import { Girando, NotaError } from './ui'
import { Logo } from './BarraTitulo'

export function Ingresar({ entrar }: { entrar: (sitio: string, usuario: string, clave: string) => Promise<void> }) {
  const [sitio, setSitio] = useState(() => localStorage.getItem('aldia-ultimo-sitio') ?? '')
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    try {
      await entrar(normalizarSitio(sitio), usuario, clave)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
      setOcupado(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="flex min-h-full flex-col justify-center px-6 py-8">
      <div className="mb-7">
        <Logo className="mb-4 size-10" />
        <h1 className="text-xl font-semibold tracking-tight">Tu campus, al día</h1>
        <p className="mt-1 text-sm text-suave">Las entregas de todas tus materias en un solo lugar, sin entrar al campus.</p>
      </div>

      <form onSubmit={enviar} className="space-y-3.5">
        <div>
          <label className="etiqueta" htmlFor="sitio">
            Dirección del campus
          </label>
          <input
            id="sitio"
            className="campo"
            value={sitio}
            onChange={(e) => setSitio(e.target.value)}
            placeholder="campus.tuinstituto.edu.ar"
            autoComplete="url"
            spellCheck={false}
            required
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="usuario">
            Usuario
          </label>
          <input
            id="usuario"
            className="campo"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            spellCheck={false}
            required
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="clave">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="clave"
              className="campo pr-10"
              type={verClave ? 'text' : 'password'}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setVerClave((v) => !v)}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-suave hover:text-texto"
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {verClave ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <NotaError>{error}</NotaError>

        <button className="boton-primario w-full py-2.5" disabled={ocupado}>
          {ocupado && <Girando />}
          Entrar
        </button>
      </form>

      <p className="mt-5 flex gap-2 text-xs leading-relaxed text-suave">
        <LockKey size={14} className="mt-0.5 shrink-0" />
        Tu contraseña va directo a tu campus y no se guarda. La app guarda solo el acceso que da Moodle, en el
        llavero de tu sistema.
      </p>
    </div>
    </div>
  )
}
