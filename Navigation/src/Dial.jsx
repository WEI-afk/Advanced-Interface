import { useEffect, useRef, useState } from 'react'

/* ================= FUTURISTIC · Dial =================
   A knob in the middle, a ring of categories that turns around it, and a fixed window at three o'clock that holds the chosen one.
   A line runs from the window to a fanned list of that category's items, which turns like a wheel. Folded, it is only the knob.
   The horizontal version is the same dial seen side-on: tabs roll along an arc under a fixed notch. */
const li = (d, w = 1.5) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.map((p, i) => <path key={i} d={p} />)}</svg>
)
const IC = {
  file: ['M5 3h6.500L15 6.500V17H5z', 'M11.500 3v3.500H15'], hash: ['M7.500 3.500L6 16.500', 'M14 3.500L12.500 16.500', 'M3.500 7.500h13', 'M3 12.500h13'],
  tasks: ['M8.500 5.500h8', 'M8.500 10h8', 'M8.500 14.500h8', 'M3.500 5.500l1 1 2-2', 'M3.500 10l1 1 2-2', 'M3.500 14.500l1 1 2-2'],
  globe: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M3 10h14', 'M10 3c2 2 3 4.500 3 7s-1 5-3 7c-2-2-3-4.500-3-7s1-5 3-7z'],
  grid: ['M3.500 3.500h5v5h-5z', 'M11.500 3.500h5v5h-5z', 'M3.500 11.500h5v5h-5z', 'M11.500 11.500h5v5h-5z'],
  gear: ['M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M10 2.500v2', 'M10 15.500v2', 'M2.500 10h2', 'M15.500 10h2', 'M4.700 4.700l1.400 1.400', 'M13.900 13.900l1.400 1.400', 'M4.700 15.300l1.400-1.400', 'M13.900 6.100l1.400-1.400'],
  user: ['M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M4.500 17a5.500 5.500 0 0 1 11 0'], table: ['M3 4h14v12H3z', 'M3 8h14', 'M3 12h14', 'M8 4v12'],
  menu: ['M5 7h10', 'M5 10h10', 'M5 13h10'], out: ['M8 4H4v12h12v-4', 'M11 3h6v6', 'M17 3l-7 7'],
}
export const DIAL = [
  { id: 'docs', icon: IC.file, name: 'Docs', items: [
    { label: 'Project management', icon: IC.file, slot: { type: 'badge', v: '3' } }, { label: 'Meeting notes', icon: IC.file, slot: { type: 'text', v: 'Today' } },
    { label: 'Sale marketing', icon: IC.table, slot: { type: 'icon' } }, { label: 'Roadmap', icon: IC.file, slot: { type: 'text', v: 'Q4' } }, { label: 'Design review', icon: IC.file } ] },
  { id: 'chat', icon: IC.hash, name: 'Chat', items: [
    { label: 'Design Chat', icon: IC.hash, slot: { type: 'badge', v: '12' } }, { label: 'Engineering', icon: IC.hash, slot: { type: 'text', v: '2m' } },
    { label: 'Launch room', icon: IC.hash, slot: { type: 'icon' } }, { label: 'Random', icon: IC.hash } ] },
  { id: 'tasks', icon: IC.tasks, name: 'Tasks', items: [
    { label: 'Today', icon: IC.tasks, slot: { type: 'badge', v: '5' } }, { label: 'Upcoming', icon: IC.tasks, slot: { type: 'text', v: '8' } },
    { label: 'Done', icon: IC.tasks, slot: { type: 'text', v: '41' } }, { label: 'Someday', icon: IC.tasks } ] },
  { id: 'browse', icon: IC.globe, name: 'Browse', items: [
    { label: 'Search', icon: IC.globe }, { label: 'Recent', icon: IC.globe, slot: { type: 'text', v: '9' } },
    { label: 'Starred', icon: IC.globe, slot: { type: 'badge', v: '2' } }, { label: 'Shared with me', icon: IC.globe, slot: { type: 'icon' } } ] },
  { id: 'spaces', icon: IC.grid, name: 'Spaces', items: [
    { label: 'Studio', icon: IC.grid }, { label: 'Marketing', icon: IC.grid, slot: { type: 'badge', v: '1' } }, { label: 'Archive', icon: IC.grid, slot: { type: 'text', v: '120' } } ] },
  { id: 'settings', icon: IC.gear, name: 'Settings', items: [
    { label: 'Profile', icon: IC.user }, { label: 'Notifications', icon: IC.gear, slot: { type: 'badge', v: '4' } }, { label: 'Billing', icon: IC.gear, slot: { type: 'text', v: 'Pro' } } ] },
  { id: 'people', icon: IC.user, name: 'People', items: [
    { label: 'Team', icon: IC.user, slot: { type: 'text', v: '14' } }, { label: 'Guests', icon: IC.user, slot: { type: 'text', v: '3' } }, { label: 'Invite', icon: IC.user, slot: { type: 'icon' } } ] },
]
const N = DIAL.length, STEP = 360 / N
const CX = 200, CY = 230, R0 = 94, R1 = 162, RI = 128, FAN = 224, FAN_STEP = 12
const pt = (r, a) => [CX + r * Math.cos(a * Math.PI / 180), CY + r * Math.sin(a * Math.PI / 180)]
const sector = (r0, r1, a0, a1) => {
  const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0)
  return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`
}
const mod = (a, n) => ((a % n) + n) % n

export function Slot({ slot }) {
  if (!slot) return null
  return <span className={`dl-slot is-${slot.type}`}>{slot.type === 'icon' ? li(IC.out) : slot.v}</span>
}
export function DialItem({ it, className = '', ...rest }) {
  return (
    <button type="button" className={`dl-item ${className}`} {...rest}>
      <span className="dl-ic">{li(it.icon)}</span><span className="dl-label">{it.label}</span><Slot slot={it.slot} />
    </button>
  )
}

// one step of the wheel per notch of scrolling, however fine the trackpad
function useNotches(fn) {
  const acc = useRef(0)
  return (e) => {
    e.preventDefault()
    acc.current += e.deltaY
    if (Math.abs(acc.current) >= 40) { fn(Math.sign(acc.current)); acc.current = 0 }
  }
}

export function Dial({ still, folded: foldedProp, cat: catProp = 0, act: actProp = 0, onStatus }) {
  const [cat, setCat] = useState(catProp)
  const [rot, setRot] = useState(-catProp * STEP)
  const [act, setAct] = useState(actProp)
  const [folded, setFolded] = useState(!!foldedProp)
  const [opened, setOpened] = useState(null)
  const box = useRef(null)
  const C = DIAL[cat]
  const turn = (d) => { setRot((r) => r - d * STEP); setCat((c) => mod(c + d, N)); setAct(0); setOpened(null) }
  const goCat = (i) => { let d = mod(i - cat, N); if (d > N / 2) d -= N; if (d) turn(d) }
  const goItem = (d) => { setAct((a) => Math.max(0, Math.min(C.items.length - 1, a + d))); setOpened(null) }
  useEffect(() => { onStatus?.(folded ? 'Folded · press the knob to open' : `${C.name} · ${C.items[act].label}${opened != null ? ' · opened' : ''}`) }, [cat, act, folded, opened]) // eslint-disable-line react-hooks/exhaustive-deps

  // the wheel listens on the element itself so it can stop the page from scrolling
  const ringWheel = useNotches((d) => !folded && turn(d))
  const listWheel = useNotches((d) => goItem(d))
  const ringRef = useRef(null), listRef = useRef(null)
  const wheels = useRef({}); wheels.current = { ringWheel, listWheel }
  useEffect(() => {
    if (still) return
    const r = ringRef.current, l = listRef.current
    const a = (e) => wheels.current.ringWheel(e), b = (e) => wheels.current.listWheel(e)
    r?.addEventListener('wheel', a, { passive: false }); l?.addEventListener('wheel', b, { passive: false })
    return () => { r?.removeEventListener('wheel', a); l?.removeEventListener('wheel', b) }
  }, [still])

  // turning the knob by dragging: every step of angle moves one category; a press without turning folds or opens the dial
  const drag = useRef(null)
  const angleAt = (e) => { const b = box.current.getBoundingClientRect(); const k = b.width / 680; return Math.atan2(e.clientY - b.top - CY * k, e.clientX - b.left - CX * k) * 180 / Math.PI }
  const down = (e) => { if (still) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { a: angleAt(e), moved: false } }
  const move = (e) => {
    const D = drag.current
    if (!D || folded) return
    let da = angleAt(e) - D.a
    if (da > 180) da -= 360
    if (da < -180) da += 360
    if (Math.abs(da) >= STEP * 0.6) { turn(da > 0 ? -1 : 1); D.a = angleAt(e); D.moved = true }
  }
  const up = () => { const D = drag.current; drag.current = null; if (D && !D.moved) setFolded((f) => !f) }
  const keys = (e) => {
    const k = { ArrowLeft: () => turn(-1), ArrowRight: () => turn(1), ArrowUp: () => goItem(-1), ArrowDown: () => goItem(1), Home: () => setAct(0), End: () => setAct(C.items.length - 1), Enter: () => setOpened(act), ' ': () => setFolded((f) => !f) }[e.key]
    if (k) { e.preventDefault(); k() }
  }

  return (
    <div className={`dl ${folded ? 'is-folded' : ''}`} ref={box} tabIndex={still ? -1 : 0} onKeyDown={still ? undefined : keys}
      role="navigation" aria-label="Dial navigation, ← → turn the ring, ↑ ↓ move through the list, Enter opens, Space folds">
      <div className="dl-ring" ref={ringRef}>
        <svg className="dl-svg" viewBox="0 0 640 460" aria-hidden="true">
          <defs><pattern id="dl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#3a3b41" /><path d="M0 0v6" stroke="rgba(255,255,255,.12)" strokeWidth="2" /></pattern></defs>
          <circle cx={CX} cy={CY} r={R1 + 30} fill="none" stroke="rgba(255,255,255,.04)" />
          <g className="dl-turn" style={{ transform: `rotate(${rot}deg)` }}>
            {DIAL.map((c, i) => <path key={c.id} className="dl-seg" d={sector(R0, R1, i * STEP - STEP / 2 + 3, i * STEP + STEP / 2 - 3)} />)}
          </g>
          {/* the window at three o'clock: always where the chosen category sits */}
          <path className="dl-window" d={sector(R0 - 6, R1 + 6, -STEP / 2 + 2, STEP / 2 - 2)} fill="url(#dl-hatch)" />
          <path className="dl-line" d={`M${CX + R1 + 6} ${CY}H${CX + FAN - 8}`} />
        </svg>
        <div className="dl-icons" style={{ transform: `rotate(${rot}deg)` }}>
          {DIAL.map((c, i) => {
            const [x, y] = pt(RI, i * STEP)
            return (
              <button key={c.id} type="button" tabIndex={-1} className={`dl-cat ${i === cat ? 'is-sel' : ''}`} aria-label={c.name} aria-current={i === cat ? 'true' : undefined}
                style={{ left: x, top: y, transform: `translate(-50%, -50%) rotate(${-rot}deg)` }} onClick={() => !still && goCat(i)}>
                {li(c.icon)}
              </button>
            )
          })}
        </div>
      </div>
      <button type="button" className="dl-knob" tabIndex={-1} aria-label={folded ? 'Open the dial' : 'Fold the dial'} style={{ left: CX, top: CY }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null }}>
        <span className="dl-ridge" style={{ transform: `rotate(${rot}deg)` }} />
        <span className="dl-face">{li(IC.menu, 1.4)}</span>
      </button>
      <div className="dl-fan" ref={listRef} style={{ left: CX, top: CY }}>
        <p className="dl-head" style={{ transform: `rotate(${(-act - 1.2) * FAN_STEP}deg) translate(${FAN + 4}px, -50%)` }}>{C.name} · {C.items.length}</p>
        {C.items.map((it, i) => {
          const d = i - act
          return (
            <DialItem key={`${C.id}${i}`} it={it} tabIndex={-1} className={`${i === act ? 'is-sel' : ''} ${opened === i ? 'is-open' : ''}`}
              style={{ transform: `rotate(${d * FAN_STEP}deg) translate(${FAN}px, -50%)`, opacity: Math.max(0, 1 - Math.abs(d) * 0.28), filter: d ? `blur(${Math.min(2, Math.abs(d) * 0.6)}px)` : 'none', '--k': i }}
              onClick={() => { if (still) return; if (i === act) setOpened(i); else setAct(i) }} />
          )
        })}
      </div>
    </div>
  )
}

// the arc bar: the dial seen side-on; tabs roll along a curve and the one under the notch is chosen
export function ArcBar({ still, value: v0 = 0, onStatus }) {
  const [v, setV] = useState(v0)
  const ref = useRef(null)
  const go = (d) => setV((x) => Math.max(0, Math.min(N - 1, x + d)))
  const wheel = useNotches((d) => go(d))
  const w = useRef(wheel); w.current = wheel
  useEffect(() => {
    if (still) return
    const el = ref.current, f = (e) => w.current(e)
    el.addEventListener('wheel', f, { passive: false })
    return () => el.removeEventListener('wheel', f)
  }, [still])
  useEffect(() => { onStatus?.(DIAL[v].name) }, [v]) // eslint-disable-line react-hooks/exhaustive-deps
  const drag = useRef(null)
  return (
    <div className="dl-arc" ref={ref} tabIndex={still ? -1 : 0} role="tablist" aria-label="Arc tab bar"
      onKeyDown={(e) => { const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (k) { e.preventDefault(); go(k) } }}
      onPointerDown={(e) => { if (!still) drag.current = { x: e.clientX } }} onPointerMove={(e) => { const D = drag.current; if (D && Math.abs(e.clientX - D.x) > 56) { go(e.clientX < D.x ? 1 : -1); D.x = e.clientX } }}
      onPointerUp={() => { drag.current = null }} onPointerLeave={() => { drag.current = null }}>
      <span className="dl-notch" aria-hidden="true" />
      {DIAL.map((c, i) => {
        const a = (i - v) * 13
        return <ArcTab key={c.id} c={c} sel={i === v} style={{ transform: `rotate(${a}deg) translateY(-560px)`, opacity: Math.max(0, 1 - Math.abs(i - v) * 0.22) }} onClick={() => !still && setV(i)} />
      })}
    </div>
  )
}

export function ArcTab({ c, sel, className = '', ...rest }) {
  return (
    <button type="button" role="tab" aria-selected={sel} tabIndex={-1} className={`dl-tab ${sel ? 'is-sel' : ''} ${className}`} {...rest}>
      <span className="dl-tab-in">{li(c.icon)}<span>{c.name}</span>{c.items[0].slot?.type === 'badge' && <i className="dl-tab-badge">{c.items[0].slot.v}</i>}</span>
    </button>
  )
}

export function DialSet({ auto }) {
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  return (
    <div className="ex nv-ex">
      <div className="nv-part">
        <h3 className="group-k">Dial · drag the knob, scroll, or use the arrow keys</h3>
        <div className="dl-stage"><Dial onStatus={setS1} still={auto} /></div>
        {!auto && <p className="tb-status" aria-live="polite">{s1}</p>}
      </div>
      <div className="nv-part">
        <h3 className="group-k">Arc bar · the same dial, side-on</h3>
        <div className="dl-stage is-arc"><ArcBar onStatus={setS2} still={auto} /></div>
        {!auto && <p className="tb-status" aria-live="polite">{s2}</p>}
      </div>
    </div>
  )
}
