import { colorPattern, emojiPattern, icons } from '../data/categories'
import { database, type Category, type Item } from '../data/database'
import { decryptBackup, encryptBackup, maxEnvelopeLength } from './envelope'

export interface Snapshot {
  version: 1
  date: string
  items: Item[]
  categories: Category[]
}

function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new Error('Les données de cette sauvegarde sont invalides.')
}

function record(value: unknown): Record<string, unknown> {
  requireValid(value && typeof value === 'object' && !Array.isArray(value))
  return value as Record<string, unknown>
}

function id(value: unknown): string {
  requireValid(typeof value === 'string' &&
    /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value))
  return value
}

function name(value: unknown): string {
  requireValid(typeof value === 'string' && value.length > 0 && value === value.trim())
  return value
}

function date(value: unknown): string {
  requireValid(typeof value === 'string')
  const timestamp = new Date(value)
  requireValid(Number.isFinite(timestamp.valueOf()) && timestamp.toISOString() === value)
  return value
}

function position(value: unknown): number {
  requireValid(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
  return value
}

function unique<T>(previous: Set<T>, value: T): T {
  requireValid(!previous.has(value))
  previous.add(value)
  return value
}

function timestamps(entry: Record<string, unknown>) {
  const createdAt = date(entry.createdAt)
  const updatedAt = date(entry.updatedAt)
  return { createdAt, updatedAt }
}

export function validateSnapshot(value: unknown): Snapshot {
  const payload = record(value)
  requireValid(payload.version === 1 && Array.isArray(payload.items) && Array.isArray(payload.categories))
  const categoryIds = new Set<string>()
  const normalizedNames = new Set<string>()
  const categoryPositions = new Set<number>()
  const categories: Category[] = payload.categories.map((value: unknown) => {
    const entry = record(value)
    const categoryName = name(entry.name)
    const normalizedName = unique(normalizedNames, categoryName.toLocaleLowerCase('fr'))
    requireValid(typeof entry.color === 'string' && ['green', 'amber', 'blue', 'rose'].includes(entry.color))
    requireValid(typeof entry.icon === 'string' && Object.hasOwn(icons, entry.icon))
    const { customColor, emoji } = entry
    requireValid(customColor === undefined || (typeof customColor === 'string' && colorPattern.test(customColor)))
    requireValid(emoji === undefined || (typeof emoji === 'string' && emojiPattern.test(emoji)))
    return {
      customColor,
      emoji,
      id: unique(categoryIds, id(entry.id)),
      name: categoryName,
      normalizedName,
      color: entry.color as Category['color'],
      icon: entry.icon as Category['icon'],
      position: unique(categoryPositions, position(entry.position)),
      ...timestamps(entry),
    }
  })

  const itemIds = new Set<string>()
  const itemPositions = new Set<string>()
  const items: Item[] = payload.items.map((value: unknown) => {
    const entry = record(value)
    const categoryId = entry.categoryId === null ? null : id(entry.categoryId)
    requireValid(categoryId === null || categoryIds.has(categoryId))
    requireValid(typeof entry.quantity === 'string')
    const index = position(entry.position)
    unique(itemPositions, `${categoryId}:${index}`)
    return {
      id: unique(itemIds, id(entry.id)),
      name: name(entry.name),
      quantity: entry.quantity,
      categoryId,
      position: index,
      checkedAt: entry.checkedAt === null ? null : date(entry.checkedAt),
      ...timestamps(entry),
    }
  })

  return { version: 1, date: date(payload.date), categories, items }
}

export async function makeBackup(phrase: string) {
  const { items, categories, state } = await database.readList()
  const snapshot: Snapshot = { version: 1, date: new Date().toISOString(), items, categories }
  return { revision: state.revision, text: await encryptBackup(snapshot, phrase) }
}

export async function readBackup(text: string, phrase: string) {
  return validateSnapshot(await decryptBackup(text, phrase))
}

export async function readBackupFile(file: File, phrase: string) {
  if (file.size > maxEnvelopeLength) throw new Error('La sauvegarde est trop volumineuse.')
  return readBackup(await file.text(), phrase)
}

export async function restoreSnapshot(input: Snapshot, expectedRevision: number) {
  const snapshot = validateSnapshot(input)
  await database.mutate(async () => {
    if ((await database.readState()).revision !== expectedRevision) {
      throw new Error('La liste a changé. Ouvrez à nouveau la sauvegarde avant de restaurer.')
    }
    const state = await database.readState()
    if (state.cloud?.enabled) await database.state.put({ ...state, cloud: { ...state.cloud, enabled: false } })
    await database.items.clear()
    await database.categories.clear()
    await database.categories.bulkAdd(snapshot.categories)
    await database.items.bulkAdd(snapshot.items)
  })
}
