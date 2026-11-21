import { useEffect, useRef, useState } from 'react'

/* ================= KINETIC · The Reel =================
   Two ideas combined: a curved ruler at the left edge whose major ticks carry the category headers and roll along the arc (the middle one is the current category),
   and a word drum beside it where that category's items roll past a fixed arrow: the chosen word is white and sharp, its neighbours tilt away, grey and blurred.
   Collapsed, only the ruler stays, with icons on its ticks. The tab bar is the same reel laid flat. */
const li = (d, w = 1.5) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.map((p, i) => <path key={i} d={p} />)}</svg>
)
const IC = {
  file: ['M5 3h6.500L15 6.500V17H5z', 'M11.500 3v3.500H15'], hash: ['M7.500 3.500L6 16.500', 'M14 3.500L12.500 16.500', 'M3.500 7.500h13', 'M3 12.500h13'],
  tasks: ['M8.500 5.500h8', 'M8.500 10h8', 'M8.500 14.500h8', 'M3.500 5.500l1 1 2-2', 'M3.500 10l1 1 2-2', 'M3.500 14.500l1 1 2-2'],
  globe: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M3 10h14', 'M10 3c2 2 3 4.500 3 7s-1 5-3 7c-2-2-3-4.500-3-7s1-5 3-7z'],
  grid: ['M3.500 3.500h5v5h-5z', 'M11.500 3.500h5v5h-5z', 'M3.500 11.500h5v5h-5z', 'M11.500 11.500h5v5h-5z'],
  gear: ['M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M10 2.500v2', 'M10 15.500v2', 'M2.500 10h2', 'M15.500 10h2', 'M4.700 4.700l1.400 1.400', 'M13.900 13.900l1.400 1.400', 'M4.700 15.300l1.400-1.400', 'M13.900 6.100l1.400-1.400'],
  user: ['M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M4.500 17a5.500 5.500 0 0 1 11 0'],
  out: ['M8 4H4v12h12v-4', 'M11 3h6v6', 'M17 3l-7 7'], side: ['M3.500 4h13v12h-13z', 'M8 4v12'],
}
export const REEL = [
  { id: 'docs', icon: IC.file, name: 'Docs', items: [
    { label: 'projects', icon: IC.file, slot: { type: 'badge', v: '3' } }, { label: 'notes', icon: IC.file, slot: { type: 'text', v: 'today' } },
    { label: 'marketing', icon: IC.file, slot: { type: 'icon' } }, { label: 'roadmap', icon: IC.file, slot: { type: 'text', v: 'Q4' } }, { label: 'reviews', icon: IC.file } ] },
  { id: 'chat', icon: IC.hash, name: 'Chat', items: [
    { label: 'design', icon: IC.hash, slot: { type: 'badge', v: '12' } }, { label: 'engineering', icon: IC.hash, slot: { type: 'text', v: '2m' } },
    { label: 'launch', icon: IC.hash, slot: { type: 'icon' } }, { label: 'random', icon: IC.hash } ] },
  { id: 'tasks', icon: IC.tasks, name: 'Tasks', items: [
    { label: 'today', icon: IC.tasks, slot: { type: 'badge', v: '5' } }, { label: 'upcoming', icon: IC.tasks, slot: { type: 'text', v: '8' } },
    { label: 'done', icon: IC.tasks, slot: { type: 'text', v: '41' } }, { label: 'someday', icon: IC.tasks } ] },
  { id: 'browse', icon: IC.globe, name: 'Browse', items: [
    { label: 'search', icon: IC.globe }, { label: 'recent', icon: IC.globe, slot: { type: 'text', v: '9' } },
    { label: 'starred', icon: IC.globe, slot: { type: 'badge', v: '2' } }, { label: 'shared', icon: IC.globe, slot: { type: 'icon' } } ] },
  { id: 'spaces', icon: IC.grid, name: 'Spaces', items: [
    { label: 'studio', icon: IC.grid }, { label: 'campaigns', icon: IC.grid, slot: { type: 'badge', v: '1' } }, { label: 'archive', icon: IC.grid, slot: { type: 'text', v: '120' } } ] },
  { id: 'settings', icon: IC.gear, name: 'Settings', items: [
    { label: 'profile', icon: IC.user }, { label: 'alerts', icon: IC.gear, slot: { type: 'badge', v: '4' } }, { label: 'billing', icon: IC.gear, slot: { type: 'text', v: 'pro' } } ] },
  { id: 'people', icon: IC.user, name: 'People', items: [
    { label: 'team', icon: IC.user, slot: { type: 'text', v: '14' } }, { label: 'guests', icon: IC.user, slot: { type: 'text', v: '3' } }, { label: 'invite', icon: IC.user, slot: { type: 'icon' } } ] },
]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
// the ruler: an arc whose centre sits off the left edge; 3° between ticks, a header on every fifth
const R = 360, CY = 240, MAJOR = 15, MINOR = 3
const ROW = 60 // the drum: one word every 60, tilting 20° per step

export function Slot({ slot }) {
  if (!slot) return null
  return <span className={`rl-slot is-${slot.type}`}>{slot.type === 'icon' ? li(IC.out) : slot.v}</span>
}
export function ReelWord({ it, className = '', ...rest }) {
  return (
    <button type="button" className={`rl-word ${className}`} {...rest}>
      <span className="rl-ic">{li(it.icon, 1.75)}</span><span className="rl-label">{it.label}</span><Slot slot={it.slot} />
    </button>
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

export function Reel({ still, collapsed: colProp, cat: c0 = 0, act: a0 = 0, sections = REEL, onStatus, label = 'Workspace' }) {
  const [cat, setCat] = useState(c0)
  const [act, setAct] = useState(a0)
  const [col, setCol] = useState(!!colProp)
  const [opened, setOpened] = useState(null)
  const C = sections[cat]
  const n = C.items.length
  const goCat = (i) => { const j = clamp(i, 0, sections.length - 1); if (j !== cat) { setCat(j); setAct(0); setOpened(null) } }
  const goItem = (i) => { setAct(clamp(i, 0, Math.max(0, n - 1))); setOpened(null) }
  useEffect(() => { onStatus?.(n ? `${C.name} · ${C.items[act].label}${opened != null ? ' · opened' : ''}` : `${C.name} · empty`) }, [cat, act, opened]) // eslint-disable-line react-hooks/exhaustive-deps

  const ruler = useRef(null), drum = useRef(null)
  const rw = useNotches((d) => goCat(cat + d)), dw = useNotches((d) => goItem(act + d))
  useWheel(ruler, rw, still)
  useWheel(drum, dw, still)
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
    <nav className={`rl ${col ? 'is-col' : ''}`} aria-label={`${label}, ← → change section, ↑ ↓ move through it`} tabIndex={still ? -1 : 0} onKeyDown={still ? undefined : keys}>
      <button type="button" className="rl-fold" tabIndex={still ? -1 : 0} aria-label={col ? 'Expand the sidebar' : 'Collapse the sidebar'} aria-expanded={!col} onClick={() => !still && setCol((c) => !c)}>
        {li(IC.side)}<span>{col ? '' : label}</span>
      </button>
      <div className="rl-ruler" ref={ruler} {...rulerDrag}>
        <div className="rl-arc" style={{ transform: `rotate(${turn}deg)` }}>
          {ticks.map((a) => {
            const major = a % MAJOR === 0 && a >= 0 && a / MAJOR < sections.length
            const off = Math.abs(a + turn)
            return <i key={a} className={`rl-tick ${major ? 'is-major' : ''}`} style={{ transform: `rotate(${a}deg) translateX(${R - (major ? 22 : 12)}px)`, opacity: Math.max(0.08, 1 - off / 70) }} />
          })}
          {sections.map((s, i) => {
            const d = i - cat
            return (
              <button key={s.id} type="button" tabIndex={-1} className={`rl-head ${d === 0 ? 'is-sel' : ''}`} aria-current={d === 0 ? 'true' : undefined} aria-label={s.name}
                style={{ transform: `rotate(${i * MAJOR}deg) translateX(${R - 34}px) translate(-100%, -50%)`, opacity: Math.max(0, 1 - Math.abs(d) * 0.22) }} onClick={() => !still && goCat(i)}>
                <span className="rl-head-t">{s.name}</span><span className="rl-head-i">{li(s.icon, d === 0 ? 2 : 1.5)}</span>
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
            const d = i - act
            return (
              <ReelWord key={it.label} it={it} tabIndex={-1} aria-current={d === 0 ? 'page' : undefined}
                className={`${d === 0 ? 'is-sel' : ''} ${opened === i ? 'is-open' : ''}`}
                style={{ '--d': d, '--ad': Math.abs(d), '--k': i, transform: `translateY(${d * ROW}px) rotateX(${-d * 20}deg)`, opacity: Math.max(0, 1 - Math.abs(d) * 0.3), filter: d ? `blur(${Math.min(3, Math.abs(d) * 1.2)}px)` : 'none' }}
                onClick={() => { if (still) return; if (d === 0) setOpened(i); else goItem(i) }} />
            )
          })}
        </div>
      </div>
    </nav>
  )
}

// the tab bar: the same reel laid flat; tabs roll sideways over a straight ruler under a fixed arrow
const GAP = 150
export function ReelTab({ c, sel, className = '', ...rest }) {
  const badge = c.items[0]?.slot?.type === 'badge' ? c.items[0].slot.v : null
  return (
    <button type="button" role="tab" aria-selected={sel} tabIndex={-1} className={`rl-tab ${sel ? 'is-sel' : ''} ${className}`} {...rest}>
      <span className="rl-ic">{li(c.icon, sel ? 2 : 1.75)}</span><span className="rl-label">{c.name}</span>{badge && <i className="rl-slot is-badge">{badge}</i>}
    </button>
  )
}
export function ReelBar({ still, value: v0 = 0, items = REEL, onStatus }) {
  const [v, setV] = useState(v0)
  const ref = useRef(null)
  const go = (i) => setV(clamp(i, 0, items.length - 1))
  const w = useNotches((d) => go(v + d))
  useWheel(ref, w, still)
  const drag = useDragSteps('x', GAP * 0.45, (d) => go(v + d), still)
  useEffect(() => { onStatus?.(items[v].name) }, [v]) // eslint-disable-line react-hooks/exhaustive-deps
  const ticks = Array.from({ length: (items.length + 6) * 10 + 1 }, (_, i) => i - 30)
  return (
    <div className="rl-bar" ref={ref} role="tablist" aria-label="Reel tab bar, ← → roll" tabIndex={still ? -1 : 0} {...drag}
      onKeyDown={still ? undefined : (e) => { const k = { ArrowLeft: v - 1, ArrowRight: v + 1, Home: 0, End: items.length - 1 }[e.key]; if (k !== undefined) { e.preventDefault(); go(k) } else if (/^[1-9]$/.test(e.key)) go(+e.key - 1) }}>
      <span className="rl-down" aria-hidden="true">↓</span>
      <div className="rl-track" style={{ transform: `translateX(${-v * GAP}px)` }}>
        {items.map((c, i) => {
          const d = i - v
          return <ReelTab key={c.id} c={c} sel={d === 0} style={{ left: i * GAP, opacity: Math.max(0, 1 - Math.abs(d) * 0.3), filter: d ? `blur(${Math.min(3, Math.abs(d) * 1.1)}px)` : 'none' }} onClick={() => !still && go(i)} />
        })}
        <div className="rl-rule" aria-hidden="true">
          {ticks.map((t) => <i key={t} className={t % 10 === 0 ? 'is-major' : ''} style={{ left: t * (GAP / 10) }} />)}
        </div>
      </div>
    </div>
  )
}

export function ReelSet({ auto }) {
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  return (
    <div className="ex nv-ex">
      <div className="nv-part">
        <h3 className="group-k">Sidebar · roll the words, roll the ruler</h3>
        <div className="rl-stage"><Reel onStatus={setS1} still={auto} cat={2} act={1} /></div>
        {!auto && <p className="tb-status" aria-live="polite">{s1}</p>}
      </div>
      <div className="nv-part">
        <h3 className="group-k">Tab bar · the reel laid flat</h3>
        <div className="rl-stage is-bar"><ReelBar onStatus={setS2} still={auto} value={2} /></div>
        {!auto && <p className="tb-status" aria-live="polite">{s2}</p>}
      </div>
    </div>
  )
}
