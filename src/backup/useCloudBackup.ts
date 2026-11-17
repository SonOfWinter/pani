import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { LocalState } from '../data/database'
import { configureCloud, uploadRevision, verifyCloudPhrase, type PendingBackup } from './cloud'
import { supabase } from './supabase'

export function useCloudBackup(state: LocalState | undefined) {
  const [session, setSession] = useState<Session | null>(null)
  const [unlock, setUnlock] = useState<{ owner: string; phrase: string }>()
  const [retry, setRetry] = useState(0)
  const [failure, setFailure] = useState(false)
  const pending = useRef<PendingBackup | null>(null)
  const accountId = session?.user.id
  const preferences = state?.cloud?.accountId === accountId ? state?.cloud : undefined
  const enabled = preferences?.enabled === true
  const revision = state?.revision
  const savedRevision = preferences?.savedRevision
  const phrase = unlock?.owner === accountId ? unlock?.phrase : undefined

  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_OUT') {
        setUnlock(undefined)
        pending.current = null
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!enabled || !accountId || !phrase || revision === undefined || revision === savedRevision) return
    const controller = new AbortController()
    let busy = false

    async function run() {
      if (!accountId || !phrase || busy || controller.signal.aborted || document.hidden || !navigator.onLine) return
      busy = true
      setFailure(false)
      try {
        const saved = await uploadRevision(
          accountId, phrase, pending.current, controller.signal, (value) => { pending.current = value },
        )
        if (saved && pending.current?.path === saved.path) pending.current = null
      } catch {
        if (!controller.signal.aborted) setFailure(true)
      } finally {
        busy = false
      }
    }

    const timer = window.setTimeout(() => void run(), 650)
    const resume = () => void run()
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [accountId, enabled, phrase, retry, revision, savedRevision, session?.access_token])

  async function enable(secret: string) {
    if (!accountId) throw new Error('Connectez-vous à Supabase.')
    await verifyCloudPhrase(accountId, secret)
    await configureCloud(accountId, true)
    setFailure(false)
    setUnlock({ owner: accountId, phrase: secret })
  }

  async function disable() {
    if (!accountId) return
    await configureCloud(accountId, false)
    setUnlock(undefined)
    pending.current = null
  }

  return {
    accountId,
    email: session?.user.email,
    unlocked: Boolean(phrase),
    enabled,
    savedAt: preferences?.savedAt,
    status: !enabled
      ? 'Désactivée'
      : !phrase
        ? 'À déverrouiller'
        : revision === savedRevision
          ? 'Sauvegardée'
          : failure
            ? 'Échec de l’envoi'
            : 'En attente',
    enable,
    disable,
    retry: () => setRetry((current) => current + 1),
  }
}

export type CloudBackup = ReturnType<typeof useCloudBackup>
