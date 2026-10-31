import { useEffect, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'

const buttonStyles = {
  primary: 'bg-ops-primary text-white hover:bg-ops-primary-hover disabled:bg-ops-line disabled:text-ops-muted disabled:hover:bg-ops-line',
  secondary: 'border border-ops-line bg-ops-panel text-ops-text hover:bg-ops-panel/70',
  subtle: 'text-ops-muted hover:bg-ops-panel hover:text-ops-text',
  danger: 'bg-rose-700 text-white hover:bg-rose-800 disabled:bg-ops-line disabled:text-ops-muted disabled:hover:bg-ops-line',
} as const

export function Button({ variant = 'secondary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return <button {...props} className={cn('inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent', buttonStyles[variant], className)} />
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('rounded-xl border border-ops-line bg-ops-panel shadow-sm', className)} />
}

const badgeColor: Record<string, string> = {
  operational: 'bg-ops-success-bg text-ops-success ring-ops-success/20', active: 'bg-ops-info-bg text-ops-info ring-ops-info/20', idle: 'bg-ops-neutral-bg text-ops-neutral ring-ops-neutral/20',
  attention: 'bg-ops-warning-bg text-ops-warning ring-ops-warning/20', maintenance: 'bg-ops-caution-bg text-ops-caution ring-ops-caution/20', offline: 'bg-ops-danger-bg text-ops-danger ring-ops-danger/20',
  critical: 'bg-ops-danger-bg text-ops-danger ring-ops-danger/20', high: 'bg-ops-caution-bg text-ops-caution ring-ops-caution/20', medium: 'bg-ops-warning-bg text-ops-warning ring-ops-warning/20', low: 'bg-ops-info-bg text-ops-info ring-ops-info/20',
  open: 'bg-ops-danger-bg text-ops-danger ring-ops-danger/20', acknowledged: 'bg-ops-warning-bg text-ops-warning ring-ops-warning/20', resolved: 'bg-ops-success-bg text-ops-success ring-ops-success/20',
  scheduled: 'bg-ops-info-bg text-ops-info ring-ops-info/20', 'in-progress': 'bg-ops-warning-bg text-ops-warning ring-ops-warning/20', completed: 'bg-ops-success-bg text-ops-success ring-ops-success/20', cancelled: 'bg-ops-neutral-bg text-ops-neutral ring-ops-neutral/20', draft: 'bg-ops-neutral-bg text-ops-neutral ring-ops-neutral/20',
}

export function Badge({ children, tone, className }: { children: ReactNode; tone?: string; className?: string }) {
  const key = tone ?? (typeof children === 'string' ? children.toLowerCase() : '')
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset', badgeColor[key] ?? 'bg-ops-neutral-bg text-ops-muted ring-ops-line', className)}>{children}</span>
}

export function PageHeading({ eyebrow, title, actions }: { eyebrow?: string; title: string; actions?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ops-accent-text">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight text-ops-text sm:text-[28px]">{title}</h1></div>{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}</div>
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return <label className={cn('grid gap-1.5 text-sm', className)}><span className="font-medium text-ops-text">{label}</span>{children}{hint && <span className="text-xs text-ops-muted">{hint}</span>}</label>
}

const inputClass = 'min-h-10 w-full rounded-lg border border-ops-line bg-ops-bg px-3 text-sm text-ops-text placeholder:text-ops-muted focus:border-ops-accent focus:ring-2 focus:ring-ops-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent'
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={cn(inputClass, props.className)} /> }
export { Select } from './ui/Select'
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={cn(inputClass, 'min-h-24 resize-y py-2.5', props.className)} /> }

export function Modal({ open, onClose, title, children, footer, size = 'max-w-xl' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: string }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])
  if (!open) return null
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="modal-title" className={cn('my-auto w-full rounded-xl border border-ops-line bg-ops-panel shadow-2xl', size)}><header className="flex items-center justify-between border-b border-ops-line px-5 py-4"><h2 id="modal-title" className="text-base font-semibold text-ops-text">{title}</h2><Button variant="subtle" className="h-8 min-h-8 w-8 p-0" onClick={onClose} aria-label="Close dialog"><X size={16} /></Button></header><div className="max-h-[min(72vh,720px)] overflow-y-auto p-5">{children}</div>{footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-ops-line px-5 py-4">{footer}</footer>}</section></div>
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-ops-line px-5 py-8 text-center"><div><p className="font-medium text-ops-text">{title}</p><p className="mt-1 text-sm text-ops-muted">{detail}</p>{action && <div className="mt-4">{action}</div>}</div></div>
}

export function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-ops-text">{title}</h2>{detail && <p className="mt-1 text-xs text-ops-muted">{detail}</p>}</div>{action}</div>
}
