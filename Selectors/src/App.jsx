import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
}

const RowText = ({ label, detail }) => (
  <span className="row-text"><span className="label">{label}</span>{detail && <span className="detail">{detail}</span>}</span>
)

function Switch({ checked, onChange, label, detail, icon, tag, t }) {
  const v = t.variant
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
  const up = () => {
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
  const w = t.thW + k * t.stretch
  const x = p * travel - k * t.stretch * clamp(p)
  // Mist: the thumb dissolves while it travels and condenses again at either end
  const fog = v === 'mist' ? Math.sin(Math.PI * clamp(p)) : 0
  let transform = `translateX(${x}px)`
  if (fog) transform += ` scale(${1 + fog * 0.4}, ${1 - fog * 0.15})`
  return (
    <li className="row row-switch" onPointerMove={glow}>
      {icon}
      <RowText label={label} detail={detail} />
      {tag && <span className="tag">{tag}</span>}
      <button className="sw" role="switch" aria-checked={checked} aria-label={label}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClick={(e) => { if (e.detail === 0) onChange(!checked) }} // keyboard (Space / Enter)
        style={{ '--p': p, '--k': k, '--tx': `${t.inset + x + w / 2}px` }}>
        <span className="sw-track" />
        <span className="sw-thumb" style={{ transform, width: w,
          filter: fog > 0.01 ? `blur(${fog * 7}px)` : undefined, opacity: 1 - fog * 0.65 }} />
      </button>
    </li>
  )
}

function Checkbox({ checked, onChange, label, detail, icon, tag, t }) {
  const v = t.variant
  const p = useSpring(checked ? 1 : 0, t.spring).value
  const draw = v === 'mist' ? 0 : 1 - clamp(p * 1.25 - 0.25) // Mist doesn't draw the check, it condenses
  const [burst, setBurst] = useState(0) // Energetic: each check pops a ring of sparks
  const prev = useRef(checked)
  useEffect(() => { if (checked && !prev.current) setBurst((b) => b + 1); prev.current = checked }, [checked])
  const box = (
    <span className="cb" style={{ '--p': clamp(p), '--s': p }}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 12.5l4 4 8-9" pathLength="1" style={{ strokeDashoffset: draw }} />
      </svg>
      {v === 'energy' && burst > 0 && <span key={burst} className="sparks" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} style={{ '--a': `${i * 60}deg` }} />)}</span>}
    </span>
  )
  return (
    <li className="row row-check">
      <button className="row-hit" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)}
        onPointerMove={glow}>
        {icon}
        {!icon && box}
        <RowText label={label} detail={detail} />
        {tag && <span className="tag">{tag}</span>}
        {icon && box}
      </button>
    </li>
  )
}

function RadioRow({ option, on, onPick, onKey, btnRef, t }) {
  const p = useSpring(on ? 1 : 0, t.spring).value
  return (
    <li className="row row-radio">
      <button ref={btnRef} className="row-hit" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
        onClick={onPick} onKeyDown={onKey} onPointerMove={glow} style={{ '--p': clamp(p), '--s': p }}>
        <span className="rd"><span className="rd-dot" /></span>
        <span className="row-text"><span className="label">{option}</span></span>
      </button>
    </li>
  )
}

function RadioGroup({ title, options, value, onChange, t }) {
  const idx = options.indexOf(value)
  const y = useSpring(idx, t.spring).value // the selection glides between rows, same path both ways
  const refs = useRef([])
  const key = (e, i) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    const n = (i + d + options.length) % options.length
    onChange(options[n]); refs.current[n]?.focus()
  }
  return (
    <ul className="list radio-list" role="radiogroup" aria-label={title} style={{ '--y': y }}>
      <span className="rd-glide" aria-hidden="true" />
      {options.map((o, i) => (
        <RadioRow key={o} option={o} on={o === value} t={t} btnRef={(el) => (refs.current[i] = el)}
          onPick={() => onChange(o)} onKey={(e) => key(e, i)} />
      ))}
    </ul>
  )
}

/* ================= the four sets =================
   one tone (Ethereal), four concepts — each concept decides how its controls move */
const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif'
const SETS = [
  {
    id: 'mist', concept: 'Mist Takes Shape', name: 'Mist', tone: 'Ethereal', platform: 'visionOS',
    content: { topic: 'Atmosphere', sw: ['Weightless', '', true], cb: ['Soft Focus', '', false], radio: ['Light', ['Dawn', 'Haze', 'Moonlight'], 'Dawn'] },
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 400, fs: 17, lh: 22, ls: '-0.1px',
      dfs: 13, dlh: 18, rowH: 54, padX: 18, gap: 14, listR: 30, divider: 0, listGap: 22,
      swW: 54, swH: 32, thW: 28, thH: 28, inset: 2, swR: 16, thR: 14, stretch: 6, swStroke: 0,
      cb: 26, cbR: 8, cbStroke: 1.5, checkStroke: 2.4, rd: 24, rdDot: 10, rdStroke: 1.5,
      ink: '#464d6b', muted: 'rgba(70,77,107,.62)', on: '#c3cdf7', off: 'rgba(61,69,89,.1)', thumb: '#ffffff', accent: '#8d9be6',
      spring: { damping: 1, response: 0.4 }, variant: 'mist',
    },
  },
  {
    id: 'invert', concept: 'Light and Dark Trade Places', name: 'Invert', tone: 'Bold', platform: 'visionOS',
    content: {},
    t: { font: '"Barlow Condensed", "SF Pro Display", Inter, sans-serif', ink: '#1d1d1d', muted: 'rgba(29,29,29,.5)', on: '#1d1d1d', off: '#cccccc' },
  },
  {
    id: 'energy', concept: 'Energy Never Sits Still', name: 'Energy', tone: 'Energetic', platform: 'visionOS',
    content: { sw: ['Boost', '', true], cb: ['Shockwave', '', true], radio: ['Pace', ['Jog', 'Run', 'Sprint'], 'Run'] },
    t: {
      font: SF, fontName: 'SF Pro Text Bold', fw: 700, fs: 17, lh: 22, ls: '-0.2px',
      dfs: 13, dlh: 18, rowH: 56, padX: 4, gap: 14, listR: 0, divider: 0, listGap: 22,
      swW: 62, swH: 36, thW: 30, thH: 30, inset: 3, swR: 18, thR: 15, stretch: 12, swStroke: 0,
      cb: 28, cbR: 9, cbStroke: 2, checkStroke: 2.8, rd: 24, rdDot: 10, rdStroke: 1.5,
      ink: '#ffffff', muted: 'rgba(255,255,255,.6)', on: '#c6ff3d', off: 'rgba(255,255,255,.16)', thumb: '#ffffff', accent: '#c6ff3d',
      spring: { damping: 0.5, response: 0.3 }, variant: 'energy',
    },
  },
  {
    id: 'frost', concept: 'Action Clears the Room', name: 'Frost', tone: 'Serene', platform: 'visionOS',
    content: {},
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 500, fs: 16, lh: 21, ls: '-0.2px',
      dfs: 13, dlh: 18, rowH: 50, padX: 16, gap: 12, listR: 28, divider: 0, listGap: 22,
      swW: 50, swH: 30, thW: 26, thH: 26, inset: 2, swR: 15, thR: 13, stretch: 6, swStroke: 0,
      cb: 24, cbR: 7, cbStroke: 1.5, checkStroke: 2.4, rd: 22, rdDot: 9, rdStroke: 1.5,
      ink: '#2b2420', muted: 'rgba(43,36,32,.6)', on: '#2b2420', off: 'rgba(43,36,32,.16)', thumb: '#ffffff', accent: '#2b2420',
      spring: { damping: 1, response: 0.4 }, variant: 'frost',
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
        <Switch label={c.sw[0]} t={t} checked={sw} onChange={setSw} />
        <Checkbox label={c.cb[0]} t={t} checked={cb} onChange={setCb} />
        <li className="row-group">
          <span className="group-label">{c.radio[0]}</span>
          <RadioGroup title={c.radio[0]} options={c.radio[1]} value={rd} onChange={setRd} t={t} />
        </li>
      </ul>
    </div>
  )
}

/* ================= small line glyphs (Serene tiles) ================= */
const GLYPH = {
  room: <path d="M2.5 13.5V7L8 2.5 13.5 7v6.5zM6.5 13.5v-4h3v4" />,
  wave: <path d="M2 8h1M5 5.5v5M8 3v10M11 5.5v5M14 8h-1" />,
  pen: <path d="M3 13l1-3.5 6.5-6.5a1.8 1.8 0 0 1 2.5 2.5L6.5 12 3 13zM9.5 4l2.5 2.5" />,
  photo: <><rect x="2.5" y="3.5" width="11" height="9" rx="2" /><circle cx="6" cy="7" r="1.2" /><path d="M13.5 10.5l-3-3-5 5" /></>,
  plus: <path d="M8 3v10M3 8h10" />,
}
const Glyph = ({ name }) => <svg viewBox="0 0 16 16" aria-hidden="true">{GLYPH[name]}</svg>
/* ================= Action Clears the Room: reaching for an action frosts everything else away =================
   one spring opens the tray; each tile reads the same spring a little later, so they rise in sequence
   and sink back in reverse — and a change of mind mid-way just turns the whole sequence around */
const ACTIONS = { Note: 'pen', Photo: 'photo', Voice: 'wave', Space: 'room' }
const ADDED = { Note: 'A note', Photo: 'A photo', Voice: 'A voice memo', Space: 'A quiet space' }
const TINT = { Note: '#e8d9c6', Photo: '#ecd3cd', Voice: '#d5dfcf', Space: '#d2dce6' } // the sun takes a calm tint from the chosen action

/* the switch, checkbox and radio are the app itself:
   + / × is the switch · the action tiles are the radio · Add to Today is the checkbox */
function FrostSet({ auto, offset = 0 }) {
  const names = Object.keys(ACTIONS)
  const [open, setOpen] = useState(false) // starts closed: just the + until you reach for it
  const [action, setAction] = useState(names[1])
  const [pin, setPin] = useState(true)
  const [ripples, setRipples] = useState(0) // each change to Today sends one slow ripple across the water
  const first = useRef(true)
  useEffect(() => { // Add to Today (checkbox) puts the chosen action in the room — or takes it away
    if (first.current) { first.current = false; return }
    if (pin) setRipples((n) => n + 1)
  }, [pin, action])
  const tiles = useRef([])
  const p = useSpring(open ? 1 : 0, { damping: 1, response: 0.75 }).value // calm: no overshoot, unhurried
  const pq = useSpring(pin ? 1 : 0, { damping: 1, response: 0.45 }).value
  useEffect(() => {
    if (!auto) return
    let i = offset
    const id = setInterval(() => {
      const k = i++ % 6
      if (k === 0) setOpen(true)
      else if (k < 4) setAction(names[k])
      else if (k === 4) { setOpen(false); setAction(names[0]) }
      else setPin((v) => !v)
    }, 1100)
    return () => clearInterval(id)
  }, [auto, offset]) // eslint-disable-line react-hooks/exhaustive-deps
  const tileKey = (e, i) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (e.key === 'Escape') { setOpen(false); return }
    if (!d) return
    e.preventDefault()
    const n = (i + d + names.length) % names.length
    setAction(names[n]); tiles.current[n]?.focus()
  }
  return (
    <div className="screen frost-screen">
      {/* the room: today's quiet list over a horizon — it frosts away while the tray is out */}
      <div className="frost-room" inert={open ? '' : undefined} style={{ filter: p > 0.005 ? `blur(${clamp(p) * 8}px)` : undefined }}>
        <div className={`room-today ${pin ? '' : 'is-hidden'}`} aria-hidden={!pin}>
          <span className="room-label">Today</span>
          <p key={action} className="room-item">{ADDED[action]}</p>
        </div>
        <span className="room-horizon" aria-hidden="true" />
        {/* the circle: a sun resting on the horizon, mirrored in the water — it sinks while the tray is out */}
        <div className="room-sky" aria-hidden="true">
          <span className="room-sun" style={{ transform: `translate(-50%, ${clamp(p) * 96}px)`, '--tint': TINT[action] }} />
        </div>
        <div className="room-water" aria-hidden="true">
          <span className="room-sun reflect" style={{ transform: `translate(-50%, ${-clamp(p) * 96}px) scaleY(-1)`, '--tint': TINT[action] }} />
          {ripples > 0 && <span key={ripples} className="room-ripple" />}
        </div>
      </div>
      {/* tapping the frosted room puts the tray away */}
      <div className="frost-veil" onClick={() => setOpen(false)} style={{ opacity: clamp(p * 0.7), pointerEvents: open ? 'auto' : 'none' }} />
      <div className="frost-dock">
        {/* switch: the + knob slides up the track and turns into × */}
        <button className="frost-switch" role="switch" aria-checked={open} aria-label="Quick actions" onClick={() => setOpen((v) => !v)} style={{ '--p': clamp(p) }}>
          <span className="frost-knob" style={{ transform: `translateY(${-p * 30}px)` }}><Glyph name="plus" /></span>
        </button>
      </div>
      <div className="frost-tiles" aria-hidden={!open}>
        <div className="frost-tile-group" role="radiogroup" aria-label="Action">
        {names.map((name, i) => {
          const q = clamp((p - i * 0.12) / 0.52) // same spring, read a little later per tile
          return (
            <button key={name} ref={(el) => (tiles.current[i] = el)} role="radio" aria-checked={action === name} tabIndex={open && action === name ? 0 : -1}
              className={`frost-tile ${action === name ? 'on' : ''}`} onClick={() => setAction(name)} onKeyDown={(e) => tileKey(e, i)}
              style={{ opacity: q, transform: `translateY(${(1 - q) * 34}px) scale(${0.94 + 0.06 * q})`, pointerEvents: open ? 'auto' : 'none' }}>
              <span className="tile-top"><Glyph name={ACTIONS[name]} /><span className="tile-radio" /></span><span>{name}</span>
            </button>
          )
        })}
        </div>
        {/* checkbox: keep what you make on today's page */}
        {(() => {
          const q = clamp((p - 4 * 0.12) / 0.52)
          return (
            <button className="frost-pin" role="checkbox" aria-checked={pin} tabIndex={open ? 0 : -1} onClick={() => setPin((v) => !v)}
              style={{ opacity: q, transform: `translateY(${(1 - q) * 34}px)`, pointerEvents: open ? 'auto' : 'none', '--q': clamp(pq), '--qs': pq }}>
              <span className="pin-box"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8.4l2.6 2.6L12 5.4" pathLength="1" style={{ strokeDashoffset: 1 - clamp(pq * 1.3 - 0.3) }} /></svg></span>
              Add to Today
            </button>
          )
        })()}
      </div>
    </div>
  )
}

/* ================= Light and Dark Trade Places: every state change is an inversion =================
   switch: the thumb slides and track/thumb swap tones · checkbox: white floods in from where you pressed ·
   radio: the white pill slides, its leading edge reaching ahead toward the new choice */
const TONES = { Amber: '#ffb35c', Moon: '#dfe6ff', Dawn: '#ffc4b8' }
const INV = { damping: 0.62, response: 0.28 } // quick and decisive, with a small overshoot

function InvertSwitch({ on, onChange }) {
  const p = useSpring(on ? 1 : 0, INV).value // 1 = ON (thumb left, dark track)
  const [hover, setHover] = useState(false)
  const lean = useSpring(hover ? 1 : 0, INV).value // hover: the thumb leans toward the side it would move to
  const c = clamp(p)
  return (
    <button className="inv-switch" role="switch" aria-checked={on} aria-label="Power" onClick={() => onChange(!on)}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      style={{ '--c': c, '--x': 1 - p + lean * (on ? 0.08 : -0.08) }}>
      <span className="inv-thumb" />
      <span className="inv-label left" style={{ color: `color-mix(in oklab, #1d1d1d ${c * 100}%, #9a9a9a)` }}>On</span>
      <span className="inv-label right" style={{ color: `color-mix(in oklab, #6f6f6f ${c * 100}%, #1d1d1d)` }}>Off</span>
    </button>
  )
}

function FloodCheckbox({ checked, onChange, label }) {
  const p = useSpring(checked ? 1 : 0, { damping: 1, response: 0.3 }).value
  const [origin, setOrigin] = useState(0) // the flood starts where you pressed
  const [hover, setHover] = useState(false)
  const h = useSpring(hover && !checked ? 1 : 0, INV).value // hover: a drop of white waits under the pointer
  const content = (
    <>
      <span className="flood-text">{label}</span>
      <span className="flood-box"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l2.8 2.8L12.5 5" /></svg></span>
    </>
  )
  return (
    <button className="flood" role="checkbox" aria-checked={checked}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      onPointerMove={(e) => { if (!checked) setOrigin(e.clientX - e.currentTarget.getBoundingClientRect().left) }}
      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); if (e.detail) setOrigin(e.clientX - r.left); onChange(!checked) }}>
      <span className="flood-layer base">{content}</span>
      <span className="flood-layer top" aria-hidden="true" style={{ clipPath: `circle(${Math.max(Math.max(0, p) * 340, h * 16)}px at ${origin}px 50%)` }}>{content}</span>
    </button>
  )
}

function InvertRadio({ value, onChange }) {
  const names = Object.keys(TONES)
  const idx = names.indexOf(value)
  const x = useSpring(idx, INV).value
  const refs = useRef([])
  const lag = idx - x // how far the pill still has to travel — its leading edge reaches ahead toward the choice
  const key = (e, i) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    const n = (i + d + names.length) % names.length
    onChange(names[n]); refs.current[n]?.focus()
  }
  return (
    <div className="inv-radio" role="radiogroup" aria-label="Tone" style={{ '--n': names.length }}>
      <span className="inv-radio-pill" style={{ left: `calc(${(x - Math.max(0, -lag) * 0.35) / names.length * 100}% + 6px)`,
        width: `calc(${(1 + Math.abs(lag) * 0.35) / names.length * 100}% - 12px)` }} />
      {names.map((n, i) => (
        <button key={n} ref={(el) => (refs.current[i] = el)} role="radio" aria-checked={value === n} tabIndex={value === n ? 0 : -1}
          onClick={() => onChange(n)} onKeyDown={(e) => key(e, i)}
          style={{ color: `color-mix(in oklab, #1d1d1d ${clamp(1 - Math.abs(x - i)) * 100}%, #8a8a8a)` }}>{n}</button>
      ))}
    </div>
  )
}

function InvertSet({ auto, offset = 0 }) {
  const [on, setOn] = useState(true)
  const [dim, setDim] = useState(false)
  const [tone, setTone] = useState('Amber')
  const lit = useSpring(on ? 1 : 0, { damping: 1, response: 0.25 }).value
  const dm = useSpring(dim ? 1 : 0, { damping: 1, response: 0.3 }).value
  useEffect(() => {
    if (!auto) return
    let i = offset
    const names = Object.keys(TONES)
    const id = setInterval(() => {
      const k = i++ % 5
      if (k < 2) setTone(names[k + 1])
      else if (k === 2) { setDim((v) => !v); setTone(names[0]) }
      else setOn((v) => !v)
    }, 1100)
    return () => clearInterval(id)
  }, [auto, offset])
  const glow = clamp(lit) * (1 - dm * 0.55)
  return (
    <div className="screen inv-screen">
      {/* the lamp answers all three controls */}
      <div className="inv-lamp" aria-hidden="true" style={{ '--g': glow, '--tone': TONES[tone] }}><span /></div>
      <div className="inv-controls">
        <div className="inv-field"><span className="inv-cap">Power</span><InvertSwitch on={on} onChange={setOn} /></div>
        <div className="inv-field"><span className="inv-cap">Auto</span><FloodCheckbox checked={dim} onChange={setDim} label="Dim at Dusk" /></div>
        <div className="inv-field"><span className="inv-cap">Tone</span><InvertRadio value={tone} onChange={setTone} /></div>
      </div>
    </div>
  )
}

/* ================= Ethereal: a soft orb of light that the controls act on =================
   Weightless lifts it off its shadow · Soft Focus diffuses its edges · Light shifts the whole screen's light.
   The controls answer at once; only the orb itself drifts slowly, as something weightless would. */
const LIGHTS = {
  Dawn: { sky: '#f7eff0', glow: '#ffd2c2', core: '#fff7f2' },
  Haze: { sky: '#f0f1f4', glow: '#d9dce6', core: '#ffffff' },
  Moonlight: { sky: '#eaeef8', glow: '#b9c7f4', core: '#f4f7ff' },
}
function MistSet({ set, auto, offset = 0 }) {
  const { content: c, t } = set
  const [sw, setSw] = useState(c.sw[2])
  const [cb, setCb] = useState(c.cb[2])
  const [rd, setRd] = useState(c.radio[2])
  const lift = useSpring(sw ? 1 : 0, { damping: 0.8, response: 0.8 }).value
  const soft = useSpring(cb ? 1 : 0, { damping: 1, response: 0.6 }).value
  useEffect(() => {
    if (!auto) return
    let i = offset
    const id = setInterval(() => {
      const k = i++ % 5
      if (k === 0) setSw((v) => !v)
      else if (k === 1) setCb((v) => !v)
      else setRd(c.radio[1][(k - 2) % c.radio[1].length])
    }, 1200)
    return () => clearInterval(id)
  }, [auto, offset, c])
  const L = LIGHTS[rd]
  return (
    <div className="screen eth-screen" style={{ '--sky': L.sky, '--glow': L.glow, '--core': L.core }}>
      <div className="eth-scene" aria-hidden="true">
        <span className="eth-shadow" style={{ transform: `translateX(-50%) scale(${1 - clamp(lift) * 0.5})`, opacity: 0.32 - clamp(lift) * 0.22 }} />
        <span className={`eth-float ${sw ? 'is-floating' : ''}`} style={{ transform: `translateY(${-lift * 40}px)` }}>
          <span className="eth-orb" style={{ filter: `blur(${1 + Math.max(0, soft) * 14}px)` }} />
        </span>
      </div>
      <div className="eth-controls">
        <ul className="list">
          <Switch label={c.sw[0]} t={t} checked={sw} onChange={setSw} />
          <Checkbox label={c.cb[0]} t={t} checked={cb} onChange={setCb} />
          <li className="row-group">
            <span className="group-label">{c.radio[0]}</span>
            <RadioGroup title={c.radio[0]} options={c.radio[1]} value={rd} onChange={setRd} t={t} />
          </li>
        </ul>
      </div>
    </div>
  )
}

/* ================= Energetic: a ball that never sits still =================
   Boost sends it higher and hotter · Shockwave rings out on every landing · Pace sets the tempo.
   The ball runs on its own clock (drawn straight to the DOM each frame); the controls are springy and overshoot. */
const PACE = { Jog: 1.1, Run: 1.9, Sprint: 3 } // bounces per second

function EnergyRadio({ options, value, onChange }) {
  const idx = options.indexOf(value)
  const x = useSpring(idx, { damping: 0.5, response: 0.3 }).value
  const refs = useRef([])
  const lag = idx - x // the pill zips ahead toward the choice, then snaps together
  const key = (e, i) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    const n = (i + d + options.length) % options.length
    onChange(options[n]); refs.current[n]?.focus()
  }
  return (
    <div className="nrg-radio" role="radiogroup" aria-label="Pace" style={{ '--n': options.length }}>
      <span className="nrg-pill" style={{ left: `calc(${(x - Math.max(0, -lag) * 0.45) / options.length * 100}% + 5px)`,
        width: `calc(${(1 + Math.abs(lag) * 0.45) / options.length * 100}% - 10px)` }} />
      {options.map((o, i) => (
        <button key={o} ref={(el) => (refs.current[i] = el)} role="radio" aria-checked={value === o} tabIndex={value === o ? 0 : -1}
          onClick={() => onChange(o)} onKeyDown={(e) => key(e, i)}
          style={{ color: `color-mix(in oklab, #17121f ${clamp(1 - Math.abs(x - i)) * 100}%, #a59db3)` }}>{o}</button>
      ))}
    </div>
  )
}

function EnergySet({ set, auto, offset = 0 }) {
  const { content: c, t } = set
  const [boost, setBoost] = useState(c.sw[2])
  const [shock, setShock] = useState(c.cb[2])
  const [pace, setPace] = useState(c.radio[2])
  const hot = useSpring(boost ? 1 : 0, { damping: 0.55, response: 0.35 }).value
  const live = useRef({}); live.current = { hot, shock, pace }
  const scene = useRef(null), ball = useRef(null), shadow = useRef(null)
  useEffect(() => {
    if (!auto) return
    let i = offset
    const id = setInterval(() => {
      const k = i++ % 5
      if (k === 0) setBoost((v) => !v)
      else if (k === 1) setShock((v) => !v)
      else setPace(c.radio[1][k - 2])
    }, 1300)
    return () => clearInterval(id)
  }, [auto, offset, c])
  useEffect(() => {
    if (reducedMotion()) return
    let raf, last = performance.now(), ph = 0
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const { hot, shock, pace } = live.current
      const prev = ph; ph += dt * PACE[pace]
      const f = ph % 1, H = 70 + hot * 70
      const y = Math.sin(Math.PI * f) * H
      const near = Math.max(0, 1 - Math.min(f, 1 - f) * 7) // 1 at the floor
      const speed = Math.abs(Math.cos(Math.PI * f))
      const sx = 1 + near * 0.3 - (1 - near) * speed * 0.08, sy = 1 - near * 0.26 + (1 - near) * speed * 0.12 // squash on landing, stretch in flight
      if (ball.current) ball.current.style.transform = `translate(-50%, ${-y}px) scale(${sx}, ${sy})`
      if (shadow.current) { shadow.current.style.transform = `translateX(-50%) scale(${1 - (y / H) * 0.55})`; shadow.current.style.opacity = 0.55 - (y / H) * 0.4 }
      if (shock && Math.floor(ph) !== Math.floor(prev) && scene.current) { // a landing: ring out
        const r = document.createElement('span'); r.className = 'nrg-shock'
        r.addEventListener('animationend', () => r.remove()); scene.current.appendChild(r)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="screen nrg-screen" style={{ '--hot': clamp(hot) }}>
      <div ref={scene} className="nrg-scene" aria-hidden="true">
        <span className="nrg-floor" />
        <span ref={shadow} className="nrg-shadow" />
        <span ref={ball} className="nrg-ball" />
      </div>
      <div className="nrg-controls">
        <ul className="list">
          <Switch label={c.sw[0]} t={t} checked={boost} onChange={setBoost} />
          <Checkbox label={c.cb[0]} t={t} checked={shock} onChange={setShock} />
        </ul>
        <span className="nrg-cap">{c.radio[0]}</span>
        <EnergyRadio options={c.radio[1]} value={pace} onChange={setPace} />
      </div>
    </div>
  )
}

const BODIES = { mist: MistSet, energy: EnergySet, frost: FrostSet, invert: InvertSet }
const SetBody = (props) => { const B = BODIES[props.set.id] ?? SetList; return <B {...props} /> }

/* ================= Figma draft thumbnail =================
   the enlarged draft is drawn in a layer above the page (so no section can clip or cover it),
   growing out of the thumbnail and shrinking back into it */
// bump when the Figma drafts are re-exported, so browsers fetch the new images
const DRAFT_VERSION = 'wire-7'

function DraftThumb({ set }) {
  const ref = useRef(null)
  const [box, setBox] = useState(null)
  const [open, setOpen] = useState(false)
  const src = `${import.meta.env.BASE_URL}final/${set.id}.png?v=${DRAFT_VERSION}`
  const show = () => {
    const r = ref.current.querySelector('img').getBoundingClientRect()
    const W = Math.min(680, window.innerWidth - 32), H = W * 504 / 900
    const right = r.left > window.innerWidth / 2 // grow toward the open side of the page
    const left = clamp(right ? r.right - W : r.left, 16, window.innerWidth - W - 16)
    const top = clamp(r.top, 16, window.innerHeight - H - 16)
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
        <img src={src} alt={`${set.tone} — Figma draft`} loading="lazy" onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
        <span>Figma draft</span>
      </div>
      {box && createPortal(
        <img className="draft-zoom" src={src} alt="" aria-hidden="true"
          onTransitionEnd={() => { if (!open) setBox(null) }}
          style={{ left: box.left, top: box.top, width: box.W, transformOrigin: `${box.ox}px ${box.oy}px`,
            transform: open ? 'none' : `scale(${box.s})`, opacity: open ? 1 : 0 }} />,
        document.body)}
    </>
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
            return <div key={r} className={`wall-tile set vision s-${set.id}`} style={cssVars(set.t)}><SetBody set={set} auto offset={c * 2 + r} /></div>
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
        <p>Week 3 · Advanced Interface</p>
      </header>
      {SETS.map((set) => (
        <section key={set.id} className={`set vision s-${set.id}`} style={cssVars(set.t)}>
          <div className="set-head">
            <h2>{set.tone}</h2>
            <DraftThumb set={set} />
          </div>
          <SetBody set={set} />
        </section>
      ))}
    </main>
  )
}
