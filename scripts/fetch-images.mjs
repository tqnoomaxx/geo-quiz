// Holt für jede Sehenswürdigkeit ein Hauptbild von Wikipedia (DE, Fallback EN)
// und trägt die Bild-URL in src/data/landmarks.json ein.
// Aufruf:  node scripts/fetch-images.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = new URL('../src/data/landmarks.json', import.meta.url)
const landmarks = JSON.parse(readFileSync(FILE, 'utf8'))
const THUMB = 1000

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Ergebnis: { image } bei Treffer, { none:true } wenn Seite ok aber ohne Bild,
// null bei Netzfehler/Rate-Limit (→ erneut versuchen lohnt sich).
async function queryTitle(lang, title) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json` +
    `&redirects=1&titles=${encodeURIComponent(title)}` +
    `&prop=pageimages&piprop=thumbnail|original&pithumbsize=${THUMB}`
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Learniverse/1.0 (Bildungsprojekt)' } })
      if (res.status === 429 || res.status >= 500) { await sleep(1000 * (attempt + 1)); continue }
      if (!res.ok) return { none: true }
      const data = await res.json()
      const pages = data?.query?.pages || {}
      for (const p of Object.values(pages)) {
        if (p.thumbnail?.source) return { image: p.thumbnail.source }
        if (p.original?.source) return { image: p.original.source }
      }
      return { none: true }
    } catch {
      await sleep(600 * (attempt + 1))
    }
  }
  return null
}

// Sucht den best passenden Artikeltitel (bei abweichenden Lemmata).
async function searchTitle(lang, term) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json` +
    `&list=search&srlimit=1&srsearch=${encodeURIComponent(term)}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Learniverse/1.0 (Bildungsprojekt)' } })
    if (!res.ok) return null
    const data = await res.json()
    return data?.query?.search?.[0]?.title || null
  } catch { return null }
}

async function findImage(lm) {
  // 1) Direkte Lemmata auf DE, dann EN
  for (const lang of ['de', 'en']) {
    for (const name of lm.name) {
      const r = await queryTitle(lang, name)
      await sleep(120)
      if (r?.image) return r.image
    }
  }
  // 2) Volltextsuche als Fallback (Lemma weicht ab): Name + Land
  for (const lang of ['de', 'en']) {
    const term = `${lm.name[0]} ${lm.country[0]}`
    const title = await searchTitle(lang, term)
    await sleep(120)
    if (title) {
      const r = await queryTitle(lang, title)
      await sleep(120)
      if (r?.image) return r.image
    }
  }
  return null
}

let ok = 0
const missing = []
for (let i = 0; i < landmarks.length; i++) {
  const lm = landmarks[i]
  if (lm.image) { ok++; continue }
  const img = await findImage(lm)
  if (img) { lm.image = img; ok++ }
  else missing.push(lm.name[0])
  process.stdout.write(`\r${i + 1}/${landmarks.length}  gefunden: ${ok}  fehlend: ${missing.length}   `)
  if (i % 20 === 0) writeFileSync(FILE, JSON.stringify(landmarks, null, 1) + '\n') // Zwischenspeichern
}
console.log()

writeFileSync(FILE, JSON.stringify(landmarks, null, 1) + '\n')
console.log(`\nFertig. ${ok}/${landmarks.length} mit Bild.`)
if (missing.length) console.log('Ohne Bild:', missing.join(', '))
