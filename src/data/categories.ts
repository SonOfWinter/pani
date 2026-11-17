import { database, type CategoryColor, type CategoryIcon } from './database'

export const colors: Record<CategoryColor, { label: string; style: string }> = {
  green: { label: 'Vert', style: 'bg-category-green' },
  amber: { label: 'Ambre', style: 'bg-category-amber' },
  blue: { label: 'Bleu', style: 'bg-category-blue' },
  rose: { label: 'Rose', style: 'bg-category-rose' },
}

export const icons: Record<CategoryIcon, { label: string; symbol: string }> = {
  basket: { label: 'Panier', symbol: '🧺' },
  apple: { label: 'Pomme', symbol: '🍎' },
  milk: { label: 'Lait', symbol: '🥛' },
  package: { label: 'Boîte', symbol: '📦' },
}

export async function saveCategory(name: string, color: CategoryColor, icon: CategoryIcon, id?: string) {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Saisissez un nom de catégorie.')
  const normalizedName = cleanName.toLocaleLowerCase('fr')
  const updatedAt = new Date().toISOString()

  return database.mutate(async () => {
    const duplicate = await database.categories.where('normalizedName').equals(normalizedName).first()
    if (duplicate && duplicate.id !== id) throw new Error('Cette catégorie existe déjà.')

    if (id) {
      const existing = await database.categories.get(id)
      if (!existing) throw new Error('Cette catégorie a été supprimée.')
      await database.categories.put({ ...existing, name: cleanName, normalizedName, color, icon, updatedAt })
      return
    }

    const last = await database.categories.orderBy('position').last()
    await database.categories.add({
      id: crypto.randomUUID(),
      name: cleanName,
      normalizedName,
      color,
      icon,
      position: (last?.position ?? -1) + 1,
      createdAt: updatedAt,
      updatedAt,
    })
  })
}

export async function deleteCategory(id: string) {
  await database.mutate(async () => {
    if (!await database.categories.get(id)) throw new Error('Cette catégorie a déjà été supprimée.')
    const items = await database.items.orderBy('position').toArray()
    const last = items.filter((item) => item.categoryId === null).at(-1)
    const updatedAt = new Date().toISOString()
    const moved = items.filter((item) => item.categoryId === id).map((item, index) => ({
      ...item,
      categoryId: null,
      position: (last?.position ?? -1) + 1 + index,
      updatedAt,
    }))
    await database.items.bulkPut(moved)
    await database.categories.delete(id)
  })
}
