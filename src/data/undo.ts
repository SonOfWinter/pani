import { database, type Category, type Item } from './database'

export type UndoAction = () => Promise<boolean>
export type RecordUndo = (action: UndoAction) => void

export async function mutateWithUndo<Result>(
  write: () => Promise<{ value: Result; undo?: UndoAction }>,
  record?: RecordUndo,
) {
  const result = await database.mutate(write, ({ undo }) => Boolean(undo))
  if (result.undo) record?.(result.undo)
  return result.value
}

export function undoMutation(write: UndoAction): UndoAction {
  return () => database.mutate(write, Boolean)
}

export async function availableItemPosition(item: Pick<Item, 'id' | 'categoryId' | 'position'>) {
  const group = await database.items.orderBy('position')
    .filter((entry) => entry.categoryId === item.categoryId && entry.id !== item.id).toArray()
  return group.some((entry) => entry.position === item.position)
    ? (group.at(-1)?.position ?? -1) + 1
    : item.position
}

export async function availableCategoryPosition(category: Category) {
  if (!await database.categories.where('position').equals(category.position).first()) return category.position
  return ((await database.categories.orderBy('position').last())?.position ?? -1) + 1
}
