import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { App } from './App'

test('le premier écran affiche le nom de Pani', () => {
  expect(renderToStaticMarkup(<App />)).toContain('<h1>Pani</h1>')
})
