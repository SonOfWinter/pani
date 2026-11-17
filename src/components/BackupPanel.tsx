import { CloudSettings } from './CloudSettings'
import type { CloudBackup } from '../backup/useCloudBackup'
import { useEffect, useRef, useState } from 'react'
import { database } from '../data/database'
import { makeBackup, readBackupFile, restoreSnapshot, type Snapshot } from '../backup/snapshot'
import { Button } from './ui/button'

function download(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `pani-${new Date().toISOString().slice(0, 10)}.pani`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function BackupPanel({ cloud, hasData, onClose }: { cloud: CloudBackup; hasData: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [phrase, setPhrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ data: Snapshot; revision: number; owner?: string }>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    return () => node?.close()
  }, [])

  async function run(operation: () => Promise<void>) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await operation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="pani-sheet"
      aria-labelledby="backup-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="backup-title" className="text-xl font-semibold">Sauvegardes</h2>
        <Button variant="ghost" disabled={busy} onClick={onClose}>Fermer</Button>
      </div>
      <p className="my-3 text-sm text-muted-foreground">
        Gardez votre phrase de récupération en lieu sûr. Elle est nécessaire pour ouvrir un fichier chiffré.
      </p>
      <fieldset className="grid gap-3" disabled={busy}>
        <label className="grid gap-1">
          Phrase de récupération
          <input
            className="pani-input"
            type="password"
            autoComplete="off"
            value={phrase}
            onChange={(event) => { setPhrase(event.target.value); setPreview(undefined) }}
          />
        </label>
        <section className="grid gap-2 rounded-lg bg-muted p-3">
          <h3 className="font-semibold">Exporter un fichier</h3>
          <label className="grid gap-1">
            Confirmer la phrase pour exporter
            <input className="pani-input" type="password" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
          <Button disabled={!phrase.trim() || phrase !== confirmation} onClick={() => void run(async () => {
            download((await makeBackup(phrase)).text)
            setMessage('Fichier chiffré préparé.')
          })}>Exporter</Button>
        </section>
        <section className="grid gap-2 rounded-lg bg-muted p-3">
          <h3 className="font-semibold">Restaurer un fichier</h3>
          <label className="grid gap-1">
            Fichier de sauvegarde
            <input
              type="file"
              accept=".pani,.json,application/json"
              onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(undefined) }}
            />
          </label>
          <Button disabled={!file || !phrase.trim()} onClick={() => {
            if (!file) return
            setPreview(undefined)
            void run(async () => {
              const { revision } = await database.readState()
              const data = await readBackupFile(file, phrase)
              setPreview({ data, revision })
            })
          }}>Ouvrir l’aperçu</Button>
        </section>
      </fieldset>
      <CloudSettings cloud={cloud} onPreview={(data, revision, owner) => setPreview({ data, revision, owner })} />
          {preview && (!preview.owner || preview.owner === cloud.accountId) && (
            <section className="mt-4 grid gap-2 rounded-lg border border-border p-3" aria-label="Aperçu à restaurer">
              <p>
                {new Date(preview.data.date).toLocaleString('fr-FR')} · {preview.data.items.length} article(s) · {preview.data.categories.length} catégorie(s)
              </p>
              {hasData && <p>Cette action remplace la liste locale. Vous pouvez d’abord l’exporter ci-dessus.</p>}
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setPreview(undefined)}>Annuler</Button>
                <Button variant="destructive" disabled={busy} onClick={() => void run(async () => {
                  await restoreSnapshot(preview.data, preview.revision)
                  setPreview(undefined)
                  setMessage('Sauvegarde restaurée.')
                })}>Confirmer le remplacement</Button>
              </div>
            </section>
          )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </dialog>
  )
}
