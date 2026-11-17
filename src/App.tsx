import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useLiveQuery } from 'dexie-react-hooks'
import { Cloud, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useCloudBackup } from './backup/useCloudBackup'
import { BackupPanel } from './components/BackupPanel'
import { BottomNav } from './components/BottomNav'
import { CategoryEditor } from './components/CategoryEditor'
import { categoryBackground, CategoryLabel } from './components/CategoryLabel'
import { ItemEditor } from './components/ItemEditor'
import { QuantityStepper } from './components/QuantityStepper'
import { CategoryDrop, Reorder, SortableRow } from './components/Reorder'
import { ShoppingView } from './components/ShoppingView'
import { Button } from './components/ui/button'
import { database, type Item, type Mode } from './data/database'
import { changeQuantity, deleteItem } from './data/items'
import { moveItem } from './data/order'

export function App() {
  const result = useLiveQuery(async () => {
    try {
      return { list: await database.readList(), error: false as const }
    } catch {
      return { error: true as const }
    }
  }, [])
  const cloud = useCloudBackup(result?.list?.state)
  const [announcement, setAnnouncement] = useState('')
  const [error, setError] = useState('')
  const [backupOpen, setBackupOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [openMenu, setOpenMenu] = useState<string>()
  const [editor, setEditor] = useState<{ item: Item | null } | null>(null)

  const items = result?.list?.items ?? []
  const categories = result?.list?.categories ?? []
  const mode = result?.list?.state.mode ?? 'list'
  const remaining = items.filter((item) => item.checkedAt === null).length
  const term = query.trim().toLocaleLowerCase('fr')
  const matching = term ? items.filter((item) => item.name.toLocaleLowerCase('fr').includes(term)) : items
  const groups = [...categories, null].map((category) => ({
    category,
    items: matching.filter((item) => item.categoryId === (category?.id ?? null)),
  })).filter((group) => !term || group.items.length)

  async function run(operation: () => Promise<unknown>, failure: string, success?: string) {
    try {
      await operation()
      setError('')
      if (success) setAnnouncement(success)
    } catch {
      setError(failure)
    }
  }

  function reorder(item: Item, destination: Parameters<typeof moveItem>[1]) {
    setOpenMenu(undefined)
    return run(() => moveItem(item.id, destination), 'Impossible de déplacer cet article.', `${item.name} déplacé.`)
  }

  async function remove(item: Item) {
    if (!window.confirm(`Supprimer « ${item.name} » ?`)) return
    await run(async () => {
      await deleteItem(item.id)
      setOpenMenu(undefined)
      document.getElementById('add-item')?.focus()
    }, 'Impossible de supprimer cet article.')
  }

  async function switchMode(next: Mode) {
    setOpenMenu(undefined)
    if (next !== 'list') setQuery('')
    await run(() => database.setMode(next), 'Impossible de changer de vue. Réessayez.')
  }

  return (
    <>
      <main className="pani-shell mx-auto max-w-xl">
        <header className="screen-header">
          <div>
            <h1>{mode === 'list' ? 'Liste' : mode === 'shopping' ? 'Courses' : 'Catégories'}</h1>
            {mode !== 'categories' && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {remaining} {remaining === 1 ? 'article à acheter' : 'articles à acheter'}
              </p>
            )}
          </div>
          <Button variant="ghost" className="px-2" aria-label="Sauvegardes" disabled={!result?.list} onClick={() => setBackupOpen(true)}>
            <Cloud size={21} />
          </Button>
        </header>
        <p role="status" className="sr-only">{announcement}</p>
        {error && <p role="alert">{error}</p>}
        {result?.error && <p role="alert">Pani ne peut pas ouvrir les données locales.</p>}
        {!result && <p role="status">Ouverture de la liste…</p>}
        {result?.list && mode === 'categories' && <CategoryEditor categories={categories} />}
        {result?.list && mode === 'shopping' && <ShoppingView items={items} categories={categories} />}
        {result?.list && mode === 'list' && (
          <>
            <div className="list-toolbar">
              <input
                type="search"
                className="pani-input min-w-0 flex-1"
                aria-label="Rechercher un article"
                placeholder="Rechercher"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Escape') setQuery('') }}
              />
              <Button id="add-item" aria-label="Ajouter un article" className="px-2.5" onClick={() => { setOpenMenu(undefined); setEditor({ item: null }) }}>
                <Plus size={20} />
              </Button>
            </div>
            {!groups.length && <p className="empty-group">Aucun résultat.</p>}
            <Reorder onDrop={({ active, over }) => {
              if (!over || active.id === over.id) return
              const item = items.find((entry) => entry.id === active.id)
              const target = items.find((entry) => entry.id === over.id)
              const targetId = String(over.id)
              if (!item) return
              if (target) void reorder(item, { categoryId: target.categoryId, targetId: target.id })
              else if (targetId.startsWith('category:')) {
                void reorder(item, { categoryId: targetId.slice(9) || null })
              }
            }}>
              {groups.map(({ category, items: groupItems }) => (
                <CategoryDrop key={category?.id ?? 'none'} id={`category:${category?.id ?? ''}`}>
                  <h2 className="category-heading" style={categoryBackground(category)}><CategoryLabel category={category} /></h2>
                  {groupItems.length === 0 && (
                    <p className="empty-group">{!category && !items.length ? 'Votre liste est vide.' : 'Aucun article'}</p>
                  )}
                  <SortableContext items={groupItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                    <ul className="divide-y divide-border">
                      {groupItems.map((item) => (
                        <SortableRow
                          key={item.id}
                          id={item.id}
                          label={item.name}
                          disabled={Boolean(term)}
                          menuOpen={openMenu === item.id}
                          onMenuChange={(open) => setOpenMenu(open ? item.id : undefined)}
                          menu={
                            <>
                              <button type="button" aria-label={`Modifier ${item.name}`} onClick={() => { setOpenMenu(undefined); setEditor({ item }) }}><Pencil size={18} /></button>
                              <button type="button" aria-label="Fermer les actions" onClick={() => setOpenMenu(undefined)}><X size={18} /></button>
                              <button type="button" aria-label={`Supprimer ${item.name}`} className="delete-action" onClick={() => void remove(item)}><Trash2 size={18} /></button>
                            </>
                          }
                        >
                          <button
                            type="button"
                            data-swipe-trigger
                            className="min-h-11 min-w-0 flex-1 break-words text-left"
                            aria-label={`Actions pour ${item.name}`}
                            aria-expanded={openMenu === item.id}
                            aria-controls={`actions-${item.id}`}
                            onClick={(event) => {
                              const open = openMenu !== item.id
                              setOpenMenu(open ? item.id : undefined)
                              if (open && event.detail === 0) {
                                requestAnimationFrame(() => document
                                  .getElementById(`actions-${item.id}`)
                                  ?.querySelector('button')
                                  ?.focus({ preventScroll: true }))
                              }
                            }}
                          >
                            {item.name}
                          </button>
                          <QuantityStepper item={item} onChange={(delta) => void run(
                            () => changeQuantity(item.id, delta), 'Impossible de modifier la quantité.',
                          )} />
                        </SortableRow>
                      ))}
                    </ul>
                  </SortableContext>
                </CategoryDrop>
              ))}
            </Reorder>
          </>
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
        {backupOpen && <BackupPanel cloud={cloud} hasData={items.length + categories.length > 0} onClose={() => setBackupOpen(false)} />}
      </main>
      <BottomNav mode={mode} disabled={!result?.list} onNavigate={(next) => void switchMode(next)} />
    </>
  )
}
