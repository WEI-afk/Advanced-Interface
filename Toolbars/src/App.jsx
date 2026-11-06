import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const mod = (a, n) => ((a % n) + n) % n

const ic = (d, w) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
)
const P = {
  undo: ['M9 14L4 9l5-5', 'M4 9h11a5 5 0 0 1 0 10h-3'], redo: ['M15 14l5-5-5-5', 'M20 9H9a5 5 0 0 0 0 10h3'],
  pen: ['M4 20l4-1 11-11-3-3L5 16z', 'M14 7l3 3'], sticker: ['M12 3a9 9 0 1 0 9 9h-5a4 4 0 0 1-4-4z', 'M12 3v5a4 4 0 0 0 4 4h5'],
  text: ['M5 6V4h14v2', 'M12 4v16', 'M9 20h6'], share: ['M12 3v12', 'M7 8l5-5 5 5', 'M5 13v6h14v-6'], check: ['M5 12.500l4.500 4.500L19 7'],
  back: ['M15 5l-7 7 7 7'], list: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  prev: ['M14 6l-6 6 6 6'], next: ['M10 6l6 6-6 6'], mark: ['M6 3h12v18l-6-4-6 4z'], search: ['M10.500 4a6.500 6.500 0 1 0 0 13 6.500 6.500 0 0 0 0-13z', 'M15.500 15.500L21 21'],
}

/* ================= the toolbar system =================
   One bar, three groups: start, center, end. Each group can be used alone (left, center or right aligned) or all three spread.
   Every button is the same structure: [icon] [label], either one optional. Arrow keys move between buttons, Home and End jump. */
function Btn({ b, on, onPress, lit }) {
  return (
    <button type="button" className={`tb-btn ${b.icon ? 'has-icon' : ''} ${b.label ? 'has-label' : ''} ${on ? 'is-on' : ''} ${lit ? 'is-lit' : ''} ${b.title ? 'is-title' : ''}`}
      aria-label={b.label ? undefined : b.name} aria-pressed={b.toggle ? !!on : undefined} data-id={b.id} onClick={() => onPress?.(b)}>
      {b.icon && <span className="tb-ic">{b.icon}</span>}
      {b.label && <span className={`tb-label ${b.opt ? 'opt' : ''}`}>{b.label}</span>}
    </button>
  )
}

function useRoving(ref) {
  // one tab stop for the whole toolbar; arrows walk the buttons
  const onKeyDown = (e) => {
    const list = [...ref.current.querySelectorAll('.tb-live .tb-btn')]
    const i = list.indexOf(document.activeElement)
    if (i < 0) return
    let j = null
    if (e.key === 'ArrowRight') j = mod(i + 1, list.length)
    else if (e.key === 'ArrowLeft') j = mod(i - 1, list.length)
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = list.length - 1
    if (j == null) return
    e.preventDefault()
    list[j].focus()
  }
  useLayoutEffect(() => {
    const list = [...ref.current.querySelectorAll('.tb-live .tb-btn')]
    list.forEach((b, i) => { b.tabIndex = i ? -1 : 0 })
  })
  const onFocus = (e) => {
    const list = [...ref.current.querySelectorAll('.tb-live .tb-btn')]
    list.forEach((b) => { b.tabIndex = b === e.target ? 0 : -1 })
  }
  return { onKeyDown, onFocus }
}

/* ----- PLAYFUL · Gumdrop: a sticker of a toolbar. Buttons pop up when you point at them and squash when you press; the blue pill hops between tools ----- */
const TOOLS = ['draw', 'stickers', 'text']
function GumSet({ auto, offset = 0 }) {
  const ref = useRef(null)
  const [tool, setTool] = useState(offset % 3)
  const [hist, setHist] = useState({ n: 3, at: 3 })
  const [shared, setShared] = useState(false)
  const [done, setDone] = useState(false)
  const [pill, setPill] = useState(null)
  const [demo, setDemo] = useState(-1)
  const rove = useRoving(ref)

  const groups = [
    [{ id: 'undo', name: 'Undo', icon: ic(P.undo, 2.2) }, { id: 'redo', name: 'Redo', icon: ic(P.redo, 2.2) }],
    [{ id: 'draw', label: 'Draw', icon: ic(P.pen, 2.2), opt: true }, { id: 'stickers', label: 'Stickers', icon: ic(P.sticker, 2.2), opt: true }, { id: 'text', label: 'Text', icon: ic(P.text, 2.2), opt: true }],
    [{ id: 'share', label: shared ? 'Copied' : 'Share', icon: ic(shared ? P.check : P.share, 2.2), opt: true }, { id: 'done', label: done ? 'Saved' : 'Done' }],
  ]
  const press = (b) => {
    if (TOOLS.includes(b.id)) setTool(TOOLS.indexOf(b.id))
    else if (b.id === 'undo') setHist((h) => ({ ...h, at: Math.max(0, h.at - 1) }))
    else if (b.id === 'redo') setHist((h) => ({ ...h, at: Math.min(h.n, h.at + 1) }))
    else if (b.id === 'share') { setShared(true); setTimeout(() => setShared(false), 1400) }
    else if (b.id === 'done') { setDone(true); setTimeout(() => setDone(false), 1400) }
  }
  // the selection pill measures the chosen tool and springs to it
  useLayoutEffect(() => {
    const el = ref.current?.querySelector(`[data-id="${TOOLS[tool]}"]`)
    if (el) setPill({ x: el.offsetLeft + el.offsetParent.offsetLeft, w: el.offsetWidth })
  }, [tool, shared])
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const el = ref.current?.querySelector(`[data-id="${TOOLS[tool]}"]`)
      if (el) setPill({ x: el.offsetLeft + el.offsetParent.offsetLeft, w: el.offsetWidth })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [tool])

  useEffect(() => {
    if (!auto) return
    let k = offset
    const t = setInterval(() => { k++; if (k % 2) setDemo(mod(k, 7)); else { setDemo(-1); setTool((v) => (v + 1) % 3) } }, 900)
    return () => clearInterval(t)
  }, [auto, offset])

  const ids = groups.flat().map((b) => b.id)
  return (
    <div className="gum">
      <div className="tb gum-bar tb-live" ref={ref} role="toolbar" aria-label="Sticker tools" onKeyDown={rove.onKeyDown} onFocus={rove.onFocus}>
        {pill && <i className="gum-pill" aria-hidden="true" style={{ transform: `translateX(${pill.x}px)`, width: pill.w }} />}
        {groups.map((g, i) => (
          <div key={i} className={`tb-group g${i}`}>
            {g.map((b) => <Btn key={b.id} b={b} on={TOOLS[tool] === b.id} lit={demo >= 0 && ids[demo] === b.id} onPress={press} />)}
          </div>
        ))}
      </div>
      <p className="gum-note" aria-live="polite">Step {hist.at} of {hist.n}</p>
    </div>
  )
}

/* ----- MYSTERIOUS · Lantern: the bar stays dark. A small light follows your pointer, and only what it touches is lit: gold labels, hairline edges ----- */
const CHAPTERS = ['V · The Stair', 'VI · The Hall', 'VII · The Cellar', 'VIII · The Well']
function LanSet({ auto, offset = 0 }) {
  const ref = useRef(null)
  const stage = useRef(null)
  const [ch, setCh] = useState(2)
  const [marked, setMarked] = useState(false)
  const [search, setSearch] = useState(false)
  const [lightOn, setLightOn] = useState(!!auto)
  const rove = useRoving(ref)
  const groups = [
    [{ id: 'back', name: 'Back', icon: ic(P.back, 1.2) }, { id: 'chapters', label: 'Chapters', icon: ic(P.list, 1.2), opt: true }],
    [{ id: 'prev', name: 'Previous chapter', icon: ic(P.prev, 1.2) }, { id: 'title', label: <>{CHAPTERS[ch].split(' · ')[0]}<span className="tb-rest"> · {CHAPTERS[ch].split(' · ')[1]}</span></>, title: true }, { id: 'next', name: 'Next chapter', icon: ic(P.next, 1.2) }],
    [{ id: 'search', label: 'Search', icon: ic(P.search, 1.2), opt: true, toggle: true }, { id: 'mark', name: 'Bookmark', icon: ic(P.mark, 1.2), toggle: true }],
  ]
  const onState = { mark: marked, search }
  const press = (b) => {
    if (b.id === 'prev') setCh((v) => Math.max(0, v - 1))
    else if (b.id === 'next') setCh((v) => Math.min(CHAPTERS.length - 1, v + 1))
    else if (b.id === 'mark') setMarked((v) => !v)
    else if (b.id === 'search') setSearch((v) => !v)
  }
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    stage.current.style.setProperty('--mx', `${e.clientX - r.left}px`)
    stage.current.style.setProperty('--my', `${e.clientY - r.top}px`)
    setLightOn(true)
  }
  const bar = (live) => (
    <div className={`tb lan-bar ${live ? 'tb-live' : 'lan-lit'}`} ref={live ? ref : undefined} role={live ? 'toolbar' : undefined} aria-hidden={live ? undefined : true}
      aria-label={live ? 'Reading tools' : undefined} onKeyDown={live ? rove.onKeyDown : undefined} onFocus={live ? rove.onFocus : undefined}>
      {groups.map((g, i) => (
        <div key={i} className={`tb-group g${i}`}>
          {g.map((b) => <Btn key={b.id} b={b} on={onState[b.id]} onPress={live ? press : undefined} />)}
        </div>
      ))}
    </div>
  )
  return (
    <div className={`lan ${lightOn ? 'is-on' : ''} ${auto ? 'is-auto' : ''}`} ref={stage} onPointerMove={auto ? undefined : move} onPointerLeave={() => !auto && setLightOn(false)}
      onFocusCapture={(e) => {
        if (auto || !e.target.matches?.(':focus-visible')) return
        const r = ref.current.getBoundingClientRect(), b = e.target.getBoundingClientRect()
        stage.current.style.setProperty('--mx', `${b.left + b.width / 2 - r.left}px`); stage.current.style.setProperty('--my', `${b.top + b.height / 2 - r.top}px`); setLightOn(true)
      }}>
      <div className="lan-wrap">
        <i className="lan-glow" aria-hidden="true" />
        {bar(true)}
        {bar(false)}
      </div>
    </div>
  )
}

/* ================= page ================= */
const SETS = [
  { id: 'gum', tone: 'Playful, Gumdrop', Body: GumSet },
  { id: 'lan', tone: 'Mysterious, Lantern', Body: LanSet },
]

/* Figma drawing + spec thumbnail: the enlarged copy is drawn above the page, so no section clips it */
function DraftThumb({ set }) {
  const ref = useRef(null)
  const [box, setBox] = useState(null)
  const [open, setOpen] = useState(false)
  const src = `${import.meta.env.BASE_URL}final/${set.id}.png`
  const show = () => {
    const im = ref.current.querySelector('img')
    const r = im.getBoundingClientRect()
    const W = Math.min(900, window.innerWidth - 32), H = W * (im.naturalHeight / im.naturalWidth || .7)
    const left = Math.min(Math.max(r.right - W, 16), window.innerWidth - W - 16)
    const top = Math.max(16, Math.min(r.top, window.innerHeight - H - 16))
    setBox({ left, top, W, s: r.width / W, ox: r.left - left, oy: r.top - top })
    requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)))
  }
  const hide = () => setOpen(false)
  useEffect(() => {
    if (!box) return
    window.addEventListener('scroll', hide, { passive: true })
    return () => window.removeEventListener('scroll', hide)
  }, [box])
  return (
    <>
      <div ref={ref} className="draft-ref" tabIndex={0} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
        <img src={src} alt={`${set.tone} — Figma drawing and spec`} loading="lazy" onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
        <span>Figma spec</span>
      </div>
      {box && createPortal(
        <img className="draft-zoom" src={src} alt="" aria-hidden="true" onTransitionEnd={() => { if (!open) setBox(null) }}
          style={{ left: box.left, top: box.top, width: box.W, transformOrigin: `${box.ox}px ${box.oy}px`, transform: open ? 'none' : `scale(${box.s})`, opacity: open ? 1 : 0 }} />,
        document.body)}
    </>
  )
}

/* wall (home page hover background): the toolbars operating themselves, repeated to fill the screen */
function Wall() {
  const embedded = window.parent !== window
  const [active, setActive] = useState(true)
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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 820)), rows: Math.ceil(window.innerHeight / 300) + 1 }))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: layout.cols }, (_, c) => (
        <div key={c} className="wall-col">
          {Array.from({ length: layout.rows }, (_, r) => {
            const set = SETS[(c + r) % SETS.length]
            return <div key={r} className="wall-tile"><set.Body auto offset={c * 2 + r} /></div>
          })}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  if (new URLSearchParams(window.location.search).has('wall')) return <Wall />
  return (
    <main>
      <header className="page-head">
        <a className="back" href="../">← Advanced Interface</a>
        <h1>Toolbars</h1>
        <p>Week 7 · Advanced Interface</p>
      </header>
      {SETS.map((set) => (
        <section key={set.id} className={`set s-${set.id}`}>
          <div className="set-head">
            <h2>{set.tone}</h2>
            <DraftThumb set={set} />
          </div>
          <set.Body />
        </section>
      ))}
    </main>
  )
}
