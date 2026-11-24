import { useState } from 'react'
import type { Item } from '../data/database'

type OrderChange = Pick<Item, 'id' | 'position'> & Partial<Pick<Item, 'categoryId'>>

export function useOrderPreview(revision: number) {
  const [preview, setPreview] = useState<{ changes: Map<string, OrderChange>; committedRevision?: number }>()
  const pending = preview && (preview.committedRevision === undefined || revision < preview.committedRevision)
    ? preview
    : undefined

  function apply<T extends { id: string; position: number }>(rows: T[]): T[] {
    if (!pending) return rows
    return rows.map((row) => {
      const change = pending.changes.get(row.id)
      return change ? { ...row, ...change } : row
    }).sort((a, b) => a.position - b.position)
  }

  async function commit(changes: OrderChange[], write: () => Promise<number>) {
    const positions = new Map(changes.map((change) => [change.id, change]))
    setPreview({ changes: positions })
    try {
      // LiveQuery can deliver the committed order after the write promise resolves.
      setPreview({ changes: positions, committedRevision: await write() })
    } catch (error) {
      setPreview(undefined)
      throw error
    }
  }

  return { apply, commit, moving: Boolean(pending) }
}
