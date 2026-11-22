import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { categoryColor, deleteCategory, icons, saveCategory } from '../data/categories'
import type { Category } from '../data/database'
import { moveCategory } from '../data/order'
import type { RecordUndo } from '../data/undo'
import { categoryBackground, CategoryLabel } from './CategoryLabel'
import { Reorder, SortableRow } from './Reorder'
import { toast } from 'sonner'
import { BottomSheet, type BottomSheetHandle } from './BottomSheet'
import { useConfirm } from './ui/confirm'
import { Button } from './ui/button'

function CategoryForm({ category, recordUndo, onClose }: { category: Category | null; recordUndo: RecordUndo; onClose: () => void }) {
  const confirm = useConfirm()
  const sheet = useRef<BottomSheetHandle>(null)
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category ? categoryColor(category) : '#7d9b92')
  const [emoji, setEmoji] = useState(category ? category.emoji ?? icons[category.icon].symbol : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(operation: () => Promise<void>, message: string) {
    setBusy(true)
    setError('')
    try {
      await operation()
      sheet.current?.dismiss(() => {
        onClose()
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
    if (!busy) void run(() => saveCategory(name, color, emoji, category?.id, recordUndo), category ? 'Catégorie modifiée.' : 'Catégorie ajoutée.')
  }

  async function remove(current: Category) {
    if (await confirm({
      title: 'Supprimer cette catégorie ?',
      description: 'Ses articles iront dans « Sans catégorie ».',
      action: 'Supprimer la catégorie',
    })) {
      await run(() => deleteCategory(current.id, recordUndo), 'Catégorie supprimée.')
    }
  }

  return (
    <BottomSheet ref={sheet} titleId="category-dialog-title" busy={busy} onClose={onClose}>
      <form className="grid gap-4" onSubmit={(event) => submit(event)}>
        <h2 id="category-dialog-title" className="text-xl font-semibold">
          {category ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
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

export function CategoryEditor({ categories, recordUndo }: { categories: Category[]; recordUndo: RecordUndo }) {
  const [editor, setEditor] = useState<{ category: Category | null }>()
  const [error, setError] = useState('')
  const [moving, setMoving] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  async function reorder(id: string, target: string) {
    setMoving(true)
    setError('')
    try {
      await moveCategory(id, target)
      const name = categories.find((category) => category.id === id)?.name
      if (name) setAnnouncement(`${name} déplacée.`)
    } catch {
      setError('Impossible de déplacer cette catégorie.')
    } finally {
      setMoving(false)
    }
  }

  return (
    <section aria-label="Gérer les catégories">
      <Button id="add-category" className="mb-4" onClick={() => setEditor({ category: null })}>
        <Plus size={18} /> Ajouter une catégorie
      </Button>
      <p role="status" className="sr-only">{announcement}</p>
      {error && <p role="alert">{error}</p>}
      {categories.length === 0 && <p className="empty-group">Aucune catégorie.</p>}
      <Reorder verticalOnly showPreview={false} onDrop={({ active, over }) => {
        if (over && active.id !== over.id) void reorder(String(active.id), String(over.id))
      }}>
        <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
          <ul className="grid gap-1">
            {categories.map((category) => (
              <SortableRow key={category.id} id={category.id} label={category.name} disabled={moving} appearance={categoryBackground(category)}>
                <button
                  type="button"
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left font-medium"
                  aria-label={`Modifier ${category.name}`}
                  onClick={() => setEditor({ category })}
                >
                  <CategoryLabel category={category} />
                </button>
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </Reorder>
      {editor && <CategoryForm category={editor.category} recordUndo={recordUndo} onClose={() => setEditor(undefined)} />}
    </section>
  )
}
