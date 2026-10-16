import { useCallback, useEffect, useId, useRef, useState } from 'react'
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
  const s = useRef({ x: target, v: 0, target, held: false })
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
    if (s.current.held) return // the finger owns the value until it lets go
    if (reducedMotion()) { s.current.x = target; s.current.v = 0; redraw((n) => n + 1); return }
    run()
  }, [target, run])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return {
    value: s.current.x,
    // drag: follow the pointer 1:1 (no spring)
    hold(x) { cancelAnimationFrame(raf.current); s.current.held = true; s.current.x = x; redraw((n) => n + 1) },
    // release: continue from the current position at the pointer's velocity
    release(v) {
      s.current.held = false; s.current.v = v
      if (reducedMotion()) { s.current.x = s.current.target; s.current.v = 0; redraw((n) => n + 1) } else run()
    },
  }
}

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
// soft boundary: the further past the edge, the less it follows
const rubber = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))
const lerp = (a, b, t) => a + (b - a) * t

/* ================= the slider engine =================
   Shared by every slider on the page; each tone only decides how it looks and moves.
   - press: instant feedback; the thumb jumps to the finger and the value updates at once
   - drag: the thumb follows 1:1, soft past the ends; stepped sliders feel detents between stops
   - release: the spring takes over at the finger's velocity; a flick carries a stepped slider on
   - keyboard: arrows / Page Up/Down / Home / End, with the value announced */
function useSlider({ t, onChange, steps = 0, inset = 0, vertical = false, spring = { damping: 1, response: 0.35 } }) {
  const pos = useSpring(t, spring)
  const track = useRef(null)
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [vel, setVel] = useState(0)
  const [hx, setHx] = useState(null) // where the pointer hovers along the track (0..1)
  const g = useRef(null)
  const n = steps ? steps - 1 : 0
  const snap = (x) => (n ? Math.round(clamp(x) * n) / n : clamp(x))
  const at = (e) => {
    const r = track.current.getBoundingClientRect()
    const f = vertical ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width // vertical: first stop at the top
    return (f - inset) / (1 - 2 * inset)
  }
  const draw = (raw) => {
    let x = raw
    if (x < 0) x = -rubber(-x, 1, 0.4)
    else if (x > 1) x = 1 + rubber(x - 1, 1, 0.4)
    else if (n) { // detents: the thumb lingers at each stop, then slips to the next
      const k = x * n, b = Math.round(k), f = k - b
      x = (b + Math.sign(f) * Math.pow(Math.abs(f) * 2, 2) / 2) / n
    }
    return x
  }
  const down = (e) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setPressed(true) // feedback on press, not on release
    const raw = at(e)
    g.current = { x0: vertical ? e.clientY : e.clientX, raw, moved: false, hist: [[raw, e.timeStamp]] }
    pos.hold(draw(raw)) // the thumb lands under the finger the instant you press
    const live = snap(raw)
    if (live !== t) onChange(live)
  }
  const move = (e) => {
    const d = g.current
    if (!d) { setHx(at(e)); return }
    const raw = at(e); d.raw = raw
    if (!d.moved && Math.abs((vertical ? e.clientY : e.clientX) - d.x0) > 3) { d.moved = true; setDragging(true) }
    if (!d.moved) return
    pos.hold(draw(raw))
    d.hist.push([raw, e.timeStamp]); if (d.hist.length > 6) d.hist.shift()
    const [a, b] = [d.hist[0], d.hist[d.hist.length - 1]]
    setVel(b[1] > a[1] ? (b[0] - a[0]) / ((b[1] - a[1]) / 1000) : 0)
    const live = snap(raw)
    if (live !== t) onChange(live) // the value (and whatever it drives) updates during the drag
  }
  const up = () => {
    const d = g.current
    g.current = null
    setPressed(false); setDragging(false); setVel(0)
    if (!d) return
    if (!d.moved) { onChange(snap(d.raw)); pos.release(0); return } // a tap: stays put (a stepped slider settles onto its stop)
    const [a, b] = [d.hist[0], d.hist[d.hist.length - 1]]
    const v = b[1] > a[1] ? (b[0] - a[0]) / ((b[1] - a[1]) / 1000) : 0
    onChange(n ? snap(d.raw + v * 0.06) : snap(d.raw)) // a flick carries a stepped slider on
    pos.release(clamp(v, -6, 6))
  }
  const key = (e) => {
    const unit = n ? 1 / n : 0.01
    const big = n ? unit : 0.1
    const up = vertical ? -unit : unit // a vertical list runs top → bottom
    const d = { ArrowRight: unit, ArrowUp: up, ArrowLeft: -unit, ArrowDown: -up, PageUp: big, PageDown: -big, Home: -1, End: 1 }[e.key]
    if (d == null) return
    e.preventDefault()
    onChange(snap(t + d * (e.shiftKey && !n ? 10 : 1)))
  }
  const state = dragging ? 'is-drag' : pressed ? 'is-press' : hover ? 'is-hover' : ''
  return {
    p: pos.value, hover, pressed, dragging, vel, hx, state, track,
    x: (p) => (inset + p * (1 - 2 * inset)) * 100, // position along the track, in %
    bind: {
      role: 'slider', tabIndex: 0,
      onPointerEnter: () => setHover(true), onPointerLeave: () => { setHover(false); setHx(null) },
      onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onKeyDown: key,
    },
  }
}

/* ================= Energetic: a heart that beats at your tempo ================= */
const LEVELS = ['Easy', 'Steady', 'Push', 'Hard', 'All-out']
const ENERGY_SPRING = { damping: 0.5, response: 0.3 } // quick, with overshoot

function EnergyTempo({ t, onChange }) {
  const s = useSlider({ t, onChange, spring: ENERGY_SPRING })
  const bpm = Math.round(60 + clamp(s.p) * 120) // counts with the thumb
  const stretch = 1 + Math.min(Math.abs(s.vel) * 0.08, 0.5) // the thumb stretches with speed
  return (
    <div className={`nrg-slider ${s.state}`} {...s.bind} aria-label="Tempo" aria-valuemin={60} aria-valuemax={180} aria-valuenow={Math.round(60 + t * 120)} aria-valuetext={`${Math.round(60 + t * 120)} beats per minute`}>
      <div className="sl-head"><span className="sl-label">Tempo</span><span className="sl-value">{bpm}<small> BPM</small></span></div>
      <div className="nrg-track" ref={s.track}>
        <span className="nrg-fill" style={{ width: `${clamp(s.p) * 100}%` }} />
        <span className="nrg-thumb" style={{ left: `${s.x(s.p)}%`, '--st': s.dragging ? stretch : 1 }} />
        <span className="nrg-bubble" style={{ left: `${s.x(s.p)}%` }}>{bpm}</span>
      </div>
    </div>
  )
}

function EnergyIntensity({ level, onChange }) {
  const s = useSlider({ t: level / 4, onChange: (x) => onChange(Math.round(x * 4)), steps: 5, inset: 0.1, spring: ENERGY_SPRING })
  return (
    <div className={`nrg-slider ${s.state}`} {...s.bind} aria-label="Intensity" aria-valuemin={0} aria-valuemax={4} aria-valuenow={level} aria-valuetext={LEVELS[level]}>
      <div className="sl-head"><span className="sl-label">Intensity</span><span className="sl-value">{LEVELS[level]}</span></div>
      <div className="nrg-blocks" ref={s.track}>
        {LEVELS.map((_, i) => <span key={`${i}-${i <= level}`} className={`blk ${i <= level ? 'lit' : ''}`} style={{ '--i': i }} />)}
        <span className="nrg-knob" style={{ left: `${s.x(s.p)}%` }} />
        <span className="nrg-bubble" style={{ left: `${s.x(s.p)}%` }}>{LEVELS[level]}</span>
      </div>
      <div className="nrg-ticks" aria-hidden="true">{LEVELS.map((l, i) => <span key={l} className={i === level ? 'on' : ''}>{l}</span>)}</div>
    </div>
  )
}

function PulseOrb({ bpm, level }) {
  const orb = useRef(null), stage = useRef(null)
  const live = useRef({}); live.current = { bpm, level }
  useEffect(() => {
    if (reducedMotion()) return
    let raf, last = performance.now(), ph = 0
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const { bpm, level } = live.current
      const prev = ph; ph += dt * bpm / 60
      const e = Math.exp(-(ph % 1) * 7) // a sharp beat, then a quick decay
      if (orb.current) orb.current.style.transform = `translate(-50%, -50%) scale(${1 + e * (0.06 + level * 0.035)})`
      if (Math.floor(ph) !== Math.floor(prev) && level >= 1 && stage.current) { // each beat rings out — harder at higher intensity
        const r = document.createElement('span'); r.className = 'pulse-ring'
        r.style.setProperty('--reach', 1.4 + level * 0.25)
        r.addEventListener('animationend', () => r.remove()); stage.current.appendChild(r)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div ref={stage} className="pulse-stage" style={{ '--heat': level / 4, '--size': `${110 + level * 16}px` }} aria-hidden="true">
      <span ref={orb} className="pulse-orb"><b>{bpm}</b><small>BPM</small></span>
    </div>
  )
}

function EnergySet({ auto, offset = 0 }) {
  const [tempo, setTempo] = useState((128 - 60) / 120)
  const [level, setLevel] = useState(2)
  useAuto(auto, offset, [() => setTempo(Math.random()), () => setLevel(Math.floor(Math.random() * 5))])
  const tempoS = useSpring(tempo, { damping: 1, response: 0.3 }).value // the heart glides to a new tempo
  return (
    <div className="screen nrg-screen">
      <PulseOrb bpm={Math.round(60 + tempoS * 120)} level={level} />
      <div className="controls">
        <EnergyTempo t={tempo} onChange={setTempo} />
        <EnergyIntensity level={level} onChange={setLevel} />
      </div>
    </div>
  )
}

/* ================= Futuristic: a reactor you tune by instrument ================= */
const FUT_SPRING = { damping: 0.9, response: 0.22 } // precise, near-instant, a hint of settle
const WARPS = ['W1', 'W2', 'W3', 'W4', 'W5']

function FutThrust({ t, onChange }) {
  const s = useSlider({ t, onChange, spring: FUT_SPRING })
  const pct = (clamp(s.p) * 100).toFixed(1).padStart(5, '0') // counts with the reticle
  return (
    <div className={`fut-slider ${s.state}`} {...s.bind} aria-label="Thrust" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(t * 100)} aria-valuetext={`${Math.round(t * 100)} percent`}>
      <div className="sl-head"><span className="sl-label">Thrust</span><span className="sl-value">{pct}<small>%</small></span></div>
      <div className="fut-track" ref={s.track}>
        <span className="fut-fill" style={{ width: `${clamp(s.p) * 100}%` }} />
        <span className="fut-thumb" style={{ left: `${s.p * 100}%` }}><i /></span>
        <span className="fut-readout" style={{ left: `${s.p * 100}%` }}>THR {pct}</span>
      </div>
      {/* a graduated ruler: ticks light up behind the thumb and brighten near the pointer */}
      <div className="fut-ruler" aria-hidden="true">
        {Array.from({ length: 21 }, (_, i) => {
          const at = i / 20, near = s.hx == null ? 0 : clamp(1 - Math.abs(at - s.hx) * 8)
          return <span key={i} className={`${i % 5 === 0 ? 'major' : ''} ${at <= s.p + 1e-6 ? 'on' : ''}`} style={{ left: `${at * 100}%`, '--near': near }}>{i % 5 === 0 && <em>{i * 5}</em>}</span>
        })}
      </div>
    </div>
  )
}

function FutWarp({ warp, onChange }) {
  const s = useSlider({ t: warp / 4, onChange: (x) => onChange(Math.round(x * 4)), steps: 5, inset: 0.1, spring: FUT_SPRING })
  return (
    <div className={`fut-slider ${s.state}`} {...s.bind} aria-label="Warp" aria-valuemin={1} aria-valuemax={5} aria-valuenow={warp + 1} aria-valuetext={`Warp ${warp + 1}`}>
      <div className="sl-head"><span className="sl-label">Warp</span><span className="sl-value">{WARPS[warp]}</span></div>
      <div className="fut-cells" ref={s.track}>
        {WARPS.map((w, i) => <span key={`${w}-${i === warp}`} className={`cell ${i < warp ? 'below' : ''} ${i === warp ? 'on' : ''}`}>{w}</span>)}
        <span className="fut-bracket" style={{ left: `${s.x(s.p)}%` }} />
        <span className="fut-readout" style={{ left: `${s.x(s.p)}%` }}>WARP {warp + 1}</span>
      </div>
    </div>
  )
}

function Reactor({ thrust, warp }) {
  const rings = useRef([])
  const live = useRef({}); live.current = { thrust }
  useEffect(() => {
    if (reducedMotion()) return
    let raf, last = performance.now()
    const ang = [0, 0, 0, 0, 0]
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const sp = 12 + live.current.thrust * 260 // degrees per second
      ang.forEach((a, i) => {
        ang[i] = a + dt * sp * (i % 2 ? -1 : 1) / (1 + i * 0.35)
        rings.current[i]?.setAttribute('transform', `rotate(${ang[i].toFixed(2)})`)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const DASH = ['2 6', '14 6', '1 3', '30 10 4 10', '6 4']
  return (
    <div className="reactor" style={{ '--thrust': thrust, '--warp': warp / 4 }} aria-hidden="true">
      <svg viewBox="-150 -150 300 300">
        <circle r="140" className="r-scale" />
        {DASH.map((d, i) => (
          <circle key={i} ref={(el) => (rings.current[i] = el)} r={44 + i * 19} strokeDasharray={d} className={`r-ring ${i <= warp ? 'on' : ''}`} />
        ))}
        <circle r="30" className="r-core" />
      </svg>
      <span className="r-label">THR {(thrust * 100).toFixed(0).padStart(3, '0')} · W{warp + 1}</span>
    </div>
  )
}

function FutureSet({ auto, offset = 0 }) {
  const [thrust, setThrust] = useState(0.62)
  const [warp, setWarp] = useState(2)
  useAuto(auto, offset, [() => setThrust(Math.random()), () => setWarp(Math.floor(Math.random() * 5))])
  const thrustS = useSpring(thrust, FUT_SPRING).value
  return (
    <div className="screen fut-screen">
      <Reactor thrust={clamp(thrustS)} warp={warp} />
      <div className="controls">
        <FutThrust t={thrust} onChange={setThrust} />
        <FutWarp warp={warp} onChange={setWarp} />
      </div>
    </div>
  )
}

/* ================= Mysterious: a moon over still water =================
   One live value — the Phase thumb's position — drives the whole night at once: the moon's shadow,
   the sky, the stars, the reflection, the name and the illumination. Veil thickens a drifting mist.
   Nothing ever cuts: dragging between stops passes through every moon in between. */
const MOON_PHASES = ['New', 'Crescent', 'Half', 'Gibbous', 'Full']
const MYS_SPRING = { damping: 1, response: 0.55 } // slow and deliberate, never bounces
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mixHex = (h1, h2, t) => '#' + hexRgb(h1).map((v, i) => Math.round(lerp(v, hexRgb(h2)[i], clamp(t))).toString(16).padStart(2, '0')).join('')
const STARS = Array.from({ length: 46 }, (_, i) => { const r = (n) => ((Math.sin(i * 9301 + n * 49297) * 233280) % 1 + 1) % 1; return { x: r(1) * 100, y: r(2) * 58, s: 0.6 + r(3) * 1.6, d: r(4) * 6 } })

// a name that hands over to the next one through a soft blur, following a continuous position
function Handover({ names, f }) {
  const lo = clamp(Math.floor(f), 0, names.length - 1), hi = clamp(Math.ceil(f), 0, names.length - 1), w = f - Math.floor(f)
  return (
    <span className="handover">
      <b style={{ opacity: 1 - w, filter: `blur(${w * 5}px)` }}>{names[lo]}</b>
      {hi !== lo && <b style={{ opacity: w, filter: `blur(${(1 - w) * 5}px)` }}>{names[hi]}</b>}
    </span>
  )
}

// a tiny drawing of a moon phase, for the stops
const Glyph = ({ k }) => (
  <svg viewBox="-6 -6 12 12" aria-hidden="true">
    <circle r="5" className="g-dark" />
    {k > 0 && <path className="g-lit" d={k === 4 ? 'M0-5A5 5 0 1 1 0 5A5 5 0 1 1 0-5' : `M0-5A5 5 0 0 1 0 5A${(5 * Math.abs(2 - k) / 2).toFixed(2)} 5 0 0 ${k < 2 ? 1 : 0} 0-5`} />}
  </svg>
)

// how lit a point on the track is: by the thumb's light and by the lantern under the pointer
function lightAt(x, s, reach) {
  const w = s.track.current?.offsetWidth || 280
  const fromThumb = clamp(1 - (Math.abs(x - clamp(s.p)) * w) / reach)
  const fromPointer = s.hx == null ? 0 : clamp(1 - (Math.abs(x - s.hx) * w) / 60)
  return Math.max(fromThumb, fromPointer)
}
// star points along a path: they twinkle like the sky's stars and brighten when a light passes over them
function PathStars({ at, s, reach, dim = 0 }) {
  return at.map((x, i) => (
    <span key={x} className="mys-star" style={{ left: `${x * 100}%`, '--lit': lightAt(x, s, reach), '--dim': dim, animationDelay: `${-(i * 1.7) % 6}s` }} />
  ))
}
const lights = (s, reach) => ({ '--tx': `${clamp(s.p) * 100}%`, '--hx': s.hx == null ? '-200%' : `${s.hx * 100}%`, '--reach': `${reach}px` })

// the Phase thumb is the moon itself, drawn in the current phase
function MiniMoon({ k }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="-10 -10 20 20" aria-hidden="true">
      <defs><mask id={`mm${id}`}><circle r="8" fill="#fff" /><circle r="8.5" cx={-k * 17} fill="#000" /></mask></defs>
      <circle r="8" className="mm-dark" />
      <circle r="8" className="mm-lit" mask={`url(#mm${id})`} />
    </svg>
  )
}

function MoonPhase({ phase, onChange, onMorph }) {
  const s = useSlider({ t: phase / 4, onChange: (x) => onChange(Math.round(x * 4)), steps: 5, spring: MYS_SPRING })
  useEffect(() => { onMorph(clamp(s.p) * 4) }, [s.p]) // eslint-disable-line react-hooks/exhaustive-deps
  const f = clamp(s.p) * 4
  const reach = 40 + (f / 4) * 110 // a fuller moon lights more of the path
  return (
    <div className={`mys-slider ${s.state}`} {...s.bind} aria-label="Moon phase" aria-valuemin={0} aria-valuemax={4} aria-valuenow={phase} aria-valuetext={MOON_PHASES[phase]}>
      <div className="sl-head"><span className="mys-cap">Phase</span><span className="mys-val"><Handover names={MOON_PHASES} f={f} /></span></div>
      <div className="mys-track" ref={s.track} style={lights(s, reach)}>
        <span className="mys-line" />
        <span className="mys-fill" style={{ width: `${clamp(s.p) * 100}%` }} />
        <PathStars at={[0.125, 0.375, 0.625, 0.875]} s={s} reach={reach} />{/* a waypoint between each pair of phases */}
        {MOON_PHASES.map((n, i) => (
          <span key={n} className="mys-stop" style={{ left: `${(i / 4) * 100}%`, opacity: 0.06 + lightAt(i / 4, s, reach) * 0.94 }}><Glyph k={i} /></span>
        ))}
        <span className="mys-pearl is-moon" style={{ left: `${s.p * 100}%` }}><MiniMoon k={f / 4} /></span>
      </div>
    </div>
  )
}

function MoonVeil({ t, onChange, onMorph }) {
  const s = useSlider({ t, onChange, spring: MYS_SPRING })
  useEffect(() => { onMorph(clamp(s.p)) }, [s.p]) // eslint-disable-line react-hooks/exhaustive-deps
  const v = clamp(s.p)
  const reach = 120 - v * 85 // the thicker the veil, the less of the path you can see
  return (
    <div className={`mys-slider ${s.state}`} {...s.bind} aria-label="Veil" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(t * 100)} aria-valuetext={`${Math.round(t * 100)} percent veil`}>
      <div className="sl-head"><span className="mys-cap">Veil</span><span className="mys-val">{Math.round(v * 100)}<small>%</small></span></div>
      <div className="mys-track" ref={s.track} style={lights(s, reach)}>
        <span className="mys-line" />
        <span className="mys-fill" style={{ width: `${v * 100}%` }} />
        <PathStars at={[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]} s={s} reach={reach} dim={v} />{/* the mist hides them as it thickens */}
        <span className="mys-pearl" style={{ left: `${s.p * 100}%`, filter: `blur(${v * 1.6}px)`, opacity: 1 - v * 0.35 }} />
      </div>
    </div>
  )
}

function Night({ f, veil }) {
  const k = f / 4 // 0 new … 1 full
  const R = 64, dx = k * 2.15 * R // how far the shadow has slid off the moon
  const sky = mixHex('#05060f', '#141a3c', k), horizon = mixHex('#0d0f22', '#3a3d78', k)
  const id = useId().replace(/:/g, '') // each night gets its own mask (the home wall shows several)
  return (
    <div className="night" style={{ '--sky': sky, '--hz': horizon, '--k': k, '--veil': veil }} aria-hidden="true">
      <div className="stars">{STARS.map((st, i) => <i key={i} style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, animationDelay: `${-st.d}s` }} />)}</div>
      <div className="moon-wrap">
        <svg className="moon" viewBox="-90 -90 180 180">
          <defs>
            <filter id={`t${id}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" /></filter>
            <mask id={`m${id}`}><circle r={R} fill="#fff" /><circle r={R + 2} cx={-dx} fill="#000" filter={`url(#t${id})`} /></mask>
            <radialGradient id={`g${id}`} cx="40%" cy="38%"><stop offset="0" stopColor="#f4f1e6" /><stop offset="1" stopColor="#c9c5b8" /></radialGradient>
          </defs>
          <circle r={R + 18 + veil * 30} className="halo" />
          <circle r={R} className="earthshine" />
          <circle r={R} fill={`url(#g${id})`} mask={`url(#m${id})`} />
        </svg>
      </div>
      <div className="water">
        <svg className="moon reflect" viewBox="-90 -90 180 180">
          <circle r={R} className="earthshine" />
          <circle r={R} fill={`url(#g${id})`} mask={`url(#m${id})`} />
        </svg>
      </div>
      <div className="mist"><i /><i /></div>
      <span className="night-read"><Handover names={MOON_PHASES} f={f} /> · {Math.round(k * 100)}% lit</span>
    </div>
  )
}

function MysteriousSet({ auto, offset = 0 }) {
  const [phase, setPhase] = useState(1)
  const [veil, setVeil] = useState(0.3)
  const [f, setF] = useState(1)      // live phase position (0…4) from the thumb
  const [v, setV] = useState(0.3)    // live veil from the thumb
  useAuto(auto, offset, [() => setPhase(Math.floor(Math.random() * 5)), () => setVeil(Math.random())])
  return (
    <div className="screen mys-screen">
      <Night f={f} veil={v} />
      <div className="controls mys-controls">
        <MoonPhase phase={phase} onChange={setPhase} onMorph={setF} />
        <MoonVeil t={veil} onChange={setVeil} onMorph={setV} />
      </div>
    </div>
  )
}

// the home page's hover wall plays each set by itself
function useAuto(auto, offset, actions) {
  useEffect(() => {
    if (!auto) return
    let i = offset
    const id = setInterval(() => actions[i++ % actions.length](), 1400)
    return () => clearInterval(id)
  }, [auto, offset]) // eslint-disable-line react-hooks/exhaustive-deps
}

/* ================= the three sets + their spec ================= */
const SETS = [
  {
    id: 'energy', tone: 'Energetic', Body: EnergySet,
    spec: [
      ['Layout', [['Screen', 'padding 28 / 32, radius 34, #17121F'], ['Columns', 'subject 1fr · controls 340'], ['Slider gap', '34'], ['Label → track', '14']]],
      ['Type', [['Label', 'Unbounded 600 · 12 / 16 · caps · tracking 0.1em'], ['Value', 'Unbounded 600 · 18 / 22 · tabular'], ['Bubble', 'Unbounded 800 · 14 / 18'], ['Step names', 'Unbounded 500 · 10 / 12']]],
      ['Continuous · Tempo', [['Range', '60 – 180 BPM, step 1'], ['Track', 'h 12 (16 on hover/drag), radius 8, #2A2333'], ['Fill', 'gradient #C6FF3D → #FF2D78'], ['Thumb', '30 × 30, radius 15, #FFF, shadow 0 3 8 / 40%'], ['Bubble', 'h 30, pad 0 10, radius 10, #C6FF3D, 16 above thumb']]],
      ['Stepped · Intensity', [['Stops', '5 — Easy · Steady · Push · Hard · All-out'], ['Blocks', 'h 16, radius 6, gap 6; lit = lime → pink by stop'], ['Knob', '10 × 30, radius 5, #FFF, centred on stop'], ['Bubble', 'same as Tempo']]],
      ['States', [['Hover', 'thumb ×1.12, track 12 → 16'], ['Pressed', 'thumb squash 1.25 × 0.8 + 6 px lime glow, bubble pops in'], ['Drag', 'thumb stays squashed (1.25 × 0.8) and stretches further with speed (≤ 1.5×); live value bubble; each lit block pops']]],
      ['Motion', [['Spring', 'damping 0.5, response 0.3 (overshoots)'], ['Flick', 'stepped: projected 60 ms ahead, carries to next stop']]],
    ],
  },
  {
    id: 'reactor', tone: 'Futuristic', Body: FutureSet,
    spec: [
      ['Layout', [['Screen', 'padding 28 / 32, radius 34, #05080F + 24 px grid at 4%'], ['Columns', 'subject 1fr · controls 340'], ['Slider gap', '38']]],
      ['Type', [['Label', 'Space Grotesk 500 · 11 / 14 · caps · tracking 0.24em'], ['Value', 'JetBrains Mono 500 · 18 / 22 · tabular'], ['Readout', 'JetBrains Mono 500 · 11 / 14'], ['Ruler', 'JetBrains Mono 400 · 9 / 10']]],
      ['Continuous · Thrust', [['Range', '0 – 100 %, step 1 (0.1 shown)'], ['Track', 'h 2, rgba(62,240,255,.18)'], ['Fill', '#3EF0FF + glow 0 0 8'], ['Thumb', 'diamond 14 × 14, stroke 1.5 #3EF0FF, crosshair h 30'], ['Ruler', '21 ticks every 5 %, major every 25 % (h 10 / 5)']]],
      ['Stepped · Warp', [['Stops', '5 — W1 … W5'], ['Cells', 'h 32, gap 6, chamfer 6, stroke 1'], ['Bracket', 'cell width, corner arms 8, stroke 1.5']]],
      ['States', [['Hover', 'diamond ×1.15; ruler ticks near the pointer brighten'], ['Pressed', 'diamond fills, brackets close 4 px'], ['Drag', 'readout chip above thumb, ticks light behind it; new cell boots with a flicker']]],
      ['Motion', [['Spring', 'damping 0.9, response 0.22 (precise)']]],
    ],
  },
  {
    id: 'moon', tone: 'Mysterious', Body: MysteriousSet,
    spec: [
      ['Layout', [['Screen', 'radius 34; night scene 1fr · controls 320, padding 28 / 36'], ['Moon', 'r 64 (128 Ø); halo r 82 → 112 with Veil'], ['Water', 'lower 34 % of the scene; reflection blurred 3, 35 %']]],
      ['Type', [['Caption', 'Inter 500 · 10 / 12 · caps · tracking 0.3em'], ['Phase name', 'Cormorant Garamond italic 400 · 26 / 30'], ['Veil value', 'Cormorant Garamond 400 · 26 / 30, % at 15'], ['Labels', 'no text appears on press or drag — the header and the scene carry the value']]],
      ['Stepped · Phase', [['Stops', '5 — New · Crescent · Half · Gibbous · Full'], ['Track', 'h 1, #E8E6DC at 55 %, hidden — visible only inside the pools of light'], ['Light', 'thumb reach 40 → 150 px as the moon fills'], ['Stops', 'moon glyphs 12 × 12, 6 % in the dark → 100 % when lit'], ['Waypoints', 'star points 2 × 2 midway between stops; twinkle 6 s; 22 % → 100 % and ×1.6 when lit'], ['Thumb', 'a moon 18 × 18 drawn in the current phase']]],
      ['Continuous · Veil', [['Range', '0 – 100 %, step 1'], ['Fill', 'a trail of light, transparent → #E8E6DC 80 %, ending at the thumb'], ['Light', 'reach 120 → 35 px as the veil thickens'], ['Stars', 'a star point every 10 %, fading under the veil'], ['Thumb', 'pearl 14 × 14, blurs up to 1.6 px with the veil']]],
      ['States', [['Hover', 'a lantern (60 px) follows the pointer and reveals the hidden track and stops beneath it'], ['Pressed', 'the thumb blooms a 10 px halo'], ['Drag', 'the pool of light travels with the thumb; names hand over through a 5 px blur; the night follows live']]],
      ['Motion', [['Spring', 'damping 1, response 0.55 (slow, no bounce)'], ['Ambient', 'stars twinkle 6 s · mist drifts 40 s · reflection shimmers 5 s']]],
    ],
  },
]

/* ================= Figma draft thumbnail =================
   the enlarged draft is drawn above the page, so no section clips it */
const DRAFT_VERSION = 'wire-4'
function DraftThumb({ set }) {
  const ref = useRef(null)
  const [box, setBox] = useState(null)
  const [open, setOpen] = useState(false)
  const src = `${import.meta.env.BASE_URL}final/${set.id}.png?v=${DRAFT_VERSION}`
  const show = () => {
    const r = ref.current.querySelector('img').getBoundingClientRect()
    const W = Math.min(680, window.innerWidth - 32), H = W * 504 / 900
    const left = clamp(r.right - W, 16, window.innerWidth - W - 16)
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
        <img className="draft-zoom" src={src} alt="" aria-hidden="true" onTransitionEnd={() => { if (!open) setBox(null) }}
          style={{ left: box.left, top: box.top, width: box.W, transformOrigin: `${box.ox}px ${box.oy}px`, transform: open ? 'none' : `scale(${box.s})`, opacity: open ? 1 : 0 }} />,
        document.body)}
    </>
  )
}

function SetSection({ set }) {
  const [spec, setSpec] = useState(false)
  const { Body } = set
  return (
    <section className={`set s-${set.id}`}>
      <div className="set-head">
        <h2>{set.tone}</h2>
        <div className="head-tools">
          <DraftThumb set={set} />
          <button className="spec-toggle" aria-expanded={spec} onClick={() => setSpec((v) => !v)}>{spec ? 'Hide spec' : 'Spec'}</button>
        </div>
      </div>
      <Body />
      {/* spec sheet: folded away until asked for */}
      <div className={`spec ${spec ? 'open' : ''}`} aria-hidden={!spec}>
        <div className="spec-inner">
          <div className="spec-grid">
            {set.spec.map(([group, rows]) => (
              <div key={group} className="spec-group">
                <h3>{group}</h3>
                <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              </div>
            ))}
          </div>
          <p className="spec-note">px at 1×. All sliders: press anywhere on the track and the thumb jumps there · drag 1:1 · arrows / Page Up / Page Down / Home / End.</p>
        </div>
      </div>
    </section>
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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 520)), rows: Math.ceil(window.innerHeight / 330) + 1 }))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: layout.cols }, (_, c) => (
        <div key={c} className="wall-col">
          {Array.from({ length: layout.rows }, (_, r) => {
            const set = SETS[(c + r * 2) % SETS.length]
            return <div key={r} className={`wall-tile s-${set.id}`}><set.Body auto offset={c * 2 + r} /></div>
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
        <h1>Sliders</h1>
        <p>Week 4 · Advanced Interface</p>
      </header>
      {SETS.map((set) => <SetSection key={set.id} set={set} />)}
    </main>
  )
}
