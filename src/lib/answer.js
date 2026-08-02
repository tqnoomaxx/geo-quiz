// Normalisiert eine Eingabe für toleranten Vergleich:
// Kleinschreibung, Akzente/Umlaute entfernt, ß→ss, nur Buchstaben & Ziffern.
export const normalize = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '')
    .trim()

// Prüft, ob die Eingabe einer der akzeptierten Schreibweisen entspricht.
export const matches = (input, accepted) => {
  const n = normalize(input)
  if (!n) return false
  return (Array.isArray(accepted) ? accepted : [accepted]).some(a => normalize(a) === n)
}
