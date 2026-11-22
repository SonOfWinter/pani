import { categoryColor, icons } from '../data/categories'
import type { Category } from '../data/database'

export function CategoryLabel({ category }: { category: Category | null }) {
  if (!category) return <>Sans catégorie</>
  return (
    <>
      <span aria-hidden="true">{category.emoji ?? icons[category.icon].symbol}</span>
      <span className="min-w-0 break-words">{category.name}</span>
    </>
  )
}

export function categoryBackground(category: Category | null) {
  if (!category) return undefined
  const backgroundColor = categoryColor(category)
  const [red, green, blue] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(backgroundColor.slice(start, start + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
  return { backgroundColor, color: luminance > 0.179 ? '#000' : '#fff' }
}
