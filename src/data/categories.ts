import { database, type Category, type CategoryColor, type CategoryIcon } from './database'
import { availableCategoryPosition, mutateWithUndo, undoMutation, type RecordUndo } from './undo'

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

export async function saveCategory(name: string, customColor: string, emoji: string, id?: string, record?: RecordUndo) {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Saisissez un nom de catégorie.')
  if (!colorPattern.test(customColor)) throw new Error('Sélectionnez une couleur valide.')
  const symbol = emoji.trim()
  if (symbol && !emojiPattern.test(symbol)) throw new Error('Choisissez un emoji.')
  const normalizedName = cleanName.toLocaleLowerCase('fr')
  const updatedAt = new Date().toISOString()

  return mutateWithUndo(async () => {
    const duplicate = await database.categories.where('normalizedName').equals(normalizedName).first()
    if (duplicate && duplicate.id !== id) throw new Error('Cette catégorie existe déjà.')

    if (id) {
      const existing = await database.categories.get(id)
      if (!existing) throw new Error('Cette catégorie a été supprimée.')
      const saved = { ...existing, name: cleanName, normalizedName, customColor, emoji: symbol || undefined, updatedAt }
      if (sameCategoryDetails(existing, saved)) return { value: undefined }
      await database.categories.put(saved)
      return { value: undefined, undo: undoMutation(async () => {
        const current = await database.categories.get(id)
        if (!current || !sameCategoryDetails(current, saved) || await nameTaken(existing)) return false
        await database.categories.update(id, {
          name: existing.name,
          normalizedName: existing.normalizedName,
          customColor: existing.customColor,
          emoji: existing.emoji,
          updatedAt: new Date().toISOString(),
        })
        return true
      }) }
    }

    const last = await database.categories.orderBy('position').last()
    const category: Category = {
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
    }
    await database.categories.add(category)
    return { value: undefined, undo: undoMutation(async () => {
      const current = await database.categories.get(category.id)
      if (!current || !sameCategoryDetails(current, category)) return false
      if (await database.items.filter((item) => item.categoryId === category.id).first()) return false
      await database.categories.delete(category.id)
      return true
    }) }
  }, record)
}

function sameCategoryDetails(current: Category, expected: Category) {
  return current.name === expected.name && current.customColor === expected.customColor && current.emoji === expected.emoji
}

async function nameTaken(category: Category) {
  const existing = await database.categories.where('normalizedName').equals(category.normalizedName).first()
  return existing !== undefined && existing.id !== category.id
}

export async function deleteCategory(id: string, record?: RecordUndo) {
  await mutateWithUndo(async () => {
    const category = await database.categories.get(id)
    if (!category) throw new Error('Cette catégorie a déjà été supprimée.')
    const items = await database.items.orderBy('position').toArray()
    const last = items.filter((item) => item.categoryId === null).at(-1)
    const updatedAt = new Date().toISOString()
    const previous = items.filter((item) => item.categoryId === id)
    const moved = previous.map((item, index) => ({
      ...item,
      categoryId: null,
      position: (last?.position ?? -1) + 1 + index,
      updatedAt,
    }))
    await database.items.bulkPut(moved)
    await database.categories.delete(id)
    return { value: undefined, undo: undoMutation(async () => {
      if (await database.categories.get(id) || await nameTaken(category)) return false
      const current = await database.items.bulkGet(previous.map((item) => item.id))
      const restored = []
      for (const [index, original] of previous.entries()) {
        const item = current[index]
        if (!item || item.categoryId !== null || item.position !== moved[index].position) return false
        restored.push({ ...item, categoryId: id, position: original.position, updatedAt: new Date().toISOString() })
      }
      await database.categories.add({ ...category, position: await availableCategoryPosition(category) })
      await database.items.bulkPut(restored)
      return true
    }) }
  }, record)
}
