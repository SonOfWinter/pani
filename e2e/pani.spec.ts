import { createServer } from 'node:http'
import { expect, test, type Locator, type Page } from '@playwright/test'

async function waitForSheet(popup: Locator) {
  await popup.locator('.pani-sheet').evaluate((panel) =>
    Promise.allSettled(panel.getAnimations().map((animation) => animation.finished)),
  )
}

async function addItem(page: Page, name: string, quantity = '') {
  await page.getByRole('button', { name: 'Ajouter un article' }).click()
  const form = page.getByRole('dialog', { name: 'Ajouter un article' })
  await waitForSheet(form)
  await form.getByLabel('Nom', { exact: true }).fill(name)
  await form.getByLabel('Quantité (facultatif)').fill(quantity)
  await form.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(form).toBeHidden()
}

async function swipeIntoShopping(page: Page, name: string) {
  const item = page.getByRole('button', { name: `Actions pour ${name}` })
  await item.hover()
  const box = await item.boundingBox()
  if (!box) throw new Error('Article introuvable.')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 70, y, { steps: 12 })
  await page.mouse.up()
}

async function waitForOfflineShell(page: Page) {
  await expect.poll(() => page.evaluate(async () =>
    Boolean((await navigator.serviceWorker.getRegistration())?.active),
  )).toBe(true)
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
}

test('applique une mise à jour PWA depuis un petit écran et retrouve sa liste hors ligne', async ({ page, context, baseURL }) => {
  let version = 1
  // Serve two versions of the production worker on an isolated origin.
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(baseURL ?? 'http://127.0.0.1:4173')
      url.pathname = request.url ?? '/'
      const upstream = await fetch(url)
      const type = upstream.headers.get('content-type')
      if (type) response.setHeader('content-type', type)
      response.statusCode = upstream.status
      if (url.pathname === '/sw.js') {
        response.setHeader('cache-control', 'no-store')
        response.end(`${await upstream.text()}\n// Test update ${version}\n`)
      } else {
        response.end(Buffer.from(await upstream.arrayBuffer()))
      }
    } catch {
      response.writeHead(502).end()
    }
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject).listen(0, '127.0.0.1', resolve)
  })
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Serveur de test indisponible.')
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(`http://127.0.0.1:${address.port}/`)
    await waitForOfflineShell(page)
    for (const name of ['Riz', 'Pâtes', 'Carottes', 'Oranges', 'Pommes', 'Farine', 'Lentilles', 'Avoine']) {
      await addItem(page, name)
    }
    await page.getByRole('button', { name: 'Actions pour Riz' }).press('Alt+ArrowRight')
    await expect(page.getByRole('button', { name: 'Actions pour Riz' })).toHaveAccessibleDescription('Dans Courses')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    version = 2
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update().then(() => undefined))
    const notice = page.getByRole('complementary', { name: 'Mise à jour' })
    const update = notice.getByRole('button', { name: 'Mettre à jour' })
    await expect(update).toBeInViewport({ ratio: 1 })
    const later = notice.getByRole('button', { name: 'Plus tard' })
    await expect(later).toBeInViewport({ ratio: 1 })
    await later.press('Enter')
    await expect(notice).toBeHidden()
    await page.reload()
    await expect(update).toBeInViewport({ ratio: 1 })

    for (const name of ['Catégories', 'Courses']) {
      const tab = page.getByRole('button', { name, exact: true })
      await tab.click()
      await expect(tab).toHaveAttribute('aria-pressed', 'true')
      await expect(update).toBeInViewport({ ratio: 1 })
    }
    await Promise.all([page.waitForEvent('load'), update.click()])
    await expect(notice).toBeHidden()
    await expect(page.getByRole('checkbox', { name: 'Riz' })).toBeVisible()

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('checkbox', { name: 'Riz' })).toBeVisible()
    await page.getByRole('button', { name: 'Liste', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Actions pour Avoine' })).toBeVisible()
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test('ajoute un article aux courses au clavier et le retrouve après une relance hors ligne', async ({ page, context }) => {
  await page.goto('/')
  await addItem(page, 'Avoine')
  const item = page.getByRole('button', { name: 'Actions pour Avoine' })
  await expect(item).not.toHaveAccessibleDescription('Dans Courses')
  await item.press('Enter')
  const add = page.getByRole('button', { name: 'Ajouter Avoine aux courses' })
  await expect(add).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Avoine ajouté aux courses.', { exact: true })).toBeVisible()
  await expect(item).toHaveAccessibleDescription('Dans Courses')
  await expect(item.locator('svg')).toBeVisible()
  await waitForOfflineShell(page)

  await context.setOffline(true)
  await page.reload()
  await expect(item).toHaveAccessibleDescription('Dans Courses')
  await page.getByRole('button', { name: 'Courses', exact: true }).press('Enter')
  await expect(page.getByRole('checkbox', { name: 'Avoine' })).toBeVisible()
})

test('prépare les achats puis termine ses courses après une relance hors ligne', async ({ page, context }) => {
  await page.goto('/')
  await addItem(page, 'Tomates', '500 g')
  await addItem(page, 'Riz')
  await page.getByRole('searchbox').fill('toma')
  await expect(page.getByText('Tomates', { exact: true })).toBeVisible()
  await expect(page.getByText('Riz', { exact: true })).toBeHidden()
  await page.getByRole('searchbox').fill('')
  await page.getByRole('button', { name: 'Courses', exact: true }).click()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.getByRole('button', { name: 'Liste', exact: true }).click()
  await swipeIntoShopping(page, 'Tomates')
  await expect(page.getByText('Tomates ajouté aux courses.', { exact: true })).toBeVisible()
  await swipeIntoShopping(page, 'Tomates')
  await expect(page.getByText('Tomates est déjà dans les courses.', { exact: true })).toBeVisible()
  await swipeIntoShopping(page, 'Riz')
  await page.getByRole('button', { name: 'Courses', exact: true }).click()
  await expect(page.getByRole('checkbox')).toHaveCount(2)
  await page.getByRole('button', { name: 'Augmenter la quantité de Tomates' }).click()
  await expect(page.getByRole('group', { name: 'Quantité de Tomates' }).locator('output')).toHaveText('501 g')
  await page.getByRole('checkbox', { name: /Tomates/ }).click()
  await expect(page.getByText('1 article à acheter', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(page.getByText('2 articles à acheter', { exact: true })).toBeVisible()
  await page.getByRole('checkbox', { name: /Tomates/ }).click()
  await expect(page.getByText('1 article à acheter', { exact: true })).toBeVisible()
  await waitForOfflineShell(page)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Courses', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('1 article à acheter', { exact: true })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Riz' }).click()
  await expect(page.getByText('Courses terminées.')).toBeVisible()
  await page.getByText('Articles pris (2)', { exact: true }).click()
  await page.getByRole('checkbox', { name: /Tomates/ }).click()

  await expect(page.getByText('Articles pris (1)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Retirer les articles pris' }).click()
  const removeChecked = page.getByRole('alertdialog', { name: 'Retirer les articles pris de la liste ?' })
  await removeChecked.getByRole('button', { name: 'Annuler' }).click()
  await expect(page.getByRole('checkbox', { name: 'Riz' })).toBeChecked()
  await page.getByRole('button', { name: 'Retirer les articles pris' }).click()
  await removeChecked.getByRole('button', { name: 'Retirer les articles pris' }).click()
  await page.getByRole('button', { name: 'Liste', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Actions pour Tomates' })).toHaveAccessibleDescription('Dans Courses')
  await expect(page.getByRole('button', { name: 'Actions pour Riz' })).not.toHaveAccessibleDescription('Dans Courses')
  await expect(page.getByText('Tomates', { exact: true })).toBeVisible()
  await expect(page.getByText('500 g', { exact: true })).toBeVisible()
  await expect(page.getByText('Riz', { exact: true })).toBeVisible()
  await swipeIntoShopping(page, 'Riz')
  await expect(page.getByText('Riz ajouté aux courses.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Courses', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Riz' }).click()
  await expect(page.getByText('Articles pris (1)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Vider les courses' }).click()
  await page.getByRole('alertdialog', { name: 'Vider toute la liste de courses ?' })
    .getByRole('button', { name: 'Vider les courses' }).click()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await expect(page.getByText('Articles pris (1)', { exact: true })).toBeHidden()
  await page.getByRole('button', { name: 'Liste', exact: true }).click()
  await expect(page.getByText('Riz', { exact: true })).toBeVisible()
  await expect(page.getByText('Tomates', { exact: true })).toBeVisible()
})

test('restaure un export chiffré dans une installation vierge', async ({ page, browser }, testInfo) => {
  const phrase = 'phrase réservée au test de restauration'
  await page.goto('/')
  await addItem(page, 'Pommes', '6')
  await swipeIntoShopping(page, 'Pommes')
  await page.getByRole('button', { name: 'Sauvegardes', exact: true }).click()
  await page.getByLabel('Phrase de récupération', { exact: true }).fill(phrase)
  await page.getByLabel('Confirmer la phrase pour exporter').fill(phrase)
  const received = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter', exact: true }).click()
  const backup = testInfo.outputPath('backup.pani')
  await (await received).saveAs(backup)

  const newPage = await browser.newPage({ viewport: { width: 320, height: 568 }, hasTouch: true })
  try {
    await newPage.goto(page.url())
    await expect(newPage.getByText('Votre liste est vide.')).toBeVisible()
    await newPage.getByRole('button', { name: 'Sauvegardes', exact: true }).click()
    const openPreview = newPage.getByRole('button', { name: 'Ouvrir l’aperçu', exact: true })
    const restorePhrase = newPage.getByLabel('Phrase de récupération du fichier', { exact: true })
    await expect(openPreview).toBeEnabled()
    await openPreview.click()
    await expect(newPage.getByRole('alert')).toContainText('Choisissez un fichier de sauvegarde.')
    const panel = newPage.getByRole('dialog', { name: 'Sauvegardes' })
    const selectFile = panel.getByRole('button', { name: 'Choisir un fichier', exact: true })
    const cancelledPicker = newPage.waitForEvent('filechooser')
    await selectFile.click()
    await cancelledPicker
    await panel.locator('input[type="file"]').dispatchEvent('cancel', { bubbles: true })
    await expect(panel).not.toHaveAttribute('data-closing', 'true')
    await expect(panel).toBeVisible()
    await expect(panel.getByText('Aucun fichier de sauvegarde sélectionné.')).toBeVisible()

    const picker = newPage.waitForEvent('filechooser')
    await selectFile.click()
    await (await picker).setFiles(backup)
    await expect(panel.getByText('backup.pani', { exact: true })).toBeVisible()
    await openPreview.click()
    await expect(newPage.getByRole('alert')).toContainText('Saisissez la phrase utilisée')
    await restorePhrase.fill('phrase incorrecte')
    await openPreview.click()
    await expect(newPage.getByRole('alert')).toContainText('Phrase incorrecte')
    await expect(newPage.getByRole('alert')).toBeInViewport()
    await expect(newPage.getByRole('button', { name: 'Confirmer le remplacement' })).toBeHidden()
    await restorePhrase.fill(phrase)
    await openPreview.click()
    const preview = newPage.getByRole('region', { name: 'Aperçu à restaurer' })
    await expect(preview).toContainText('1 article')
    await expect(preview.getByRole('button', { name: 'Confirmer le remplacement' })).toBeInViewport()
    await newPage.getByRole('button', { name: 'Confirmer le remplacement' }).click()
    await expect(newPage.getByText('Sauvegarde restaurée.')).toBeInViewport()
    await newPage.getByRole('button', { name: 'Fermer', exact: true }).click()
    await expect(newPage.getByText('Pommes', { exact: true })).toBeVisible()
    await newPage.getByRole('button', { name: 'Courses', exact: true }).click()
    await expect(newPage.getByRole('checkbox', { name: 'Pommes' })).toBeVisible()
  } finally {
    await newPage.close()
  }
})


test('ajuste la quantité, révèle les actions et dépose dans une catégorie vide', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'Pommes')
  await page.getByRole('button', { name: 'Augmenter la quantité de Pommes' }).click()
  const stepper = page.getByRole('group', { name: 'Quantité de Pommes' })
  await expect(stepper.locator('output')).toHaveText('2')
  await page.getByRole('button', { name: 'Diminuer la quantité de Pommes' }).click()
  await expect(stepper.locator('output')).toHaveText('1')

  const name = page.getByText('Pommes', { exact: true })
  const itemBox = await name.boundingBox()
  if (!itemBox) throw new Error('Article introuvable.')
  const itemX = itemBox.x + itemBox.width / 2
  const itemY = itemBox.y + itemBox.height / 2
  await page.mouse.move(itemX, itemY)
  await page.mouse.down()
  await page.mouse.move(itemX - 70, itemY, { steps: 12 })
  await page.mouse.up()
  const action = page.getByRole('button', { name: 'Modifier Pommes' })
  await expect(action).toBeVisible()
  await expect(page.getByRole('button', { name: 'Actions pour Pommes' })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Monter Pommes' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Descendre Pommes' })).toHaveCount(0)
  const actionBox = await action.boundingBox()
  if (!actionBox) throw new Error('Action introuvable.')
  await page.mouse.move(actionBox.x + actionBox.width / 2, actionBox.y + actionBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(actionBox.x + actionBox.width / 2 + 65, actionBox.y + actionBox.height / 2, { steps: 12 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: 'Actions pour Pommes' })).toHaveAttribute('aria-expanded', 'false')
  await expect(action).toBeHidden()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Catégories', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Nom', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Ajouter une catégorie' }).click()
  const popup = page.getByRole('dialog', { name: 'Ajouter une catégorie' })
  await waitForSheet(popup)
  await popup.getByRole('textbox', { name: 'Nom', exact: true }).fill('Fruits')
  await popup.getByLabel('Couleur', { exact: true }).fill('#008877')
  await popup.getByLabel('Emoji', { exact: true }).fill('🍇')
  await popup.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(popup).toBeHidden()
  const edit = page.getByRole('button', { name: 'Modifier Fruits' })
  await edit.click()
  const editPopup = page.getByRole('dialog', { name: 'Modifier la catégorie' })
  await expect(editPopup.getByLabel('Couleur', { exact: true })).toHaveValue('#008877')
  await waitForSheet(editPopup)
  await editPopup.getByRole('button', { name: 'Supprimer la catégorie' }).click()
  const confirmation = page.getByRole('alertdialog', { name: 'Supprimer cette catégorie ?' })
  await confirmation.getByRole('button', { name: 'Annuler' }).click()
  await expect(editPopup).toBeVisible()
  await editPopup.getByRole('button', { name: 'Annuler' }).click()
  await expect(editPopup).toBeHidden()
  const categoryHandle = page.getByRole('button', { name: 'Déplacer Fruits' })
  const categoryBox = await categoryHandle.boundingBox()
  if (!categoryBox) throw new Error('Poignée de catégorie introuvable.')
  await page.mouse.move(categoryBox.x + categoryBox.width / 2, categoryBox.y + categoryBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(categoryBox.x + categoryBox.width / 2, categoryBox.y + categoryBox.height / 2 + 24, { steps: 6 })
  await expect(edit.locator('..')).toHaveCSS('background-color', 'rgb(0, 136, 119)')
  await expect(edit.locator('..')).toHaveCSS('opacity', '1')
  await expect(page.locator('.drag-preview')).toHaveCount(0)
  await page.mouse.up()
  const listTab = page.getByRole('button', { name: 'Liste', exact: true })
  // dnd-kit blocks the release click briefly after a pointer drag.
  await expect(async () => {
    await listTab.click()
    await expect(listTab).toHaveAttribute('aria-pressed', 'true', { timeout: 250 })
  }).toPass({ timeout: 3000 })
  const category = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Fruits', exact: true }) })
  await expect(category.getByText('Aucun article')).toBeVisible()
  await expect(category.getByRole('heading')).toHaveCSS('background-color', 'rgb(0, 136, 119)')

  const handle = page.getByRole('button', { name: 'Déplacer Pommes' })
  const source = await handle.boundingBox()
  const target = await category.getByText('Aucun article').boundingBox()
  if (!source || !target) throw new Error('Cible de dépôt introuvable.')
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 16 })
  await page.mouse.up()
  await expect(category.getByText('Pommes', { exact: true })).toBeVisible()
  await expect(category.getByText('🍇', { exact: true })).toBeVisible()
  await page.reload()
  await expect(category.getByText('Pommes', { exact: true })).toBeVisible()
  await swipeIntoShopping(page, 'Pommes')
  await page.getByRole('button', { name: 'Courses', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Fruits', exact: true })).toHaveCSS('background-color', 'rgb(0, 136, 119)')
})

test('une catégorie reste dans sa colonne pendant un déplacement latéral', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Catégories', exact: true }).click()

  for (const name of ['Fruits', 'Pain', 'Boissons']) {
    await page.getByRole('button', { name: 'Ajouter une catégorie' }).click()
    const popup = page.getByRole('dialog', { name: 'Ajouter une catégorie' })
    await waitForSheet(popup)
    await popup.getByRole('textbox', { name: 'Nom', exact: true }).fill(name)
    await popup.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(popup).toBeHidden()
  }

  const row = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Modifier Pain' }) })
  const followingRow = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Modifier Boissons' }) })
  const handle = await row.getByRole('button', { name: 'Déplacer Pain' }).boundingBox()
  const initial = await row.boundingBox()
  const following = await followingRow.boundingBox()
  if (!handle || !initial || !following) throw new Error('Catégories introuvables.')

  const x = handle.x + handle.width / 2
  const y = handle.y + handle.height / 2
  const right = (page.viewportSize()?.width ?? 390) - 5
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (const side of [right, 5, right]) {
    await page.mouse.move(side, y, { steps: 10 })
    await expect.poll(async () => {
      const box = await row.boundingBox()
      return box ? Math.round(box.x - initial.x) : null
    }).toBe(0)
    await expect.poll(async () => {
      const box = await followingRow.boundingBox()
      return box ? Math.round(box.y - following.y) : null
    }).toBe(0)
  }

  await page.mouse.move(right, following.y + following.height / 2, { steps: 10 })
  await page.mouse.up()
  await expect(page.getByRole('listitem')).toHaveText([/Fruits/, /Boissons/, /Pain/])
})


test('les panneaux se ferment en touchant le fond et les actions affichent leur confirmation', async ({ page }) => {
  await page.goto('/')
  const add = page.getByRole('button', { name: 'Ajouter un article' })
  const outside = { x: 5, y: 5 }
  await add.focus()
  const startsFromBottom = page.evaluate(() => new Promise<boolean>((resolve) => {
    const observer = new MutationObserver(() => {
      const panel = document.querySelector('.pani-sheet[data-opening]')
      if (!panel) return
      observer.disconnect()
      const animation = panel.getAnimations()[0]?.effect
      resolve(animation instanceof KeyframeEffect &&
        String(animation.getKeyframes()[0]?.transform).includes('100%'))
    })
    observer.observe(document.body, { subtree: true, childList: true, attributes: true })
  }))
  await add.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Ajouter un article' })).toBeVisible()
  await expect(startsFromBottom).resolves.toBe(true)
  await expect(page.locator('body')).toHaveCSS('position', 'fixed')
  await page.touchscreen.tap(outside.x, outside.y)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveCSS('position', 'fixed')
  await expect(add).toBeFocused()

  await page.setViewportSize({ width: 320, height: 640 })
  await page.getByRole('button', { name: 'Sauvegardes', exact: true }).click()
  const backup = page.getByRole('dialog', { name: 'Sauvegardes' })
  await expect(backup).toBeVisible()
  await waitForSheet(backup)
  expect(await backup.locator('.pani-sheet').evaluate((panel) => panel.scrollWidth)).toBe(
    await backup.locator('.pani-sheet').evaluate((panel) => panel.clientWidth),
  )
  await page.touchscreen.tap(outside.x, outside.y)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Catégories', exact: true }).click()
  await page.getByRole('button', { name: 'Ajouter une catégorie' }).click()
  await expect(page.getByRole('dialog', { name: 'Ajouter une catégorie' })).toBeVisible()
  await page.touchscreen.tap(outside.x, outside.y)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Liste', exact: true }).click()
  await addItem(page, 'Riz')
  await expect(page.getByText('Article ajouté.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Actions pour Riz' }).click()
  await page.getByRole('button', { name: 'Modifier Riz' }).click()
  const editor = page.getByRole('dialog', { name: 'Modifier l’article' })
  await editor.getByLabel('Nom', { exact: true }).fill('Riz basmati')
  await editor.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(editor).toHaveCount(0)
  await expect(page.getByText('Article modifié.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Actions pour Riz basmati' }).click()
  await page.getByRole('button', { name: 'Supprimer Riz basmati' }).click()
  const deletion = page.getByRole('alertdialog', { name: 'Supprimer « Riz basmati » ?' })
  await expect(deletion.getByRole('button', { name: 'Annuler' })).toBeFocused()
  await deletion.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.getByText('Riz basmati supprimé.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Actions pour Riz basmati' })).toHaveCount(0)
})
