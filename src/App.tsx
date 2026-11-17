import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button } from './components/ui/button'
import { database, type Category, type Item, type Mode } from './data/database'

const modes: { value: Mode; label: string }[] = [
  { value: 'list', label: 'Liste' },
  { value: 'shopping', label: 'Courses' },
]

export function groupItems(items: Item[], categories: Category[]) {
  return [
    ...categories.map((category) => ({
      id: category.id,
      label: category.name,
      items: items.filter((item) => item.categoryId === category.id),
    })),
    {
      id: null,
      label: 'Sans catégorie',
      items: items.filter((item) => item.categoryId === null),
    },
  ].filter((group) => group.items.length > 0)
}

export function App() {
  const result = useLiveQuery(
    async () => {
      try {
        return { list: await database.readList(), error: false as const }
      } catch {
        return { error: true as const }
      }
    },
    [],
  )
  const [error, setError] = useState('')

  async function switchMode(mode: Mode) {
    try {
      await database.setMode(mode)
      setError('')
    } catch {
      setError('Impossible de changer de vue. Réessayez.')
    }
  }

  const items = result?.list?.items ?? []
  const categories = result?.list?.categories ?? []
  const mode = result?.list?.state.mode ?? 'list'
  const remaining = items.filter((item) => item.checkedAt === null).length
  const groups = groupItems(items, categories)

  return (
    <main className="pani-shell mx-auto max-w-xl">
      <header className="mb-7">
        <h1 className="text-4xl font-bold tracking-tight">Pani</h1>
        <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {remaining} {remaining === 1 ? 'article à acheter' : 'articles à acheter'}
        </p>
      </header>
      <div role="group" aria-label="Mode" className="mb-7 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {modes.map(({ value, label }) => (
          <Button
            key={value}
            variant={mode === value ? 'default' : 'ghost'}
            aria-pressed={mode === value}
            disabled={!result?.list}
            onClick={() => void switchMode(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {result?.error && <p role="alert">Pani ne peut pas ouvrir les données locales.</p>}
      {!result && <p role="status">Ouverture de la liste…</p>}
      {result?.list && groups.length === 0 && (
        <p className="rounded-lg bg-card p-5 text-muted-foreground">
          {mode === 'list' ? 'Votre liste est vide.' : 'Aucun article à acheter.'}
        </p>
      )}
      {groups.map((group) => (
        <section key={group.id ?? 'none'} className="mb-6">
          <h2 className="mb-2 px-2 font-semibold">{group.label}</h2>
          <ul className="divide-y divide-muted rounded-lg bg-card">
            {group.items.map((item) => (
              <li key={item.id} className="flex min-h-11 items-center justify-between gap-4 px-4 py-2">
                <span>{item.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">{item.quantity}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
