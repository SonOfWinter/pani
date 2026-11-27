import { database, type Item } from './database'
import { availableItemPosition, mutateWithUndo, undoMutation, type RecordUndo } from './undo'

function sameItemDetails(current: Item, expected: Item) {
  return current.name === expected.name && current.quantity === expected.quantity &&
    current.categoryId === expected.categoryId && current.position === expected.position
}

export async function saveItem(name: string, quantity: string, categoryId: string | null, id?: string, record?: RecordUndo) {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Saisissez un nom.')
  const updatedAt = new Date().toISOString()

  return mutateWithUndo(async () => {
    const existing = id ? await database.items.get(id) : undefined
    if (id && !existing) throw new Error('Cet article a été supprimé.')
    if (categoryId && !await database.categories.get(categoryId)) {
      throw new Error('Cette catégorie a été supprimée.')
    }
    const sameCategory = existing?.categoryId === categoryId
    const last = sameCategory ? undefined : await database.items.orderBy('position').filter(
      (item) => item.categoryId === categoryId,
    ).last()
    const position = sameCategory && existing ? existing.position : (last?.position ?? -1) + 1
    if (existing) {
      const saved = { ...existing, name: cleanName, quantity: quantity.trim(), categoryId, position, updatedAt }
      if (sameItemDetails(existing, saved)) return { value: existing.id }
      await database.items.put(saved)
      return { value: existing.id, undo: undoMutation(async () => {
        const current = await database.items.get(saved.id)
        if (!current || !sameItemDetails(current, saved)) return false
        if (existing.categoryId && !await database.categories.get(existing.categoryId)) return false
        await database.items.update(saved.id, {
          name: existing.name,
          quantity: existing.quantity,
          categoryId: existing.categoryId,
          position: await availableItemPosition(existing),
          updatedAt: new Date().toISOString(),
        })
        return true
      }) }
    }

    const item = {
      id: crypto.randomUUID(),
      name: cleanName,
      quantity: quantity.trim(),
      categoryId,
      position,
      createdAt: updatedAt,
      updatedAt,
    }
    await database.items.add(item)
    return { value: item.id, undo: undoMutation(async () => {
      const current = await database.items.get(item.id)
      if (!current || current.shopping || !sameItemDetails(current, item)) return false
      await database.items.delete(item.id)
      return true
    }) }
  }, record)
}

export async function deleteItem(id: string, record?: RecordUndo) {
  await mutateWithUndo(async () => {
    const item = await database.items.get(id)
    if (!item) return { value: undefined }
    await database.items.delete(id)
    return { value: undefined, undo: undoMutation(async () => {
      if (await database.items.get(id) || (item.categoryId && !await database.categories.get(item.categoryId))) return false
      await database.items.add({ ...item, position: await availableItemPosition(item) })
      return true
    }) }
  }, record)
}

export function quantityParts(quantity: string) {
  const match = /^(\d+(?:[,.]\d+)?)(.*)$/.exec(quantity)
  const count = match ? Number(match[1].replace(',', '.')) : 1
  return {
    count: Number.isSafeInteger(Math.trunc(count)) ? count : 1,
    suffix: match?.[2] ?? (quantity ? ` ${quantity}` : ''),
  }
}

export type QuantityChange = -1 | 1 | { count: number }

export function formatQuantityCount(count: number) {
  return count.toLocaleString('fr-FR', { useGrouping: false, maximumSignificantDigits: 21 })
}

export function parseQuantityCount(value: string) {
  const trimmed = value.trim()
  if (!/^\d+(?:[,.]\d+)?$/.test(trimmed)) return null
  const count = Number(trimmed.replace(',', '.'))
  return count > 0 && count <= Number.MAX_SAFE_INTEGER ? count : null
}

export async function changeQuantity(id: string, change: QuantityChange, shopping = false) {
  await database.mutate(async () => {
    const item = await database.items.get(id)
    if (!item) throw new Error('Cet article a été supprimé.')
    const entry = shopping ? item.shopping : item
    if (!entry) throw new Error('Cet article a été retiré des courses.')
    const { count, suffix } = quantityParts(entry.quantity)
    if (change === -1 && count <= 1) return
    const next = typeof change === 'number'
      ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, count + change))
      : change.count
    if (!Number.isFinite(next) || next <= 0 || next > Number.MAX_SAFE_INTEGER) {
      throw new Error('Saisissez une quantité valide.')
    }
    if (next === count) return
    const quantity = formatQuantityCount(next) + suffix
    if (shopping && item.shopping) {
      await database.items.update(id, { shopping: { ...item.shopping, quantity } })
    } else {
      await database.items.update(id, { quantity, updatedAt: new Date().toISOString() })
    }
  })
}

export async function addToShopping(id: string, record?: RecordUndo) {
  return mutateWithUndo(async () => {
    const item = await database.items.get(id)
    if (!item) throw new Error('Cet article a été supprimé.')
    if (item.shopping) return { value: false }
    await database.items.update(id, { shopping: { quantity: item.quantity, checkedAt: null } })
    return { value: true, undo: undoMutation(async () => {
      const current = await database.items.get(id)
      if (!current?.shopping) return false
      await database.items.update(id, { shopping: undefined })
      return true
    }) }
  }, record)
}

interface CheckChange {
  id: string
  before: string | null
  after: string | null
}

function undoChecks(changes: CheckChange[]) {
  return undoMutation(async () => {
    const items = await database.items.bulkGet(changes.map(({ id }) => id))
    const restored: Item[] = []
    for (const [index, change] of changes.entries()) {
      const item = items[index]
      if (!item?.shopping || item.shopping.checkedAt !== change.after) return false
      restored.push({ ...item, shopping: { ...item.shopping, checkedAt: change.before } })
    }
    await database.items.bulkPut(restored)
    return true
  })
}

export async function setItemChecked(id: string, checked: boolean, expected: string | null, record?: RecordUndo) {
  return mutateWithUndo(async () => {
    const item = await database.items.get(id)
    if (!item?.shopping) throw new Error('Cet article a été retiré des courses.')
    if (item.shopping.checkedAt !== expected || checked === (expected !== null)) return { value: item.shopping.checkedAt }
    const checkedAt = checked ? new Date().toISOString() : null
    await database.items.update(id, { shopping: { ...item.shopping, checkedAt } })
    return { value: checkedAt, undo: undoChecks([{ id, before: expected, after: checkedAt }]) }
  }, record)
}

export async function uncheckAll(record?: RecordUndo) {
  return mutateWithUndo(async () => {
    const changes: CheckChange[] = []
    const items = await database.items.filter((item) => Boolean(item.shopping?.checkedAt)).toArray()
    const updates = items.flatMap((item) => {
      if (!item.shopping?.checkedAt) return []
      changes.push({ id: item.id, before: item.shopping.checkedAt, after: null })
      return [{ ...item, shopping: { ...item.shopping, checkedAt: null } }]
    })
    if (!changes.length) return { value: false }
    await database.items.bulkPut(updates)
    return { value: true, undo: undoChecks(changes) }
  }, record)
}

export async function clearShopping(checkedIds?: string[]) {
  return database.mutate(async () => {
    const items = checkedIds
      ? (await database.items.bulkGet(checkedIds)).filter((item) => item?.shopping?.checkedAt)
      : await database.items.filter((item) => item.shopping !== undefined).toArray()
    for (const item of items) {
      if (item) await database.items.update(item.id, { shopping: undefined })
    }
    return items.length > 0
  }, Boolean)
}
