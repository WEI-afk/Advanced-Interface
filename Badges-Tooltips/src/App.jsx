import { useEffect, useRef, useState } from 'react'

/* ---------- icons ---------- */
const PATHS = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  chat: <path d="M4 5h16v11H9.5L5 20v-4H4z" />,
  rooms: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  meet: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10.5l5-3v9l-5-3z" /></>,
  bell: <><path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 004 0" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6v.4" /></>,
  star: <path className="solid" d="M12 3.2l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.5l-5.4 2.9 1.2-5.9-4.4-4.1 6-.7z" />,
}
function Icon({ name }) {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>
}

/* ---------- a number that rolls to its new value instead of swapping ---------- */
function Roll({ value }) {
  const [pair, setPair] = useState({ from: null, to: value, k: 0 })
  useEffect(() => {
    if (value !== pair.to) setPair((p) => ({ from: p.to, to: value, k: p.k + 1 }))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className="roll">
      {pair.from != null && <span key={`o${pair.k}`} className="roll-out">{pair.from}</span>}
      <span key={`i${pair.k}`} className={pair.k ? 'roll-in' : ''}>{pair.to}</span>
    </span>
  )
}

/* ---------- the five sets ---------- */
const SETS = [
  {
    id: 'candy', name: 'Candy Pop', tone: 'Playful',
    desc: 'Bubblegum badges pop in with a squishy overshoot; tooltips bounce out of their anchor like comic speech bubbles.',
    text: 'yay!', fmt: (n) => (n > 99 ? '99+' : n),
    plain: 'Notifications',
    rich: { title: 'Hey there! 👋', text: 'Invite a friend to your room and play together.', action: 'Let’s go!', done: 'Invited! 🎉' },
  },
  {
    id: 'gallery', name: 'Gallery', tone: 'Elegant',
    desc: 'Hairlines, serif numerals and a touch of gold. Everything arrives slowly and quietly, like a gallery label.',
    text: 'new', fmt: (n) => (n > 99 ? '99+' : n),
    plain: 'Notifications',
    rich: { title: 'The Autumn Collection', text: 'A curated selection of new pieces, now on view.', action: 'Discover', done: 'Saved to your list' },
  },
  {
    id: 'hud', name: 'HUD', tone: 'Futuristic',
    desc: 'A heads-up display: radar-pulse dots, bracketed counters that glitch in, and holographic panels that scan open.',
    text: 'NEW', fmt: (n) => String(Math.min(n, 99)).padStart(2, '0'),
    plain: 'ALERTS // 3 PENDING',
    rich: { title: 'SYS//LINK', text: 'SIGNAL 98% · LATENCY 12MS · NODE 07', action: 'ENGAGE', done: 'LINKED ✓' },
  },
  {
    id: 'desktop', name: 'Desktop 98', tone: 'Nostalgic',
    desc: 'The family computer: beveled taskbar buttons, red notification badges and pale-yellow system tooltips.',
    text: 'New', fmt: (n) => (n > 99 ? '99+' : n),
    plain: 'Notifications',
    rich: { title: 'Updates are ready', text: 'Your computer has new updates. Click OK to install them now.', action: 'OK', done: 'Installing…' },
    openDelay: 500,
  },
  {
    id: 'mist', name: 'Mist', tone: 'Ethereal',
    desc: 'Frosted glass and soft light. Badges bloom out of a blur, tooltips condense from haze and drift away again.',
    text: 'new', fmt: (n) => (n > 99 ? '99+' : n),
    plain: 'Notifications',
    rich: { title: 'A quiet moment', text: 'Take a slow breath. Your space is ready when you are.', action: 'Begin', done: 'Breathing…' },
  },
]

/* ---------- badges ---------- */
const NO_BADGES = { dot: false, count: false, text: false, icon: false, n: 3 }

// badges stay mounted and keep their last content, so they animate out as smoothly as they animate in
function BadgeBar({ set, s, clear }) {
  const items = [
    { id: 'mail', label: 'Mail', kind: 'count', on: s.count, content: <Roll value={set.fmt(s.n)} /> },
    { id: 'chat', label: 'Chat', kind: 'text', on: s.text, content: set.text },
    { id: 'rooms', label: 'Rooms', kind: 'dot', on: s.dot },
    { id: 'meet', label: 'Meet', kind: 'icon', on: s.icon, content: <Icon name="star" /> },
  ]
  return (
    <nav className="bar" aria-label="Badge anchors">
      {items.map((it) => (
        <div key={it.id} className={`anchor-wrap a-${it.id}`}>
          <button className="anchor" onClick={() => clear(it.kind)} aria-label={`${it.label}${it.on ? ' (has updates)' : ''}`}>
            <Icon name={it.id} />
            <span className={`badge badge-${it.kind} ${it.on ? 'on' : ''}`} aria-hidden="true">{it.content}</span>
          </button>
          <span className="anchor-label">{it.label}</span>
        </div>
      ))}
    </nav>
  )
}

// a little script so wall tiles demo every badge appearing and disappearing on their own
const BADGE_SCRIPT = [
  (s) => ({ ...s, dot: true }), (s) => ({ ...s, count: true }), (s) => ({ ...s, text: true }), (s) => ({ ...s, icon: true }),
  (s) => ({ ...s, n: s.n + 1 }), (s) => ({ ...s, n: s.n + 1 }), (s) => ({ ...s, dot: false }), (s) => ({ ...s, count: false }),
  (s) => ({ ...s, text: false }), (s) => ({ ...s, icon: false, n: 3 }),
]

function BadgeCard({ set, auto, offset = 0 }) {
  const [s, setS] = useState(NO_BADGES)
  const clear = (kind) => setS((p) => ({ ...p, [kind]: false }))
  useEffect(() => {
    if (!auto) return
    let i = offset % BADGE_SCRIPT.length
    const t = setInterval(() => { setS(BADGE_SCRIPT[i]); i = (i + 1) % BADGE_SCRIPT.length }, 1100)
    return () => clearInterval(t)
  }, [auto, offset])
  const toggle = (kind) => setS((p) => ({ ...p, [kind]: !p[kind] }))
  return (
    <div className="card">
      {!auto && <div className="card-label">Badge</div>}
      <div className="stage stage-badge"><BadgeBar set={set} s={s} clear={clear} /></div>
      {!auto && (
        <div className="controls">
          {[['dot', 'Dot'], ['count', 'Number'], ['text', 'Text'], ['icon', 'Icon']].map(([k, label]) => (
            <button key={k} className={s[k] ? 'active' : ''} aria-pressed={s[k]} onClick={() => toggle(k)}>{label}</button>
          ))}
          <button onClick={() => setS((p) => ({ ...p, count: true, n: p.n + 1 }))}>+1</button>
          <button className="end" onClick={() => setS((p) => ({ ...NO_BADGES, n: p.n }))}>Clear all</button>
        </div>
      )}
    </div>
  )
}

/* ---------- tooltips ---------- */
// opens after a short pause and closes after a short grace period, so moving into a rich tooltip keeps it open
function useHoverIntent(openDelay = 120, closeDelay = 200) {
  const [open, setOpen] = useState(false)
  const t = useRef()
  useEffect(() => () => clearTimeout(t.current), [])
  const enter = () => { clearTimeout(t.current); t.current = setTimeout(() => setOpen(true), openDelay) }
  const leave = () => { clearTimeout(t.current); t.current = setTimeout(() => setOpen(false), closeDelay) }
  return [open, { onPointerEnter: enter, onPointerLeave: leave, onFocus: enter, onBlur: leave }]
}

const TOOLTIP_SCRIPT = ['default', 'plain', 'default', 'rich']

function TooltipCard({ set, auto, offset = 0 }) {
  const [forced, setForced] = useState(auto ? 'default' : null)
  const [plainHover, plainBind] = useHoverIntent(set.openDelay ?? 120)
  const [richHover, richBind] = useHoverIntent(set.openDelay ?? 120, 260)
  const [acted, setActed] = useState(false)
  useEffect(() => {
    if (!auto) return
    let i = offset % TOOLTIP_SCRIPT.length
    const t = setInterval(() => { i = (i + 1) % TOOLTIP_SCRIPT.length; setForced(TOOLTIP_SCRIPT[i]) }, 1600)
    return () => clearInterval(t)
  }, [auto, offset])
  useEffect(() => { if (acted) { const t = setTimeout(() => setActed(false), 2400); return () => clearTimeout(t) } }, [acted])

  const plainOpen = forced ? forced === 'plain' : plainHover
  const richOpen = forced ? forced === 'rich' : richHover
  const chip = (k, label) => (
    <button className={(forced ?? 'hover') === k ? 'active' : ''} onClick={() => setForced(k === 'hover' ? null : k)}>{label}</button>
  )
  return (
    <div className="card">
      {!auto && <div className="card-label">Tooltip</div>}
      <div className="stage stage-tip">
        <div className="tip-anchors">
          <div className="anchor-wrap">
            <span className="tip-host">
              <button className={`anchor ${plainOpen ? 'hot' : ''}`} aria-describedby={`${set.id}-plain`} {...plainBind}><Icon name="bell" /></button>
              <span id={`${set.id}-plain`} role="tooltip" className={`tip tip-plain ${plainOpen ? 'open' : ''}`}>{set.plain}</span>
            </span>
            <span className="anchor-label">Plain</span>
          </div>
          <div className="anchor-wrap">
            <span className="tip-host" {...richBind}>
              <button className={`anchor ${richOpen ? 'hot' : ''}`} aria-expanded={richOpen} aria-controls={`${set.id}-rich`}><Icon name="info" /></button>
              <div id={`${set.id}-rich`} role="dialog" aria-label={set.rich.title} className={`tip tip-rich ${richOpen ? 'open' : ''}`}>
                <div className="rich-title">{set.rich.title}</div>
                <p className="rich-text">{set.rich.text}</p>
                <button className={`rich-action ${acted ? 'acted' : ''}`} tabIndex={richOpen ? 0 : -1} onClick={() => setActed(true)}>
                  {acted ? set.rich.done : set.rich.action}
                </button>
              </div>
            </span>
            <span className="anchor-label">Rich</span>
          </div>
        </div>
      </div>
      {!auto && (
        <div className="controls">
          {chip('hover', 'Hover')}{chip('default', 'Default')}{chip('plain', 'Plain')}{chip('rich', 'Rich')}
        </div>
      )}
    </div>
  )
}

/* ---------- wall: every set, auto-playing, repeated to fill the screen ---------- */
// (the Advanced Interface home page shows this as a hover background via Badges-Tooltips/?wall)
const TILES = SETS.flatMap((set) => [{ set, Card: BadgeCard }, { set, Card: TooltipCard }])

function Wall() {
  const embedded = window.parent !== window
  const [active, setActive] = useState(!embedded)
  useEffect(() => {
    if (!embedded) return
    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data === 'wall:play') setActive(true)
      if (e.data === 'wall:pause') setActive(false)
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage('wall:ready', window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [embedded])
  const [layout] = useState(() => ({
    cols: Math.max(1, Math.round(window.innerWidth / 340)),
    rows: Math.ceil(window.innerHeight / 200) + 1,
  }))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: layout.cols }, (_, c) => (
        <div key={c} className="wall-col">
          {Array.from({ length: layout.rows }, (_, r) => {
            const { set, Card } = TILES[(c * 3 + r) % TILES.length]
            return (
              <div key={r} className={`wall-tile t-${set.id}`}>
                <Card set={set} auto offset={c * 2 + r} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ---------- page ---------- */
export default function App() {
  if (new URLSearchParams(window.location.search).has('wall')) return <Wall />
  return (
    <main>
      <header className="page-head">
        <a className="back" href="../">← Advanced Interface</a>
        <h1>Badges &amp; Tooltips</h1>
        <p>Week 2 · five sets, five tones · badge: none ↔ dot, none ↔ number / text / icon · tooltip: plain, rich with an action</p>
      </header>
      {SETS.map((set, i) => (
        <section key={set.id} className={`set t-${set.id}`}>
          <div className="set-head">
            <div>
              <div className="set-tone">{String(i + 1).padStart(2, '0')} · {set.tone}</div>
              <h2>{set.name}</h2>
              <p>{set.desc}</p>
            </div>
            {/* Figma draft for reference: small thumbnail, zooms in on hover / focus */}
            <a className="draft-ref" href={`${import.meta.env.BASE_URL}drafts/${set.id}.png`} target="_blank" rel="noreferrer">
              <img src={`${import.meta.env.BASE_URL}drafts/${set.id}.png`} alt={`${set.name} draft from Figma`} loading="lazy"
                onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
              <span>Draft</span>
            </a>
          </div>
          <div className="grid">
            <BadgeCard set={set} />
            <TooltipCard set={set} />
          </div>
        </section>
      ))}
    </main>
  )
}
