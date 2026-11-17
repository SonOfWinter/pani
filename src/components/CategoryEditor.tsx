import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Category, CategoryColor, CategoryIcon } from '../data/database'
import { colors, deleteCategory, icons, saveCategory } from '../data/categories'
import { Button } from './ui/button'

export function CategoryEditor({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [id, setId] = useState<string>()
  const [name, setName] = useState('')
  const [color, setColor] = useState<CategoryColor>('green')
  const [icon, setIcon] = useState<CategoryIcon>('basket')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    return () => node?.close()
  }, [])

  function edit(category?: Category) {
    setId(category?.id)
    setName(category?.name ?? '')
    setColor(category?.color ?? 'green')
    setIcon(category?.icon ?? 'basket')
    setError('')
  }

  async function run(operation: () => Promise<void>) {
    setBusy(true)
    try {
      await operation()
      edit()
    } catch (reason) {
      setError(reason instanceof Error && reason.message
        ? reason.message
        : 'Impossible d’enregistrer cette catégorie.')
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void run(() => saveCategory(name, color, icon, id))
  }

  return (
    <dialog
      ref={dialog}
      className="pani-sheet"
      aria-labelledby="categories-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id="categories-title" className="text-xl font-semibold">Catégories</h2>
        <Button variant="ghost" disabled={busy} onClick={onClose}>Fermer</Button>
      </div>
      <ul className="mb-4 grid gap-2">
        {categories.map((category) => (
          <li key={category.id}>
            <Button variant="outline" disabled={busy} onClick={() => edit(category)}>
              <span aria-hidden="true">{icons[category.icon].symbol}</span>
              {category.name}
              <span className="sr-only">, modifier</span>
            </Button>
          </li>
        ))}
      </ul>
      <form className="grid gap-3" onSubmit={submit}>
        <h3 className="font-semibold">{id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h3>
        <label className="grid gap-1">
          Nom
          <input className="pani-input" value={name} required onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-1">
          Couleur
          <select className="pani-input" value={color} onChange={(event) => setColor(event.target.value as CategoryColor)}>
            {Object.entries(colors).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          Icône
          <select className="pani-input" value={icon} onChange={(event) => setIcon(event.target.value as CategoryIcon)}>
            {Object.entries(icons).map(([key, value]) => <option key={key} value={key}>{value.symbol} {value.label}</option>)}
          </select>
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>Enregistrer</Button>
          {id && (
            <>
              <Button variant="ghost" disabled={busy} onClick={() => edit()}>Annuler la modification</Button>
              <Button variant="destructive" disabled={busy} onClick={() => {
                if (window.confirm('Supprimer cette catégorie ? Ses articles iront dans « Sans catégorie ».')) {
                  void run(() => deleteCategory(id))
                }
              }}>Supprimer la catégorie</Button>
            </>
          )}
        </div>
      </form>
    </dialog>
  )
}
