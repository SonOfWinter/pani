import { expect, test, type Page } from '@playwright/test'

async function addItem(page: Page, name: string, quantity = '') {
  await page.getByRole('button', { name: 'Ajouter un article' }).click()
  const form = page.getByRole('dialog', { name: 'Ajouter un article' })
  await form.getByLabel('Nom', { exact: true }).fill(name)
  await form.getByLabel('Quantité (facultatif)').fill(quantity)
  await form.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(form).toBeHidden()
}

test('prépare les achats puis termine ses courses après une relance hors ligne', async ({ page, context }) => {
  await page.goto('/')
  await addItem(page, 'Tomates', '500 g')
  await addItem(page, 'Riz')
  await page.getByRole('searchbox').fill('toma')
  await expect(page.getByText('Tomates', { exact: true })).toBeVisible()
  await expect(page.getByText('Riz', { exact: true })).toBeHidden()
  await page.getByRole('searchbox').fill('')
  await page.getByRole('button', { name: 'Courses', exact: true }).click()
  await page.getByRole('checkbox', { name: /Tomates/ }).click()
  await expect(page.getByText('1 article à acheter', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(async () =>
    Boolean((await navigator.serviceWorker.getRegistration())?.active),
  )).toBe(true)
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Courses', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('1 article à acheter', { exact: true })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Riz' }).click()
  await expect(page.getByText('Courses terminées.')).toBeVisible()
  await page.getByText('Articles pris (2)', { exact: true }).click()
  await page.getByRole('checkbox', { name: /Tomates/ }).click()

  await expect(page.getByText('Articles pris (1)', { exact: true })).toBeVisible()
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Retirer les articles pris' }).click()
  await expect(page.getByRole('checkbox', { name: 'Riz' })).toBeChecked()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Retirer les articles pris' }).click()
  await page.getByRole('button', { name: 'Liste', exact: true }).click()
  await expect(page.getByText('Tomates', { exact: true })).toBeVisible()
  await expect(page.getByText('500 g', { exact: true })).toBeVisible()
  await expect(page.getByText('Riz', { exact: true })).toBeHidden()
})

test('restaure un export chiffré dans une installation vierge', async ({ page, browser }, testInfo) => {
  const phrase = 'phrase réservée au test de restauration'
  await page.goto('/')
  await addItem(page, 'Pommes', '6')
  await page.getByRole('button', { name: 'Sauvegardes', exact: true }).click()
  await page.getByLabel('Phrase de récupération', { exact: true }).fill(phrase)
  await page.getByLabel('Confirmer la phrase pour exporter').fill(phrase)
  const received = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter', exact: true }).click()
  const backup = testInfo.outputPath('backup.pani')
  await (await received).saveAs(backup)

  const newPage = await browser.newPage()
  try {
    await newPage.goto(page.url())
    await expect(newPage.getByText('Votre liste est vide.')).toBeVisible()
    await newPage.getByRole('button', { name: 'Sauvegardes', exact: true }).click()
    await newPage.getByLabel('Phrase de récupération', { exact: true }).fill('phrase incorrecte')
    await newPage.getByLabel('Fichier de sauvegarde', { exact: true }).setInputFiles(backup)
    await newPage.getByRole('button', { name: 'Ouvrir l’aperçu', exact: true }).click()
    await expect(newPage.getByRole('alert')).toContainText('Phrase incorrecte')
    await expect(newPage.getByRole('button', { name: 'Confirmer le remplacement' })).toBeHidden()
    await newPage.getByLabel('Phrase de récupération', { exact: true }).fill(phrase)
    await newPage.getByRole('button', { name: 'Ouvrir l’aperçu', exact: true }).click()
    await expect(newPage.getByRole('region', { name: 'Aperçu à restaurer' })).toContainText('1 article')
    await newPage.getByRole('button', { name: 'Confirmer le remplacement' }).click()
    await expect(newPage.getByText('Sauvegarde restaurée.')).toBeVisible()
    await newPage.getByRole('button', { name: 'Fermer', exact: true }).click()
    await expect(newPage.getByText('Pommes', { exact: true })).toBeVisible()
  } finally {
    await newPage.close()
  }
})
