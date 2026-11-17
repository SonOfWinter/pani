import Dexie, { type EntityTable } from 'dexie'

export type Mode = 'list' | 'shopping' | 'categories'
export type CategoryColor = 'green' | 'amber' | 'blue' | 'rose'
export type CategoryIcon = 'basket' | 'apple' | 'milk' | 'package'

export interface Item {
  id: string
  name: string
  quantity: string
  categoryId: string | null
  position: number
  shopping?: { quantity: string; checkedAt: string | null }
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  normalizedName: string
  color: CategoryColor
  icon: CategoryIcon
  customColor?: string
  emoji?: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface CloudPreferences {
  enabled: boolean
  accountId: string
  installationId: string
  savedRevision: number | null
  savedAt: string | null
  savedPath?: string
}

export interface LocalState {
  id: 'local'
  mode: Mode
  revision: number
  cloud?: CloudPreferences
}

export class PaniDatabase extends Dexie {
  declare items: EntityTable<Item, 'id'>
  declare categories: EntityTable<Category, 'id'>
  declare state: EntityTable<LocalState, 'id'>

  constructor(name = 'pani') {
    super(name)
    // Keep shipped schema versions here. Add a new version and upgrade callback
    // for later migrations so IndexedDB can roll back a failed upgrade.
    this.version(1).stores({
      items: 'id, [categoryId+position], position',
      categories: 'id, &normalizedName, position',
      state: 'id',
    })
    this.version(2).stores({}).upgrade((transaction) =>
      transaction.table<Item & { checkedAt?: string | null }>('items').toCollection().modify((item) => {
        item.shopping = { quantity: item.quantity, checkedAt: item.checkedAt ?? null }
        delete item.checkedAt
      }),
    )
  }

  async readState(): Promise<LocalState> {
    return (await this.state.get('local')) ?? { id: 'local', mode: 'list', revision: 0 }
  }

  async setMode(mode: Mode): Promise<void> {
    await this.transaction('rw', this.state, async () => {
      const state = await this.readState()
      await this.state.put({ ...state, mode })
    })
  }

  async mutate<Result>(write: () => Promise<Result>, changed: (result: Result) => boolean = () => true): Promise<Result> {
    return this.transaction('rw', [this.items, this.categories, this.state], async () => {
      const result = await write()
      if (changed(result)) {
        const state = await this.readState()
        await this.state.put({ ...state, revision: state.revision + 1 })
      }
      return result
    })
  }

  async readList() {
    return this.transaction('r', [this.items, this.categories, this.state], async () => {
      const [items, categories, state] = await Promise.all([
        this.items.orderBy('position').toArray(),
        this.categories.orderBy('position').toArray(),
        this.readState(),
      ])
      return { items, categories, state }
    })
  }
}

export const database = new PaniDatabase()
