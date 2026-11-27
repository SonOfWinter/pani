import { useLiveQuery } from 'dexie-react-hooks'
import { Cloud, Pencil, Plus, ShoppingBasket, Trash2, Undo2, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type FocusEvent } from 'react'
import { toast } from 'sonner'
import { useCloudBackup } from './backup/useCloudBackup'
import { BackupPanel } from './components/BackupPanel'
import { BottomNav } from './components/BottomNav'
import { navigation, navigationIndex } from './lib/navigation'
import { CategoryEditor } from './components/CategoryEditor'
import { ItemEditor } from './components/ItemEditor'
import { CategoryDisclosure } from './components/CategoryDisclosure'
import { QuantityStepper } from './components/QuantityStepper'
import { CategoryDrop, ItemSortGroup, Reorder, SortableRow } from './components/Reorder'
import { ShoppingBadge, shoppingOrigin, type ShoppingOrigin } from './components/ShoppingBadge'
import { ShoppingView } from './components/ShoppingView'
import { UpdateNotice } from './components/UpdateNotice'
import { useConfirm } from './components/ui/confirm'
import { Button } from './components/ui/button'
import { database, type Item, type Mode } from './data/database'
import { addToShopping, changeQuantity, clearShopping, deleteItem } from './data/items'
import { animateCounter, animateModeChange, animateRemoval, animateRowRemoval, animateSavedRow, animateUndo, captureUndoMotion } from './lib/list-motion'
import { moveItem, planItemMove } from './data/order'
import { useOrderPreview } from './lib/useOrderPreview'
import { useUndoHistory } from './lib/useUndoHistory'
import type { RecordUndo } from './data/undo'

type PurchaseFeedback =
  | { kind: 'added' | 'already'; origin: ShoppingOrigin }
  | { kind: 'error' }

export function App() {
  const screenTop = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const top = screenTop.current
    if (!top) return
    function syncHeader() {
      top?.toggleAttribute('data-compact', window.scrollY > 0)
    }
    syncHeader()
    window.addEventListener('scroll', syncHeader, { passive: true })
    return () => window.removeEventListener('scroll', syncHeader)
  }, [])

  const confirm = useConfirm()
  const undo = useUndoHistory()
  const recordListUndo: RecordUndo = (action) => undo.record('list', action)
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
  const [collapsedCategories, setCollapsedCategories] = useState(new Set<string | null>())
  const [purchaseFeedback, setPurchaseFeedback] = useState<Record<string, PurchaseFeedback>>({})
  const [openMenu, setOpenMenu] = useState<string>()
  const [editor, setEditor] = useState<{ item: Item | null; fromTop?: number } | null>(null)

  const revision = result?.list?.state.revision ?? 0
  const itemOrder = useOrderPreview(revision)
  const categoryOrder = useOrderPreview(revision)
  const items = itemOrder.apply(result?.list?.items ?? [])
  const categories = result?.list?.categories ?? []
  const mode = result?.list?.state.mode ?? 'list'
  const activeTab = navigationIndex(mode)
  const movePending = mode === 'list' ? itemOrder.moving : mode === 'categories' && categoryOrder.moving
  const undoUnavailable = !result?.list || !undo.history[mode].length || undo.busy || movePending
  const shoppingItems = items.flatMap((item) => item.shopping
    ? [{ ...item, quantity: item.shopping.quantity, checkedAt: item.shopping.checkedAt }]
    : [])
  const remaining = shoppingItems.filter((item) => item.checkedAt === null).length
  const screenTitle = useRef<HTMLHeadingElement>(null)
  const screenContent = useRef<HTMLDivElement>(null)
  const previousMode = useRef(mode)
  const uncategorizedArrival = useRef(false)

  useLayoutEffect(() => {
    const previous = previousMode.current
    previousMode.current = mode
    if (mode === 'list' && uncategorizedArrival.current) {
      uncategorizedArrival.current = false
      const count = document.getElementById('category:')?.querySelector<HTMLElement>('.category-count')
      if (count) animateCounter(count, 1)
    }
    if (previous === mode || !screenTitle.current || !screenContent.current) return
    const direction = Math.sign(activeTab - navigationIndex(previous))
    return animateModeChange(screenTitle.current, screenContent.current, direction)
  }, [activeTab, mode])

  const shoppingCount = useRef<HTMLSpanElement>(null)
  const previousRemaining = useRef(remaining)
  const undoMotion = useRef<{ revision: number; mode: Mode; layout: NonNullable<ReturnType<typeof captureUndoMotion>> } | undefined>(undefined)

  useLayoutEffect(() => {
    const direction = remaining - previousRemaining.current
    previousRemaining.current = remaining
    if (mode !== 'shopping' || !shoppingCount.current) return
    const animation = animateCounter(shoppingCount.current, direction)
    return () => animation?.cancel()
  }, [mode, remaining])

  useLayoutEffect(() => {
    const motion = undoMotion.current
    if (!motion || revision <= motion.revision) return
    undoMotion.current = undefined
    if (mode === motion.mode) animateUndo(motion.layout)
  }, [mode, revision])

  async function undoLastAction() {
    const layout = captureUndoMotion()
    const motion = layout ? { revision, mode, layout } : undefined
    undoMotion.current = motion
    if (!await undo.undo(mode) && undoMotion.current === motion) undoMotion.current = undefined
  }

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

  async function addPurchase(item: Item, origin: ShoppingOrigin) {
    let feedback: PurchaseFeedback
    try {
      const added = await addToShopping(item.id, recordListUndo)
      feedback = { kind: added ? 'added' : 'already', origin }
    } catch {
      feedback = { kind: 'error' }
    }
    setPurchaseFeedback((current) => ({ ...current, [item.id]: feedback }))
    if (feedback.kind === 'added') navigator.vibrate?.(12)
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
    return run(
      async () => {
        const changes = planItemMove(items, item, destination)
        if (!changes.length) return
        await itemOrder.commit(changes, () => moveItem(item.id, destination, recordListUndo))
        toast.success(`${item.name} déplacé.`)
      },
      'Impossible de déplacer cet article.',
    )
  }

  async function remove(item: Item) {
    if (!await confirm({ title: `Supprimer « ${item.name} » ?`, action: 'Supprimer' })) return
    await run(async () => {
      setOpenMenu(undefined)
      const animation = await animateRowRemoval(document.getElementById(`reorder-row-${item.id}`))
      try {
        await deleteItem(item.id, recordListUndo)
      } catch (error) {
        animation?.cancel()
        throw error
      }
      document.getElementById('add-item')?.focus()
    }, 'Impossible de supprimer cet article.', `${item.name} supprimé.`)
  }

  async function switchMode(next: Mode) {
    setOpenMenu(undefined)
    if (next !== 'list') {
      setQuery('')
      setPurchaseFeedback({})
      setCollapsedCategories(new Set())
    }
    await run(() => database.setMode(next), 'Impossible de changer de vue. Réessayez.')
  }

  function toggleCategory(id: string | null) {
    setOpenMenu(undefined)
    setCollapsedCategories((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function revealFocusedControl(event: FocusEvent<HTMLDivElement>) {
    const control = event.target
    if (control.closest('dialog')) return
    requestAnimationFrame(() => {
      const top = screenTop.current
      if (!top || document.activeElement !== control) return
      const bottom = Math.max(...Array.from(top.children, (child) => child.getBoundingClientRect().bottom))
      const { top: controlTop } = control.getBoundingClientRect()
      if (controlTop < bottom + 6) window.scrollBy(0, controlTop - bottom - 6)
    })
  }

  return (
    <>
      <main className="pani-shell mx-auto max-w-xl">
        <div ref={screenTop} className="screen-top">
          <header className="screen-header">
            <div>
              <h1 ref={screenTitle}>{navigation[activeTab].label}</h1>
              {mode !== 'categories' && (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {mode === 'shopping'
                    ? <><span ref={shoppingCount} className="shopping-count">{remaining}</span> {remaining === 1 ? 'article à acheter' : 'articles à acheter'}</>
                    : `${items.length} ${items.length === 1 ? 'article' : 'articles'}`}
                </p>
              )}
            </div>
            <div className="flex shrink-0">
              {mode === 'shopping' && (
                <Button variant="ghost" className="px-2" aria-label="Vider les courses" disabled={!shoppingItems.length} onClick={() => void emptyShopping()}>
                  <Trash2 size={21} />
                </Button>
              )}
              <Button variant="ghost" className="px-2 aria-disabled:opacity-50" aria-label="Annuler la dernière action"
                aria-disabled={undoUnavailable} onClick={() => { if (!undoUnavailable) void undoLastAction() }}>
                <Undo2 size={21} aria-hidden="true" />
              </Button>
              <Button variant="ghost" className="px-2" aria-label="Sauvegardes" disabled={!result?.list} onClick={() => setBackupOpen(true)}>
                <Cloud size={21} />
              </Button>
            </div>
          </header>
          <UpdateNotice />
        </div>
        <div key={mode} ref={screenContent} className="screen-transition" onFocus={revealFocusedControl}>
          {result?.error && <p role="alert">Pani ne peut pas ouvrir les données locales.</p>}
          {!result && <p role="status">Ouverture de la liste…</p>}
          {result?.list && mode === 'categories' && <CategoryEditor categories={categories} order={categoryOrder} recordUndo={(action) => undo.record('categories', action)}
            onCategoryRemoved={(id) => {
              if (items.some((item) => item.categoryId === id)) uncategorizedArrival.current = true
            }} />}
          {result?.list && mode === 'shopping' && <ShoppingView items={shoppingItems} categories={categories} recordUndo={(action) => undo.record('shopping', action)} />}
          {result?.list && mode === 'list' && (
            <>
              <div className="list-toolbar">
                <input
                  type="search"
                  className="pani-input min-w-0 flex-1"
                  aria-label="Rechercher un article"
                  placeholder="Rechercher"
                  value={query}
                  onChange={(event) => {
                    const value = event.target.value
                    setQuery(value)
                    if (value.trim() && collapsedCategories.size) setCollapsedCategories(new Set())
                  }}
                  onKeyDown={(event) => { if (event.key === 'Escape') setQuery('') }}
                />
                <Button id="add-item" aria-label="Ajouter un article" className="px-2.5" onClick={() => { setOpenMenu(undefined); setEditor({ item: null }) }}>
                  <Plus size={20} />
                </Button>
              </div>
              {!groups.length && <p className="empty-group">Aucun résultat.</p>}
              <Reorder hasCategoryTargets onStart={() => setOpenMenu(undefined)} onDrop={({ active, over }) => {
                if (!over || active.id === over.id || itemOrder.moving) return
                const item = items.find((entry) => entry.id === active.id)
                const target = items.find((entry) => entry.id === over.id)
                const targetId = String(over.id)
                if (!item) return
                if (target) void reorder(item, { categoryId: target.categoryId, targetId: target.id })
                else if (targetId.startsWith('category:')) {
                  void reorder(item, { categoryId: targetId.slice(9) || null })
                }
              }}>
                {groups.map(({ category, items: groupItems }) => {
                  const categoryId = category?.id ?? null
                  const expanded = Boolean(term) || !collapsedCategories.has(categoryId)
                  const groupId = `category:${categoryId ?? ''}`
                  return (
                    <CategoryDrop key={categoryId ?? 'none'} id={groupId} expanded={expanded}>
                      <CategoryDisclosure category={category} count={groupItems.length} expanded={expanded}
                        searching={Boolean(term)} onToggle={() => toggleCategory(categoryId)}>
                        {groupItems.length === 0 && (
                          <p className="empty-group">{!category && !items.length ? 'Votre liste est vide.' : 'Aucun article'}</p>
                        )}
                        <ItemSortGroup id={groupId} itemIds={groupItems.map((item) => item.id)}
                          expanded={expanded} committing={itemOrder.moving}>
                          {groupItems.map((item) => {
                            const feedback = purchaseFeedback[item.id]
                            return (
                              <SortableRow
                                key={item.id}
                                id={item.id}
                                label={item.name}
                                disabled={Boolean(term) || !expanded}
                                dropDisabled={!expanded}
                                dragPending={itemOrder.moving}
                                menuOpen={openMenu === item.id}
                                onSwipeRight={(origin) => void addPurchase(item, origin)}
                                onMenuChange={(open) => setOpenMenu(open ? item.id : undefined)}
                                menu={
                                  <>
                                    <button type="button" aria-label={`Ajouter ${item.name} aux courses`} onClick={(event) => {
                                      void addPurchase(item, shoppingOrigin(event.currentTarget))
                                      setOpenMenu(undefined)
                                      document.getElementById(`reorder-row-${item.id}`)
                                        ?.querySelector<HTMLButtonElement>('[data-swipe-trigger]')?.focus({ preventScroll: true })
                                    }}><ShoppingBasket size={18} /></button>
                                    <button type="button" aria-label={`Modifier ${item.name}`} onClick={() => { setOpenMenu(undefined); setEditor({
                                      item, fromTop: document.getElementById(`reorder-row-${item.id}`)?.getBoundingClientRect().top,
                                    }) }}><Pencil size={18} /></button>
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
                                    void addPurchase(item, shoppingOrigin(event.currentTarget))
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
                                  <span className="min-w-0 break-words">
                                    <span>{item.name}</span>
                                    <span role="status" className={feedback?.kind === 'error'
                                      ? 'block text-xs text-muted-foreground' : 'sr-only'}>
                                      {feedback?.kind === 'added' && item.shopping && `${item.name} ajouté aux courses.`}
                                      {feedback?.kind === 'already' && item.shopping && `${item.name} est déjà dans les courses.`}
                                      {feedback?.kind === 'error' && 'Impossible d’ajouter cet article aux courses.'}
                                    </span>
                                  </span>
                                  {item.shopping && <ShoppingBadge id={`in-shopping-${item.id}`}
                                    arrival={feedback && feedback.kind !== 'error' ? feedback : undefined} />}
                                </button>
                                <QuantityStepper item={item} onChange={(change) => void run(
                                  () => changeQuantity(item.id, change), 'Impossible de modifier la quantité.',
                                )} />
                              </SortableRow>
                            )
                          })}
                        </ItemSortGroup>
                      </CategoryDisclosure>
                    </CategoryDrop>
                  )
                })}
              </Reorder>
            </>
          )}
        </div>
        {editor && (
          <ItemEditor
            item={editor.item}
            recordUndo={recordListUndo}
            categories={categories}
            onClose={() => setEditor(null)}
            onSave={(id, categoryId) => {
              if (!editor.item) setQuery('')
              setEditor(null)
              animateSavedRow(id, !editor.item, editor.item?.categoryId !== categoryId ? editor.fromTop : undefined)
              toast.success(editor.item ? 'Article modifié.' : 'Article ajouté.')
            }}
          />
        )}
        {backupOpen && <BackupPanel cloud={cloud} hasData={items.length + categories.length > 0} onRestored={undo.clear} onClose={() => setBackupOpen(false)} />}
      </main>
      <BottomNav mode={mode} disabled={!result?.list} onNavigate={(next) => void switchMode(next)} />
    </>
  )
}
