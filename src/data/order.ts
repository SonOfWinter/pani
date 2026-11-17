import { database } from './database'

type Direction = -1 | 1
type ItemDestination =
  | { direction: Direction }
  | { categoryId: string | null; targetId?: string }

export async function moveItem(id: string, destination: ItemDestination) {
  await database.mutate(async () => {
    const item = await database.items.get(id)
    if (!item) throw new Error('Article introuvable.')
    const categoryId = 'direction' in destination ? item.categoryId : destination.categoryId
    if (categoryId !== null && !await database.categories.get(categoryId)) {
      throw new Error('Catégorie introuvable.')
    }

    const ordered = await database.items.orderBy('position').toArray()
    const current = ordered.filter((entry) => entry.categoryId === item.categoryId)
    const target = categoryId === item.categoryId
      ? current
      : ordered.filter((entry) => entry.categoryId === categoryId)
    const from = current.findIndex((entry) => entry.id === id)
    const to = 'direction' in destination
      ? from + destination.direction
      : destination.targetId
        ? target.findIndex((entry) => entry.id === destination.targetId)
        : target.length
    if (to < 0 || ('direction' in destination && to >= target.length)) {
      throw new Error('Destination introuvable.')
    }

    current.splice(from, 1)
    target.splice(to, 0, { ...item, categoryId })
    const groups = current === target ? [target] : [current, target]
    const now = new Date().toISOString()
    await database.items.bulkPut(groups.flatMap((group) => group.flatMap((entry, position) => {
      if (entry.id !== id && entry.position === position) return []
      return [{ ...entry, position, updatedAt: now }]
    })))
  })
}

export async function moveCategory(id: string, destination: Direction | string) {
  await database.mutate(async () => {
    const ordered = await database.categories.orderBy('position').toArray()
    const from = ordered.findIndex((category) => category.id === id)
    const to = typeof destination === 'number'
      ? from + destination
      : ordered.findIndex((category) => category.id === destination)
    if (from < 0 || to < 0 || to >= ordered.length) throw new Error('Catégorie introuvable.')
    const [category] = ordered.splice(from, 1)
    ordered.splice(to, 0, category)
    const now = new Date().toISOString()
    await database.categories.bulkPut(ordered.flatMap((entry, position) =>
      entry.position === position ? [] : [{ ...entry, position, updatedAt: now }],
    ))
  })
}
