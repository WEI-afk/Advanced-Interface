import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const mod = (a, n) => ((a % n) + n) % n
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* line icons */
const li = (d) => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
)
const ICON = {
  chev: li(['M7.500 4.500L13 10l-5.500 5.500']),
  plus: li(['M10 4v12', 'M4 10h12']),
  rain: li(['M5 11a4 4 0 0 1 1-7.800A5 5 0 0 1 15.500 5 3 3 0 0 1 15 11z', 'M7 14l-1 3', 'M11 14l-1 3', 'M15 14l-1 3']),
  moon: li(['M16 12.500A7 7 0 0 1 7.500 4a7 7 0 1 0 8.500 8.500z']),
  cloud: li(['M6 15a4 4 0 0 1 0-8 5 5 0 0 1 9.500 1A3.500 3.500 0 0 1 15 15z', 'M10 9v5', 'M8 12l2 2 2-2']),
  mark: li(['M5 3h10v14l-5-3.500L5 17z']),
  pillar: li(['M4 4h12', 'M4 16h12', 'M6.500 4v12', 'M10 4v12', 'M13.500 4v12']),
  arch: li(['M3 17V9a7 7 0 0 1 14 0v8', 'M7 17V9.500a3 3 0 0 1 6 0V17']),
  back: li(['M12.500 4.500L7 10l5.500 5.500']),
}

/* ================= the list system =================
   One row structure, every configuration:
   [icon | avatar | thumbnail | nothing] title + optional second line ....... [text | icon | both]
   A row with `to` navigates one level deeper; a row with `sub` expands in place. Both sets render this same structure;
   only the styling tokens differ. */
function Left({ left }) {
  if (!left) return null
  if (left.icon) return <span className="ls-left ls-icon">{left.icon}</span>
  if (left.avatar) return <span className="ls-left ls-avatar" style={{ '--c': left.c }}>{left.avatar}</span>
  return <span className="ls-left ls-thumb" style={{ background: left.thumb }} aria-hidden="true" />
}

function Row({ item, d, active, pressed, m, depth, open }) {
  const near = Math.max(0, 1 - Math.abs(d))
  return (
    <div className={`ls-row ${active ? 'is-hover' : ''} ${pressed ? 'is-press' : ''} ${open ? 'is-open' : ''} ${depth ? 'is-child' : ''}`} data-id={item.id}
      role={item.sub ? 'treeitem' : 'button'} aria-expanded={item.sub ? !!open : undefined} aria-haspopup={item.to ? 'true' : undefined}
      style={{ '--d': Math.max(-3, Math.min(3, d)), '--near': near }}
      onPointerEnter={() => m.enter(item.id)} onPointerLeave={() => m.leave(item.id)}
      onPointerDown={(e) => m.press(item.id, e)} onPointerUp={() => m.release(item)} onPointerCancel={() => m.cancel()}>
      <div className="ls-in">
        <Left left={item.left} />
        <span className="ls-text">
          <span className="ls-title">{item.title}</span>
          {item.line && <span className="ls-line">{item.line}</span>}
        </span>
        {(item.text != null || item.right || item.to || item.sub) && (
          <span className="ls-right">
            {item.text != null && <span className="ls-note">{item.text}</span>}
            {item.right}
            {item.to && <span className="ls-go">{ICON.chev}</span>}
            {item.sub && <span className="ls-plus">{ICON.plus}</span>}
          </span>
        )}
      </div>
    </div>
  )
}

function ListSet({ build, label, cls, auto, offset = 0 }) {
  const root = useRef(null)
  const [n, setN] = useState(0)
  const { title, items } = build(n, () => setN((v) => v + 1))
  const [layers, setLayers] = useState([{ page: null, key: 0, dir: 1 }]) // page = the row opened, or null at the top
  const [open, setOpen] = useState(null)
  const [cur, setCur] = useState(auto ? items[0].id : null)
  const [down, setDown] = useState(null)
  const seq = useRef(0)
  const fly = useRef(null)
  const top = layers[layers.length - 1]
  const pageItem = top.page && items.find((i) => i.id === top.page)
  const rows = pageItem ? pageItem.to : items

  const flat = (list) => list.flatMap((it) => (it.sub && open === it.id ? [it, ...it.sub] : [it]))
  const visible = flat(rows)
  const at = visible.findIndex((v) => v.id === cur)

  const go = (it) => {
    const t = root.current.querySelector(`.ls-layer.in [data-id="${it.id}"] .ls-title`)
    fly.current = { from: t?.getBoundingClientRect(), to: '.ls-layer.in .ls-head h3' }
    setCur(it.to[0].id)
    setLayers((v) => [...v.slice(-1), { page: it.id, key: ++seq.current, dir: 1 }])
  }
  const backTo = () => {
    if (!top.page) return
    const t = root.current.querySelector('.ls-layer.in .ls-head h3')
    fly.current = { from: t?.getBoundingClientRect(), to: `.ls-layer.in [data-id="${top.page}"] .ls-title` }
    setCur(top.page)
    setLayers((v) => [...v.slice(-1), { page: null, key: ++seq.current, dir: -1 }])
  }
  const activate = (it) => {
    if (it.to) go(it)
    else if (it.sub) setOpen((v) => (v === it.id ? null : it.id))
    else it.act?.()
  }

  // the title you chose flies from the row to the heading of the next level, and back
  useLayoutEffect(() => {
    const f = fly.current
    fly.current = null
    if (!f?.from || reducedMotion()) return
    const el = root.current.querySelector(f.to)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.height) return
    const s = f.from.height / r.height
    el.animate([
      { transformOrigin: '0 0', transform: `translate(${f.from.left - r.left}px, ${f.from.top - r.top}px) scale(${s})` },
      { transformOrigin: '0 0', transform: 'none' },
    ], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' })
  }, [layers])

  const m = {
    enter(id) { if (!auto) setCur(id) },
    leave(id) { if (!auto) { setCur((v) => (v === id ? null : v)); setDown(null) } },
    press(id, e) {
      if (auto) return
      const b = e.currentTarget.getBoundingClientRect()
      setDown({ id, x: e.clientX - b.left, y: e.clientY - b.top })
      setCur(id)
    },
    release(it) { if (!auto && down?.id === it.id) { setDown(null); activate(it) } },
    cancel() { setDown(null) },
  }

  const latest = useRef()
  latest.current = { visible, at, open, top, activate, backTo, rows }
  useEffect(() => {
    if (auto) return
    const onKey = (e) => {
      const el = root.current
      if (!el || !(el.matches(':hover') || el.contains(document.activeElement)) || e.metaKey || e.ctrlKey) return
      const L = latest.current
      const it = L.visible[L.at]
      const stop = () => { e.preventDefault(); e.stopPropagation() }
      if (e.key === 'ArrowDown') { stop(); setCur(L.visible[mod(L.at + 1, L.visible.length)].id) }
      else if (e.key === 'ArrowUp') { stop(); setCur(L.visible[L.at < 0 ? L.visible.length - 1 : mod(L.at - 1, L.visible.length)].id) }
      else if ((e.key === 'Enter' || e.key === ' ') && it) { stop(); L.activate(it) }
      else if (e.key === 'ArrowRight' && it && (it.to || (it.sub && L.open !== it.id))) { stop(); L.activate(it) }
      else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        if (it?.sub && L.open === it.id) { stop(); setOpen(null) }
        else if (L.open && L.rows.find((r) => r.id === L.open)?.sub.some((s) => s.id === it?.id)) { stop(); setCur(L.open); setOpen(null) }
        else if (L.top.page) { stop(); L.backTo() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [auto])

  /* wall: it runs itself */
  useEffect(() => {
    if (!auto) return
    let k = offset
    const t = setInterval(() => {
      const L = latest.current
      if (L.top.page) { if (k++ % 3 === 2) L.backTo(); else setCur(L.visible[mod(L.at + 1, L.visible.length)].id); return }
      const i = mod(L.at + 1, L.visible.length)
      const it = L.visible[L.at]
      if (it?.to && k % 2) { k++; L.activate(it); return }
      if (it?.sub) L.activate(it)
      k++
      setCur(L.visible[i].id)
    }, 900 + offset * 40)
    return () => clearInterval(t)
  }, [auto, offset])

  const renderRows = (list, live) => {
    let idx = -1
    const dist = () => { idx += 1; return live && at >= 0 ? idx - at : 9 }
    return list.map((it) => {
      const d = dist()
      return (
        <div key={it.id} className="ls-slot">
          <Row item={it} d={d} depth={0} m={m} active={live && cur === it.id} pressed={live && down?.id === it.id} open={open === it.id} />
          {it.sub && (
            <div className={`ls-fold ${open === it.id ? 'on' : ''}`} inert={open === it.id ? undefined : ''}>
              <div className="ls-fold-in">
                {it.sub.map((s, si) => {
                  const shown = open === it.id
                  const sd = shown ? dist() : 9
                  return <div key={s.id} style={{ '--si': si }} className="ls-fold-row"><Row item={s} d={sd} depth={1} m={m} active={live && cur === s.id} pressed={live && down?.id === s.id} /></div>
                })}
              </div>
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className={`ls ${cls}`} ref={root} tabIndex={auto ? -1 : 0} role="tree" aria-label={label}>
      {layers.map((l, i) => {
        const live = i === layers.length - 1
        const p = l.page && items.find((x) => x.id === l.page)
        return (
          <div key={l.key} className={`ls-layer ${live ? 'in' : 'out'}`} style={{ '--dir': l.dir }} aria-hidden={!live || undefined}>
            <div className="ls-head">
              {p && <button type="button" className="ls-back" tabIndex={-1} onClick={live ? backTo : undefined} aria-label="Back">{ICON.back}</button>}
              <h3>{p ? p.title : title}</h3>
            </div>
            <div className="ls-rows">{renderRows(p ? p.to : items, live)}</div>
          </div>
        )
      })}
    </div>
  )
}

/* ----- SERENE · Still Water: a library of quiet sounds. Each row fills slowly with water from below; a press drops a ripple ----- */
const thumb = (a, b) => `linear-gradient(160deg, ${a}, ${b})`
const TIMER = ['Off', '30 min', '1 hour']
const water = (n, tick) => ({
  title: 'Still Water',
  items: [
    { id: 'fog', title: 'Morning Fog', line: 'Field recording', left: { thumb: thumb('#d9e6df', '#8fb3a8') }, text: '42 min', to: [
      { id: 'fog1', title: 'First Light', line: 'Part one', left: { icon: ICON.moon }, text: '14 min' },
      { id: 'fog2', title: 'Over the Reeds', line: 'Part two', left: { icon: ICON.moon }, text: '16 min' },
      { id: 'fog3', title: 'Burning Off', line: 'Part three', left: { icon: ICON.moon }, text: '12 min' },
    ] },
    { id: 'ines', title: 'Ines Moreau', line: 'Slow cello', left: { avatar: 'IM', c: '#5f8279' }, text: '12 pieces', to: [
      { id: 'ines1', title: 'Low Tide', text: '6 min' },
      { id: 'ines2', title: 'Long Bow', text: '9 min' },
      { id: 'ines3', title: 'Evening, Again', text: '7 min' },
    ] },
    { id: 'rain', title: 'Rain', line: 'Three kinds', left: { icon: ICON.rain }, sub: [
      { id: 'rain1', title: 'Light Rain', text: '20 min' },
      { id: 'rain2', title: 'On a Tin Roof', text: '35 min' },
      { id: 'rain3', title: 'Distant Thunder', text: '1 hr' },
    ] },
    { id: 'saved', title: 'Saved for Tonight', left: { icon: ICON.cloud }, text: '3', right: ICON.mark },
    { id: 'timer', title: 'Sleep Timer', text: TIMER[n % 3], act: tick },
  ],
})

/* ----- MONUMENTAL · The Index: an archive set like carved lettering. The chosen name swells, its neighbors give way, and a slab slides under it ----- */
const index = (n, tick) => ({
  title: 'The Index',
  items: [
    { id: 'pantheon', title: 'Pantheon', text: '126 AD', to: [
      { id: 'pa1', title: 'Oculus', text: '8.9 m' },
      { id: 'pa2', title: 'Dome', text: '43.3 m' },
      { id: 'pa3', title: 'Portico', text: '16 columns' },
    ] },
    { id: 'wall', title: 'Great Wall', line: 'China · 21,196 km', left: { thumb: thumb('#b9b1a3', '#57524a') }, text: '220 BC', to: [
      { id: 'wa1', title: 'Badaling', text: 'Restored' },
      { id: 'wa2', title: 'Jinshanling', text: 'Weathered' },
      { id: 'wa3', title: 'Gubeikou', text: 'Wild' },
    ] },
    { id: 'ando', title: 'Tadao Ando', line: 'Architect', left: { avatar: 'TA', c: '#1a1815' }, right: ICON.pillar, to: [
      { id: 'an1', title: 'Church of the Light', text: '1989' },
      { id: 'an2', title: 'Water Temple', text: '1991' },
      { id: 'an3', title: 'Chichu Art Museum', text: '2004' },
    ] },
    { id: 'wonders', title: 'Wonders', left: { icon: ICON.arch }, text: '3', sub: [
      { id: 'wo1', title: 'Giza', text: '2560 BC' },
      { id: 'wo2', title: 'Petra', text: '312 BC' },
      { id: 'wo3', title: 'Machu Picchu', text: '1450' },
    ] },
    { id: 'kept', title: 'Kept', left: { icon: ICON.mark }, text: n % 2 ? 'Saved' : 'Save', act: tick },
  ],
})

const WaterSet = ({ auto, offset }) => <ListSet build={water} label="Quiet sounds" cls="ls-water" auto={auto} offset={offset} />
const IndexSet = ({ auto, offset }) => <ListSet build={index} label="Archive of structures" cls="ls-index" auto={auto} offset={offset} />

/* ================= page ================= */
const SETS = [
  { id: 'water', tone: 'Serene, Still Water', Body: WaterSet },
  { id: 'index', tone: 'Monumental, The Index', Body: IndexSet },
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

/* wall (home page hover background): the lists operating themselves, repeated to fill the screen */
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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 620)), rows: Math.ceil(window.innerHeight / 560) + 1 }))
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
        <h1>Lists</h1>
        <p>Week 5 · Advanced Interface</p>
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
