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

export async function toggleItem(id: string) {
  await database.mutate(async () => {
    const item = await database.items.get(id)
    if (!item) throw new Error('Cet article a été supprimé.')
    const updatedAt = new Date().toISOString()
    await database.items.put({
      ...item,
      checkedAt: item.checkedAt === null ? updatedAt : null,
      updatedAt,
    })
  })
}

export async function deleteCheckedItems(ids: string[]) {
  await database.mutate(async () => {
    const items = await database.items.bulkGet(ids)
    await database.items.bulkDelete(items.flatMap((item) => item?.checkedAt ? [item.id] : []))
  })
}
