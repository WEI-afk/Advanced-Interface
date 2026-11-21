import { useEffect, useRef, useState } from 'react'

/* ================= KINETIC · The Reel =================
   A workspace sidebar. A curved ruler at the left edge carries the sections on its major ticks; the middle one is where you are.
   Beside it, that section's pages roll past a fixed arrow as big words.
   At rest it is folded into a half-circle on the left edge. Point at it (or focus it) and the reel grows out: every section on the ruler,
   the neighbouring pages, slots, and the chosen page's fact line and the people in it. The tab bar is the same reel laid flat. */
const li = (d, w = 1.5) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.map((p, i) => <path key={i} d={p} />)}</svg>
)
const IC = {
  file: ['M5 3h6.500L15 6.500V17H5z', 'M11.500 3v3.500H15'], hash: ['M7.500 3.500L6 16.500', 'M14 3.500L12.500 16.500', 'M3.500 7.500h13', 'M3 12.500h13'],
  tasks: ['M8.500 5.500h8', 'M8.500 10h8', 'M8.500 14.500h8', 'M3.500 5.500l1 1 2-2', 'M3.500 10l1 1 2-2', 'M3.500 14.500l1 1 2-2'],
  globe: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M3 10h14', 'M10 3c2 2 3 4.500 3 7s-1 5-3 7c-2-2-3-4.500-3-7s1-5 3-7z'],
  gear: ['M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M10 2.500v2', 'M10 15.500v2', 'M2.500 10h2', 'M15.500 10h2', 'M4.700 4.700l1.400 1.400', 'M13.900 13.900l1.400 1.400', 'M4.700 15.300l1.400-1.400', 'M13.900 6.100l1.400-1.400'],
  user: ['M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M4.500 17a5.500 5.500 0 0 1 11 0'], table: ['M3 4h14v12H3z', 'M3 8h14', 'M3 12h14', 'M8 4v12'],
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
const A = (label, icon, meta, who, slot) => ({ label, icon, meta, who, slot })
export const REEL = [
  { id: 'docs', icon: IC.file, name: 'Docs', items: [
    A('projects', IC.file, '12 docs · edited 5 min ago', ['MK', 'JL', 'AR', 'TS', 'DP'], { type: 'badge', v: '3' }), A('notes', IC.file, 'Standup, Nov 20 · 4 pages', ['MK', 'JL'], { type: 'text', v: 'today' }),
    A('marketing', IC.table, 'Launch plan · shared with Sales', ['SO', 'AR', 'BW'], { type: 'icon', v: 'shared' }), A('roadmap', IC.file, 'Q4 · 9 of 14 shipped', ['DP', 'MK', 'TS'], { type: 'text', v: 'Q4' }), A('reviews', IC.file, '2 waiting for you', ['JL', 'BW']) ] },
  { id: 'chat', icon: IC.hash, name: 'Chat', items: [
    A('design', IC.hash, '12 unread · Maya: “new nav is up”', ['MK', 'JL', 'AR', 'SO', 'TS', 'BW', 'DP'], { type: 'badge', v: '12' }), A('engineering', IC.hash, 'Last message 2 min ago', ['TS', 'DP', 'AR'], { type: 'text', v: '2m' }),
    A('launch', IC.hash, 'Shared with 2 partners', ['SO', 'BW'], { type: 'icon', v: 'shared' }), A('random', IC.hash, 'Quiet since Monday', ['JL']) ] },
  { id: 'tasks', icon: IC.tasks, name: 'Tasks', items: [
    A('today', IC.tasks, '5 due · 2 overdue', ['BW'], { type: 'badge', v: '5' }), A('upcoming', IC.tasks, '8 this week', ['BW', 'MK'], { type: 'text', v: '8' }),
    A('done', IC.tasks, '41 closed in November', ['BW', 'MK', 'JL'], { type: 'text', v: '41' }), A('someday', IC.tasks, '17 ideas parked', ['BW']) ] },
  { id: 'browse', icon: IC.globe, name: 'Browse', items: [
    A('search', IC.globe, 'Press / anywhere', []), A('recent', IC.globe, '9 opened today', ['BW'], { type: 'text', v: '9' }),
    A('starred', IC.globe, '2 updated since you looked', ['MK', 'AR'], { type: 'badge', v: '2' }), A('shared', IC.globe, '23 items from 6 people', ['JL', 'SO', 'TS', 'DP', 'AR', 'MK'], { type: 'icon', v: 'shared' }) ] },
  { id: 'spaces', icon: IC.grid, name: 'Spaces', items: [
    A('studio', IC.grid, '8 members · 40 docs', ['MK', 'JL', 'AR', 'TS', 'DP', 'SO', 'BW', 'KE']), A('campaigns', IC.grid, '1 new request', ['SO', 'AR'], { type: 'badge', v: '1' }), A('archive', IC.grid, '120 items · read only', [], { type: 'text', v: '120' }) ] },
  { id: 'settings', icon: IC.gear, name: 'Settings', items: [
    A('profile', IC.user, 'Ben · Designer', ['BW']), A('alerts', IC.gear, '4 rules · quiet after 7 pm', [], { type: 'badge', v: '4' }), A('billing', IC.gear, 'Pro · renews Dec 1', [], { type: 'text', v: 'pro' }) ] },
  { id: 'people', icon: IC.user, name: 'People', items: [
    A('team', IC.user, '14 members · 6 online', ['MK', 'JL', 'AR', 'TS', 'DP', 'SO', 'KE', 'RN', 'LV', 'CH', 'PA', 'YU', 'IO', 'BW'], { type: 'text', v: '14' }), A('guests', IC.user, '3 guests · 1 expires Friday', ['RN', 'LV', 'CH'], { type: 'text', v: '3' }),
    A('invite', IC.user, 'Send a link or an email', [], { type: 'icon', v: 'link' }) ] },
]
export const TABS = [
  { id: 'home', icon: IC.grid, name: 'Home', meta: '3 things need you' },
  { id: 'inbox', icon: IC.hash, name: 'Inbox', meta: '12 unread · 2 mentions', badge: '12' },
  { id: 'docs', icon: IC.file, name: 'Docs', meta: '12 docs · edited 5 min ago' },
  { id: 'tasks', icon: IC.tasks, name: 'Tasks', meta: '5 due today', badge: '5' },
  { id: 'people', icon: IC.user, name: 'People', meta: '14 members · 6 online' },
]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
// the ruler: an arc whose centre sits off the left edge; 3° between ticks, a month on every fifth
const R = 360, MAJOR = 15, MINOR = 3
const ROW = 60, OPEN = 72 // the drum: one word every 60; when the reel opens, the words below the chosen one make 84 of room for its detail

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
// the people in the chosen item: up to four faces, the rest as a count
const HUE = { MK: 12, JL: 200, AR: 140, TS: 260, DP: 40, SO: 320, BW: 180, KE: 90, RN: 0, LV: 280, CH: 60, PA: 220, YU: 300, IO: 160 }
const Faces = ({ it }) => it.who.length === 0 ? null : (
  <span className="rl-faces" aria-hidden="true">
    {it.who.slice(0, 4).map((w) => <i key={w} style={{ '--h': HUE[w] ?? 0 }}>{w}</i>)}
    {it.who.length > 4 && <b>+{it.who.length - 4}</b>}
  </span>
)

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

export function Reel({ still, live: liveProp, collapsed: colProp, cat: c0 = 0, act: a0 = 0, sections = REEL, onStatus, label = 'Workspace' }) {
  const [cat, setCat] = useState(c0)
  const [act, setAct] = useState(a0)
  const [opened, setOpened] = useState(null)
  const [live, engage] = useEngaged(liveProp)
  const col = colProp ?? !live // at rest it is folded into the handle; pointing at it (or focusing it) opens it
  const C = sections[cat]
  const n = C.items.length
  const goCat = (i) => { const j = clamp(i, 0, sections.length - 1); if (j !== cat) { setCat(j); setAct(0); setOpened(null) } }
  const goItem = (i) => { setAct(clamp(i, 0, Math.max(0, n - 1))); setOpened(null) }
  useEffect(() => { onStatus?.(n ? `${C.name} · ${C.items[act].label} · ${C.items[act].meta}${opened != null ? ' · opened' : ''}` : `${C.name} · nothing here yet`) }, [cat, act, opened]) // eslint-disable-line react-hooks/exhaustive-deps

  const ruler = useRef(null), drum = useRef(null), nub = useRef(null)
  const rw = useNotches((d) => goCat(cat + d)), dw = useNotches((d) => goItem(act + d))
  useWheel(ruler, rw, still)
  useWheel(drum, dw, still)
  useWheel(nub, (e) => { if (col) rw(e) }, still) // folded, scrolling the handle still changes the section
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
    <nav className={`rl ${col ? 'is-col' : ''} ${live ? 'is-live' : ''}`} aria-label={`${label}, ${C.name}${n ? `, ${C.items[act].label}` : ''}. Focus to open; ← → change section, ↑ ↓ move through it`} aria-expanded={!col} tabIndex={still ? -1 : 0} onKeyDown={still ? undefined : keys} {...(still ? {} : engage)}>
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
          {n === 0 && <p className="rl-empty">nothing here yet</p>}
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
              <Faces it={C.items[act]} />
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
    <div className={`rl-bar ${live ? 'is-live' : ''}`} ref={ref} role="tablist" aria-label="Tab bar, ← → roll" tabIndex={still ? -1 : 0} {...drag} {...(still ? {} : engage)}
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
        <div className="rl-stage"><Reel onStatus={setS1} still={auto} cat={6} act={0} /></div>
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
