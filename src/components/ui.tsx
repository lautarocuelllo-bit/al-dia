import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import DOMPurify from 'dompurify'
import { CircleNotch } from '@phosphor-icons/react'
import { abrirEnNavegador } from '../lib/plataforma'
import { tonoDeCurso } from '../lib/tiempo'

export function Girando({ className = '' }: { className?: string }) {
  return <CircleNotch className={`animate-spin ${className}`} size={16} />
}

export function NotaError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-lg bg-alerta-fondo px-3 py-2 text-sm text-alerta">
      {children}
    </p>
  )
}

/** Etiqueta de la materia con un color propio */
export function Materia({ id, nombre }: { id: number; nombre: string }) {
  const h = tonoDeCurso(id)
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 truncate text-xs font-medium text-suave"
      title={nombre}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ background: `oklch(0.68 0.14 ${h})` }} />
      <span className="truncate">{nombre}</span>
    </span>
  )
}

/**
 * HTML que viene del campus (consignas, avisos). Se limpia con DOMPurify porque lo escribe otra persona
 * y la app tiene acceso al sistema; los enlaces se abren en el navegador y las imágenes del campus llevan el token.
 */
export function HtmlCampus({ html, arreglarUrl }: { html: string; arreglarUrl?: (url: string) => string }) {
  const ref = useRef<HTMLDivElement>(null)
  const limpio = useMemo(() => {
    const frag = DOMPurify.sanitize(html, { FORBID_TAGS: ['style', 'form', 'input', 'button'], FORBID_ATTR: ['style'] })
    if (!arreglarUrl) return frag
    const doc = new DOMParser().parseFromString(frag, 'text/html')
    doc.querySelectorAll('img[src*="pluginfile.php"]').forEach((img) => {
      img.setAttribute('src', arreglarUrl(img.getAttribute('src')!))
    })
    return doc.body.innerHTML
  }, [html, arreglarUrl])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const alHacerClic = (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement).closest('a')
      if (!a?.href) return
      ev.preventDefault()
      abrirEnNavegador(a.href)
    }
    el.addEventListener('click', alHacerClic)
    return () => el.removeEventListener('click', alHacerClic)
  }, [])

  if (!limpio.trim()) return <p className="text-sm text-suave">Sin descripción.</p>
  return <div ref={ref} className="contenido-campus text-sm" dangerouslySetInnerHTML={{ __html: limpio }} />
}
