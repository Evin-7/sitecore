import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../lib/cn'

const emptyValue = '__sitecore_select_empty__'

type OptionProps = {
  value?: string | number
  label?: string
  disabled?: boolean
  children?: ReactNode
}

type Option = {
  value: string
  label: ReactNode
  textValue: string
  disabled?: boolean
}

export type SelectProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: ReactNode
  children: ReactNode
  className?: string
  startIcon?: ReactNode
  disabled?: boolean
  name?: string
  required?: boolean
  autoComplete?: string
  form?: string
  id?: string
  title?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'grammar' | 'spelling'
}

function textContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textContent).join(' ')
  if (isValidElement<{ children?: ReactNode }>(node)) return textContent(node.props.children)
  return ''
}

function getOptions(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<OptionProps>(child) || child.type !== 'option') return []
    const option = child as ReactElement<OptionProps>
    const label = option.props.label ?? option.props.children
    const value = String(option.props.value ?? textContent(label))
    return [{ value, label, textValue: textContent(label), disabled: option.props.disabled }]
  })
}

function toRadixValue(value: string | undefined) {
  return value === '' ? emptyValue : value
}

function fromRadixValue(value: string) {
  return value === emptyValue ? '' : value
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  placeholder,
  children,
  className,
  startIcon,
  disabled,
  name,
  required,
  autoComplete,
  form,
  ...triggerProps
}: SelectProps) {
  const options = getOptions(children)
  const isInvalid = triggerProps['aria-invalid'] !== undefined && triggerProps['aria-invalid'] !== false

  return (
    <SelectPrimitive.Root
      value={toRadixValue(value)}
      defaultValue={toRadixValue(defaultValue)}
      onValueChange={(nextValue) => onValueChange?.(fromRadixValue(nextValue))}
      disabled={disabled}
      name={name}
      required={required}
      autoComplete={autoComplete}
      form={form}
    >
      <SelectPrimitive.Trigger
        {...triggerProps}
        disabled={disabled}
        className={cn(
          'inline-flex h-10 min-h-10 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-ops-line bg-ops-bg px-3.5 text-left text-sm text-ops-text shadow-sm outline-none transition-colors placeholder:text-ops-muted hover:border-ops-muted focus-visible:border-ops-accent focus-visible:ring-2 focus-visible:ring-ops-accent/25 data-[placeholder]:text-ops-muted disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55',
          className,
          isInvalid && 'border-ops-danger focus-visible:border-ops-danger focus-visible:ring-ops-danger/25',
        )}
      >
        {startIcon && <span aria-hidden="true" className="inline-flex shrink-0 items-center text-ops-muted">{startIcon}</span>}
        <span className="min-w-0 flex-1 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon aria-hidden="true" className="shrink-0 text-ops-muted">
          <ChevronDown size={16} strokeWidth={1.8} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={5}
          collisionPadding={8}
          className="z-[70] w-max min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1rem)] max-h-[min(18rem,var(--radix-select-content-available-height))] overflow-hidden rounded-xl border border-ops-line bg-ops-panel p-1.5 text-ops-text shadow-xl outline-none data-[state=open]:animate-[sitecore-select-in_100ms_ease-out]"
        >
          <SelectPrimitive.ScrollUpButton aria-hidden="true" className="flex h-5 items-center justify-center text-ops-muted">
            <ChevronUp size={14} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="max-h-[min(18rem,var(--radix-select-content-available-height))]">
            {options.map((option, index) => (
              <SelectPrimitive.Item
                key={`${option.value}-${index}`}
                value={toRadixValue(option.value)!}
                textValue={option.textValue}
                disabled={option.disabled}
                className="relative flex min-h-9 cursor-default select-none items-center whitespace-nowrap rounded-md py-2 pl-3 pr-9 text-sm leading-5 text-ops-text outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-ops-accent-bg data-[highlighted]:text-ops-accent-text data-[state=checked]:font-medium"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex items-center text-ops-accent-text">
                  <Check size={15} strokeWidth={2} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton aria-hidden="true" className="flex h-5 items-center justify-center text-ops-muted">
            <ChevronDown size={14} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
