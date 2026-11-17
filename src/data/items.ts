import { database } from './database'

export async function saveItem(name: string, quantity: string, categoryId: string | null, id?: string) {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Saisissez un nom.')
  const updatedAt = new Date().toISOString()

  return database.mutate(async () => {
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
      await database.items.put({
        ...existing, name: cleanName, quantity: quantity.trim(), categoryId, position, updatedAt,
      })
      return existing.id
    }

    const newId = crypto.randomUUID()
    await database.items.add({
      id: newId,
      name: cleanName,
      quantity: quantity.trim(),
      categoryId,
      checkedAt: null,
      position,
      createdAt: updatedAt,
      updatedAt,
    })
    return newId
  })
}

export async function deleteItem(id: string) {
  await database.mutate(() => database.items.delete(id))
}

export function quantityParts(quantity: string) {
  const match = /^(\d+(?:[,.]\d+)?)(.*)$/.exec(quantity)
  const count = match ? Number(match[1].replace(',', '.')) : 1
  return {
    count: Number.isSafeInteger(Math.trunc(count)) ? count : 1,
    suffix: match?.[2] ?? (quantity ? ` ${quantity}` : ''),
  }
}

export async function changeQuantity(id: string, delta: -1 | 1) {
  await database.mutate(async () => {
    const item = await database.items.get(id)
    if (!item) throw new Error('Cet article a été supprimé.')
    const { count, suffix } = quantityParts(item.quantity)
    if (delta < 0 && count <= 1) return
    const next = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, count + delta))
    const quantity = String(next).replace('.', ',') + suffix
    await database.items.put({ ...item, quantity, updatedAt: new Date().toISOString() })
  })
}

export async function setItemChecked(id: string, checked: boolean, expected: string | null) {
  return database.mutate(async () => {
    const item = await database.items.get(id)
    if (!item) throw new Error('Cet article a été supprimé.')
    if (item.checkedAt !== expected) return item.checkedAt
    const updatedAt = new Date().toISOString()
    const checkedAt = checked ? updatedAt : null
    await database.items.put({ ...item, checkedAt, updatedAt })
    return checkedAt
  })
}

export async function deleteCheckedItems(ids: string[]) {
  await database.mutate(async () => {
    const items = await database.items.bulkGet(ids)
    await database.items.bulkDelete(items.flatMap((item) => item?.checkedAt ? [item.id] : []))
  })
}
