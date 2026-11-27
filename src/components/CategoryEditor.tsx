import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { categoryColor, deleteCategory, icons, saveCategory } from '../data/categories'
import type { Category } from '../data/database'
import { moveCategory, planCategoryMove } from '../data/order'
import type { useOrderPreview } from '../lib/useOrderPreview'
import type { RecordUndo } from '../data/undo'
import { animateRowRemoval, animateSavedRow } from '../lib/list-motion'
import { categoryBackground, CategoryLabel } from './CategoryLabel'
import { Reorder, SortableRow } from './Reorder'
import { toast } from 'sonner'
import { BottomSheet, type BottomSheetHandle } from './BottomSheet'
import { useConfirm } from './ui/confirm'
import { Button } from './ui/button'

function CategoryForm({ category, recordUndo, onClose, onDelete, onDeleted }: {
  category: Category | null
  recordUndo: RecordUndo
  onClose: () => void
  onDelete: (category: Category) => Promise<void>
  onDeleted: (id: string) => void
}) {
  const confirm = useConfirm()
  const sheet = useRef<BottomSheetHandle>(null)
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category ? categoryColor(category) : '#7d9b92')
  const [emoji, setEmoji] = useState(category ? category.emoji ?? icons[category.icon].symbol : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run<Result>(operation: () => Promise<Result>, message: string, after: (result: Result) => void) {
    setBusy(true)
    setError('')
    try {
      const result = await operation()
      sheet.current?.dismiss(() => {
        onClose()
        after(result)
        toast.success(message)
      })
    } catch (reason) {
      setError(reason instanceof Error && reason.message
        ? reason.message
        : 'Impossible d’enregistrer cette catégorie.')
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!busy) void run(
      () => saveCategory(name, color, emoji, category?.id, recordUndo),
      category ? 'Catégorie modifiée.' : 'Catégorie ajoutée.',
      (id) => animateSavedRow(id, !category),
    )
  }

  async function remove(current: Category) {
    if (await confirm({
      title: 'Supprimer cette catégorie ?',
      description: 'Ses articles iront dans « Sans catégorie ».',
      action: 'Supprimer la catégorie',
    })) {
      await run(() => onDelete(current), 'Catégorie supprimée.', () => onDeleted(current.id))
    }
  }

  return (
    <BottomSheet ref={sheet} titleId="category-dialog-title" busy={busy} onClose={onClose}>
      <form className="grid gap-4" onSubmit={(event) => submit(event)}>
        <h2 id="category-dialog-title" className="text-xl font-semibold">
          {category ? 'Modifier la catégorie' : 'Ajouter un rayon'}
        </h2>
        <label className="grid gap-1">
          Nom
          <input className="pani-input" value={name} required onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="grid gap-1">
            Couleur
            <input className="color-picker" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          <label className="grid min-w-0 flex-1 gap-1">
            Emoji
            <input className="pani-input min-w-0" value={emoji} maxLength={32} onChange={(event) => setEmoji(event.target.value)} />
          </label>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => sheet.current?.dismiss()}>Annuler</Button>
          <Button type="submit" disabled={busy}>Enregistrer</Button>
        </div>
        {category && (
          <Button variant="ghost" className="justify-self-start text-destructive" disabled={busy} onClick={() => void remove(category)}>Supprimer la catégorie</Button>
        )}
      </form>
    </BottomSheet>
  )
}

export function CategoryEditor({ categories, order, recordUndo, onCategoryRemoved }: {
  categories: Category[]
  order: ReturnType<typeof useOrderPreview>
  recordUndo: RecordUndo
  onCategoryRemoved: (id: string) => void
}) {
  const [editor, setEditor] = useState<{ category: Category | null }>()
  const [error, setError] = useState('')
  const [departing, setDeparting] = useState<Category>()
  const departureAnimation = useRef<Animation | undefined>(undefined)
  const ordered = order.apply(categories)
  const visibleCategories = departing && !ordered.some((category) => category.id === departing.id)
    ? [...ordered, departing].sort((a, b) => a.position - b.position)
    : ordered
  const [announcement, setAnnouncement] = useState('')

  useLayoutEffect(() => {
    if (departing) return
    departureAnimation.current?.cancel()
    departureAnimation.current = undefined
  }, [departing])

  async function remove(category: Category) {
    setDeparting(category)
    try {
      await deleteCategory(category.id, recordUndo)
      onCategoryRemoved(category.id)
    } catch (reason) {
      setDeparting(undefined)
      throw reason
    }
  }

  function foldRemovedCategory(id: string) {
    requestAnimationFrame(() => {
      void animateRowRemoval(document.getElementById(`reorder-row-${id}`)).then((animation) => {
        departureAnimation.current = animation
        setDeparting(undefined)
        document.getElementById('add-category')?.focus({ preventScroll: true })
      })
    })
  }

  async function reorder(id: string, target: string) {
    setError('')
    try {
      const changes = planCategoryMove(categories, id, target)
      if (!changes.length) return
      await order.commit(changes, () => moveCategory(id, target, recordUndo))
      const name = categories.find((category) => category.id === id)?.name
      if (name) setAnnouncement(`${name} déplacée.`)
    } catch {
      setError('Impossible de déplacer cette catégorie.')
    }
  }

  return (
    <section aria-label="Gérer les catégories">
      <Button id="add-category" className="mb-4" onClick={() => setEditor({ category: null })}>
        <Plus size={18} /> Ajouter un rayon
      </Button>
      <p role="status" className="sr-only">{announcement}</p>
      {error && <p role="alert">{error}</p>}
      {visibleCategories.length === 0 && <p className="empty-group">Aucune catégorie.</p>}
      <Reorder showPreview={false} onDrop={({ active, over }) => {
        if (over && active.id !== over.id && !order.moving) void reorder(String(active.id), String(over.id))
      }}>
        <SortableContext items={visibleCategories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
          <ul className="grid gap-1">
            {visibleCategories.map((category) => (
              <SortableRow key={category.id} id={category.id} label={category.name}
                dragPending={order.moving || Boolean(departing)} appearance={categoryBackground(category)}>
                <button
                  type="button"
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left font-medium"
                  aria-label={`Modifier ${category.name}`}
                  disabled={category.id === departing?.id}
                  onClick={() => setEditor({ category })}
                >
                  <CategoryLabel category={category} />
                </button>
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </Reorder>
      {editor && <CategoryForm category={editor.category} recordUndo={recordUndo} onClose={() => setEditor(undefined)}
        onDelete={remove} onDeleted={foldRemovedCategory} />}
    </section>
  )
}
