import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, pointerWithin, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef, type PointerEvent, type ReactNode } from 'react'
import { Button } from './ui/button'

export function Reorder({ children, onDrop }: {
  children: ReactNode
  onDrop: (event: DragEndEvent) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => args.pointerCoordinates ? pointerWithin(args) : closestCenter(args)}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Appuyez sur Espace pour saisir, utilisez les flèches, puis appuyez de nouveau sur Espace. Échap annule.',
        },
        announcements: {
          onDragStart: () => 'Déplacement commencé.',
          onDragOver: () => undefined,
          onDragEnd: ({ over }) => over ? 'Destination sélectionnée.' : 'Déplacement annulé.',
          onDragCancel: () => 'Déplacement annulé.',
        },
      }}
      onDragEnd={onDrop}
    >
      {children}
    </DndContext>
  )
}

export function SortableRow({ id, label, disabled = false, onSwipe, children }: {
  id: string
  label: string
  disabled?: boolean
  onSwipe?: () => void
  children: ReactNode
}) {
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging, isOver } =
    useSortable({ id, disabled })

  function beginSwipe(event: PointerEvent<HTMLLIElement>) {
    if (!onSwipe || event.pointerType === 'mouse' || !event.isPrimary ||
      !(event.target instanceof Element) ||
      event.target.closest('button, input, select, summary, details, a')) return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }

  function finishSwipe(event: PointerEvent<HTMLLIElement>) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    gesture.current = null
    const dx = start.x - event.clientX
    const dy = Math.abs(start.y - event.clientY)
    if (!isDragging && dx >= 48 && dx > dy * 1.5) onSwipe?.()
  }

  return (
    <li
      ref={setNodeRef}
      onPointerDown={beginSwipe}
      onPointerUp={finishSwipe}
      onPointerCancel={() => { gesture.current = null }}
      style={{ transform: CSS.Transform.toString(transform), touchAction: onSwipe ? 'pan-y' : undefined }}
      className={`relative flex min-h-11 items-center gap-2 bg-card px-2 py-1 ${isDragging ? 'z-10 opacity-75' : ''} ${isOver ? 'ring-2 ring-inset ring-ring' : ''}`}
    >
      {!disabled && (
        <Button
          variant="ghost"
          ref={setActivatorNodeRef}
          className="touch-none px-2"
          {...attributes}
          {...listeners}
          aria-label={`Déplacer ${label}`}
        >
          <span aria-hidden="true">⠿</span>
        </Button>
      )}
      {children}
    </li>
  )
}

export function CategoryDrop({ id, label }: { id: string; label: string }) {
  const { setNodeRef, isOver, active } = useDroppable({ id })
  if (!active) return null
  return (
    <div ref={setNodeRef} className={`min-h-11 rounded-lg border border-dashed p-2 ${isOver ? 'border-ring bg-muted' : 'border-border'}`}>
      {label}
    </div>
  )
}
