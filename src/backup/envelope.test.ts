import { beforeAll, expect, test } from 'vitest'
import { decryptBackup, encryptBackup, maxEnvelopeLength } from './envelope'

const phrase = 'une phrase de test à plusieurs mots'
const payload = { items: [{ name: 'Tomates', quantity: '500 g' }] }
let encrypted: string

beforeAll(async () => {
  encrypted = await encryptBackup(payload, phrase)
})

test('chiffre et restaure les données Unicode avec des IV distincts', async () => {
  expect(encrypted).not.toContain('Tomates')
  expect(JSON.parse(await encryptBackup(payload, phrase)).iv).not.toEqual(JSON.parse(encrypted).iv)
  await expect(decryptBackup(encrypted, phrase)).resolves.toEqual(payload)
})

test('refuse une phrase erronée et les modifications du contenu ou de l’en-tête', async () => {
  await expect(decryptBackup(encrypted, 'phrase erronée')).rejects.toThrow('endommagée')
  const value = JSON.parse(encrypted)
  const altered = {
    ...value,
    ciphertext: (value.ciphertext.startsWith('A') ? 'B' : 'A') + value.ciphertext.slice(1),
  }
  await expect(decryptBackup(JSON.stringify(altered), phrase)).rejects.toThrow('endommagée')
  await expect(decryptBackup(JSON.stringify({ ...value, salt: btoa('0'.repeat(16)) }), phrase)).rejects.toThrow('endommagée')
})

test('rejette tailles, versions et coûts hors contrat', async () => {
  const value = JSON.parse(encrypted)
  await expect(decryptBackup('x'.repeat(maxEnvelopeLength + 1), phrase)).rejects.toThrow('format')
  await expect(decryptBackup(JSON.stringify({ ...value, version: 99 }), phrase)).rejects.toThrow('format')
  await expect(decryptBackup(JSON.stringify({ ...value, iterations: 99_000_000 }), phrase)).rejects.toThrow('format')
})
