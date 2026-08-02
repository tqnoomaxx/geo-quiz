import test from 'node:test'
import assert from 'node:assert/strict'
import { matches, normalize } from '../../src/lib/answer.js'

test('normalisiert Großschreibung, Umlaute, Akzente und Satzzeichen', () => {
  assert.equal(normalize('  Côte-d’Ivoire  '), 'cotedivoire')
  assert.equal(normalize('SÃO TOMÉ'), 'saotome')
  assert.equal(normalize('Straße'), 'strasse')
})

test('akzeptiert alternative Schreibweisen', () => {
  assert.equal(matches('Neu Delhi', ['Neu-Delhi', 'New Delhi']), true)
  assert.equal(matches('vae', ['Vereinigte Arabische Emirate', 'VAE']), true)
  assert.equal(matches('Euro', ['US-Dollar', 'USD']), false)
})

test('akzeptiert keine leeren Antworten', () => {
  assert.equal(matches('', ['Euro']), false)
  assert.equal(matches('---', ['Euro']), false)
})
