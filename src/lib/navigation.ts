import type { Mode } from '../data/database'

export const navigation = [
  { mode: 'list', label: 'Liste' },
  { mode: 'shopping', label: 'Courses' },
  { mode: 'categories', label: 'Rayons' },
] as const satisfies ReadonlyArray<{ mode: Mode; label: string }>

export function navigationIndex(mode: Mode) {
  return navigation.findIndex((tab) => tab.mode === mode)
}
