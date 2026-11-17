import { maxEnvelopeLength } from './envelope'
import { database } from '../data/database'
import { makeBackup, readBackup } from './snapshot'
import { backupBucket, supabase } from './supabase'

export interface PendingBackup {
  path: string
  revision: number
  text: string
}

export async function configureCloud(accountId: string, enabled: boolean) {
  await database.transaction('rw', database.state, async () => {
    const state = await database.readState()
    const previous = state.cloud?.accountId === accountId ? state.cloud : undefined
    await database.state.put({
      ...state,
      cloud: {
        enabled,
        accountId,
        installationId: previous?.installationId ?? crypto.randomUUID(),
        savedRevision: previous?.savedRevision ?? null,
        savedAt: previous?.savedAt ?? null,
        savedPath: previous?.savedPath,
      },
    })
  })
}

export async function uploadRevision(accountId: string, phrase: string, pending: PendingBackup | null, signal: AbortSignal, remember: (value: PendingBackup) => void) {
  if (!supabase) return
  const storage = supabase.storage.from(backupBucket)

  const run = async () => {
    const { cloud, revision } = await database.readState()
    if (signal.aborted || document.hidden || !cloud?.enabled ||
        cloud.accountId !== accountId || cloud.savedRevision === revision) return
    const prefix = `${accountId}/${cloud.installationId}`
    let backup = pending?.revision === revision && pending.path.startsWith(`${prefix}/`) ? pending : null
    if (!backup) {
      backup = {
        ...await makeBackup(phrase),
        path: `${prefix}/${crypto.randomUUID()}.pani`,
      }
      if (signal.aborted) return
      remember(backup)
    }

    const current = await database.readState()
    if (signal.aborted || !current.cloud?.enabled || current.cloud.accountId !== accountId) return
    const result = await storage.upload(backup.path, backup.text, {
      upsert: false,
      contentType: 'application/json',
    })
    if (result.error) {
      const existing = await storage.download(backup.path)
      if (existing.error || await existing.data.text() !== backup.text) throw result.error
    }
    const uploadedRevision = backup.revision
    const uploadedPath = backup.path
    await database.transaction('rw', database.state, async () => {
      const latest = await database.readState()
      if (!latest.cloud?.enabled || latest.cloud.accountId !== accountId ||
          latest.cloud.installationId !== cloud.installationId) return
      if (latest.cloud.savedRevision !== null && latest.cloud.savedRevision > uploadedRevision) return
      await database.state.put({
        ...latest,
        cloud: { ...latest.cloud, savedRevision: uploadedRevision, savedAt: new Date().toISOString(), savedPath: uploadedPath },
      })
    })

    const listed = await storage.list(prefix, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (listed.data && listed.data.length > 5) {
      const obsolete = listed.data.slice(5).map((entry) => `${prefix}/${entry.name}`)
      await storage.remove(obsolete)
    }
    return backup
  }

  // Safari and other browsers exposing Web Locks serialize uploads between tabs.
  return navigator.locks
    ? navigator.locks.request(`pani-backup-${accountId}`, run)
    : run()
}

export async function verifyCloudPhrase(accountId: string, phrase: string) {
  const { cloud } = await database.readState()
  if (!supabase || cloud?.accountId !== accountId || !cloud.savedPath) return
  const { data, error } = await supabase.storage.from(backupBucket).download(cloud.savedPath)
  if (error) throw new Error('Impossible de vérifier la phrase. Vérifiez le réseau et réessayez.')
  await readBackup(await data.text(), phrase)
}

export interface CloudSnapshot {
  path: string
  date: string
}

export async function listCloudSnapshots(accountId: string) {
  if (!supabase) return []
  const storage = supabase.storage.from(backupBucket)
  const snapshots: CloudSnapshot[] = []
  const pageSize = 100

  for (let offset = 0; ; offset += pageSize) {
    const { data: folders, error } = await storage.list(accountId, { limit: pageSize, offset })
    if (error) throw new Error('Impossible de lister les sauvegardes distantes.')
    for (const folder of folders) {
      if (folder.id || !/^[a-f\d-]{36}$/i.test(folder.name)) continue
      const prefix = `${accountId}/${folder.name}`
      const { data: files, error: filesError } = await storage.list(prefix, {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      if (filesError) throw new Error('Impossible de lister les sauvegardes distantes.')
      for (const file of files) {
        if (file.id && file.created_at && file.name.endsWith('.pani')) {
          snapshots.push({ path: `${prefix}/${file.name}`, date: file.created_at })
        }
      }
    }
    if (folders.length < pageSize) break
  }
  return snapshots.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50)
}

export async function openCloudSnapshot(accountId: string, path: string, phrase: string) {
  if (!supabase || !path.startsWith(`${accountId}/`)) throw new Error('Sauvegarde indisponible.')
  const { data, error } = await supabase.storage.from(backupBucket).download(path)
  if (error) throw new Error('Téléchargement impossible. Vérifiez le réseau et réessayez.')
  if (data.size > maxEnvelopeLength) throw new Error('La sauvegarde est trop volumineuse.')
  return readBackup(await data.text(), phrase)
}
