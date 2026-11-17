import console from 'node:console'
import process from 'node:process'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
assert(url?.startsWith('https://') && key?.startsWith('sb_publishable_'), 'Projet de test et clé publique requis.')

async function signIn(suffix) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const email = process.env[`PANI_TEST_EMAIL_${suffix}`]
  const password = process.env[`PANI_TEST_PASSWORD_${suffix}`]
  assert(email && password, `Compte de test ${suffix} requis.`)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  assert(!error && data.user, `Connexion du compte de test ${suffix} impossible.`)
  return { id: data.user.id, storage: client.storage.from('pani-backups') }
}

const owner = await signIn('A')
const other = await signIn('B')
assert.notEqual(owner.id, other.id)
const name = `test-${randomUUID()}.pani`
const path = `${owner.id}/${name}`
const content = JSON.stringify({ test: 'fixture without user data' })

try {
  assert.equal((await owner.storage.upload(path, content, { contentType: 'application/json' })).error, null)
  assert.equal(await (await owner.storage.download(path)).data?.text(), content)
  const visible = await owner.storage.list(owner.id, { search: name })
  assert.equal(visible.error, null)
  assert(visible.data?.some((entry) => entry.name === name))
  assert((await other.storage.download(path)).error)
  const hidden = await other.storage.list(owner.id, { search: name })
  assert(hidden.error || !hidden.data?.some((entry) => entry.name === name))
  assert((await other.storage.upload(path, '{}', { upsert: true, contentType: 'application/json' })).error)
  await other.storage.remove([path])
  assert.equal(await (await owner.storage.download(path)).data?.text(), content)
  assert((await owner.storage.upload(path, '{}', { upsert: true, contentType: 'application/json' })).error)
} finally {
  assert.equal((await owner.storage.remove([path])).error, null)
}
assert((await owner.storage.download(path)).error)
console.log('Séparation des deux comptes vérifiée.')
