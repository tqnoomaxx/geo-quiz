import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readJson = name => JSON.parse(readFileSync(new URL(`../../src/data/${name}.json`, import.meta.url)))

test('alle 197 Länder haben eindeutige IDs und ein lösbares Währungsquiz', () => {
  const countries = readJson('countries')
  assert.equal(countries.length, 197)
  assert.equal(new Set(countries.map(country => country.id)).size, countries.length)
  for (const country of countries) {
    assert.ok(country.name, `Name fehlt bei ${country.id}`)
    assert.ok(country.flag, `Flagge fehlt bei ${country.name}`)
    assert.ok(country.currency?.length, `Währung fehlt bei ${country.name}`)
  }
})

test('alle Kerndatensätze sind vorhanden und intern konsistent', () => {
  const countries = readJson('countries')
  const countryIds = new Set(countries.map(country => country.id))
  const landmarks = readJson('landmarks')
  const planets = readJson('planets')
  const dwarfs = readJson('dwarf_planets')

  assert.ok(landmarks.length >= 170)
  assert.equal(planets.length, 8)
  assert.ok(dwarfs.length >= 5)
  assert.equal(new Set(landmarks.map(landmark => landmark.id)).size, landmarks.length)

  for (const landmark of landmarks) {
    assert.ok(countryIds.has(landmark.countryId), `Ungültiges Land bei ${landmark.id}`)
    assert.match(landmark.image, /^https:\/\//, `Bild fehlt bei ${landmark.id}`)
  }
})
