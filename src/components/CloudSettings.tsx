import { useState, type FormEvent } from 'react'
import { supabase } from '../backup/supabase'
import type { CloudBackup } from '../backup/useCloudBackup'
import { Button } from './ui/button'

export function CloudSettings({ cloud }: { cloud: CloudBackup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phrase, setPhrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'L’opération a échoué. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  function signIn(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const result = await supabase?.auth.signInWithPassword({ email: email.trim(), password })
      if (result?.error) throw new Error('Connexion impossible. Vérifiez vos identifiants et le réseau.')
      setPassword('')
    })
  }

  const client = supabase
  if (!client) return null

  return (
    <section className="mt-4 grid gap-3 rounded-lg bg-muted p-3" aria-label="Sauvegarde Supabase">
      <h3 className="font-semibold">Sauvegarde Supabase</h3>
      {error && <p role="alert">{error}</p>}
      {!cloud.accountId ? (
        <form onSubmit={signIn} className="grid gap-2">
          <label className="grid gap-1">E-mail du compte
            <input className="pani-input" required autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="grid gap-1">Mot de passe du compte
            <input className="pani-input" required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <Button type="submit" disabled={busy}>Se connecter</Button>
        </form>
      ) : (
        <>
          <p className="break-all">{cloud.email}</p>
          <p role="status">{cloud.status}{cloud.savedAt ? ` · Dernier succès ${new Date(cloud.savedAt).toLocaleString('fr-FR')}` : ''}</p>
          <p className="text-sm text-muted-foreground">Le compte donne accès aux fichiers. Gardez une phrase longue de plusieurs mots pour les déchiffrer.</p>
          {(!cloud.enabled || !cloud.unlocked) && (
            <>
              <label className="grid gap-1">Phrase de récupération Supabase
                <input className="pani-input" type="password" autoComplete="off" value={phrase} onChange={(event) => setPhrase(event.target.value)} />
              </label>
              {!cloud.enabled && <label className="grid gap-1">Confirmer la phrase Supabase
                <input className="pani-input" type="password" autoComplete="off" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
              </label>}
              <Button disabled={busy || phrase.trim().length < 16 || (!cloud.enabled && phrase !== confirm)} onClick={() => void run(async () => {
                await cloud.enable(phrase)
                setPhrase('')
                setConfirm('')
              })}>{cloud.enabled ? 'Déverrouiller' : 'Activer la sauvegarde automatique'}</Button>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {cloud.enabled && cloud.unlocked && <Button variant="outline" onClick={cloud.retry}>Réessayer l’envoi</Button>}
            {cloud.enabled && <Button variant="outline" disabled={busy} onClick={() => void run(cloud.disable)}>Désactiver l’envoi</Button>}
            <Button variant="ghost" disabled={busy} onClick={() => void run(async () => {
              const { error } = await client.auth.signOut()
              if (error) throw new Error('Impossible de fermer la session.')
            })}>Se déconnecter</Button>
          </div>
        </>
      )}
    </section>
  )
}
