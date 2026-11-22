import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useLiveQuery } from 'dexie-react-hooks'
import { Cloud, Pencil, Plus, ShoppingBasket, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCloudBackup } from './backup/useCloudBackup'
import { BackupPanel } from './components/BackupPanel'
import { BottomNav } from './components/BottomNav'
import { CategoryEditor } from './components/CategoryEditor'
import { categoryBackground, CategoryLabel } from './components/CategoryLabel'
import { ItemEditor } from './components/ItemEditor'
import { QuantityStepper } from './components/QuantityStepper'
import { CategoryDrop, Reorder, SortableRow } from './components/Reorder'
import { ShoppingView } from './components/ShoppingView'
import { UpdateNotice } from './components/UpdateNotice'
import { useConfirm } from './components/ui/confirm'
import { Button } from './components/ui/button'
import { database, type Item, type Mode } from './data/database'
import { addToShopping, changeQuantity, clearShopping, deleteItem } from './data/items'
import { animateRemoval, animateSavedItem } from './lib/list-motion'
import { moveItem } from './data/order'

export function App() {
  const confirm = useConfirm()
  const result = useLiveQuery(async () => {
    try {
      return { list: await database.readList(), error: false as const }
    } catch {
      return { error: true as const }
    }
  }, [])
  const cloud = useCloudBackup(result?.list?.state)
  const [backupOpen, setBackupOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [openMenu, setOpenMenu] = useState<string>()
  const [editor, setEditor] = useState<{ item: Item | null } | null>(null)

  const items = result?.list?.items ?? []
  const categories = result?.list?.categories ?? []
  const mode = result?.list?.state.mode ?? 'list'
  const shoppingItems = items.flatMap((item) => item.shopping
    ? [{ ...item, quantity: item.shopping.quantity, checkedAt: item.shopping.checkedAt }]
    : [])
  const remaining = shoppingItems.filter((item) => item.checkedAt === null).length
  const term = query.trim().toLocaleLowerCase('fr')
  const matching = term ? items.filter((item) => item.name.toLocaleLowerCase('fr').includes(term)) : items
  const groups = [...categories, null].map((category) => ({
    category,
    items: matching.filter((item) => item.categoryId === (category?.id ?? null)),
  })).filter((group) => !term || group.items.length)

  async function run(operation: () => Promise<unknown>, failure: string, success?: string) {
    try {
      await operation()
      if (success) toast.success(success)
    } catch {
      toast.error(failure)
    }
  }

  async function addPurchase(item: Item) {
    await run(async () => {
      const added = await addToShopping(item.id)
      if (added) toast.success(`${item.name} ajouté aux courses.`)
      else toast.info(`${item.name} est déjà dans les courses.`)
    }, 'Impossible d’ajouter cet article aux courses.')
  }

  async function emptyShopping() {
    if (!await confirm({
      title: 'Vider toute la liste de courses ?',
      description: 'Les articles cochés et ceux à acheter seront retirés de Courses. Ils resteront dans Liste.',
      action: 'Vider les courses',
    })) return
    void run(async () => {
      await animateRemoval(shoppingItems.map((item) => document.getElementById(`shopping-row-${item.id}`)))
      await clearShopping()
    }, 'Impossible de vider les courses.', 'Liste de courses vidée.')
  }

  function reorder(item: Item, destination: Parameters<typeof moveItem>[1]) {
    setOpenMenu(undefined)
    return run(() => moveItem(item.id, destination), 'Impossible de déplacer cet article.', `${item.name} déplacé.`)
  }

  async function remove(item: Item) {
    if (!await confirm({ title: `Supprimer « ${item.name} » ?`, action: 'Supprimer' })) return
    await run(async () => {
      await animateRemoval([document.getElementById(`reorder-row-${item.id}`)])
      await deleteItem(item.id)
      setOpenMenu(undefined)
      document.getElementById('add-item')?.focus()
    }, 'Impossible de supprimer cet article.', `${item.name} supprimé.`)
  }

  async function switchMode(next: Mode) {
    setOpenMenu(undefined)
    if (next !== 'list') setQuery('')
    await run(() => database.setMode(next), 'Impossible de changer de vue. Réessayez.')
  }

  return (
    <>
      <main className="pani-shell mx-auto max-w-xl">
        <UpdateNotice />
        <div key={mode} className="screen-transition">
          <header className="screen-header">
            <div>
              <h1>{mode === 'list' ? 'Liste' : mode === 'shopping' ? 'Courses' : 'Catégories'}</h1>
              {mode !== 'categories' && (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {mode === 'shopping'
                    ? `${remaining} ${remaining === 1 ? 'article à acheter' : 'articles à acheter'}`
                    : `${items.length} ${items.length === 1 ? 'article' : 'articles'}`}
                </p>
              )}
            </div>
            <div className="flex">
              {mode === 'shopping' && (
                <Button variant="ghost" className="px-2" aria-label="Vider les courses" disabled={!shoppingItems.length} onClick={() => void emptyShopping()}>
                  <Trash2 size={21} />
                </Button>
              )}
              <Button variant="ghost" className="px-2" aria-label="Sauvegardes" disabled={!result?.list} onClick={() => setBackupOpen(true)}>
                <Cloud size={21} />
              </Button>
            </div>
          </header>
          {result?.error && <p role="alert">Pani ne peut pas ouvrir les données locales.</p>}
          {!result && <p role="status">Ouverture de la liste…</p>}
          {result?.list && mode === 'categories' && <CategoryEditor categories={categories} />}
          {result?.list && mode === 'shopping' && <ShoppingView items={shoppingItems} categories={categories} />}
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
                            onSwipeRight={() => void addPurchase(item)}
                            onMenuChange={(open) => setOpenMenu(open ? item.id : undefined)}
                            menu={
                              <>
                                <button type="button" aria-label={`Ajouter ${item.name} aux courses`} onClick={() => void addPurchase(item)}><ShoppingBasket size={18} /></button>
                                <button type="button" aria-label={`Modifier ${item.name}`} onClick={() => { setOpenMenu(undefined); setEditor({ item }) }}><Pencil size={18} /></button>
                                <button type="button" aria-label="Fermer les actions" onClick={() => setOpenMenu(undefined)}><X size={18} /></button>
                                <button type="button" aria-label={`Supprimer ${item.name}`} className="delete-action" onClick={() => void remove(item)}><Trash2 size={18} /></button>
                              </>
                            }
                          >
                            <button
                              type="button"
                              data-swipe-trigger
                              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
                              aria-label={`Actions pour ${item.name}`}
                              aria-describedby={item.shopping ? `in-shopping-${item.id}` : undefined}
                              aria-expanded={openMenu === item.id}
                              aria-controls={`actions-${item.id}`}
                              aria-keyshortcuts="Alt+ArrowRight"
                              onKeyDown={(event) => {
                                if (!event.altKey || event.key !== 'ArrowRight' || openMenu === item.id) return
                                event.preventDefault()
                                void addPurchase(item)
                              }}
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
                              <span className="min-w-0 break-words">{item.name}</span>
                              {item.shopping && (
                                <span id={`in-shopping-${item.id}`} className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                                  <span className="sr-only">Dans Courses</span>
                                  <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7.5 9 12 3.5 16.5 9 M2 9h20 M3 9l2.5 11h13L21 9 M9 12l1 5 M15 12l-1 5" />
                                  </svg>
                                </span>
                              )}
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
        </div>
        {editor && (
          <ItemEditor
            item={editor.item}
            categories={categories}
            onClose={() => setEditor(null)}
            onSave={(id) => {
              if (!editor.item) setQuery('')
              setEditor(null)
              animateSavedItem(id)
              toast.success(editor.item ? 'Article modifié.' : 'Article ajouté.')
            }}
          />
        )}
        {backupOpen && <BackupPanel cloud={cloud} hasData={items.length + categories.length > 0} onClose={() => setBackupOpen(false)} />}
      </main>
      <BottomNav mode={mode} disabled={!result?.list} onNavigate={(next) => void switchMode(next)} />
    </>
  )
}
