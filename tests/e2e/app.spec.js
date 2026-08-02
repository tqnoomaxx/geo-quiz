import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const countries = JSON.parse(readFileSync(new URL('../../src/data/countries.json', import.meta.url)))
const currenciesByCountry = new Map(countries.map(country => [country.name, country.currency]))

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('Startseite ist vollständig, navigierbar und ohne horizontalen Überlauf', async ({ page }) => {
  await expect(page).toHaveTitle(/Geographie/)
  await expect(page.getByRole('heading', { name: /Entdecke.*die Welt/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Währungen' })).toBeVisible()
  await expect(page.getByText('Dein Lernfortschritt')).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)

  await page.getByRole('button', { name: 'Statistik' }).click()
  await expect(page).toHaveURL(/#stats$/)
  await expect(page.getByRole('heading', { name: 'Statistik' })).toBeVisible()
})

test('Währungsquiz prüft alle Länderdaten und speichert Fortschritt', async ({ page }) => {
  await page.goto('./#currencyQuiz')
  await expect(page.getByRole('heading', { name: 'Währungs-Quiz' })).toBeVisible()

  const countryName = await page.locator('.quiz-item h2').textContent()
  const accepted = currenciesByCountry.get(countryName)
  expect(accepted?.length).toBeGreaterThan(0)

  await page.getByLabel('Antwort').fill(accepted[0])
  await expect(page.locator('.quiz-item .counter')).toHaveText('1/1')
  await expect(page.locator('.reveal li')).toHaveClass(/ok/)
  await expect(page.getByText(accepted[0], { exact: true })).toBeVisible()

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('geo-stats')))
  expect(saved.correct).toBe(1)
  expect(saved.points).toBe(10)
})

test('übersprungene Währungsfragen werden in derselben Runde wiederholt', async ({ page }) => {
  await page.goto('./#currencyQuiz')
  const firstCountry = await page.locator('.quiz-item h2').textContent()
  await page.getByRole('button', { name: 'Überspringen' }).click()
  await expect(page.locator('.quiz-item h2')).not.toHaveText(firstCountry)

  await page.getByRole('button', { name: 'Überspringen' }).click()
  await expect(page.locator('.quiz-item h2')).toHaveText(firstCountry)
})

test('Theme und Hash-Route bleiben nach einem Reload erhalten', async ({ page }) => {
  await page.getByRole('button', { name: 'Design wechseln' }).click()
  await page.getByLabel('Quiz', { exact: true }).click()
  await page.reload()

  await expect(page).toHaveURL(/#quiz$/)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('heading', { name: 'Quiz' })).toBeVisible()
})

test('Kernnavigation läuft ohne JavaScript- oder Konsolenfehler', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })

  for (const route of ['#home', '#learn', '#quiz', '#stats', '#achievements', '#currencyQuiz']) {
    await page.goto(`./${route}`)
    await expect(page.locator('main')).not.toBeEmpty()
  }

  expect(errors).toEqual([])
})

test('Sehenswürdigkeiten behalten auch während des Bildladens ein stabiles Medienfeld', async ({ page }) => {
  await page.goto('./#landmarkLearn')
  const media = page.locator('.lm-media, .lm-placeholder').first()
  await expect(media).toBeVisible()
  expect(await media.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(200)
})
