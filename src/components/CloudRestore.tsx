import { useState } from 'react'
import { listCloudSnapshots, openCloudSnapshot, type CloudSnapshot } from '../backup/cloud'
import type { Snapshot } from '../backup/snapshot'
import { database } from '../data/database'
import { Button } from './ui/button'

export function CloudRestore({ accountId, onPreview }: {
  accountId: string
  onPreview: (data: Snapshot, revision: number, owner: string) => void
}) {
  const [snapshots, setSnapshots] = useState<CloudSnapshot[]>()
  const [path, setPath] = useState('')
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(operation: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await operation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sauvegarde indisponible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <fieldset className="grid gap-2 border-t border-border pt-3" disabled={busy}>
      <legend className="font-semibold">Restaurer depuis Supabase</legend>
      <Button variant="outline" onClick={() => void run(async () => {
        const latest = await listCloudSnapshots(accountId)
        setSnapshots(latest)
        setPath(latest[0]?.path ?? '')
      })}>Charger les sauvegardes</Button>
      {error && <p role="alert">{error}</p>}
      {snapshots?.length === 0 && <p>Aucune sauvegarde dans ce compte.</p>}
      {Boolean(snapshots?.length) && (
        <>
          <label className="grid gap-1">Sauvegarde distante
            <select className="pani-input" value={path} onChange={(event) => setPath(event.target.value)}>
              {snapshots?.map((snapshot) => (
                <option key={snapshot.path} value={snapshot.path}>{new Date(snapshot.date).toLocaleString('fr-FR')}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">Phrase de récupération de cette sauvegarde
            <input className="pani-input" value={phrase} type="password" autoComplete="off" onChange={(event) => setPhrase(event.target.value)} />
          </label>
          <Button disabled={!phrase.trim() || !path} onClick={() => void run(async () => {
            const { revision } = await database.readState()
            onPreview(await openCloudSnapshot(accountId, path, phrase), revision, accountId)
            setPhrase('')
          })}>Ouvrir l’aperçu distant</Button>
        </>
      )}
    </fieldset>
  )
}
