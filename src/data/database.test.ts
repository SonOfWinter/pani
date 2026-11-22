import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'vitest'
import Dexie, { liveQuery } from 'dexie'
import { database, PaniDatabase, type Item } from './database'
import { addToShopping, changeQuantity, deleteItem, saveItem, setItemChecked, uncheckAll } from './items'
import { deleteCategory, saveCategory } from './categories'
import type { UndoAction } from './undo'

let db: PaniDatabase
const item: Item = {
  id: 'test-item',
  name: 'Farine',
  quantity: '500 g',
  categoryId: null,
  position: 0,
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

test('conserve la quantité de Courses et la coche indépendamment de Liste après réouverture', async () => {
  try {
    const id = await saveItem('Farine', '500 g', null)
    await addToShopping(id)
    await changeQuantity(id, 1, true)
    await changeQuantity(id, -1)
    const checkedAt = await setItemChecked(id, true, null)
    expect(checkedAt).toEqual(expect.any(String))

    database.close()
    await database.open()
    expect(await database.items.get(id)).toMatchObject({
      quantity: '499 g',
      shopping: { quantity: '501 g', checkedAt },
    })
  } finally {
    await database.delete()
  }
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


test('la migration conserve les achats préexistants et leur coche', async () => {
  const legacy = new Dexie(db.name)
  legacy.version(1).stores({
    items: 'id, [categoryId+position], position',
    categories: 'id, &normalizedName, position',
    state: 'id',
  })
  await legacy.table('items').add({ ...item, checkedAt: item.updatedAt })
  legacy.close()

  const { items } = await db.readList()
  expect(items).toEqual([{ ...item, shopping: { quantity: item.quantity, checkedAt: item.updatedAt } }])
})

test('annule les modifications et suppressions en conservant les données des autres vues', async () => {
  const history: UndoAction[] = []
  const record = (undo: UndoAction) => history.push(undo)
  const undo = async () => {
    const action = history.pop()
    expect(action).toBeDefined()
    await expect(action?.()).resolves.toBe(true)
  }
  try {
    await database.open()
    await saveCategory('Épicerie', '#123456', '', undefined, record)
    const category = await database.categories.toCollection().first()
    if (!category) throw new Error('Catégorie absente.')
    const id = await saveItem('Farine', '1 kg', category.id, undefined, record)
    await saveItem('Farine complète', '2 kg', null, id, record)
    await deleteItem(id, record)
    await undo()
    expect(await database.items.get(id)).toMatchObject({ name: 'Farine complète', categoryId: null })
    await undo()
    expect(await database.items.get(id)).toMatchObject({ name: 'Farine', quantity: '1 kg', categoryId: category.id })

    await saveCategory('Produits secs', '#224466', '', category.id, record)
    await deleteCategory(category.id, record)
    await addToShopping(id)
    await undo()
    expect(await database.items.get(id)).toMatchObject({ categoryId: category.id, shopping: { quantity: '1 kg' } })
    await undo()
    expect(await database.categories.get(category.id)).toMatchObject({ name: 'Épicerie', customColor: '#123456' })

    const other = await saveItem('Riz', '2 kg', null)
    await addToShopping(other)
    const firstCheck = await setItemChecked(id, true, null, record)
    const secondCheck = await setItemChecked(other, true, null, record)
    await setItemChecked(id, false, firstCheck, record)
    await undo()
    await uncheckAll(record)
    await changeQuantity(other, 1, true)
    await undo()
    expect(await database.items.get(id)).toMatchObject({ shopping: { checkedAt: firstCheck } })
    expect(await database.items.get(other)).toMatchObject({ shopping: { checkedAt: secondCheck, quantity: '3 kg' } })
  } finally {
    await database.delete()
  }
})
