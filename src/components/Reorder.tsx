import {
  AutoScrollActivator, closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin,
  useDroppable, useSensor, useSensors, type DragEndEvent, type Modifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ShoppingBasket } from 'lucide-react'
import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'

const verticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })
const verticalModifiers = [verticalAxis]

export function Reorder({ children, onDrop, showPreview = true, verticalOnly = false }: {
  children: ReactNode
  onDrop: (event: DragEndEvent) => void
  showPreview?: boolean
  verticalOnly?: boolean
}) {
  const [label, setLabel] = useState<string>()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  return (
    <DndContext
      sensors={sensors}
      modifiers={verticalOnly ? verticalModifiers : undefined}
      autoScroll={verticalOnly ? { activator: AutoScrollActivator.DraggableRect } : true}
      collisionDetection={(args) => {
        if (verticalOnly || !args.pointerCoordinates) return closestCenter(args)
        const collisions = pointerWithin(args)
        const rows = collisions.filter(({ id }) => id !== args.active.id && !String(id).startsWith('category:'))
        if (rows.length) return rows
        if (collisions.some(({ id }) => id === args.active.id)) return []
        return collisions
      }}
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
      onDragStart={({ active }) => setLabel(active.data.current?.label as string | undefined)}
      onDragCancel={() => setLabel(undefined)}
      onDragEnd={(event) => {
        setLabel(undefined)
        onDrop(event)
      }}
    >
      {children}
      {showPreview && (
        <DragOverlay dropAnimation={null}>
          {label && <div className="drag-preview"><GripVertical size={18} />{label}</div>}
        </DragOverlay>
      )}
    </DndContext>
  )
}

export function SortableRow({ id, label, disabled = false, dropDisabled = false, menu, menuOpen = false, onMenuChange, onSwipeRight, appearance, children }: {
  id: string
  label: string
  disabled?: boolean
  dropDisabled?: boolean
  menu?: ReactNode
  menuOpen?: boolean
  onMenuChange?: (open: boolean) => void
  onSwipeRight?: () => void
  appearance?: CSSProperties
  children: ReactNode
}) {
  const suppressClick = useRef(false)
  const gesture = useRef<{ id: number; x: number; y: number; locked: boolean } | null>(null)
  const [slide, setSlide] = useState<number>()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id, disabled: { draggable: disabled, droppable: dropDisabled }, data: { label } })
  const menuWidth = 192
  const basketWidth = 44
  const coloredRow = Boolean(appearance)

  function beginSwipe(event: PointerEvent<HTMLLIElement>) {
    suppressClick.current = false
    if (!menu || !event.isPrimary || event.button !== 0 || !(event.target instanceof Element)) return
    if (!menuOpen && event.target.closest('button:not([data-swipe-trigger]), input, select, a')) return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, locked: false }
  }

  function moveSwipe(event: PointerEvent<HTMLLIElement>) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = Math.abs(event.clientY - start.y)
    if (!start.locked) {
      if (dy > 9 && dy >= Math.abs(dx)) {
        gesture.current = null
        return
      }
      if (Math.abs(dx) < 9 || Math.abs(dx) <= dy) return
      start.locked = true
      suppressClick.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const rightLimit = !menuOpen && onSwipeRight ? basketWidth : 0
    setSlide(Math.max(-menuWidth, Math.min(rightLimit, (menuOpen ? -menuWidth : 0) + dx)))
  }

  function finishSwipe(event: PointerEvent<HTMLLIElement>) {
    const start = gesture.current
    if (start?.id !== event.pointerId) return
    gesture.current = null
    setSlide(undefined)
    if (!start.locked) return
    const dx = event.clientX - start.x
    if (dx < -32) onMenuChange?.(true)
    if (dx > 32) {
      if (menuOpen) onMenuChange?.(false)
      else onSwipeRight?.()
    }
  }

  return (
    <li
      id={`reorder-row-${id}`}
      ref={setNodeRef}
      style={{
        transform: !isDragging || coloredRow ? CSS.Translate.toString(transform) : undefined,
        transition,
        zIndex: coloredRow && isDragging ? 1 : undefined,
      }}
      onPointerDown={beginSwipe}
      onPointerMove={moveSwipe}
      onPointerUp={finishSwipe}
      onPointerCancel={() => { gesture.current = null; setSlide(undefined) }}
      onPointerLeave={() => { if (!gesture.current?.locked) gesture.current = null }}
      onClickCapture={(event) => {
        if (!suppressClick.current || event.detail === 0) return
        suppressClick.current = false
        event.preventDefault()
        event.stopPropagation()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) onMenuChange?.(false)
      }}
      className={`sortable-row ${menu ? 'swipe-row' : ''} ${!coloredRow && isDragging ? 'is-dragging' : ''} ${!coloredRow && isOver && !isDragging ? 'is-over' : ''}`}
    >
      {menu && (
        <div id={`actions-${id}`} className="swipe-menu" style={{ width: menuWidth }} inert={!menuOpen} aria-hidden={!menuOpen}>
          {menu}
        </div>
      )}
      {onSwipeRight && slide !== undefined && slide > 0 && (
        <div className="absolute inset-y-0 left-0 flex items-center" aria-hidden="true">
          <div className="swipe-basket" style={{ width: basketWidth }}>
            <ShoppingBasket size={19} />
          </div>
        </div>
      )}
      <div
        className={`row-content ${menu ? 'swipe-content' : ''}`}
        style={{
          ...appearance,
          transform: menu ? `translateX(${slide ?? (menuOpen ? -menuWidth : 0)}px)` : undefined,
          transition: slide !== undefined ? 'none' : undefined,
        }}
      >
        {!disabled && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="row-icon touch-none"
            style={appearance ? { color: 'inherit' } : undefined}
            {...attributes}
            {...listeners}
            aria-label={`Déplacer ${label}`}
          >
            <GripVertical size={19} />
          </button>
        )}
        {children}
      </div>
    </li>
  )
}

export function CategoryDrop({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <section ref={setNodeRef} className={`list-group ${isOver ? 'is-over' : ''}`}>{children}</section>
}
