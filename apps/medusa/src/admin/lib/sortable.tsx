import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { CSS, type Transform } from "@dnd-kit/utilities"
import { IconButton } from "@medusajs/ui"
import { DotsSix } from "@medusajs/icons"
import type { CSSProperties, HTMLAttributes } from "react"

/**
 * Shared drag-and-drop helpers so the spec-template editor and the category
 * tree reorder rows the same way. We deliberately keep a single implementation
 * here (consistent feel) and avoid `@dnd-kit/modifiers` — the vertical-axis
 * lock is done by clamping the transform's x to 0, mirroring Medusa's own
 * dashboard CategoryTree.
 */

/** Pointer drag with a small activation distance so clicks still register, plus keyboard support. */
export function useSortableSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
}

/** Style for a sortable row — vertical-only motion (x clamped to 0). */
export function sortableStyle(
  transform: Transform | null,
  transition: string | undefined,
  isDragging: boolean
): CSSProperties {
  return {
    transform: CSS.Transform.toString(
      transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null
    ),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }
}

/**
 * Drag grip. Spread `useSortable`'s `attributes`/`listeners` onto this so only
 * the handle initiates a drag — the rest of the row (checkboxes, links, delete)
 * stays interactive.
 */
export function DragHandle(props: HTMLAttributes<HTMLButtonElement>) {
  return (
    <IconButton
      size="2xsmall"
      variant="transparent"
      className="cursor-grab touch-none active:cursor-grabbing"
      {...props}
    >
      <DotsSix className="text-ui-fg-muted" />
    </IconButton>
  )
}
