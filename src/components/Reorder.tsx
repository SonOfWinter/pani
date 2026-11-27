import {
  AutoScrollActivator, closestCenter, DndContext, DragOverlay, getClientRect, KeyboardSensor, PointerSensor, pointerWithin,
  useDndContext, useDroppable, useSensor, useSensors, type DragEndEvent, type Modifier,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { animateDrop } from '../lib/list-motion'
import { PaniBasket, shoppingOrigin, type ShoppingOrigin } from './ShoppingBadge'

const verticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })
const verticalModifiers = [verticalAxis]
const ItemDragLayout = createContext<{
  insertionIndex: number
  removedId?: string
  height: number
} | null>(null)

export function ItemSortGroup({ id, itemIds, expanded, committing, children }: {
  id: string
  itemIds: string[]
  expanded: boolean
  committing: boolean
  children: ReactNode
}) {
  const { active, activeNodeRect, over, measureDroppableContainers } = useDndContext()
  const target = over?.data.current?.sortable
  const sourceId = active?.data.current?.sortable?.containerId
  const targetId = target?.containerId ?? over?.id
  const height = activeNodeRect?.height ?? 0
  const betweenGroups = expanded && !committing && height > 0 && sourceId && targetId &&
    sourceId !== targetId && over?.data.current?.expanded !== false
  const insertionIndex = betweenGroups && targetId === id ? target?.index ?? itemIds.length : -1
  const removedId = betweenGroups && sourceId === id ? String(active.id) : undefined
  const removedBefore = useRef(false)

  useLayoutEffect(() => {
    const removed = Boolean(removedId)
    if (removedBefore.current === removed) return
    removedBefore.current = removed
    measureDroppableContainers([])
  }, [removedId, measureDroppableContainers])

  return (
    <SortableContext id={id} items={itemIds} strategy={verticalListSortingStrategy}>
      <ItemDragLayout.Provider value={insertionIndex >= 0 || removedId ? { insertionIndex, removedId, height } : null}>
        <ul className="list-sortable-items divide-y divide-border" data-committing={committing} data-dragging={Boolean(active)}
          style={{ paddingBottom: insertionIndex >= 0 ? height : undefined }}>
          {children}
        </ul>
      </ItemDragLayout.Provider>
    </SortableContext>
  )
}

export function Reorder({ children, onDrop, onStart, showPreview = true, hasCategoryTargets = false }: {
  children: ReactNode
  onDrop: (event: DragEndEvent) => void
  onStart?: () => void
  showPreview?: boolean
  hasCategoryTargets?: boolean
}) {
  const [label, setLabel] = useState<string>()
  const preview = useRef<HTMLDivElement>(null)
  const settling = useRef<Animation | undefined>(undefined)
  const [drop, setDrop] = useState<{
    rowId: string
    from: DOMRect
    folded?: { target: HTMLElement; ghost: HTMLElement }
  }>()

  useLayoutEffect(() => {
    if (!drop) return
    const row = document.getElementById(drop.rowId)
    if (!row) return
    if (!drop.folded) {
      const animation = animateDrop(row, drop.from.top - getClientRect(row, { ignoreTransform: true }).top)
      settling.current = animation
      return () => animation?.cancel()
    }

    const { target, ghost } = drop.folded
    const top = target.getBoundingClientRect().top
    Object.assign(ghost.style, {
      position: 'fixed', zIndex: '999', top: `${top}px`, left: `${drop.from.left}px`, width: `${drop.from.width}px`,
    })
    ghost.setAttribute('aria-hidden', 'true')
    document.body.append(ghost)
    const animation = animateDrop(ghost, drop.from.top - top, true)
    settling.current = animation
    if (animation) void animation.finished.then(() => ghost.remove(), () => ghost.remove())
    else ghost.remove()
    return () => {
      animation?.cancel()
      ghost.remove()
    }
  }, [drop])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  return (
    <DndContext
      sensors={sensors}
      modifiers={verticalModifiers}
      autoScroll={hasCategoryTargets ? true : { activator: AutoScrollActivator.DraggableRect }}
      collisionDetection={(args) => {
        if (!hasCategoryTargets || !args.pointerCoordinates) return closestCenter(args)
        const collisions = pointerWithin({
          ...args,
          pointerCoordinates: {
            x: args.collisionRect.left + args.collisionRect.width / 2,
            y: args.pointerCoordinates.y,
          },
        })
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
      onDragStart={({ active }) => {
        settling.current?.cancel()
        setLabel(active.data.current?.label as string | undefined)
        onStart?.()
      }}
      onDragCancel={() => setLabel(undefined)}
      onDragEnd={(event) => {
        const rowId = `reorder-row-${event.active.id}`
        const overlay = preview.current
        const from = (overlay ?? document.getElementById(rowId))?.getBoundingClientRect()
        if (from && event.over && event.over.id !== event.active.id) {
          const target = hasCategoryTargets && overlay
            ? document.getElementById(String(event.over.id))?.querySelector<HTMLElement>('h2 button[aria-expanded="false"]')
            : undefined
          const ghost = target && overlay?.cloneNode(true)
          setDrop({ rowId, from, folded: target && ghost instanceof HTMLElement ? { target, ghost } : undefined })
        }
        setLabel(undefined)
        onDrop(event)
      }}
    >
      {children}
      {showPreview && (
        <DragOverlay dropAnimation={null}>
          {label && <div ref={preview} className="drag-preview"><GripVertical size={18} />{label}</div>}
        </DragOverlay>
      )}
    </DndContext>
  )
}

export function SortableRow({ id, label, disabled = false, dropDisabled = false, dragPending = false, menu, menuOpen = false, onMenuChange, onSwipeRight, appearance, children }: {
  id: string
  label: string
  disabled?: boolean
  dropDisabled?: boolean
  dragPending?: boolean
  menu?: ReactNode
  menuOpen?: boolean
  onMenuChange?: (open: boolean) => void
  onSwipeRight?: (origin: ShoppingOrigin) => void
  appearance?: CSSProperties
  children: ReactNode
}) {
  const layout = useContext(ItemDragLayout)
  const swipeBasket = useRef<HTMLDivElement>(null)
  const suppressClick = useRef(false)
  const gesture = useRef<{ id: number; x: number; y: number; locked: boolean } | null>(null)
  const [slide, setSlide] = useState<number>()
  const { attributes, index, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id, disabled: { draggable: disabled || dragPending, droppable: dropDisabled }, data: { label } })
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
      else onSwipeRight?.(shoppingOrigin(swipeBasket.current ?? event.currentTarget))
    }
  }

  return (
    <li
      id={`reorder-row-${id}`}
      ref={setNodeRef}
      style={{
        marginBottom: layout?.removedId === id ? -layout.height : undefined,
        transform: layout && layout.insertionIndex >= 0 && index >= layout.insertionIndex
          ? `translateY(${layout.height}px)`
          : !isDragging || coloredRow ? CSS.Translate.toString(transform) : undefined,
        transition: dragPending && menu ? 'none' : transition,
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
          <div ref={swipeBasket} className="swipe-basket" style={{ width: basketWidth }}>
            <PaniBasket size={19} />
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
            aria-disabled={dragPending || undefined}
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

export function CategoryDrop({ id, expanded, children }: { id: string; expanded: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { expanded } })
  return <section id={id} ref={setNodeRef} className={`list-group ${isOver ? 'is-over' : ''}`}>{children}</section>
}
