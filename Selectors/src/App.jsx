import { useCallback, useEffect, useRef, useState } from 'react'

/* ================= spring physics =================
   Apple-style springs described by damping ratio + response (seconds), not duration.
   Every value animates from where it is right now, so motion can be interrupted and reversed. */
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function stepSpring(s, damping, response, dt) {
  const k = (2 * Math.PI / response) ** 2
  const c = (4 * Math.PI * damping) / response
  const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n
  for (let i = 0; i < n; i++) {
    s.v += (-k * (s.x - s.target) - c * s.v) * h
    s.x += s.v * h
  }
}

function useSpring(target, { damping = 1, response = 0.35 } = {}) {
  const s = useRef({ x: target, v: 0, target })
  const cfg = useRef({ damping, response })
  cfg.current = { damping, response }
  const [, redraw] = useState(0)
  const raf = useRef()
  const run = useCallback(() => {
    cancelAnimationFrame(raf.current)
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const st = s.current
      stepSpring(st, cfg.current.damping, cfg.current.response, dt)
      if (Math.abs(st.x - st.target) < 1e-4 && Math.abs(st.v) < 1e-3) { st.x = st.target; st.v = 0; redraw((n) => n + 1); return }
      redraw((n) => n + 1)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [])
  useEffect(() => {
    s.current.target = target
    if (reducedMotion()) { s.current.x = target; s.current.v = 0; redraw((n) => n + 1); return }
    run()
  }, [target, run])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return {
    value: s.current.x,
    // drag: follow the pointer 1:1 (no spring), remembering velocity for the hand-off
    hold(x) { cancelAnimationFrame(raf.current); s.current.x = x; redraw((n) => n + 1) },
    // release: continue from the current position at the pointer's velocity
    release(v) { s.current.v = v; if (reducedMotion()) { s.current.x = s.current.target; s.current.v = 0; redraw((n) => n + 1) } else run() },
  }
}

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
// soft boundary: the further past the edge, the less it follows
const rubber = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))

/* ================= controls ================= */
// tracks the pointer inside a row as --mx / --my, used for the visionOS-style hover light
const glow = (e) => {
  const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
  el.style.setProperty('--nx', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3))
  el.style.setProperty('--ny', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3))
}

function Switch({ checked, onChange, label, detail, t }) {
  const pos = useSpring(checked ? 1 : 0, t.spring)
  const [pressed, setPressed] = useState(false)
  const press = useSpring(pressed ? 1 : 0, { damping: 1, response: 0.2 })
  const drag = useRef(null)
  const travel = t.swW - t.thW - 2 * t.inset

  const down = (e) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setPressed(true) // feedback on press, not on release
    drag.current = { x0: e.clientX, p0: pos.value, moved: false, hist: [[e.clientX, e.timeStamp]] }
  }
  const move = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x0
    if (Math.abs(dx) > 4) d.moved = true
    if (!d.moved) return
    pos.hold((d.p0 * travel + dx) / travel) // raw position; the soft ends are applied when drawing
    d.hist.push([e.clientX, e.timeStamp]); if (d.hist.length > 5) d.hist.shift()
  }
  const up = (e) => {
    const d = drag.current
    drag.current = null
    setPressed(false)
    if (!d) return
    if (!d.moved) { onChange(!checked); return }
    const [a, b] = [d.hist[0], d.hist[d.hist.length - 1]]
    const vel = b[1] > a[1] ? (b[0] - a[0]) / ((b[1] - a[1]) / 1000) / travel : 0 // track-widths per second
    // a flick decides by direction; a slow drag decides by where the thumb was let go
    const next = Math.abs(vel) > 1.5 ? vel > 0 : clamp(pos.value) > 0.5
    pos.release(clamp(vel, -12, 12)) // hand the flick's speed to the spring (capped)
    if (next !== checked) onChange(next)
  }

  const k = press.value
  // wherever the spring is, the thumb only ever stretches softly past the ends of the track
  let px = pos.value * travel
  if (px < 0) px = -rubber(-px, travel)
  if (px > travel) px = travel + rubber(px - travel, travel)
  const p = px / travel
  return (
    <li className="row row-switch" onPointerMove={glow}>
      <span className="row-text"><span className="label">{label}</span>{detail && <span className="detail">{detail}</span>}</span>
      <button className="sw" role="switch" aria-checked={checked} aria-label={label}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClick={(e) => { if (e.detail === 0) onChange(!checked) }} // keyboard (Space / Enter)
        style={{ '--p': p, '--k': k }}>
        <span className="sw-track" />
        <span className="sw-led" />
        <span className="sw-thumb" style={{ transform: `translateX(${p * travel - k * t.stretch * clamp(p)}px)`, width: t.thW + k * t.stretch }} />
      </button>
    </li>
  )
}

function Checkbox({ checked, onChange, label, detail, t }) {
  const p = useSpring(checked ? 1 : 0, t.spring).value
  const ring = t.checkStyle === 'ring'
  return (
    <li className="row row-check">
      <button className="row-hit" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} onPointerMove={glow}>
        <span className={`cb ${ring ? 'cb-ring' : ''}`} style={{ '--p': clamp(p), '--s': p }}>
          {ring ? (
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <circle className="ring-track" cx="16" cy="16" r="13" />
              <circle className="ring-fill" cx="16" cy="16" r="13" pathLength="1" style={{ strokeDashoffset: 1 - clamp(p / 0.7) }} />
              <path d="M10.5 16.5l3.6 3.6 7.4-8" pathLength="1" style={{ strokeDashoffset: 1 - clamp((p - 0.55) / 0.45) }} />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 12.5l4 4 8-9" pathLength="1" style={{ strokeDashoffset: 1 - clamp(p * 1.25 - 0.25) }} />
            </svg>
          )}
        </span>
        <span className="row-text"><span className="label">{label}</span>{detail && <span className="detail">{detail}</span>}</span>
      </button>
    </li>
  )
}

function RadioDot({ on, t }) {
  const p = useSpring(on ? 1 : 0, t.spring).value
  return (
    <span className="rd" style={{ '--p': clamp(p), '--s': p }}>
      <span className="rd-dot" />
      {on && t.radioStyle === 'ripple' && <span className="rd-ripple" />}
    </span>
  )
}

function RadioGroup({ title, options, value, onChange, t }) {
  const idx = options.indexOf(value)
  const y = useSpring(idx, t.spring).value // the selection glides between rows, same path both ways
  const refs = useRef([])
  const trailing = t.radioStyle === 'check'
  const key = (e, i) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    const n = (i + d + options.length) % options.length
    onChange(options[n]); refs.current[n]?.focus()
  }
  return (
    <ul className={`list radio-list ${trailing ? 'radio-trailing' : ''}`} role="radiogroup" aria-label={title} style={{ '--y': y }}>
      <span className="rd-glide" aria-hidden="true" />
      {trailing && (
        <svg className="rd-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
      )}
      {options.map((o, i) => (
        <li key={o} className="row row-radio">
          <button ref={(el) => (refs.current[i] = el)} className="row-hit" role="radio" aria-checked={o === value}
            tabIndex={o === value ? 0 : -1} onClick={() => onChange(o)} onKeyDown={(e) => key(e, i)} onPointerMove={glow}>
            {!trailing && <RadioDot on={o === value} t={t} />}
            <span className="row-text"><span className="label">{o}</span></span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ================= the four sets =================
   tokens drive the CSS (as custom properties) AND the spec table, so the spec is always exact */
const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif'
// all four sets share visionOS glass; each has its own world and one signature detail
const SETS = [
  {
    id: 'mist', name: 'Mist', tone: 'Ethereal', platform: 'visionOS',
    content: { topic: 'Immersion', sw: ['Spatial Audio', '', true], cb: ['Show Hands', '', false], radio: ['Environment', ['Yosemite', 'Mount Hood', 'Moon'], 'Yosemite'] },
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 500, fs: 17, lh: 22, ls: '-0.3px',
      dfs: 13, dlh: 18, rowH: 54, padX: 18, gap: 14, listR: 30, divider: 0, listGap: 22,
      swW: 54, swH: 32, thW: 28, thH: 28, inset: 2, swR: 16, thR: 14, stretch: 6, swStroke: 0,
      cb: 26, cbR: 8, cbStroke: 1.5, checkStroke: 2.4, rd: 24, rdDot: 10, rdStroke: 1.5,
      checkStyle: 'square', radioStyle: 'dot',
      ink: '#ffffff', muted: 'rgba(255,255,255,.62)', on: '#34c759', off: 'rgba(255,255,255,.18)', thumb: '#ffffff', accent: '#ffffff',
      spring: { damping: 1, response: 0.45 },
    },
  },
  {
    id: 'aurora', name: 'Aurora', tone: 'Ethereal', platform: 'visionOS',
    content: { topic: 'Night', sw: ['Aurora Alerts', '', true], cb: ['Show Stars', '', false], radio: ['Sky', ['Iceland', 'Lapland', 'Yukon'], 'Lapland'] },
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 500, fs: 17, lh: 22, ls: '-0.3px',
      dfs: 13, dlh: 18, rowH: 54, padX: 18, gap: 14, listR: 30, divider: 0, listGap: 22,
      swW: 54, swH: 32, thW: 28, thH: 28, inset: 2, swR: 16, thR: 14, stretch: 6, swStroke: 0,
      cb: 26, cbR: 8, cbStroke: 1.5, checkStroke: 2.4, rd: 24, rdDot: 10, rdStroke: 1.5,
      checkStyle: 'square', radioStyle: 'dot',
      ink: '#ffffff', muted: 'rgba(225,240,255,.6)', on: '#5ef0c8', off: 'rgba(255,255,255,.16)', thumb: '#ffffff', accent: '#5ef0c8',
      spring: { damping: 1, response: 0.5 },
    },
  },
  {
    id: 'halo', name: 'Halo', tone: 'Ethereal', platform: 'visionOS',
    content: { topic: 'Presence', sw: ['Persona', '', true], cb: ['Eye Contact', '', false], radio: ['Window', ['Small', 'Medium', 'Large'], 'Medium'] },
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 500, fs: 17, lh: 22, ls: '-0.3px',
      dfs: 13, dlh: 18, rowH: 54, padX: 18, gap: 14, listR: 30, divider: 0, listGap: 22,
      swW: 54, swH: 32, thW: 28, thH: 28, inset: 2, swR: 16, thR: 14, stretch: 6, swStroke: 0,
      cb: 26, cbR: 8, cbStroke: 1.5, checkStroke: 2.4, rd: 24, rdDot: 10, rdStroke: 1.5,
      checkStyle: 'square', radioStyle: 'dot',
      ink: '#2a2f45', muted: 'rgba(42,47,69,.55)', on: '#8f9cff', off: 'rgba(42,47,69,.12)', thumb: '#ffffff', accent: '#2a2f45',
      spring: { damping: 1, response: 0.55 },
    },
  },
  {
    id: 'drift', name: 'Drift', tone: 'Ethereal', platform: 'visionOS',
    content: { topic: 'Depth', sw: ['Ambient Sound', '', true], cb: ['Particles', '', false], radio: ['Mood', ['Calm', 'Deep', 'Glow'], 'Calm'] },
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 500, fs: 17, lh: 22, ls: '-0.3px',
      dfs: 13, dlh: 18, rowH: 54, padX: 18, gap: 14, listR: 30, divider: 0, listGap: 22,
      swW: 54, swH: 32, thW: 28, thH: 28, inset: 2, swR: 16, thR: 14, stretch: 6, swStroke: 0,
      cb: 26, cbR: 8, cbStroke: 1.5, checkStroke: 2.4, rd: 24, rdDot: 10, rdStroke: 1.5,
      checkStyle: 'square', radioStyle: 'dot',
      ink: '#eafcff', muted: 'rgba(200,240,250,.6)', on: '#4fd1e8', off: 'rgba(255,255,255,.16)', thumb: '#ffffff', accent: '#eafcff',
      spring: { damping: 1, response: 0.6 },
    },
  },
]

const cssVars = (t) => ({
  '--font': t.font, '--fw': t.fw, '--fs': `${t.fs}px`, '--lh': `${t.lh}px`, '--ls': t.ls, '--dfs': `${t.dfs}px`, '--dlh': `${t.dlh}px`,
  '--row-h': `${t.rowH}px`, '--pad-x': `${t.padX}px`, '--gap': `${t.gap}px`, '--list-r': `${t.listR}px`, '--divider': `${t.divider}px`, '--list-gap': `${t.listGap}px`,
  '--sw-w': `${t.swW}px`, '--sw-h': `${t.swH}px`, '--th-w': `${t.thW}px`, '--th-h': `${t.thH}px`, '--inset': `${t.inset}px`, '--sw-r': `${t.swR}px`, '--th-r': `${t.thR}px`, '--sw-stroke': `${t.swStroke}px`,
  '--cb': `${t.cb}px`, '--cb-r': `${t.cbR}px`, '--cb-stroke': `${t.cbStroke}px`, '--check-stroke': t.checkStroke,
  '--rd': `${t.rd}px`, '--rd-dot': `${t.rdDot}px`, '--rd-stroke': `${t.rdStroke}px`,
  '--ink': t.ink, '--muted': t.muted, '--on': t.on, '--off': t.off, '--thumb': t.thumb, '--accent': t.accent,
})

/* ================= a set: one list, one topic, all three controls ================= */
function SetList({ set, auto, offset = 0 }) {
  const { content: c, t } = set
  const [sw, setSw] = useState(c.sw[2])
  const [cb, setCb] = useState(c.cb[2])
  const [rd, setRd] = useState(c.radio[2])
  useEffect(() => {
    if (!auto) return
    let i = offset
    const id = setInterval(() => {
      const k = i++ % 5
      if (k === 0) setSw((v) => !v)
      else if (k === 1) setCb((v) => !v)
      else setRd(c.radio[1][(k - 2) % c.radio[1].length])
    }, 1000)
    return () => clearInterval(id)
  }, [auto, offset, c])
  return (
    <div className="topic">
      <h3 className="list-title">{c.topic}</h3>
      <ul className="list">
        <Switch label={c.sw[0]} detail={c.sw[1]} t={t} checked={sw} onChange={setSw} />
        <Checkbox label={c.cb[0]} detail={c.cb[1]} t={t} checked={cb} onChange={setCb} />
        <li className="row-group">
          <span className="group-label">{c.radio[0]}</span>
          <RadioGroup title={c.radio[0]} options={c.radio[1]} value={rd} onChange={setRd} t={t} />
        </li>
      </ul>
    </div>
  )
}

/* ================= wall (home page hover background) ================= */
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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 380)), rows: Math.ceil(window.innerHeight / 330) + 1 }))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: layout.cols }, (_, c) => (
        <div key={c} className="wall-col">
          {Array.from({ length: layout.rows }, (_, r) => {
            const set = SETS[(c + r * 3) % SETS.length]
            return <div key={r} className={`wall-tile set vision s-${set.id}`} style={cssVars(set.t)}><SetList set={set} auto offset={c * 2 + r} /></div>
          })}
        </div>
      ))}
    </div>
  )
}

/* ================= page ================= */
export default function App() {
  if (new URLSearchParams(window.location.search).has('wall')) return <Wall />
  return (
    <main>
      <header className="page-head">
        <a className="back" href="../">← Advanced Interface</a>
        <h1>Selectors</h1>
        <p>Week 3 · Ethereal · visionOS</p>
      </header>
      {SETS.map((set) => (
        <section key={set.id} className={`set vision s-${set.id}`} style={cssVars(set.t)}>
          <div className="set-head">
            <h2>{set.name}</h2>
            {/* Figma line drawing: small thumbnail, zooms in on hover / focus */}
            <a className="draft-ref" href={`${import.meta.env.BASE_URL}final/${set.id}.png`} target="_blank" rel="noreferrer">
              <img src={`${import.meta.env.BASE_URL}final/${set.id}.png`} alt={`${set.name} drawing from Figma`} loading="lazy"
                onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
              <span>Figma</span>
            </a>
          </div>
          <SetList set={set} />
        </section>
      ))}
    </main>
  )
}
