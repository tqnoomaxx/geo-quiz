import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Home, BookOpen, Brain, BarChart3, Trophy,
  Sun, Moon, ArrowLeft, ArrowRight, Check, X, RotateCcw,
  Globe2, Map, Landmark, Orbit, CircleDotDashed, Sparkles, LockKeyhole, Coins
} from 'lucide-react'
import countries from './data/countries.json'
import landmarks from './data/landmarks.json'
import planets from './data/planets.json'
import dwarfs from './data/dwarf_planets.json'
import { matches } from './lib/answer'
import './styles.css'

/* ---------- Themen-Registry (datengetrieben) ---------- */

const NAV = [
  ['home', 'Start', Home],
  ['learn', 'Lernen', BookOpen],
  ['quiz', 'Quiz', Brain],
  ['stats', 'Statistik', BarChart3],
  ['achievements', 'Erfolge', Trophy],
]

// Abgefragte Felder je Thema: [Datenschlüssel, Label]
const COUNTRY_FIELDS = [
  ['capital', 'Hauptstadt'], ['peak', 'Höchste Erhebung'], ['river', 'Längster Fluss'],
  ['languages', 'Amtssprache'], ['currency', 'Währung'],
]
const PLANET_FIELDS = [
  ['type', 'Planetentyp'], ['order', 'Reihenfolge'], ['rings', 'Ringsystem'],
  ['largestMoon', 'Größter Mond'], ['orbit', 'Umlaufzeit'], ['rotation', 'Rotationsdauer'],
  ['diameter', 'Durchmesser'], ['temperature', 'Temperatur'],
]
const DWARF_FIELDS = [
  ['type', 'Typ'], ['region', 'Region'], ['largestMoon', 'Größter Mond'],
  ['orbit', 'Umlaufzeit'], ['diameter', 'Durchmesser'], ['temperature', 'Temperatur'],
]

const LM_EMOJI = {
  Bauwerk: '🏛️', Naturwunder: '🌄', Nationalpark: '🏞️', 'UNESCO-Welterbe': '🏺',
  Insel: '🏝️', Wasserfall: '🌊', Berg: '⛰️', Schlucht: '🏜️', Wahrzeichen: '📍',
}

// Ziel-Liste eines Eintrags für den Auto-Quiz: {key, label, accepted[], display}
const attrTargets = fields => item =>
  fields.map(([key, label]) => {
    const values = Array.isArray(item[key]) ? item[key] : [item[key]].filter(Boolean)
    const accepted = values.length || key !== 'river' ? values : ['Kein permanenter Fluss', 'Kein Fluss', 'Keiner']
    return {
      key,
      label,
      accepted,
      display: accepted[0] || 'Keine Angabe',
    }
  }).filter(target => target.accepted.length)

const TOPICS = {
  countries: { base: 'country', icon: Map, title: 'Länder', description: 'Hauptstädte, Flüsse und Fakten', learn: true, quiz: true },
  landmarks: { base: 'landmark', icon: Landmark, title: 'Sehenswürdigkeiten', description: 'Berühmte Orte aus aller Welt', learn: true, quiz: true },
  currencies: { base: 'currency', icon: Coins, title: 'Währungen', description: 'Welche Währung gehört zum Land?', learn: false, quiz: true },
  planets: { base: 'planet', icon: Orbit, title: 'Planeten', description: 'Unser Sonnensystem erkunden', learn: true, quiz: true },
  moons: { base: 'moon', icon: CircleDotDashed, title: 'Monde', description: 'Die Begleiter der Planeten', learn: false, quiz: true },
  dwarfs: { base: 'dwarf', icon: Sparkles, title: 'Zwergplaneten', description: 'Kleine Himmelskörper, großes Wissen', learn: true, quiz: true },
}
const TOPIC_ORDER = ['countries', 'landmarks', 'currencies', 'planets', 'moons', 'dwarfs']

const PAGES = new Set([
  ...NAV.map(([id]) => id),
  ...Object.values(TOPICS).flatMap(topic => [
    topic.learn ? `${topic.base}Learn` : null,
    topic.quiz ? `${topic.base}Quiz` : null,
  ]).filter(Boolean),
])

const EMPTY_STATS = { correct: 0, wrong: 0, points: 0, mastered: [], questions: {}, activity: [] }

const readStats = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('geo-stats') || localStorage.getItem('lv-stats') || 'null')
    return saved ? {
      ...EMPTY_STATS,
      ...saved,
      mastered: Array.isArray(saved.mastered) ? saved.mastered : [],
      questions: saved.questions && typeof saved.questions === 'object' ? saved.questions : {},
      activity: Array.isArray(saved.activity) ? saved.activity : [],
    } : EMPTY_STATS
  } catch {
    return EMPTY_STATS
  }
}

const ACHIEVEMENTS = [
  { icon: '⭐', title: 'Erster Schritt', desc: 'Erste richtige Antwort', done: s => s.correct >= 1 },
  { icon: '🔥', title: 'Durchstarter', desc: '50 richtige Antworten', done: s => s.correct >= 50 },
  { icon: '💎', title: 'Sammler', desc: '1000 Punkte', done: s => s.points >= 1000 },
  { icon: '🌍', title: 'Weltkenner', desc: '25 Länder gemeistert', done: s => countMastered(s, countries) >= 25 },
  { icon: '🗺️', title: 'Kartograf', desc: 'Alle Länder gemeistert', done: s => countMastered(s, countries) >= countries.length },
  { icon: '📸', title: 'Entdecker', desc: '100 Sehenswürdigkeiten erkannt', done: s => countMastered(s, landmarks) >= 100 },
  { icon: '💶', title: 'Währungsprofi', desc: 'Alle Länderwährungen gemeistert', done: s => countries.every(country => s.mastered.includes(`currency:${country.id}`)) },
  { icon: '🪐', title: 'Sonnenmeister', desc: 'Alle Planeten gemeistert', done: s => countMastered(s, planets) >= planets.length },
  { icon: '☄️', title: 'Zwergenkönig', desc: 'Alle Zwergplaneten gemeistert', done: s => countMastered(s, dwarfs) >= dwarfs.length },
]
const countMastered = (s, list) => list.filter(x => s.mastered.includes(x.id)).length

/* ---------- App ---------- */

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('geo-theme') || localStorage.getItem('lv-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [page, setPage] = useState(() => {
    const route = location.hash.slice(1)
    return PAGES.has(route) ? route : 'home'
  })
  const [stats, setStats] = useState(readStats)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('geo-theme', theme)
  }, [theme])
  useEffect(() => localStorage.setItem('geo-stats', JSON.stringify(stats)), [stats])
  useEffect(() => {
    const onHashChange = () => {
      const route = location.hash.slice(1)
      setPage(PAGES.has(route) ? route : 'home')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const navigate = next => {
    if (!PAGES.has(next)) return
    if (location.hash.slice(1) === next) setPage(next)
    else location.hash = next
  }

  const showToast = (kind, text) => {
    clearTimeout(toastTimer.current)
    setToast({ kind, text })
    toastTimer.current = setTimeout(() => setToast(null), 1600)
  }
  const reward = (ok, message, question) => {
    setStats(s => ({
      ...s,
      correct: s.correct + (ok ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
      points: s.points + (ok ? 10 : 0),
      questions: question ? {
        ...s.questions,
        [question.key]: {
          title: question.title,
          item: question.item,
          correct: (s.questions[question.key]?.correct || 0) + (ok ? 1 : 0),
          wrong: (s.questions[question.key]?.wrong || 0) + (ok ? 0 : 1),
        },
      } : s.questions,
    }))
    if (message) showToast(ok ? 'ok' : 'no', message)
  }
  const markMastered = id =>
    setStats(s => (!id || s.mastered.includes(id) ? s : { ...s, mastered: [...s.mastered, id] }))
  const recordLearning = (title, item, level) => {
    const itemName = Array.isArray(item.name) ? item.name[0] : item.name
    setStats(s => ({
      ...s,
      activity: [{ title, item: itemName, level, at: Date.now() }, ...s.activity].slice(0, 8),
    }))
  }

  const quizProps = { reward, markMastered, onBack: () => navigate('quiz') }
  const learnProps = { onBack: () => navigate('learn'), onRate: recordLearning }
  const activeNav = page.endsWith('Quiz') ? 'quiz' : page.endsWith('Learn') ? 'learn' : page

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('home')} aria-label="Zur Startseite">
          <Globe2 aria-hidden="true" /> <span>Geographie</span>
        </button>
        <nav>
          {NAV.map(([id, label, Icon]) => (
            <button key={id} className={activeNav === id ? 'active' : ''} onClick={() => navigate(id)} aria-label={label} aria-current={activeNav === id ? 'page' : undefined}>
              <Icon /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Design wechseln">
          {theme === 'light' ? <Moon /> : <Sun />} <span>{theme === 'light' ? 'Dunkel' : 'Hell'}</span>
        </button>
      </aside>

      <main>
        {page === 'home' && <HomePage setPage={navigate} stats={stats} />}
        {page === 'learn' && <Library mode="learn" setPage={navigate} />}
        {page === 'quiz' && <Library mode="quiz" setPage={navigate} />}

        {page === 'countryQuiz' && <CountryQuiz key="cq" {...quizProps} />}
        {page === 'landmarkQuiz' && <LandmarkQuiz key="lq" {...quizProps} />}
        {page === 'currencyQuiz' && <CurrencyQuiz key="cuq" {...quizProps} />}
        {page === 'planetQuiz' && <PlanetQuiz key="pq" {...quizProps} />}
        {page === 'moonQuiz' && <MoonQuiz key="mq" {...quizProps} />}
        {page === 'dwarfQuiz' && <DwarfQuiz key="dq" {...quizProps} />}

        {page === 'countryLearn' && <CountryLearn key="cl" {...learnProps} />}
        {page === 'landmarkLearn' && <LandmarkLearn key="ll" {...learnProps} />}
        {page === 'planetLearn' && <PlanetLearn key="pl" {...learnProps} />}
        {page === 'dwarfLearn' && <DwarfLearn key="dl" {...learnProps} />}

        {page === 'stats' && <Stats stats={stats} />}
        {page === 'achievements' && <Achievements stats={stats} />}
      </main>

      {toast && (
        <div className={`toast ${toast.kind}`} role="status" aria-live="polite">
          {toast.kind === 'ok' ? <Check /> : <X />} {toast.text}
        </div>
      )}
    </div>
  )
}

/* ---------- Startseite ---------- */

function HomePage({ setPage, stats }) {
  const total = stats.correct + stats.wrong
  const rate = total ? Math.round((stats.correct / total) * 100) : 0
  return (
    <>
      <header className="home-head">
        <div><h1>Entdecke<br />die Welt.</h1><p>Wissen über unseren Planeten – Schritt für Schritt.<br />Lernen, verstehen, ausprobieren.</p></div>
        <Globe2 className="hero-globe" aria-hidden="true" />
      </header>

      <section className="topics">
        {TOPIC_ORDER.map(id => (
          <TopicCard key={id} id={id} setPage={setPage} />
        ))}
      </section>

      <section className="progress-panel" aria-label="Dein Lernfortschritt">
        <div className="progress-copy"><h2>Dein Lernfortschritt</h2><p>Ein Überblick über deine bisherigen Ergebnisse.</p></div>
        <div className="quickstats">
          <StatBox value={stats.correct} label="Richtig" />
          <StatBox value={stats.wrong} label="Falsch" />
          <StatBox value={`${rate}%`} label="Quote" />
          <StatBox value={stats.points} label="Punkte" />
        </div>
      </section>

      <section className="coming-soon">
        <LockKeyhole aria-hidden="true" />
        <div><h2>Bald mehr</h2><p>Freue dich auf weitere spannende Themen.</p></div>
        <span>Geschichte</span><i /> <span>Tiere</span><i /> <span>Flaggen</span>
      </section>
    </>
  )
}

function TopicCard({ id, setPage }) {
  const t = TOPICS[id]
  const Icon = t.icon
  return (
    <article className={`topic ${id === 'countries' ? 'featured' : ''}`}>
      <div className="topic-icon"><Icon aria-hidden="true" /></div>
      <h2>{t.title}</h2>
      <p>{t.description}</p>
      <div className="topic-actions">
        {t.learn
          ? <button onClick={() => setPage(t.base + 'Learn')}>Lernen <ArrowRight /></button>
          : <span className="only-quiz">nur Quiz</span>}
        <button className="ghost" onClick={() => setPage(t.base + 'Quiz')}>Quiz <ArrowRight /></button>
      </div>
    </article>
  )
}

function StatBox({ value, label }) {
  return <div className="stat"><b>{value}</b><small>{label}</small></div>
}

/* ---------- Themenauswahl (Lernen / Quiz) ---------- */

function Library({ mode, setPage }) {
  const learn = mode === 'learn'
  const list = TOPIC_ORDER.filter(id => (learn ? TOPICS[id].learn : TOPICS[id].quiz))
  return (
    <Page icon={learn ? BookOpen : Brain} title={learn ? 'Lernen' : 'Quiz'}>
      <div className="pick">
        {list.map(id => (
          <button key={id} onClick={() => setPage(TOPICS[id].base + (learn ? 'Learn' : 'Quiz'))}>
            {React.createElement(TOPICS[id].icon, { 'aria-hidden': true })}
            <span>{TOPICS[id].title}</span>
          </button>
        ))}
      </div>
    </Page>
  )
}

/* ---------- Generischer Auto-Quiz (ohne Bestätigen) ---------- */

function Quiz({ title, icon = Brain, items, targetsOf, renderHeader, reward, markMastered, masteredId, onBack }) {
  const pick = () => items[Math.floor(Math.random() * items.length)]
  const [item, setItem] = useState(pick)
  const [input, setInput] = useState('')
  const [solved, setSolved] = useState([])
  const [flash, setFlash] = useState(null)
  const [retryItems, setRetryItems] = useState([])
  const inputRef = useRef(null)

  const targets = targetsOf(item)
  const done = solved.length === targets.length
  const question = {
    key: `${title}:${item.id}`,
    title,
    item: Array.isArray(item.name) ? item.name[0] : item.name,
  }

  // Kernstück: bei jeder Eingabe automatisch prüfen – kein Button, kein Enter nötig.
  const onChange = value => {
    const hit = targets.find(t => !solved.includes(t.key) && matches(value, t.accepted))
    if (hit) {
      const next = [...solved, hit.key]
      setSolved(next)
      setInput('')
      setFlash(hit.key)
      setTimeout(() => setFlash(null), 700)
      reward(true, `${hit.label} ✓`, question)
      if (next.length === targets.length && markMastered) markMastered(masteredId?.(item))
    } else {
      setInput(value)
    }
  }

  const goNext = () => {
    const missed = targets.length - solved.length
    if (missed > 0) reward(false, `${missed} offen`, question)
    const queued = retryItems.filter(queuedItem => queuedItem !== item)
    let n = queued[0] || pick()
    if (items.length > 1) while (n === item) n = pick()
    setRetryItems(missed > 0 ? [...queued.slice(1), item] : queued.slice(1))
    setItem(n); setSolved([]); setInput(''); inputRef.current?.focus()
  }

  return (
    <Page icon={icon} title={title} onBack={onBack}>
      <p className="page-intro">Gib die gesuchten Informationen ein. Deine Antworten werden beim Tippen automatisch erkannt.</p>
      <div className="quiz">
        {renderHeader(item, { done, solved: solved.length, total: targets.length })}

        <label className="sr-only" htmlFor="quiz-answer">Antwort</label>
        <input
          id="quiz-answer"
          ref={inputRef} autoFocus className="answer" value={input}
          onChange={e => onChange(e.target.value)} placeholder="Antwort eingeben …" disabled={done}
        />

        <ul className="reveal">
          {targets.map(t => {
            const ok = solved.includes(t.key)
            return (
              <li key={t.key} className={`${ok ? 'ok' : ''} ${flash === t.key ? 'flash' : ''}`}>
                <span className="dot">{ok ? <Check /> : ''}</span>
                <b>{t.label}</b>
                <em>{ok ? t.display : 'Noch nicht gelöst'}</em>
              </li>
            )
          })}
        </ul>

        <button className="next" onClick={goNext}>{done ? 'Nächstes →' : 'Überspringen'}</button>
      </div>
    </Page>
  )
}

/* Kopf-Bausteine */
const flagHeader = (sub) => (item, st) => (
  <div className="quiz-item">
    <span className="flag">{item.flag}</span>
    <div><small>{sub(item)}</small><h2>{item.name}</h2></div>
    <span className="counter">{st.solved}/{st.total}</span>
  </div>
)
const orbHeader = (sub) => (item, st) => (
  <div className="quiz-item">
    <span className="orb">{item.symbol}</span>
    <div><small>{sub(item)}</small><h2>{item.name}</h2></div>
    <span className="counter">{st.solved}/{st.total}</span>
  </div>
)

/* Konkrete Quizze */
const CountryQuiz = p => (
  <Quiz {...p} title="Länder-Quiz" items={countries}
    targetsOf={attrTargets(COUNTRY_FIELDS)} masteredId={c => c.id}
    renderHeader={flagHeader(c => c.continent)} />
)
const CurrencyQuiz = p => (
  <Quiz {...p} icon={Coins} title="Währungs-Quiz" items={countries}
    targetsOf={item => [{ key: 'currency', label: 'Währung', accepted: item.currency, display: item.currency[0] }]}
    masteredId={item => `currency:${item.id}`}
    renderHeader={flagHeader(item => item.continent)} />
)
const PlanetQuiz = p => (
  <Quiz {...p} title="Planeten-Quiz" items={planets}
    targetsOf={attrTargets(PLANET_FIELDS)} masteredId={x => x.id}
    renderHeader={orbHeader(() => 'Planet')} />
)
const DwarfQuiz = p => (
  <Quiz {...p} title="Zwergplaneten-Quiz" items={dwarfs}
    targetsOf={attrTargets(DWARF_FIELDS)} masteredId={x => x.id}
    renderHeader={orbHeader(() => 'Zwergplanet')} />
)
const MoonQuiz = p => (
  <Quiz {...p} title="Monde-Quiz" items={planets.filter(x => x.moons.length)}
    targetsOf={item => item.moons.map((m, i) => ({ key: 'm' + i, label: 'Mond', accepted: [m], display: m }))}
    masteredId={x => 'moon:' + x.id}
    renderHeader={(item, st) => (
      <div className="quiz-item">
        <span className="orb">{item.symbol}</span>
        <div><small>Nenne die wichtigsten Monde</small><h2>{item.name}</h2></div>
        <span className="counter">{st.solved}/{st.total}</span>
      </div>
    )} />
)

function LandmarkQuiz(p) {
  return (
    <Quiz {...p} title="Sehenswürdigkeiten-Quiz" items={landmarks}
      targetsOf={item => [{ key: 'country', label: 'Land', accepted: item.country, display: item.country[0] }]}
      masteredId={x => x.id}
      renderHeader={(item, st) => (
        <div className="lm-header">
          <LandmarkImage lm={item} big />
          <p className="lm-ask">{st.done ? item.name[0] : 'Welches Land?'}</p>
        </div>
      )} />
  )
}

function LandmarkImage({ lm, big }) {
  const [status, setStatus] = useState('loading')
  const src = lm.image || `/landmarks/${lm.id}.jpg`
  useEffect(() => setStatus('loading'), [src])
  if (status === 'error') {
    return <div className={`lm-placeholder ${big ? 'big' : ''}`}>{LM_EMOJI[lm.type] || '🏛️'}</div>
  }
  return (
    <div className={`lm-media ${big ? 'big' : ''}`}>
      {status === 'loading' && <div className={`lm-placeholder ${big ? 'big' : ''}`} aria-hidden="true">{LM_EMOJI[lm.type] || '🏛️'}</div>}
      <img
        className={`lm-img ${big ? 'big' : ''} ${status === 'loaded' ? 'loaded' : ''}`}
        src={src}
        alt={lm.name[0]}
        referrerPolicy="no-referrer"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  )
}

/* ---------- Generischer Lernmodus (gewichtete Wiederholung) ---------- */

function Learn({ title, items, renderCard, onBack, onRate }) {
  const [weights, setWeights] = useState(() => items.map(() => 1))
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * items.length))

  // Gewichtete Zufallsauswahl – unsichere/falsche Karten erscheinen häufiger.
  const pickNext = w => {
    const total = w.reduce((a, b) => a + b, 0)
    let r = Math.random() * total
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i }
    return 0
  }
  const rate = level => {
    const w = weights.slice()
    w[idx] = level === 2 ? 1 : level === 1 ? 3 : 5 // gewusst / unsicher / nicht gewusst
    onRate?.(title, items[idx], level)
    setWeights(w)
    setIdx(pickNext(w))
  }

  return (
    <Page icon={BookOpen} title={title} onBack={onBack}>
      <div className="card">{renderCard(items[idx])}</div>
      <div className="rate">
        <button className="bad" onClick={() => rate(0)}>Nicht gewusst</button>
        <button className="mid" onClick={() => rate(1)}>Unsicher</button>
        <button className="good" onClick={() => rate(2)}>Gewusst</button>
      </div>
    </Page>
  )
}

const CountryLearn = p => (
  <Learn {...p} title="Länder lernen" items={countries} renderCard={c => (
    <>
      <span className="flag big">{c.flag}</span>
      <h2>{c.name}</h2><small>{c.continent}</small>
      <dl>{COUNTRY_FIELDS.map(([k, l]) => (
        <div key={k}><dt>{l}</dt><dd>{c[k].length ? c[k].join(' / ') : k === 'river' ? 'Kein permanenter Fluss' : 'Keine Angabe'}</dd></div>
      ))}</dl>
    </>
  )} />
)
const PlanetLearn = p => (
  <Learn {...p} title="Planeten lernen" items={planets} renderCard={x => (
    <>
      <span className="orb big">{x.symbol}</span>
      <h2>{x.name}</h2><small>{x.fact}</small>
      <dl>
        <div><dt>Typ</dt><dd>{x.type[0]}</dd></div>
        <div><dt>Monde</dt><dd>{x.moons.length ? x.moons.join(', ') : 'keine'}</dd></div>
        <div><dt>Umlaufzeit</dt><dd>{x.orbit[0]}</dd></div>
        <div><dt>Durchmesser</dt><dd>{x.diameter[0]}</dd></div>
      </dl>
    </>
  )} />
)
const DwarfLearn = p => (
  <Learn {...p} title="Zwergplaneten lernen" items={dwarfs} renderCard={x => (
    <>
      <span className="orb big">{x.symbol}</span>
      <h2>{x.name}</h2><small>{x.fact}</small>
      <dl>
        <div><dt>Region</dt><dd>{x.region[0]}</dd></div>
        <div><dt>Monde</dt><dd>{x.moons.length ? x.moons.join(', ') : 'keine'}</dd></div>
        <div><dt>Umlaufzeit</dt><dd>{x.orbit[0]}</dd></div>
        <div><dt>Durchmesser</dt><dd>{x.diameter[0]}</dd></div>
      </dl>
    </>
  )} />
)
const LandmarkLearn = p => (
  <Learn {...p} title="Sehenswürdigkeiten lernen" items={landmarks} renderCard={l => (
    <>
      <LandmarkImage lm={l} big />
      <h2>{l.name[0]}</h2><small>{l.type} · {l.country[0]}</small>
      <p className="lm-desc">{l.description}</p>
    </>
  )} />
)

/* ---------- Statistik ---------- */

function Stats({ stats }) {
  const total = stats.correct + stats.wrong
  const rate = total ? Math.round((stats.correct / total) * 100) : 0
  const bars = [
    ['Länder', countMastered(stats, countries), countries.length],
    ['Sehenswürdigkeiten', countMastered(stats, landmarks), landmarks.length],
    ['Planeten', countMastered(stats, planets), planets.length],
    ['Zwergplaneten', countMastered(stats, dwarfs), dwarfs.length],
    ['Währungen', countries.filter(country => stats.mastered.includes(`currency:${country.id}`)).length, countries.length],
  ]
  const hardest = Object.values(stats.questions)
    .filter(question => question.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || a.correct - b.correct)
    .slice(0, 4)
  const levelLabels = ['Nicht gewusst', 'Unsicher', 'Gewusst']
  return (
    <Page icon={BarChart3} title="Statistik">
      <section className="quickstats">
        <StatBox value={stats.correct} label="Richtig" />
        <StatBox value={stats.wrong} label="Falsch" />
        <StatBox value={`${rate}%`} label="Quote" />
        <StatBox value={stats.points} label="Punkte" />
      </section>
      <div className="bars">
        {bars.map(([name, got, max]) => (
          <div key={name} className="bar">
            <span>{name}</span>
            <i><b style={{ width: `${max ? (got / max) * 100 : 0}%` }} /></i>
            <em>{got}/{max}</em>
          </div>
        ))}
      </div>
      <div className="insight-grid">
        <section className="insight">
          <h2>Schwierigste Fragen</h2>
          {hardest.length ? (
            <ul>{hardest.map(question => (
              <li key={`${question.title}:${question.item}`}>
                <span><b>{question.item}</b><small>{question.title}</small></span>
                <em>{question.wrong}× offen</em>
              </li>
            ))}</ul>
          ) : <p>Noch keine schwierigen Fragen – weiter so.</p>}
        </section>
        <section className="insight">
          <h2>Zuletzt gelernt</h2>
          {stats.activity.length ? (
            <ul>{stats.activity.slice(0, 4).map((entry, index) => (
              <li key={`${entry.at}:${index}`}>
                <span><b>{entry.item}</b><small>{entry.title}</small></span>
                <em>{levelLabels[entry.level]}</em>
              </li>
            ))}</ul>
          ) : <p>Starte eine Lernrunde, um hier deinen Verlauf zu sehen.</p>}
        </section>
      </div>
      <button className="reset" onClick={() => {
        if (confirm('Fortschritt wirklich zurücksetzen?')) {
          localStorage.removeItem('geo-stats'); localStorage.removeItem('lv-stats'); location.reload()
        }
      }}>
        <RotateCcw /> Zurücksetzen
      </button>
    </Page>
  )
}

/* ---------- Erfolge ---------- */

function Achievements({ stats }) {
  return (
    <Page icon={Trophy} title="Erfolge">
      <div className="ach-grid">
        {ACHIEVEMENTS.map(a => {
          const done = a.done(stats)
          return (
            <div key={a.title} className={`ach ${done ? 'done' : ''}`}>
              <span>{a.icon}</span><b>{a.title}</b><small>{a.desc}</small>
              {done && <em>✓</em>}
            </div>
          )
        })}
      </div>
    </Page>
  )
}

/* ---------- Seitengerüst ---------- */

function Page({ icon: Icon, title, onBack, children }) {
  return (
    <section className="page">
      {onBack && <button className="back" onClick={onBack}><ArrowLeft /> Zurück</button>}
      <header className="head"><Icon /><h1>{title}</h1></header>
      {children}
    </section>
  )
}

createRoot(document.getElementById('root')).render(<App />)
