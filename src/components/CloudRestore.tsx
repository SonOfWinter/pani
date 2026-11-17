import { useRef, useState } from 'react'
import { listCloudSnapshots, openCloudSnapshot, type CloudSnapshot } from '../backup/cloud'
import type { Snapshot } from '../backup/snapshot'
import { database } from '../data/database'
import { Button } from './ui/button'

export function CloudRestore({ accountId, onPreview }: {
  accountId: string
  onPreview: (data: Snapshot, revision: number, owner: string) => void
}) {
  const phraseInput = useRef<HTMLInputElement>(null)
  const [snapshots, setSnapshots] = useState<CloudSnapshot[]>()
  const [path, setPath] = useState('')
  const [phrase, setPhrase] = useState('')
  const [action, setAction] = useState<'list' | 'preview'>()
  const [error, setError] = useState('')

  async function run(kind: 'list' | 'preview', operation: () => Promise<void>) {
    setAction(kind)
    setError('')
    try {
      await operation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sauvegarde indisponible.')
    } finally {
      setAction(undefined)
    }
  }

  return (
    <fieldset className="grid gap-2 border-t border-border pt-3" disabled={action !== undefined}>
      <legend className="font-semibold">Restaurer depuis Supabase</legend>
      <Button variant="outline" onClick={() => void run('list', async () => {
        const latest = await listCloudSnapshots(accountId)
        setSnapshots(latest)
        setPath(latest[0]?.path ?? '')
      })}>{action === 'list' ? 'Chargement…' : 'Charger les sauvegardes'}</Button>
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
            <input ref={phraseInput} className="pani-input" value={phrase} type="password" autoComplete="off" onChange={(event) => setPhrase(event.target.value)} />
          </label>
          <Button onClick={() => {
            if (!path) {
              setError('Sélectionnez une sauvegarde distante.')
              return
            }
            if (!phrase.trim()) {
              setError('Saisissez la phrase de récupération de cette sauvegarde.')
              phraseInput.current?.focus()
              return
            }
            void run('preview', async () => {
              const { revision } = await database.readState()
              onPreview(await openCloudSnapshot(accountId, path, phrase), revision, accountId)
              setPhrase('')
            })
          }}>{action === 'preview' ? 'Lecture de la sauvegarde…' : 'Ouvrir l’aperçu distant'}</Button>
        </>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </fieldset>
  )
}
