import { afterEach, expect, test, vi } from 'vitest'
import { animateDrop } from './list-motion'

afterEach(() => vi.unstubAllGlobals())

test('anime un dépôt décalé et respecte les mouvements réduits', () => {
  const matchMedia = vi.fn().mockReturnValue({ matches: false })
  const animate = vi.fn()
  vi.stubGlobal('window', { matchMedia })
  const row = { animate } as unknown as HTMLElement

  animateDrop(row, -12)
  expect(animate).toHaveBeenCalledWith(
    [{ transform: 'translateY(-12px)', opacity: 1 }, { transform: 'translateY(0)', opacity: 1 }],
    expect.objectContaining({ duration: 220 }),
  )

  animate.mockClear()
  animateDrop(row, 0)
  expect(animate).not.toHaveBeenCalled()
  matchMedia.mockReturnValue({ matches: true })
  animateDrop(row, -12)
  expect(animate).not.toHaveBeenCalled()
})
