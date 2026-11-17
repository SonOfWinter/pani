import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { liveQuery } from 'dexie'
import { PaniDatabase, type Item } from './database'

let db: PaniDatabase
const item: Item = {
  id: 'test-item',
  name: 'Farine',
  quantity: '500 g',
  categoryId: null,
  position: 0,
  checkedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  db = new PaniDatabase(crypto.randomUUID())
})

afterEach(async () => {
  await db.delete()
})

test('conserve les articles et la révision après réouverture', async () => {
  await db.mutate(() => db.items.add(item))
  db.close()
  await db.open()
  expect(await db.readList()).toMatchObject({ items: [item], state: { revision: 1 } })
})

test('annule les écritures partielles et conserve la révision', async () => {
  await expect(db.mutate(async () => {
    await db.items.add(item)
    await db.items.add(item)
  })).rejects.toThrow()
  expect(await db.readList()).toMatchObject({ items: [], state: { revision: 0 } })
})

test('observe une écriture commise sur la liste', async () => {
  const observed = new Promise<Item[]>((resolve, reject) => {
    const subscription = liveQuery(() => db.readList()).subscribe({
      next: ({ items }) => {
        if (items.length > 0) {
          subscription.unsubscribe()
          resolve(items)
        }
      },
      error: reject,
    })
  })
  await db.mutate(() => db.items.add(item))
  await expect(observed).resolves.toEqual([item])
})
