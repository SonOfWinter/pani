import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CategoryDrop, Reorder, SortableRow } from './components/Reorder'
import { moveItem } from './data/order'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ShoppingView } from './components/ShoppingView'
import { CategoryEditor } from './components/CategoryEditor'
import { colors, icons } from './data/categories'
import { ItemEditor } from './components/ItemEditor'
import { deleteItem } from './data/items'
import { Button } from './components/ui/button'
import { database, type Category, type Item, type Mode } from './data/database'

const modes: { value: Mode; label: string }[] = [
  { value: 'list', label: 'Liste' },
  { value: 'shopping', label: 'Courses' },
]

export function groupItems(items: Item[], categories: Category[]) {
  return [
    ...categories.map((category) => ({
      id: category.id,
      label: category.name,
      category,
      items: items.filter((item) => item.categoryId === category.id),
    })),
    {
      id: null,
      label: 'Sans catégorie',
      category: null,
      items: items.filter((item) => item.categoryId === null),
    },
  ].filter((group) => group.items.length > 0)
}

export function App() {
  const result = useLiveQuery(
    async () => {
      try {
        return { list: await database.readList(), error: false as const }
      } catch {
        return { error: true as const }
      }
    },
    [],
  )
  const [announcement, setAnnouncement] = useState('')
  const [error, setError] = useState('')
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<{ item: Item | null } | null>(null)

  async function reorder(item: Item, destination: Parameters<typeof moveItem>[1]) {
    try {
      await moveItem(item.id, destination)
      setError('')
      setAnnouncement(`${item.name} déplacé.`)
    } catch {
      setError('Impossible de déplacer cet article.')
    }
  }

  async function remove(item: Item) {
    if (!window.confirm(`Supprimer « ${item.name} » ?`)) return
    try {
      await deleteItem(item.id)
      setError('')
      document.getElementById('add-item')?.focus()
    } catch {
      setError('Impossible de supprimer cet article.')
    }
  }

  async function switchMode(mode: Mode) {
    try {
      await database.setMode(mode)
      setError('')
    } catch {
      setError('Impossible de changer de vue. Réessayez.')
    }
  }

  const items = result?.list?.items ?? []
  const categories = result?.list?.categories ?? []
  const mode = result?.list?.state.mode ?? 'list'
  const remaining = items.filter((item) => item.checkedAt === null).length
  const matching = mode === 'list' && query.trim()
    ? items.filter((item) => item.name.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')))
    : items
  const groups = groupItems(matching, categories)

  return (
    <main className="pani-shell mx-auto max-w-xl">
      <header className="mb-7">
        <h1 className="text-4xl font-bold tracking-tight">Pani</h1>
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {remaining} {remaining === 1 ? 'article à acheter' : 'articles à acheter'}
        </p>
      </header>
      <div role="group" aria-label="Mode" className="mb-7 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {modes.map(({ value, label }) => (
          <Button
            key={value}
            variant={mode === value ? 'default' : 'ghost'}
            aria-pressed={mode === value}
            disabled={!result?.list}
            onClick={() => void switchMode(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {result?.list && mode === 'list' && (
        <div className="mb-6 flex flex-wrap gap-2">
          <input
            type="search"
            className="pani-input min-w-40 flex-1"
            aria-label="Rechercher un article"
            placeholder="Rechercher"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button id="add-item" onClick={() => setEditor({ item: null })}>Ajouter un article</Button>
          <Button variant="outline" onClick={() => setCategoriesOpen(true)}>Catégories</Button>
        </div>
      )}
      <p role="status" className="sr-only">{announcement}</p>
      {error && <p role="alert">{error}</p>}
      {result?.error && <p role="alert">Pani ne peut pas ouvrir les données locales.</p>}
      {!result && <p role="status">Ouverture de la liste…</p>}
      {result?.list && mode === 'shopping' && <ShoppingView items={items} categories={categories} />}
      {result?.list && mode === 'list' && groups.length === 0 && (
        <p className="rounded-lg bg-card p-5 text-muted-foreground">
          {query.trim() ? 'Aucun résultat.' : 'Votre liste est vide.'}
        </p>
      )}
      {mode === 'list' && (
        <Reorder onDrop={({ active, over }) => {
          if (!over || active.id === over.id) return
          const item = items.find((entry) => entry.id === active.id)
          const target = items.find((entry) => entry.id === over.id)
          const overId = String(over.id)
          if (item && target) void reorder(item, { categoryId: target.categoryId, targetId: target.id })
          else if (item && overId.startsWith('category:')) {
            void reorder(item, { categoryId: overId.slice(9) || null })
          }
        }}>
          {groups.map((group) => (
            <section key={group.id ?? 'none'} className="mb-6">
              <h2 className={`mb-2 rounded-lg px-2 py-1 font-semibold ${group.category ? colors[group.category.color].style : ''}`}>
                {group.category && <span aria-hidden="true" className="mr-2">{icons[group.category.icon].symbol}</span>}
                {group.label}
              </h2>
              <SortableContext items={group.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-muted rounded-lg bg-card">
                  {group.items.map((item, index) => (
                    <SortableRow key={item.id} id={item.id} label={item.name} disabled={Boolean(query.trim())}>
                      <div className="min-w-0 flex-1">
                        <p className="break-words">{item.name}</p>
                        {item.quantity && <p className="break-words text-sm text-muted-foreground">{item.quantity}</p>}
                      </div>
                      <details className="shrink-0">
                        <summary className="flex min-h-11 cursor-pointer items-center px-2" aria-label={`Actions pour ${item.name}`}>•••</summary>
                        <Button variant="ghost" onClick={() => setEditor({ item })}>Modifier</Button>
                        <Button variant="ghost" onClick={() => void remove(item)}>Supprimer</Button>
                        {!query.trim() && (
                          <>
                            <Button variant="ghost" disabled={index === 0} onClick={() => void reorder(item, { direction: -1 })}>Monter</Button>
                            <Button variant="ghost" disabled={index === group.items.length - 1} onClick={() => void reorder(item, { direction: 1 })}>Descendre</Button>
                          </>
                        )}
                        <label className="grid gap-1 px-2 pb-2">
                          Changer de catégorie
                          <select className="pani-input" value={item.categoryId ?? ''} onChange={(event) => {
                            void reorder(item, { categoryId: event.currentTarget.value || null })
                          }}>
                            <option value="">Sans catégorie</option>
                            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                          </select>
                        </label>
                      </details>
                    </SortableRow>
                  ))}
                </ul>
              </SortableContext>
            </section>
          ))}
          {[...categories, null].map((category) => (
            <CategoryDrop key={category?.id ?? 'none'} id={`category:${category?.id ?? ''}`} label={`Placer à la fin de ${category?.name ?? 'Sans catégorie'}`} />
          ))}
        </Reorder>
      )}
      {editor && (
        <ItemEditor
          item={editor.item}
          categories={categories}
          onClose={() => setEditor(null)}
          onSave={() => {
            if (!editor.item) setQuery('')
            setEditor(null)
          }}
        />
      )}
      {categoriesOpen && <CategoryEditor categories={categories} onClose={() => setCategoriesOpen(false)} />}
    </main>
  )
}
