import { useCallback, useEffect, useRef, useState } from 'react'
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
   - press: instant feedback; a tap on the track springs the thumb there
   - drag: the thumb follows 1:1, soft past the ends; stepped sliders feel detents between stops
   - release: the spring takes over at the finger's velocity; a flick carries a stepped slider on
   - keyboard: arrows / Page Up/Down / Home / End, with the value announced */
function useSlider({ t, onChange, steps = 0, inset = 0, spring = { damping: 1, response: 0.35 } }) {
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
    return ((e.clientX - r.left) / r.width - inset) / (1 - 2 * inset)
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
    g.current = { x0: e.clientX, raw, moved: false, hist: [[raw, e.timeStamp]] }
  }
  const move = (e) => {
    const d = g.current
    if (!d) { setHx(at(e)); return }
    const raw = at(e); d.raw = raw
    if (!d.moved && Math.abs(e.clientX - d.x0) > 3) { d.moved = true; setDragging(true) }
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
    if (!d.moved) { onChange(snap(d.raw)); return } // a tap: the thumb springs to where you pressed
    const [a, b] = [d.hist[0], d.hist[d.hist.length - 1]]
    const v = b[1] > a[1] ? (b[0] - a[0]) / ((b[1] - a[1]) / 1000) : 0
    onChange(n ? snap(d.raw + v * 0.06) : snap(d.raw)) // a flick carries a stepped slider on
    pos.release(clamp(v, -6, 6))
  }
  const key = (e) => {
    const unit = n ? 1 / n : 0.01
    const big = n ? unit : 0.1
    const d = { ArrowRight: unit, ArrowUp: unit, ArrowLeft: -unit, ArrowDown: -unit, PageUp: big, PageDown: -big, Home: -1, End: 1 }[e.key]
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
  const bpm = Math.round(60 + t * 120)
  const stretch = 1 + Math.min(Math.abs(s.vel) * 0.08, 0.5) // the thumb stretches with speed
  return (
    <div className={`nrg-slider ${s.state}`} {...s.bind} aria-label="Tempo" aria-valuemin={60} aria-valuemax={180} aria-valuenow={bpm} aria-valuetext={`${bpm} beats per minute`}>
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
  return (
    <div className="screen nrg-screen">
      <PulseOrb bpm={Math.round(60 + tempo * 120)} level={level} />
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
  const pct = (t * 100).toFixed(1).padStart(5, '0')
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
  return (
    <div className="screen fut-screen">
      <Reactor thrust={thrust} warp={warp} />
      <div className="controls">
        <FutThrust t={thrust} onChange={setThrust} />
        <FutWarp warp={warp} onChange={setWarp} />
      </div>
    </div>
  )
}

/* ================= Luxurious: a gold coin, weighed and polished ================= */
const KARATS = [9, 14, 18, 22, 24]
const GOLD = { 9: '#c7b27f', 14: '#d2b46b', 18: '#dbb158', 22: '#e1ab45', 24: '#e6a434' }
const LUX_SPRING = { damping: 1, response: 0.5 } // weighty and smooth — never bounces

function LuxLustre({ t, onChange }) {
  const s = useSlider({ t, onChange, spring: LUX_SPRING })
  const v = Math.round(t * 100)
  return (
    <div className={`lux-slider ${s.state}`} {...s.bind} aria-label="Lustre" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <div className="sl-head"><span className="sl-label">Lustre</span><span className="sl-value">{v}</span></div>
      <div className="lux-track" ref={s.track}>
        <span className="lux-fill" style={{ width: `${clamp(s.p) * 100}%` }} />
        <span className="lux-thumb" style={{ left: `${s.p * 100}%` }}><i /></span>
        <span className="lux-float" style={{ left: `${s.p * 100}%` }}>{v}</span>
      </div>
    </div>
  )
}

function LuxKarat({ k, onChange }) {
  const s = useSlider({ t: k / 4, onChange: (x) => onChange(Math.round(x * 4)), steps: 5, spring: LUX_SPRING })
  return (
    <div className={`lux-slider ${s.state}`} {...s.bind} aria-label="Karat" aria-valuemin={9} aria-valuemax={24} aria-valuenow={KARATS[k]} aria-valuetext={`${KARATS[k]} karat`}>
      <div className="sl-head"><span className="sl-label">Karat</span><span className="sl-value">{KARATS[k]}<small>K</small></span></div>
      <div className="lux-track" ref={s.track}>
        <span className="lux-fill" style={{ width: `${clamp(s.p) * 100}%` }} />
        {KARATS.map((c, i) => <span key={c} className={`lux-notch ${i <= k ? 'on' : ''}`} style={{ left: `${(i / 4) * 100}%` }} />)}
        <span className="lux-thumb" style={{ left: `${s.p * 100}%` }}><i /></span>
        <span className="lux-float" style={{ left: `${s.p * 100}%` }}>{KARATS[k]} <em>karat</em></span>
      </div>
      <div className="lux-marks" aria-hidden="true">{KARATS.map((c, i) => <span key={c} className={i === k ? 'on' : ''} style={{ left: `${(i / 4) * 100}%` }}>{c}K</span>)}</div>
    </div>
  )
}

function Coin({ karat, lustre }) {
  return (
    <div className="coin-stage" aria-hidden="true">
      <div className="coin" style={{ '--gold': GOLD[karat], '--lustre': lustre }}>
        <span className="coin-sheen" />
        <span className="coin-glint" />
        <span className="coin-mark"><span>{karat}<i>K</i></span></span>
      </div>
    </div>
  )
}

function LuxSet({ auto, offset = 0 }) {
  const [lustre, setLustre] = useState(0.6)
  const [k, setK] = useState(2)
  useAuto(auto, offset, [() => setLustre(Math.random()), () => setK(Math.floor(Math.random() * 5))])
  return (
    <div className="screen lux-screen">
      <Coin karat={KARATS[k]} lustre={lustre} />
      <div className="controls">
        <LuxKarat k={k} onChange={setK} />
        <LuxLustre t={lustre} onChange={setLustre} />
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
      ['States', [['Hover', 'thumb ×1.12, track 12 → 16'], ['Pressed', 'thumb squash 1.25 × 0.8 + 6 px lime glow, bubble pops in'], ['Drag', 'thumb stretches with speed (≤ 1.5×), live value bubble; each lit block pops']]],
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
    id: 'karat', tone: 'Luxurious', Body: LuxSet,
    spec: [
      ['Layout', [['Screen', 'padding 32 / 40, radius 34, #0C0B0A'], ['Columns', 'subject 1fr · controls 340'], ['Slider gap', '44']]],
      ['Type', [['Label', 'Cormorant Garamond italic 400 · 20 / 24'], ['Value', 'Bodoni Moda 400 · 24 / 28'], ['Marks', 'Cormorant Garamond 500 · 13 / 16 · tracking 0.06em'], ['Float', 'Bodoni Moda italic 400 · 26 / 30']]],
      ['Continuous · Lustre', [['Range', '0 – 100, step 1'], ['Track', 'h 1, rgba(216,181,106,.3)'], ['Fill', 'h 1.5, #D8B56A'], ['Thumb', 'bead 18 × 18, radial gold, ring 32 on hover (stroke 1)']]],
      ['Stepped · Karat', [['Stops', '5 — 9K · 14K · 18K · 22K · 24K'], ['Notches', 'diamond 7 × 7, stroke 1, filled when reached'], ['Marks', '14 below track, current in gold']]],
      ['States', [['Hover', 'a fine gold ring settles around the bead (0.5 s)'], ['Pressed', 'bead sinks ×0.9, shadow deepens'], ['Drag', 'value floats above on a hairline leader; strong detents at each karat']]],
      ['Motion', [['Spring', 'damping 1, response 0.5 (weighty, no bounce)']]],
    ],
  },
]

/* ================= Figma draft thumbnail =================
   the enlarged draft is drawn above the page, so no section clips it */
const DRAFT_VERSION = 'wire-1'
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
          <p className="spec-note">px at 1×. All sliders: drag 1:1 · tap the track to jump · arrows / Page Up / Page Down / Home / End.</p>
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
