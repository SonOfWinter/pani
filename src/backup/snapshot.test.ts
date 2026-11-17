import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'vitest'
import { database } from '../data/database'
import { saveItem } from '../data/items'
import { makeBackup, readBackup, restoreSnapshot, validateSnapshot } from './snapshot'

const phrase = 'phrase réservée au test de restauration'

afterEach(async () => {
  await database.delete()
  await database.open()
})

test('une modification locale après aperçu bloque le remplacement', async () => {
  await saveItem('Farine', '500 g', null)
  const archive = await makeBackup(phrase)
  const snapshot = await readBackup(archive.text, phrase)
  await saveItem('Riz', '', null)

  await expect(restoreSnapshot(snapshot, archive.revision)).rejects.toThrow('La liste a changé')
  expect((await database.readList()).items.map(({ name }) => name)).toEqual(['Farine', 'Riz'])
})

test('refuse une catégorie orpheline et restaure atomiquement une archive valide', async () => {
  await saveItem('Farine', '500 g', null)
  const archive = await makeBackup(phrase)
  const saved = await readBackup(archive.text, phrase)
  expect(() => validateSnapshot({
    ...saved,
    items: [{ ...saved.items[0], categoryId: crypto.randomUUID() }],
  })).toThrow('invalides')

  await saveItem('Riz', '', null)
  const { revision } = await database.readState()
  await restoreSnapshot(saved, revision)
  expect((await database.readList()).items).toEqual(saved.items)
})
