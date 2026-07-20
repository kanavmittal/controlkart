"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type ComboboxOption = { value: string; label: string }

/**
 * A searchable single-select built on Base UI's Combobox, styled to match the
 * project's `Input`/`Select`. Type to filter, click an option or use the
 * keyboard to select. Form submission is handled by the `name` prop, which
 * renders a hidden input carrying the selected option's `value`.
 */
function Combobox({
  options,
  value,
  onValueChange,
  name,
  id,
  placeholder,
  disabled,
  invalid,
  emptyText = "No results.",
  className,
}: {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  name?: string
  id?: string
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  emptyText?: string
  className?: string
}) {
  const selected = React.useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  )

  return (
    <ComboboxPrimitive.Root
      items={options}
      value={selected}
      onValueChange={(option: ComboboxOption | null) =>
        onValueChange(option?.value ?? "")
      }
      name={name}
      disabled={disabled}
    >
      <div className="relative">
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          className={cn(
            "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pr-9 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50",
            className
          )}
        />
        <ComboboxPrimitive.Trigger
          aria-label="Toggle options"
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground outline-none disabled:opacity-50"
        >
          <ChevronsUpDownIcon className="size-4 shrink-0" aria-hidden />
        </ComboboxPrimitive.Trigger>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={4} className="isolate z-50">
          <ComboboxPrimitive.Popup
            className={cn(
              "max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            )}
          >
            <ComboboxPrimitive.Empty className="px-2 py-3 text-center text-sm text-muted-foreground">
              {emptyText}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {(item: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" aria-hidden />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}

export { Combobox }
