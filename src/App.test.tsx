import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { App } from './App'

test('les trois vues et la recherche figurent dans la navigation', () => {
  const html = renderToStaticMarkup(<App />)
  expect(html).toContain('Navigation principale')
  expect(html).toContain('>Liste</span>')
  expect(html).toContain('>Courses</span>')
  expect(html).toContain('>Catégories</span>')
  expect(html).toContain('aria-label="Rechercher"')
})
