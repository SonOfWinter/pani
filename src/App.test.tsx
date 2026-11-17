import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { ConfirmProvider } from './components/ui/confirm'
import { App } from './App'

test('la navigation est limitée aux trois vues', () => {
  const html = renderToStaticMarkup(<ConfirmProvider><App /></ConfirmProvider>)
  expect(html).toContain('Navigation principale')
  expect(html).toContain('>Liste</span>')
  expect(html).toContain('>Courses</span>')
  expect(html).toContain('>Catégories</span>')
  expect(html).not.toContain('aria-label="Rechercher"')
})
