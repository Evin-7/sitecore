import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  required?: boolean
  clearable?: boolean
  placeholder?: string
  'aria-label'?: string
}

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const weekdayShortNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const accessibleDateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return year && month && day ? new Date(year, month - 1, day) : new Date()
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function dateLabel(value: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function monthLabel(date: Date) {
  return monthFormatter.format(date)
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function moveDateByMonths(date: Date, amount: number) {
  const targetMonth = shiftMonth(date, amount)
  const finalDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate()
  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(date.getDate(), finalDay))
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  required = false,
  clearable = false,
  placeholder = 'dd/mm/yyyy',
  'aria-label': ariaLabel = 'Choose date',
}: DatePickerProps) {
  const pickerId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const dayRefs = useRef(new Map<string, HTMLButtonElement>())
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(value ? parseDate(value) : new Date()))
  const [focusedDate, setFocusedDate] = useState(() => value || toDateKey(new Date()))
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null)
  const todayKey = toDateKey(new Date())
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const calendarDays = Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1))
  const rows = Array.from({ length: 6 }, (_, index) => calendarDays.slice(index * 7, (index + 1) * 7))

  const isUnavailable = (date: Date) => {
    const key = toDateKey(date)
    return Boolean((min && key < min) || (max && key > max))
  }

  const openCalendar = () => {
    if (disabled) return
    const initialDate = value ? parseDate(value) : new Date()
    setFocusedDate(toDateKey(initialDate))
    setMonth(startOfMonth(initialDate))
    setPosition(null)
    setOpen(true)
  }

  const selectDate = (date: Date) => {
    if (isUnavailable(date)) return
    onChange(toDateKey(date))
    setOpen(false)
    triggerRef.current?.focus()
  }

  const focusCalendarDate = (date: Date, direction: -1 | 1 = 1) => {
    let next = date
    for (let attempts = 0; attempts < 370 && isUnavailable(next); attempts += 1) {
      next = new Date(next.getFullYear(), next.getMonth(), next.getDate() + direction)
    }
    if (isUnavailable(next)) return
    const key = toDateKey(next)
    setFocusedDate(key)
    setMonth(startOfMonth(next))
  }

  const handleDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    let next: Date | null = null
    if (event.key === 'ArrowLeft') next = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
    if (event.key === 'ArrowRight') next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    if (event.key === 'ArrowUp') next = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7)
    if (event.key === 'ArrowDown') next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7)
    if (event.key === 'Home') next = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
    if (event.key === 'End') next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (6 - date.getDay()))
    if (event.key === 'PageUp') next = moveDateByMonths(date, -1)
    if (event.key === 'PageDown') next = moveDateByMonths(date, 1)
    if (next) {
      event.preventDefault()
      focusCalendarDate(next, next < date ? -1 : 1)
    }
  }

  useLayoutEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(320, window.innerWidth - 24)
      const height = 360
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
      const belowTop = rect.bottom + 8
      const top = belowTop + height <= window.innerHeight - 12
        ? belowTop
        : Math.max(12, rect.top - height - 8)
      setPosition({ left, top, width })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [open])

  useEffect(() => {
    if (!open || !position) return
    const frame = window.requestAnimationFrame(() => dayRefs.current.get(focusedDate)?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [focusedDate, open, position])

  return <>
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      aria-label={`${ariaLabel}${value ? `, ${dateLabel(value)}` : ''}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? pickerId : undefined}
      aria-required={required || undefined}
      onClick={() => open ? setOpen(false) : openCalendar()}
      className="inline-flex h-10 min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-ops-line bg-ops-bg px-3.5 text-left text-sm text-ops-text shadow-sm outline-none transition-colors hover:border-ops-muted focus-visible:border-ops-accent focus-visible:ring-2 focus-visible:ring-ops-accent/25 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className={cn('truncate', !value && 'text-ops-muted')}>{value ? dateLabel(value) : placeholder}</span>
      <CalendarDays aria-hidden="true" size={16} className="shrink-0 text-ops-muted" />
    </button>
    {open && position && typeof document !== 'undefined' && createPortal(
      <div
        ref={popoverRef}
        id={pickerId}
        role="dialog"
        aria-label={`${ariaLabel} calendar`}
        className="fixed z-[100] max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl border border-ops-line bg-ops-panel p-3 text-ops-text shadow-2xl"
        style={{ left: position.left, top: position.top, width: position.width }}
      >
        <div className="mb-2 flex items-center justify-between">
          <p aria-live="polite" className="px-1 text-sm font-semibold">{monthLabel(month)}</p>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous month" onClick={() => { const next = shiftMonth(month, -1); setMonth(next); focusCalendarDate(new Date(next.getFullYear(), next.getMonth(), 1)) }} className="grid h-8 w-8 place-items-center rounded-md text-ops-muted transition hover:bg-ops-bg hover:text-ops-text focus-visible:outline-2 focus-visible:outline-ops-accent"><ChevronLeft size={16}/></button>
            <button type="button" aria-label="Next month" onClick={() => { const next = shiftMonth(month, 1); setMonth(next); focusCalendarDate(new Date(next.getFullYear(), next.getMonth(), 1)) }} className="grid h-8 w-8 place-items-center rounded-md text-ops-muted transition hover:bg-ops-bg hover:text-ops-text focus-visible:outline-2 focus-visible:outline-ops-accent"><ChevronRight size={16}/></button>
          </div>
        </div>
        <div role="grid" aria-label={monthLabel(month)}>
          <div role="row" className="mb-1 grid grid-cols-7">
            {weekdayShortNames.map((day, index) => <div role="columnheader" aria-label={weekdayNames[index]} key={day} className="grid h-8 place-items-center text-[11px] font-medium text-ops-muted">{day}</div>)}
          </div>
          {rows.map((week, weekIndex) => <div role="row" key={weekIndex} className="grid grid-cols-7">
            {week.map((day) => {
              const key = toDateKey(day)
              const isSelected = key === value
              const isToday = key === todayKey
              const isCurrentMonth = day.getMonth() === month.getMonth()
              const unavailable = isUnavailable(day)
              return <div role="gridcell" key={key} className="grid h-9 place-items-center">
                <button
                  ref={(element) => { if (element) dayRefs.current.set(key, element); else dayRefs.current.delete(key) }}
                  type="button"
                  disabled={unavailable}
                  tabIndex={key === focusedDate && !unavailable ? 0 : -1}
                  aria-label={accessibleDateFormatter.format(day)}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => selectDate(day)}
                  onKeyDown={(event) => handleDayKeyDown(event, day)}
                  className={cn(
                    'relative grid h-8 w-8 place-items-center rounded-md text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ops-accent',
                    isSelected ? 'bg-ops-primary font-semibold text-white hover:bg-ops-primary-hover' : 'hover:bg-ops-bg',
                    !isCurrentMonth && !isSelected && 'text-ops-muted/55',
                    isToday && !isSelected && 'font-semibold text-ops-accent-text ring-1 ring-inset ring-ops-accent/35',
                    unavailable && 'cursor-not-allowed opacity-35 hover:bg-transparent',
                  )}
                >{day.getDate()}</button>
              </div>
            })}
          </div>)}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-ops-line pt-2">
          {clearable
            ? <button type="button" onClick={() => { onChange(''); setOpen(false); triggerRef.current?.focus() }} disabled={!value} className="rounded-md px-2 py-1.5 text-xs font-medium text-ops-accent-text hover:bg-ops-accent-bg disabled:cursor-not-allowed disabled:opacity-40">Clear</button>
            : <span />}
          <button type="button" onClick={() => selectDate(new Date())} disabled={isUnavailable(new Date())} className="rounded-md px-2 py-1.5 text-xs font-medium text-ops-accent-text hover:bg-ops-accent-bg disabled:cursor-not-allowed disabled:opacity-40">Today</button>
        </div>
      </div>,
      document.body,
    )}
  </>
}
