import { database, type Category, type CategoryColor, type CategoryIcon } from './database'

const legacyColors: Record<CategoryColor, string> = {
  green: '#7d9b92',
  amber: '#c59c50',
  blue: '#7c9abb',
  rose: '#bb8495',
}

export function categoryColor(category: Category) {
  return category.customColor ?? legacyColors[category.color]
}

export const emojiPattern = /^(?=.{1,32}$)(?=.*[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3])(?:\p{Emoji}|\u200d|\ufe0f|\u20e3|[\u{e0020}-\u{e007f}])+$/u
export const colorPattern = /^#[\da-f]{6}$/i

export const icons: Record<CategoryIcon, { label: string; symbol: string }> = {
  basket: { label: 'Panier', symbol: '🧺' },
  apple: { label: 'Pomme', symbol: '🍎' },
  milk: { label: 'Lait', symbol: '🥛' },
  package: { label: 'Boîte', symbol: '📦' },
}

export async function saveCategory(name: string, customColor: string, emoji: string, id?: string) {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Saisissez un nom de catégorie.')
  if (!colorPattern.test(customColor)) throw new Error('Sélectionnez une couleur valide.')
  const symbol = emoji.trim()
  if (symbol && !emojiPattern.test(symbol)) throw new Error('Choisissez un emoji.')
  const normalizedName = cleanName.toLocaleLowerCase('fr')
  const updatedAt = new Date().toISOString()

  return database.mutate(async () => {
    const duplicate = await database.categories.where('normalizedName').equals(normalizedName).first()
    if (duplicate && duplicate.id !== id) throw new Error('Cette catégorie existe déjà.')

    if (id) {
      const existing = await database.categories.get(id)
      if (!existing) throw new Error('Cette catégorie a été supprimée.')
      await database.categories.put({ ...existing, name: cleanName, normalizedName, customColor, emoji: symbol || undefined, updatedAt })
      return
    }

    const last = await database.categories.orderBy('position').last()
    await database.categories.add({
      id: crypto.randomUUID(),
      name: cleanName,
      normalizedName,
      color: 'green',
      icon: 'basket',
      customColor,
      emoji: symbol || undefined,
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
