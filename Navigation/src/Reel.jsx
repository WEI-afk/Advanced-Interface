import { useEffect, useRef, useState } from 'react'

/* ================= KINETIC · The Reel =================
   A photo journal. A curved ruler at the left edge carries the months on its major ticks, and the middle one is the month you are in.
   Beside it, that month's albums roll past a fixed arrow as big words.
   At rest it says as little as it can: the month, the album, the arrow. Point at it (or focus it) and the reel opens: every month on the ruler,
   the neighbouring albums sharpen, slots appear, and the chosen album unfolds its date, place, count and a strip of photos.
   Collapsed, only the ruler stays, with icons on its ticks. The tab bar is the same reel laid flat. */
const li = (d, w = 1.5) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.map((p, i) => <path key={i} d={p} />)}</svg>
)
const IC = {
  photo: ['M3 5h14v10H3z', 'M3 13l4-4 3 3 2-2 5 5', 'M13.500 8.500h.010'],
  pin: ['M10 17s5-4.500 5-8.500a5 5 0 0 0-10 0c0 4 5 8.500 5 8.500z', 'M10 10a1.500 1.500 0 1 0 0-3 1.500 1.500 0 0 0 0 3z'],
  star: ['M10 3l2.100 4.300 4.700.700-3.400 3.300.800 4.700L10 13.800 5.800 16l.800-4.700L3.200 8l4.700-.700z'],
  video: ['M3 5.500h10v9H3z', 'M13 8.500l4-2.500v8l-4-2.500'],
  users: ['M7.500 9a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z', 'M2.500 16a5 5 0 0 1 10 0', 'M13 4.200a2.500 2.500 0 0 1 0 4.600', 'M14.500 11.500a5 5 0 0 1 3 4.500'],
  heart: ['M10 16s-6-3.600-6-8a3.200 3.200 0 0 1 6-1.600A3.200 3.200 0 0 1 16 8c0 4.400-6 8-6 8z'],
  grid: ['M3.500 3.500h5v5h-5z', 'M11.500 3.500h5v5h-5z', 'M3.500 11.500h5v5h-5z', 'M11.500 11.500h5v5h-5z'],
  sun: ['M10 6.500a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7z', 'M10 2v1.500', 'M10 16.500V18', 'M2 10h1.500', 'M16.500 10H18', 'M4.300 4.300l1.100 1.100', 'M14.600 14.600l1.100 1.100', 'M4.300 15.700l1.100-1.100', 'M14.600 5.400l1.100-1.100'],
  leaf: ['M4 16c0-7 4-11 12-12-1 8-5 12-12 12z', 'M4 16l7-7'], snow: ['M10 2v16', 'M3 6l14 8', 'M3 14l14-8'],
  out: ['M8 4H4v12h12v-4', 'M11 3h6v6', 'M17 3l-7 7'], side: ['M3.500 4h13v12h-13z', 'M8 4v12'],
}
const A = (label, icon, hue, meta, slot) => ({ label, icon, hue, meta, slot })
export const REEL = [
  { id: 'jun', icon: IC.sun, name: 'June', items: [
    A('graduation', IC.star, 42, 'Jun 6 · ArtCenter, Pasadena · 186 photos', { type: 'text', v: '186' }), A('first apartment', IC.photo, 28, 'Jun 14–15 · Highland Park · 64 photos', { type: 'icon', v: 'shared' }), A('beach day', IC.sun, 196, 'Jun 28 · El Matador · 92 photos') ] },
  { id: 'jul', icon: IC.sun, name: 'July', items: [
    A('lisbon', IC.pin, 18, 'Jul 12–18 · Lisbon, PT · 214 photos, 12 new', { type: 'badge', v: '12' }), A('tile hunting', IC.photo, 210, 'Jul 14 · Alfama · 58 photos', { type: 'text', v: '58' }),
    A('fado night', IC.video, 268, 'Jul 16 · Bairro Alto · 9 videos', { type: 'text', v: '9' }), A('train home', IC.photo, 160, 'Jul 18 · Lisbon → Porto · 31 photos') ] },
  { id: 'aug', icon: IC.sun, name: 'August', items: [
    A('studio move', IC.grid, 32, 'Aug 3 · Arts District · 77 photos', { type: 'text', v: '77' }), A('heatwave', IC.sun, 8, 'Aug 9–12 · Los Angeles · 23 photos'), A('grandma 90', IC.heart, 340, 'Aug 24 · Taipei · 301 photos, 4 new', { type: 'badge', v: '4' }) ] },
  { id: 'sep', icon: IC.leaf, name: 'September', items: [
    A('first crit', IC.star, 220, 'Sep 8 · Room 204 · 18 photos', { type: 'text', v: '18' }), A('night ride', IC.video, 250, 'Sep 19 · Angeles Crest · 6 videos', { type: 'icon', v: 'shared' }), A('type sketches', IC.photo, 50, 'Sep 2–30 · 140 photos', { type: 'text', v: '140' }) ] },
  { id: 'oct', icon: IC.leaf, name: 'October', items: [
    A('pumpkin patch', IC.leaf, 24, 'Oct 11 · Pierce College · 45 photos', { type: 'text', v: '45' }), A('portfolio shoot', IC.photo, 200, 'Oct 18 · Studio B · 260 photos, 30 new', { type: 'badge', v: '30' }),
    A('halloween', IC.users, 280, 'Oct 31 · Echo Park · 88 photos', { type: 'icon', v: 'shared' }), A('first rain', IC.photo, 205, 'Oct 27 · Pasadena · 12 photos') ] },
  { id: 'nov', icon: IC.snow, name: 'November', items: [
    A('museum day', IC.photo, 38, 'Nov 2 · The Broad · 54 photos', { type: 'text', v: '54' }), A('thesis wall', IC.grid, 0, 'Nov 12 · Studio B · 96 photos, 7 new', { type: 'badge', v: '7' }), A('today', IC.star, 186, 'Nov 20 · 14 photos so far', { type: 'text', v: 'now' }) ] },
]
export const TABS = [
  { id: 'library', icon: IC.photo, name: 'Library', meta: '4,812 photos · 53 new', badge: '53' },
  { id: 'memories', icon: IC.heart, name: 'Memories', meta: 'A year ago today: Kyoto' },
  { id: 'albums', icon: IC.grid, name: 'Albums', meta: '18 albums · 3 shared' },
  { id: 'map', icon: IC.pin, name: 'Map', meta: '41 places in 6 countries' },
  { id: 'shared', icon: IC.users, name: 'Shared', meta: '2 invites waiting', badge: '2' },
]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
// the ruler: an arc whose centre sits off the left edge; 3° between ticks, a month on every fifth
const R = 360, MAJOR = 15, MINOR = 3
const ROW = 60, OPEN = 84 // the drum: one word every 60; when the reel opens, the words below the chosen one make 84 of room for its detail

export function Slot({ slot }) {
  if (!slot) return null
  return <span className={`rl-slot is-${slot.type}`} title={slot.type === 'icon' ? slot.v : undefined}>{slot.type === 'icon' ? li(IC.users) : slot.v}</span>
}
export function ReelWord({ it, className = '', ...rest }) {
  return (
    <button type="button" className={`rl-word ${className}`} title={it.label.length > 14 ? it.label : undefined} {...rest}>
      <span className="rl-ic">{li(it.icon, 1.75)}</span><span className="rl-label">{it.label}</span><Slot slot={it.slot} />
    </button>
  )
}
// the photos the chosen album unfolds: three tiles and the rest as a count
const Thumbs = ({ it }) => {
  const n = +(it.meta.match(/(\d[\d,]*) (photos|videos)/)?.[1] || '0').replace(',', '')
  return (
    <span className="rl-thumbs" aria-hidden="true">
      {[0, 1, 2].map((k) => <i key={k} style={{ '--h': it.hue + k * 24, '--k': k }} />)}
      {n > 3 && <b style={{ '--k': 3 }}>+{n - 3}</b>}
    </span>
  )
}

// one step per notch of scrolling, however fine the trackpad
function useNotches(fn) {
  const acc = useRef(0)
  return (e) => {
    e.preventDefault()
    acc.current += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
    if (Math.abs(acc.current) >= 40) { fn(Math.sign(acc.current)); acc.current = 0 }
  }
}
function useWheel(ref, fn, off) {
  const f = useRef(fn); f.current = fn
  useEffect(() => {
    const el = ref.current
    if (off || !el) return
    const h = (e) => f.current(e)
    el.addEventListener('wheel', h, { passive: false })
    return () => el.removeEventListener('wheel', h)
  }, [off]) // eslint-disable-line react-hooks/exhaustive-deps
}
// dragging moves one step per `step` px along the axis
function useDragSteps(axis, step, fn, off) {
  const d = useRef(null)
  return off ? {} : {
    onPointerDown: (e) => { if (e.button === 0) d.current = { p: axis === 'y' ? e.clientY : e.clientX, moved: false } },
    onPointerMove: (e) => {
      const D = d.current
      if (!D) return
      const p = axis === 'y' ? e.clientY : e.clientX
      if (Math.abs(p - D.p) >= step) { fn(p < D.p ? 1 : -1); D.p = p; D.moved = true; e.currentTarget.setPointerCapture?.(e.pointerId) }
    },
    onPointerUp: () => { d.current = null },
    onPointerCancel: () => { d.current = null },
    onClickCapture: (e) => { if (d.current?.moved) e.stopPropagation() },
  }
}
// at rest or engaged: pointing at it or focusing it opens the detail; it closes 400 ms after you leave (2.5 s after a touch), so passing through never flickers
function useEngaged(forced) {
  const [hot, setHot] = useState(false)
  const t = useRef(0)
  useEffect(() => () => clearTimeout(t.current), [])
  const on = () => { clearTimeout(t.current); setHot(true) }
  const off = (ms) => { clearTimeout(t.current); t.current = setTimeout(() => setHot(false), ms) }
  const props = forced !== undefined ? {} : {
    onPointerEnter: on,
    onPointerLeave: (e) => off(e.pointerType === 'touch' ? 2500 : 400),
    onFocus: on,
    onBlur: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) off(0) },
  }
  return [forced ?? hot, props]
}

export function Reel({ still, live: liveProp, collapsed: colProp, cat: c0 = 0, act: a0 = 0, sections = REEL, onStatus, label = 'Journal 2026' }) {
  const [cat, setCat] = useState(c0)
  const [act, setAct] = useState(a0)
  const [opened, setOpened] = useState(null)
  const [live, engage] = useEngaged(liveProp)
  const col = colProp ?? !live // at rest it is folded into the handle; pointing at it (or focusing it) opens it
  const C = sections[cat]
  const n = C.items.length
  const goCat = (i) => { const j = clamp(i, 0, sections.length - 1); if (j !== cat) { setCat(j); setAct(0); setOpened(null) } }
  const goItem = (i) => { setAct(clamp(i, 0, Math.max(0, n - 1))); setOpened(null) }
  useEffect(() => { onStatus?.(n ? `${C.name} · ${C.items[act].label} · ${C.items[act].meta}${opened != null ? ' · opened' : ''}` : `${C.name} · no albums yet`) }, [cat, act, opened]) // eslint-disable-line react-hooks/exhaustive-deps

  const ruler = useRef(null), drum = useRef(null), nub = useRef(null)
  const rw = useNotches((d) => goCat(cat + d)), dw = useNotches((d) => goItem(act + d))
  useWheel(ruler, rw, still)
  useWheel(drum, dw, still)
  useWheel(nub, (e) => { if (col) rw(e) }, still) // folded, scrolling the handle still changes the month
  const rulerDrag = useDragSteps('y', 44, (d) => goCat(cat + d), still)
  const drumDrag = useDragSteps('y', ROW * 0.6, (d) => goItem(act + d), still)

  const typed = useRef({ s: '', t: 0 })
  const keys = (e) => {
    const map = { ArrowUp: () => goItem(act - 1), k: () => goItem(act - 1), ArrowDown: () => goItem(act + 1), j: () => goItem(act + 1), ArrowLeft: () => goCat(cat - 1), ArrowRight: () => goCat(cat + 1), Home: () => goItem(0), End: () => goItem(n - 1), Enter: () => n && setOpened(act) }
    if (map[e.key]) { e.preventDefault(); map[e.key](); return }
    if (/^[a-z]$/i.test(e.key) && !e.metaKey && !e.ctrlKey) { // type a word to jump to it
      const T = typed.current, now = Date.now()
      T.s = (now - T.t < 700 ? T.s : '') + e.key.toLowerCase(); T.t = now
      const i = C.items.findIndex((it) => it.label.startsWith(T.s))
      if (i >= 0) goItem(i)
    }
  }

  const ticks = []
  for (let a = -90; a <= (sections.length - 1) * MAJOR + 90; a += MINOR) ticks.push(a)
  const turn = -cat * MAJOR
  return (
    <nav className={`rl ${col ? 'is-col' : ''} ${live ? 'is-live' : ''}`} aria-label={`${label}, ${C.name}${n ? `, ${C.items[act].label}` : ''}. Focus to open; ← → change month, ↑ ↓ move through its albums`} aria-expanded={!col} tabIndex={still ? -1 : 0} onKeyDown={still ? undefined : keys} {...(still ? {} : engage)}>
      {/* the handle: a half-circle on the left edge at the middle line; the whole reel shrinks into it, and it grows back out of it */}
      <span className="rl-nub" ref={nub} title={col ? `${C.name}${n ? ` · ${C.items[act].label}` : ''}` : undefined} aria-hidden="true">
        <svg className="rl-nub-ticks" viewBox="0 -48 48 96">
          {Array.from({ length: 13 }, (_, k) => { const a = (-90 + k * 15) * Math.PI / 180, r0 = k === 6 ? 33 : 37; return <line key={k} className={k === 6 ? 'is-major' : ''} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * 42} y2={Math.sin(a) * 42} /> })}
        </svg>
        <span className="rl-nub-in">{li(C.icon, 1.75)}</span>
      </span>
      <div className="rl-ruler" ref={ruler} {...rulerDrag}>
        <div className="rl-arc" style={{ transform: `rotate(${turn}deg)` }}>
          {ticks.map((a) => {
            const major = a % MAJOR === 0 && a >= 0 && a / MAJOR < sections.length
            const off = Math.abs(a + turn)
            return <i key={a} className={`rl-tick ${major ? 'is-major' : ''}`} style={{ transform: `rotate(${a}deg) translateX(${R - (major ? 22 : 12)}px)`, opacity: Math.max(0.06, (live ? 1 : 0.55) - off / (live ? 70 : 40)) }} />
          })}
          {sections.map((s, i) => {
            const d = i - cat
            return (
              <button key={s.id} type="button" tabIndex={-1} className={`rl-head ${d === 0 ? 'is-sel' : ''}`} aria-current={d === 0 ? 'true' : undefined} aria-label={s.name}
                style={{ transform: `rotate(${i * MAJOR}deg) translateX(${R - 34}px) translate(-100%, -50%)`, opacity: d === 0 ? 1 : live ? Math.max(0, 1 - Math.abs(d) * 0.2) : 0, transitionDelay: live && d ? `${Math.abs(d) * 30}ms` : '0ms' }}
                onClick={() => !still && goCat(i)}>
                <span className="rl-head-t">{s.name}<em>{s.items.length}</em></span><span className="rl-head-i">{li(s.icon, d === 0 ? 2 : 1.5)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="rl-drum" ref={drum} {...drumDrag}>
        <span className="rl-arrow" aria-hidden="true">→</span>
        <div className="rl-words" key={C.id}>
          {n === 0 && <p className="rl-empty">no albums yet</p>}
          {C.items.map((it, i) => {
            const d = i - act, ad = Math.abs(d)
            const y = d * ROW + (live && d > 0 ? OPEN : 0)
            return (
              <ReelWord key={it.label} it={it} tabIndex={-1} aria-current={d === 0 ? 'page' : undefined}
                className={`${d === 0 ? 'is-sel' : ''} ${opened === i ? 'is-open' : ''}`}
                style={{ transform: `translateY(${y}px) rotateX(${-d * 20}deg)`, opacity: d === 0 ? 1 : live ? Math.max(0, 1 - ad * 0.28) : Math.max(0, 0.16 - (ad - 1) * 0.08), '--blur': `${d ? Math.min(4, ad * (live ? 1.2 : 2.5)) : 0}px` }}
                onClick={() => { if (still) return; if (d === 0) setOpened(i); else goItem(i) }} />
            )
          })}
          {n > 0 && (
            <div className="rl-detail" key={act} aria-hidden={!live}>
              <p>{C.items[act].meta}</p>
              <Thumbs it={C.items[act]} />
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

// the tab bar: the same reel laid flat; at rest only the chosen tab reads, engaged the others and the caption come in
const GAP = 160
export function ReelTab({ c, sel, className = '', ...rest }) {
  return (
    <button type="button" role="tab" aria-selected={sel} tabIndex={-1} className={`rl-tab ${sel ? 'is-sel' : ''} ${className}`} {...rest}>
      <span className="rl-ic">{li(c.icon, sel ? 2 : 1.75)}</span><span className="rl-label">{c.name}</span>{c.badge && <i className="rl-slot is-badge">{c.badge}</i>}
    </button>
  )
}
export function ReelBar({ still, live: liveProp, value: v0 = 0, items = TABS, onStatus }) {
  const [v, setV] = useState(v0)
  const [live, engage] = useEngaged(liveProp)
  const ref = useRef(null)
  const go = (i) => setV(clamp(i, 0, items.length - 1))
  const w = useNotches((d) => go(v + d))
  useWheel(ref, w, still)
  const drag = useDragSteps('x', GAP * 0.45, (d) => go(v + d), still)
  useEffect(() => { onStatus?.(`${items[v].name} · ${items[v].meta}`) }, [v]) // eslint-disable-line react-hooks/exhaustive-deps
  const ticks = Array.from({ length: (items.length + 6) * 10 + 1 }, (_, i) => i - 30)
  return (
    <div className={`rl-bar ${live ? 'is-live' : ''}`} ref={ref} role="tablist" aria-label="Photos tab bar, ← → roll" tabIndex={still ? -1 : 0} {...drag} {...(still ? {} : engage)}
      onKeyDown={still ? undefined : (e) => { const k = { ArrowLeft: v - 1, ArrowRight: v + 1, Home: 0, End: items.length - 1 }[e.key]; if (k !== undefined) { e.preventDefault(); go(k) } else if (/^[1-9]$/.test(e.key)) go(+e.key - 1) }}>
      <span className="rl-down" aria-hidden="true">↓</span>
      <div className="rl-track" style={{ transform: `translateX(${-v * GAP}px)` }}>
        {items.map((c, i) => {
          const d = i - v, ad = Math.abs(d)
          return <ReelTab key={c.id} c={c} sel={d === 0} style={{ left: i * GAP, opacity: d === 0 ? 1 : live ? Math.max(0, 1 - ad * 0.3) : Math.max(0, 0.2 - (ad - 1) * 0.1), '--blur': `${d ? Math.min(4, ad * (live ? 1 : 2.5)) : 0}px` }} onClick={() => !still && go(i)} />
        })}
        <div className="rl-rule" aria-hidden="true">
          {ticks.map((t) => <i key={t} className={t % 10 === 0 ? 'is-major' : ''} style={{ left: t * (GAP / 10) }} />)}
        </div>
      </div>
      <p className="rl-caption" key={v} aria-hidden={!live}>{items[v].meta}</p>
    </div>
  )
}

export function ReelSet({ auto }) {
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  return (
    <div className="ex nv-ex">
      <div className="nv-part">
        <h3 className="group-k">Sidebar · point at it to open the reel</h3>
        <div className="rl-stage"><Reel onStatus={setS1} still={auto} cat={1} act={0} /></div>
        {!auto && <p className="tb-status" aria-live="polite">{s1}</p>}
      </div>
      <div className="nv-part">
        <h3 className="group-k">Tab bar · the reel laid flat</h3>
        <div className="rl-stage is-bar"><ReelBar onStatus={setS2} still={auto} value={0} /></div>
        {!auto && <p className="tb-status" aria-live="polite">{s2}</p>}
      </div>
    </div>
  )
}
