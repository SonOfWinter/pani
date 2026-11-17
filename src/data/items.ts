import { database } from './database'

export async function saveItem(name: string, quantity: string, id?: string) {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Saisissez un nom.')
  const updatedAt = new Date().toISOString()

  return database.mutate(async () => {
    const existing = id ? await database.items.get(id) : undefined
    if (id && !existing) throw new Error('Cet article a été supprimé.')
    if (existing) {
      await database.items.put({ ...existing, name: cleanName, quantity: quantity.trim(), updatedAt })
      return existing.id
    }

    const last = await database.items.orderBy('position').filter(
      (item) => item.categoryId === null,
    ).last()
    const newId = crypto.randomUUID()
    await database.items.add({
      id: newId,
      name: cleanName,
      quantity: quantity.trim(),
      categoryId: null,
      checkedAt: null,
      position: (last?.position ?? -1) + 1,
      createdAt: updatedAt,
      updatedAt,
    })
    return newId
  })
}

export async function deleteItem(id: string) {
  await database.mutate(() => database.items.delete(id))
}
