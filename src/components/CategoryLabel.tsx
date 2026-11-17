import { categoryColor, icons } from '../data/categories'
import type { Category } from '../data/database'

export function CategoryLabel({ category }: { category: Category | null }) {
  if (!category) return <>Sans catégorie</>
  return (
    <>
      <span className="category-dot" style={{ backgroundColor: categoryColor(category) }} aria-hidden="true" />
      <span aria-hidden="true">{category.emoji ?? icons[category.icon].symbol}</span>
      <span className="break-words">{category.name}</span>
    </>
  )
}
