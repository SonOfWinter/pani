import { database, type Category, type Item } from './database'
import { mutateWithUndo, undoMutation, type RecordUndo } from './undo'

type Direction = -1 | 1
type ItemDestination =
  | { direction: Direction }
  | { categoryId: string | null; targetId?: string }

interface Placement {
  id: string
  position: number
  categoryId?: string | null
}

function positionKey(row: Placement) {
  return `${row.categoryId ?? ''}:${row.position}`
}

function canRestoreOrder(current: Placement[], before: Placement[], after: Placement[]) {
  const currentById = new Map(current.map((row) => [row.id, row]))
  const moved = new Set(after.map((row) => row.id))
  for (const row of after) {
    const actual = currentById.get(row.id)
    if (!actual || positionKey(actual) !== positionKey(row)) return false
  }
  const occupied = new Set(current.filter((row) => !moved.has(row.id)).map(positionKey))
  return before.every((row) => !occupied.has(positionKey(row)))
}

async function writeItemPositions(changes: Pick<Item, 'id' | 'categoryId' | 'position'>[]) {
  const updatedAt = new Date().toISOString()
  await database.items.bulkUpdate(changes.map(({ id, ...placement }) => ({
    key: id, changes: { ...placement, updatedAt },
  })))
}

async function writeCategoryPositions(changes: Pick<Category, 'id' | 'position'>[]) {
  const updatedAt = new Date().toISOString()
  await database.categories.bulkUpdate(changes.map(({ id, position }) => ({
    key: id, changes: { position, updatedAt },
  })))
}

export function planItemMove(ordered: Item[], item: Item, destination: ItemDestination) {
  const categoryId = 'direction' in destination ? item.categoryId : destination.categoryId
  const current = ordered.filter((entry) => entry.categoryId === item.categoryId)
  const target = categoryId === item.categoryId
    ? current
    : ordered.filter((entry) => entry.categoryId === categoryId)
  const from = current.findIndex((entry) => entry.id === item.id)
  const to = 'direction' in destination
    ? from + destination.direction
    : destination.targetId
      ? target.findIndex((entry) => entry.id === destination.targetId)
      : target.length
  if (from < 0 || to < 0 || ('direction' in destination && to >= target.length)) {
    throw new Error('Destination introuvable.')
  }

  current.splice(from, 1)
  target.splice(to, 0, { ...item, categoryId })
  const groups = current === target ? [target] : [current, target]
  return groups.flatMap((group) => group.flatMap((entry, position) =>
    (entry.id !== item.id || item.categoryId === entry.categoryId) && entry.position === position
      ? []
      : [{ id: entry.id, categoryId: entry.categoryId, position }],
  ))
}

export async function moveItem(id: string, destination: ItemDestination, record?: RecordUndo) {
  return mutateWithUndo(async () => {
    const item = await database.items.get(id)
    if (!item) throw new Error('Article introuvable.')
    if ('categoryId' in destination && destination.categoryId !== null &&
      !await database.categories.get(destination.categoryId)) {
      throw new Error('Catégorie introuvable.')
    }
    const ordered = await database.items.orderBy('position').toArray()
    const after = planItemMove(ordered, item, destination)
    const { revision } = await database.readState()
    if (!after.length) return { value: revision }

    const changed = new Set(after.map((row) => row.id))
    const before = ordered.filter((row) => changed.has(row.id))
      .map(({ id, categoryId, position }) => ({ id, categoryId, position }))
    await writeItemPositions(after)
    return { value: revision + 1, undo: undoMutation(async () => {
      const current = await database.items.toArray()
      if (!canRestoreOrder(current, before, after)) return false
      const categoryIds = [...new Set(before.flatMap((row) => row.categoryId ? [row.categoryId] : []))]
      if ((await database.categories.bulkGet(categoryIds)).some((category) => !category)) return false
      await writeItemPositions(before)
      return true
    }) }
  }, record)
}

export function planCategoryMove(ordered: Category[], id: string, destination: Direction | string) {
  const from = ordered.findIndex((category) => category.id === id)
  const to = typeof destination === 'number'
    ? from + destination
    : ordered.findIndex((category) => category.id === destination)
  if (from < 0 || to < 0 || to >= ordered.length) throw new Error('Catégorie introuvable.')
  const next = [...ordered]
  const [category] = next.splice(from, 1)
  next.splice(to, 0, category)
  return next.flatMap((entry, position) => entry.position === position ? [] : [{ id: entry.id, position }])
}

export async function moveCategory(id: string, destination: Direction | string, record?: RecordUndo) {
  return mutateWithUndo(async () => {
    const ordered = await database.categories.orderBy('position').toArray()
    const after = planCategoryMove(ordered, id, destination)
    const { revision } = await database.readState()
    if (!after.length) return { value: revision }

    const changed = new Set(after.map((row) => row.id))
    const before = ordered.filter((row) => changed.has(row.id)).map(({ id, position }) => ({ id, position }))
    await writeCategoryPositions(after)
    return { value: revision + 1, undo: undoMutation(async () => {
      if (!canRestoreOrder(await database.categories.toArray(), before, after)) return false
      await writeCategoryPositions(before)
      return true
    }) }
  }, record)
}
