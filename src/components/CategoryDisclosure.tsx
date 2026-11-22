import { ChevronDown } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import type { Category } from '../data/database'
import { categoryBackground, CategoryLabel } from './CategoryLabel'

export function CategoryDisclosure({ category, count, expanded, searching = false, onToggle, children }: {
  category: Category | null
  count: number
  expanded: boolean
  searching?: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const id = useId()
  return (
    <>
      <h2 className="category-heading category-heading-toggle" style={categoryBackground(category) ?? {
        backgroundColor: 'var(--primary)',
        color: 'var(--primary-foreground)',
      }}>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`${id}-items`}
          aria-labelledby={`${id}-label`}
          aria-describedby={count > 0 ? `${id}-count` : undefined}
          aria-disabled={searching || undefined}
          onClick={() => { if (!searching) onToggle() }}
        >
          <span id={`${id}-label`} className="flex min-w-0 items-center gap-1.5">
            <CategoryLabel category={category} />
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {count > 0 && (
              <>
                <span aria-hidden="true" className="tabular-nums">{count} art.</span>
                <span id={`${id}-count`} className="sr-only">
                  {count} {count === 1 ? 'article' : 'articles'}
                </span>
              </>
            )}
            <ChevronDown size={16} className="category-chevron" aria-hidden="true" />
          </span>
        </button>
      </h2>
      <div id={`${id}-items`} className="category-panel" data-expanded={expanded} inert={!expanded} aria-hidden={!expanded}>
        <div className="category-panel-content">{children}</div>
      </div>
    </>
  )
}
