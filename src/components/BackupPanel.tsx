import { FileUp } from 'lucide-react'
import { CloudSettings } from './CloudSettings'
import type { CloudBackup } from '../backup/useCloudBackup'
import { useLayoutEffect, useRef, useState } from 'react'
import { database } from '../data/database'
import { makeBackup, readBackupFile, restoreSnapshot, type Snapshot } from '../backup/snapshot'
import { BottomSheet, type BottomSheetHandle } from './BottomSheet'
import { Button } from './ui/button'

type BackupOperation = 'export' | 'preview' | 'restore'

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

export function BackupPanel({ cloud, hasData, onRestored, onClose }: { cloud: CloudBackup; hasData: boolean; onRestored: () => void; onClose: () => void }) {
  const sheet = useRef<BottomSheetHandle>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const chooseFile = useRef<HTMLButtonElement>(null)
  const restorePhraseInput = useRef<HTMLInputElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const previewRegion = useRef<HTMLElement>(null)
  const [phrase, setPhrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [restorePhrase, setRestorePhrase] = useState('')
  const [missing, setMissing] = useState<'file' | 'phrase'>()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ data: Snapshot; revision: number; owner?: string }>()
  const [operation, setOperation] = useState<BackupOperation>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const busy = operation !== undefined
  const visiblePreview = preview && (!preview.owner || preview.owner === cloud.accountId) ? preview : undefined

  useLayoutEffect(() => {
    if (busy) return
    const target = error || message ? feedback.current : visiblePreview ? previewRegion.current : null
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'start' })
  }, [busy, error, message, visiblePreview])

  async function run(kind: BackupOperation, perform: () => Promise<void>) {
    if (busy) return
    setOperation(kind)
    setError('')
    setMessage('')
    try {
      await perform()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Une erreur est survenue.')
    } finally {
      setOperation(undefined)
    }
  }

  function openFilePreview() {
    if (!file) {
      setMissing('file')
      chooseFile.current?.focus()
      return
    }
    if (!restorePhrase.trim()) {
      setMissing('phrase')
      restorePhraseInput.current?.focus()
      return
    }
    setMissing(undefined)
    setPreview(undefined)
    void run('preview', async () => {
      const { revision } = await database.readState()
      const data = await readBackupFile(file, restorePhrase)
      setPreview({ data, revision })
    })
  }

  return (
    <BottomSheet ref={sheet} titleId="backup-title" busy={busy} onClose={onClose}>
      <div className="backup-panel">
        <div className="flex items-center justify-between gap-2">
          <h2 id="backup-title" className="text-xl font-semibold">Sauvegardes</h2>
          <Button variant="ghost" disabled={busy} onClick={() => sheet.current?.dismiss()}>Fermer</Button>
        </div>
        {(message || error) && (
          <div ref={feedback} tabIndex={-1} className="my-3 rounded-lg bg-muted p-3">
            {message && <p role="status">{message}</p>}
            {error && <p role="alert">{error}</p>}
          </div>
        )}
        {visiblePreview && (
          <section
            ref={previewRegion}
            tabIndex={-1}
            className="my-3 grid gap-2 rounded-lg border border-border p-3"
            aria-labelledby="restore-preview-title"
          >
            <h3 id="restore-preview-title" className="font-semibold">Aperçu à restaurer</h3>
            <p>
              {new Date(visiblePreview.data.date).toLocaleString('fr-FR')} · {visiblePreview.data.items.length} article(s) · {visiblePreview.data.categories.length} catégorie(s)
            </p>
            {hasData && <p>Cette action remplace la liste locale. Vous pouvez d’abord l’exporter ci-dessous.</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setPreview(undefined)}>Annuler</Button>
              <Button variant="destructive" disabled={busy} onClick={() => void run('restore', async () => {
                await restoreSnapshot(visiblePreview.data, visiblePreview.revision)
                onRestored()
                setPreview(undefined)
                setMessage('Sauvegarde restaurée.')
              })}>{operation === 'restore' ? 'Restauration…' : 'Confirmer le remplacement'}</Button>
            </div>
          </section>
        )}
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
              onChange={(event) => setPhrase(event.target.value)}
            />
          </label>
          <section className="grid gap-2 rounded-lg bg-muted p-3">
            <h3 className="font-semibold">Exporter un fichier</h3>
            <label className="grid gap-1">
              Confirmer la phrase pour exporter
              <input className="pani-input" type="password" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
            <Button disabled={!phrase.trim() || phrase !== confirmation} onClick={() => void run('export', async () => {
              download((await makeBackup(phrase)).text)
              setMessage('Fichier chiffré préparé.')
            })}>Exporter</Button>
          </section>
          <section className="grid gap-2 rounded-lg bg-muted p-3">
            <h3 className="font-semibold">Restaurer un fichier</h3>
            <input
              ref={fileInput}
              type="file"
              className="sr-only pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null)
                setMissing(undefined)
                setPreview(undefined)
              }}
            />
            <Button
              ref={chooseFile}
              variant="outline"
              className="justify-start"
              aria-describedby={missing === 'file' ? 'restore-file-status restore-file-message' : 'restore-file-status'}
              onClick={() => fileInput.current?.click()}
            >
              <FileUp size={18} aria-hidden="true" />
              {file ? 'Changer de fichier' : 'Choisir un fichier'}
            </Button>
            <p id="restore-file-status" role="status" className="text-sm text-muted-foreground">
              {file?.name ?? 'Aucun fichier de sauvegarde sélectionné.'}
            </p>
            <label className="grid gap-1">
              Phrase de récupération du fichier
              <input
                ref={restorePhraseInput}
                className="pani-input"
                type="password"
                autoComplete="off"
                value={restorePhrase}
                aria-invalid={missing === 'phrase' || undefined}
                aria-describedby={missing === 'phrase' ? 'restore-file-message' : undefined}
                onChange={(event) => {
                  setRestorePhrase(event.target.value)
                  setMissing(undefined)
                  setPreview(undefined)
                }}
              />
            </label>
            {missing && (
              <p id="restore-file-message" role="alert" className="text-sm text-destructive">
                {missing === 'file' ? 'Choisissez un fichier de sauvegarde.' : 'Saisissez la phrase utilisée pour chiffrer ce fichier.'}
              </p>
            )}
            <Button onClick={openFilePreview}>
              {operation === 'preview' ? 'Lecture de la sauvegarde…' : 'Ouvrir l’aperçu'}
            </Button>
          </section>
        </fieldset>
        <CloudSettings cloud={cloud} onPreview={(data, revision, owner) => {
          setError('')
          setMessage('')
          setPreview({ data, revision, owner })
        }} />
      </div>
    </BottomSheet>
  )
}
