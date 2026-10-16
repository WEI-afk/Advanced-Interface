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
function useSlider({ t, onChange, steps = 0, inset = 0, vertical = false, project = null, spring = { damping: 1, response: 0.35 } }) {
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
    if (project) return project(e) // a slider along any path: the path says where the pointer falls (0…1)
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
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer already gone — drag still works within the element */ }
    setPressed(true) // feedback on press, not on release
    const raw = at(e)
    g.current = { x0: e.clientX, y0: e.clientY, raw, moved: false, hist: [[raw, e.timeStamp]] }
    pos.hold(draw(raw)) // the thumb lands under the finger the instant you press
    const live = snap(raw)
    if (live !== t) onChange(live)
  }
  const move = (e) => {
    const d = g.current
    setHx(at(e)) // the pointer is tracked while hovering *and* while held, so hover-driven details keep following it
    if (!d) return
    const raw = at(e); d.raw = raw
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 3) { d.moved = true; setDragging(true) }
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

/* ================= Energetic: a drum machine =================
   Sliders don't have to be straight: Tempo is a groove wrapped around the drum's rim (a dial you turn),
   Pattern is a stepped band cradling the drum from below. A 16-step sequencer plays the pattern at the tempo;
   the drum bounces on kicks, shudders on snares and flashes on hats. Sound is optional and off by default. */
const ENERGY_SPRING = { damping: 0.5, response: 0.3 } // quick, with overshoot
const PATTERNS = [
  { name: 'Four', k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  { name: 'Backbeat', k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  { name: 'Shuffle', k: 'x.....x.x.....x.', s: '....x..x....x..x', h: 'x..x..x..x..x..x' },
  { name: 'Break', k: 'x.x.......xx....', s: '....x..x.x..x...', h: 'xxx.xxx.xxx.xxx.' },
  { name: 'Blast', k: 'xxxxxxxxxxxxxxxx', s: 'x.x.x.x.x.x.x.x.', h: 'xxxxxxxxxxxxxxxx' },
]
const ROWS = [['k', 'Kick'], ['s', 'Snare'], ['h', 'Hat']]

// --- sound: three tiny synthesized drums (only after the visitor turns sound on)
let audio = null, noiseBuf = null
function ensureAudio() {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)()
    noiseBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate)
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (audio.state === 'suspended') audio.resume()
}
function hit(kind) {
  if (!audio) return
  const t = audio.currentTime, out = audio.createGain(); out.connect(audio.destination)
  if (kind === 'k') {
    const o = audio.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15)
    out.gain.setValueAtTime(0.9, t); out.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(out); o.start(t); o.stop(t + 0.3)
  } else {
    const n = audio.createBufferSource(); n.buffer = noiseBuf
    const f = audio.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = kind === 's' ? 1200 : 7500
    const dur = kind === 's' ? 0.14 : 0.04
    out.gain.setValueAtTime(kind === 's' ? 0.5 : 0.18, t); out.gain.exponentialRampToValueAtTime(0.001, t + dur)
    n.connect(f).connect(out); n.start(t); n.stop(t + dur + 0.02)
  }
}

// --- Tempo: a 270° groove around the drum rim
const ARC = { r: 136, a0: 135, sweep: 270 }
const arcPt = (t, A = ARC) => { const a = (A.a0 + A.sweep * t) * Math.PI / 180; return [A.r * Math.cos(a), A.r * Math.sin(a)] }
const arcPath = (t, A = ARC, t0 = 0) => {
  const [x0, y0] = arcPt(t0, A), [x1, y1] = arcPt(Math.max(t, t0 + 0.0001), A)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${A.r} ${A.r} 0 ${Math.abs(A.sweep * (t - t0)) > 180 ? 1 : 0} ${A.sweep > 0 ? 1 : 0} ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

const drumXY = (e, svg) => { // pointer relative to the drum's centre (the svg origin)
  const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, sc = r.width / vb.width
  return [e.clientX - (r.left - vb.x * sc), e.clientY - (r.top - vb.y * sc)]
}

function DrumTempo({ t, onChange, svgRef, gid, children }) {
  const project = (e) => { // the pointer's angle around the drum → a position along the groove
    const [x, y] = drumXY(e, svgRef.current)
    const d = ((Math.atan2(y, x) * 180 / Math.PI - ARC.a0) % 360 + 360) % 360
    return d <= ARC.sweep ? d / ARC.sweep : (d > ARC.sweep + (360 - ARC.sweep) / 2 ? 0 : 1)
  }
  const s = useSlider({ t, onChange, project, spring: ENERGY_SPRING })
  const p = clamp(s.p), [kx, ky] = arcPt(p)
  const bpm = Math.round(60 + p * 120)
  const knobSt = s.dragging ? 1 + Math.min(Math.abs(s.vel) * 0.15, 0.4) : 1 // stretch with turning speed
  return (
    <g className={`drum-tempo ${s.state}`} {...s.bind} aria-label="Tempo" aria-valuemin={60} aria-valuemax={180} aria-valuenow={Math.round(60 + t * 120)} aria-valuetext={`${Math.round(60 + t * 120)} beats per minute`}>
      <path d={arcPath(1)} className="groove" />
      <path d={arcPath(p)} className="groove-fill" stroke={`url(#${gid})`} />
      <path d={arcPath(p)} className="groove-flow" />{/* energy streams along the fill, locked to the tempo */}
      {children}
      {s.hx != null && !s.pressed && (() => { const [gx, gy] = arcPt(clamp(s.hx)); return <g className="tempo-ghost" transform={`translate(${gx} ${gy})`}><circle r="11" /><text y="-20">{Math.round(60 + clamp(s.hx) * 120)}</text></g> })()}
      {/* the knob: pressed, it grips (compresses, pink core, halo); dragged, it stretches along the groove's tangent */}
      <g className="tempo-knob" transform={`translate(${kx.toFixed(2)} ${ky.toFixed(2)}) rotate(${(ARC.a0 + ARC.sweep * p + 90).toFixed(2)})`}>
        <circle r="23" className="halo" />
        <g className="knob-body" style={{ transform: `scale(${knobSt.toFixed(3)}, ${(1 / knobSt).toFixed(3)})` }}>
          <circle r="15" className="body" /><circle r="5" className="dot" />
        </g>
      </g>
      <text className="drum-bpm" y="12">{bpm}</text>
      <text className="drum-bpm-u" y="38">BPM</text>
    </g>
  )
}

// --- Pattern: a stepped band cradling the drum from below — Four on the left, Blast on the right
const PARC = { r: 168, a0: 160, sweep: -140 }
function PatternArc({ k, onChange, svgRef, gid }) {
  const project = (e) => { // the pointer's angle under the drum → a stop along the band
    const [x, y] = drumXY(e, svgRef.current)
    const d = ((Math.atan2(y, x) * 180 / Math.PI) % 360 + 360) % 360
    if (d >= 20 && d <= 160) return (160 - d) / 140
    return d > 160 && d < 270 ? 0 : 1
  }
  const s = useSlider({ t: k / 4, onChange: (x) => onChange(Math.round(x * 4)), steps: 5, project, spring: ENERGY_SPRING })
  const p = clamp(s.p), [cx, cy] = arcPt(p, PARC)
  const ang = PARC.a0 + PARC.sweep * p
  const st = s.dragging ? 1 + Math.min(Math.abs(s.vel) * 0.12, 0.5) : 1 // the cap stretches along the band with speed
  const peek = s.hx != null && !s.pressed ? Math.round(clamp(s.hx) * 4) : null
  const [lx, ly] = arcPt(p, { ...PARC, r: PARC.r + 30 })
  const anchor = lx > 70 ? 'start' : lx < -70 ? 'end' : 'middle' // the name leans away from the cap at the ends
  return (
    <g className={`pat-arc ${s.state}`} {...s.bind} aria-label="Pattern" aria-valuemin={0} aria-valuemax={4} aria-valuenow={k} aria-valuetext={PATTERNS[k].name}>
      <path d={arcPath(1, PARC)} className="pat-hit" />
      <path d={arcPath(1, PARC)} className="pat-band" />
      <path d={arcPath(p, PARC)} className="pat-fill" stroke={`url(#${gid})`} />
      <path d={arcPath(p, PARC)} className="pat-flow" />
      {PATTERNS.map((pt, i) => {
        const a = (PARC.a0 + PARC.sweep * i / 4) * Math.PI / 180, r0 = PARC.r - 15, r1 = PARC.r + 15
        return <line key={pt.name} className={`pat-notch ${i <= k ? 'lit' : ''} ${peek === i ? 'peek' : ''}`} x1={r0 * Math.cos(a)} y1={r0 * Math.sin(a)} x2={r1 * Math.cos(a)} y2={r1 * Math.sin(a)} />
      })}
      <g transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${ang.toFixed(2)})`}>
        <g className="pat-cap" style={{ transform: `scale(1, ${st.toFixed(3)})` }}>
          <rect x="-18" y="-7" width="36" height="14" rx="7" className="cap" /><rect x="-10" y="-1.5" width="20" height="3" rx="1.5" className="grip" />
        </g>
      </g>
      <text className="pat-name" x={lx.toFixed(2)} y={(ly + 6).toFixed(2)} textAnchor={anchor}>{PATTERNS[Math.round(p * 4)].name}</text>
    </g>
  )
}

function EnergySet({ auto, offset = 0 }) {
  const [tempo, setTempo] = useState((128 - 60) / 120)
  const [k, setK] = useState(1)
  const [sound, setSound] = useState(false)
  const [step, setStep] = useState(0)
  const drumSvg = useRef(null), head = useRef(null), rim = useRef(null), stage = useRef(null), root = useRef(null)
  const uid = useId().replace(/:/g, '')
  const tempoS = useSpring(tempo, { damping: 1, response: 0.3 }).value
  const live = useRef({}); live.current = { bpm: 60 + tempoS * 120, k, sound }
  useAuto(auto, offset, [() => setTempo(Math.random()), () => setK(Math.floor(Math.random() * 5))])
  useEffect(() => { // the playhead: sixteenth notes at the tempo; each hit moves the drum (and sounds, if on)
    let raf, last = performance.now(), ph = 0, kick = 0, snare = 0, hat = 0
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const { bpm, k, sound } = live.current, P = PATTERNS[k]
      const prev = ph; ph += dt * (bpm / 60) * 4
      if (Math.floor(ph) !== Math.floor(prev)) {
        const st = Math.floor(ph) % 16
        setStep(st)
        if (P.k[st] === 'x') { kick = 1; if (sound) hit('k'); if (!reducedMotion() && stage.current) { const r = document.createElement('span'); r.className = 'drum-ring'; r.addEventListener('animationend', () => r.remove()); stage.current.appendChild(r) } }
        if (P.s[st] === 'x') { snare = 1; if (sound) hit('s') }
        if (P.h[st] === 'x') { hat = 1; if (sound) hit('h') }
      }
      kick *= Math.exp(-dt * 14); snare *= Math.exp(-dt * 18); hat *= Math.exp(-dt * 26)
      const el = root.current // both grooves read these: they pulse on the kick and their energy flows with the tempo
      if (el) { el.style.setProperty('--kick', kick.toFixed(3)); el.style.setProperty('--snare', snare.toFixed(3)); el.style.setProperty('--flow', (-ph * 4).toFixed(2)) }
      if (head.current && !reducedMotion()) head.current.setAttribute('transform', `translate(${(Math.sin(now / 9) * snare * 4).toFixed(2)} 0) scale(${(1 + kick * 0.06).toFixed(4)})`)
      if (rim.current) rim.current.style.opacity = (0.25 + hat * 0.75).toFixed(3)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const P = PATTERNS[k]
  return (
    <div ref={root} className="screen nrg-screen">
      <button className={`nrg-sound ${sound ? 'on' : ''}`} aria-pressed={sound} onClick={() => { if (!sound) ensureAudio(); setSound((v) => !v) }}>{sound ? 'Sound on' : 'Sound off'}</button>
      <div ref={stage} className="drum-stage">
        <svg ref={drumSvg} viewBox="-240 -160 480 380" className="drum">
          <defs>
            <linearGradient id={`ng${uid}`} gradientUnits="userSpaceOnUse" x1="-140" y1="100" x2="140" y2="100"><stop offset="0" stopColor="#d4ff3a" /><stop offset="1" stopColor="#ff2e88" /></linearGradient>
            <linearGradient id={`pg${uid}`} gradientUnits="userSpaceOnUse" x1="-170" y1="0" x2="170" y2="0"><stop offset="0" stopColor="#2ee6ff" /><stop offset="1" stopColor="#d4ff3a" /></linearGradient>
            <radialGradient id={`hd${uid}`} cx="45%" cy="40%"><stop offset="0" stopColor="#ff7ab6" /><stop offset=".6" stopColor="#ff2e88" /><stop offset="1" stopColor="#7a1bff" /></radialGradient>
          </defs>
          <g ref={head} aria-hidden="true">
            <circle r="104" className="drum-shell" />
            {Array.from({ length: 10 }, (_, i) => <rect key={i} x="-5" y="-112" width="10" height="16" rx="3" className="drum-lug" transform={`rotate(${i * 36})`} />)}
            <circle r="92" className="drum-head" fill={`url(#hd${uid})`} />
            <circle r="62" className="drum-ring-mark" />
            <circle ref={rim} r="98" className="drum-hat" />
          </g>
          <DrumTempo t={tempo} onChange={setTempo} svgRef={drumSvg} gid={`ng${uid}`} />
          <PatternArc k={k} onChange={setK} svgRef={drumSvg} gid={`pg${uid}`} />
        </svg>
      </div>
      <div className="controls nrg-controls">
        <div className="sl-head mach-head"><span className="sl-label">Pattern</span></div>
        <div className="seq" aria-label={`${P.name} pattern`}>
          {ROWS.map(([key, label]) => (
            <div key={key} className={`seq-row r-${key}`}>
              <span className="seq-name">{label}</span>
              <span className="seq-cells">{Array.from({ length: 16 }, (_, i) => <i key={i} className={`${P[key][i] === 'x' ? 'on' : ''} ${i === step ? 'now' : ''} ${i % 4 === 0 ? 'beat' : ''}`} />)}</span>
            </div>
          ))}
        </div>
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
        {/* dragging fast leaves strobe frames behind the reticle, spaced by speed */}
        {s.dragging && Math.abs(s.vel) > 0.2 && [1, 2, 3].map((k) => (
          <span key={k} className="fut-ghost" style={{ left: `${clamp(s.p - s.vel * 0.03 * k) * 100}%`, opacity: 0.5 / k }} />
        ))}
        <span className="fut-thumb" style={{ left: `${s.p * 100}%` }}><i /></span>
        <span className="fut-readout" style={{ left: `${s.p * 100}%` }}>THR {pct}</span>
        {/* hover: a crosshair under the pointer reads out the value it would set */}
        {s.hx != null && !s.pressed && <span className="fut-cross" style={{ left: `${clamp(s.hx) * 100}%` }}><em>{(clamp(s.hx) * 100).toFixed(1)}</em></span>}
      </div>
      {/* a graduated ruler: ticks light up behind the thumb and brighten near the pointer */}
      <div className="fut-ruler" aria-hidden="true">
        {Array.from({ length: 21 }, (_, i) => {
          const at = i / 20, near = s.hx == null ? 0 : clamp(1 - Math.abs(at - s.hx) * 8)
          const lean = s.hx == null ? 0 : -Math.sign(s.hx - at) * near * 18 // ticks lean toward the cursor…
          return <span key={i} className={`${i % 5 === 0 ? 'major' : ''} ${at <= s.p + 1e-6 ? 'on' : ''}`}
            style={{ left: `${at * 100}%`, '--near': near, '--grow': `${near * 8}px`, rotate: `${lean}deg`, '--lean': `${lean}deg` }}>{i % 5 === 0 && <em>{i * 5}</em>}</span>
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
        <span className="fut-bracket" style={{ '--p': s.p }} />{/* a four-corner reticle, placed by the cells' exact geometry */}
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
  .filter((st) => !(st.x > 52 && st.y > 16)) // keep the sky clear around the sliders, so only the paths' own stars sit there

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
// long exposure: moving the light leaves a smear behind it, longer the faster it goes; it fades when it stops
function Smear({ s }) {
  const len = s.dragging ? Math.min(Math.abs(s.vel) * 0.12, 0.35) : 0
  const p = clamp(s.p), left = s.vel > 0 ? p - len : p
  return <span className={`mys-smear ${s.vel > 0 ? 'to-right' : 'to-left'}`} style={{ left: `${clamp(left) * 100}%`, width: `${len * 100}%` }} />
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
        <PathStars at={[0, 0.25, 0.5, 0.75, 1]} s={s} reach={reach} />{/* a star beneath each phase */}
        <Smear s={s} />
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
        <Smear s={s} />
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
      ['Layout', [['Screen', 'padding 28 / 32, radius 34, #0D0A14 with a magenta glow behind the drum'], ['Stack', 'drum with both sliders · sequencer below, same width'], ['Drum', 'head r 92 · shell r 104 · 10 lugs 10 × 16'], ['Light', 'no outlines — colour is light: acid lime #D4FF3A, hot pink #FF2E88, electric cyan #2EE6FF']]],
      ['Type', [['Label', 'Unbounded 600 · 12 / 16 · caps · tracking 0.1em'], ['Value', 'Unbounded 800 · 22 / 26'], ['BPM', 'Unbounded 800 · 44 / 44 in the drum'], ['Stops / rows', 'Unbounded 600 · 11 / 14']]],
      ['Continuous · Tempo (around the rim)', [['Range', '60 – 180 BPM, step 1'], ['Path', '270° arc, r 136, from 135° clockwise'], ['Groove', 'stroke 16 #2A2236; fill 16 → 22 on each kick, gradient #D4FF3A → #FF2E88, glow 4 → 14'], ['Flow', 'streaks 3 / 13 along the fill, moving 16 units per beat'], ['Knob', 'r 15, #FFFFFF, pink glow, bounces ×1.18 on the kick; pressed: ×0.86, core r 5 → 7 in #FF2E88, halo r 23; dragged: stretches along the tangent (≤ 1.4×)']]],
      ['Stepped · Pattern (band under the drum)', [['Stops', '5, left → right — Four · Backbeat · Shuffle · Break · Blast'], ['Band', 'arc r 168, 160° → 20° (140°), stroke 18 (22 on hover), #2A2236, round caps'], ['Fill', 'from the left, #2EE6FF → #D4FF3A, streaks flow with the tempo'], ['Notches', '5 radial ticks 30 long; lit up to the current stop, white under the pointer'], ['Cap', '36 × 14, radius 7, #FFFFFF, lime glow, set radially; hover ×1.1 · pressed ×0.9 with a pink grip · stretches along the band with speed'], ['Name', 'Unbounded 800 · 18, rides outside the cap, flips at each notch; the hovered notch turns white']]],
      ['Sequencer', [['Grid', '3 rows × 16 steps, cell 14 × 20, radius 4, gap 3'], ['Rows', 'Kick #FF2E88 · Snare #2EE6FF · Hat #D4FF3A, lit cells glow'], ['Playhead', 'sixteenth notes at the tempo, outlined column']]],
      ['States', [['Idle', 'knobs rest in their grooves; the drum keeps playing'], ['Hover', 'grooves thicken; a ghost knob previews the BPM / the stop under the pointer swells'], ['Pressed', 'the knob jumps to the finger and grips; the groove fill thickens'], ['Drag', 'knobs ride their curves 1:1 (projected onto the path); the beat and pattern change live'], ['Release', 'springs on with overshoot; stepped flicks carry to the next stop']]],
      ['Motion', [['Spring', 'damping 0.5, response 0.3'], ['Hits', 'kick: head ×1.06 + ring · snare: 4 px shudder · hat: rim flash'], ['Sound', 'optional, synthesized; off by default']]],
    ],
  },
  {
    id: 'reactor', tone: 'Futuristic', Body: FutureSet,
    spec: [
      ['Layout', [['Screen', 'padding 28 / 32, radius 34, #05080F + 24 px grid at 4%'], ['Columns', 'subject 1fr · controls 340'], ['Slider gap', '38']]],
      ['Type', [['Label', 'Space Grotesk 500 · 11 / 14 · caps · tracking 0.24em'], ['Value', 'JetBrains Mono 500 · 18 / 22 · tabular'], ['Readout', 'JetBrains Mono 500 · 11 / 14'], ['Ruler', 'JetBrains Mono 400 · 9 / 10']]],
      ['Continuous · Thrust', [['Range', '0 – 100 %, step 1 (0.1 shown)'], ['Track', 'h 2, rgba(62,240,255,.18)'], ['Fill', '#3EF0FF + glow 0 0 8'], ['Thumb', 'diamond 14 × 14, stroke 1.5 #3EF0FF, crosshair h 30'], ['Ruler', '21 ticks every 5 %, major every 25 % (h 10 / 5)']]],
      ['Stepped · Warp', [['Stops', '5 — W1 … W5'], ['Cells', 'h 32, gap 6, chamfer 6, stroke 1'], ['Reticle', 'four corners, arms 7, stroke 1.5, 5 outside the cell (2 when pressed)']]],
      ['States', [['Idle', 'outlined diamond, reticle 5 outside the cell'], ['Hover', 'diamond ×1.15; ticks near the pointer grow (+8) and lean toward it (≤ 18°); a crosshair reads out the value under it'], ['Pressed', 'diamond fills; the reticle closes in on the cell (5 → 2)'], ['Drag', 'fast moves leave three strobe frames behind the reticle, spaced by speed; readout chip; a new cell boots with a flicker'], ['Release', 'settles precisely (damping 0.9) — no overshoot to speak of']]],
      ['Motion', [['Spring', 'damping 0.9, response 0.22 (precise)']]],
    ],
  },
  {
    id: 'moon', tone: 'Mysterious', Body: MysteriousSet,
    spec: [
      ['Layout', [['Screen', 'radius 34; night scene 1fr · controls 320, padding 28 / 36'], ['Moon', 'r 64 (128 Ø); halo r 82 → 112 with Veil'], ['Water', 'lower 34 % of the scene; reflection blurred 3, 35 %']]],
      ['Type', [['Caption', 'Inter 500 · 10 / 12 · caps · tracking 0.3em'], ['Phase name', 'Cormorant Garamond italic 400 · 26 / 30'], ['Veil value', 'Cormorant Garamond 400 · 26 / 30, % at 15'], ['Labels', 'no text appears on press or drag — the header and the scene carry the value']]],
      ['Stepped · Phase', [['Stops', '5 — New · Crescent · Half · Gibbous · Full'], ['Track', 'h 1, #E8E6DC at 55 %, hidden — visible only inside the pools of light'], ['Light', 'thumb reach 40 → 150 px as the moon fills'], ['Stars', 'star points 2 × 2 beneath each of the 5 stops, 24 below the line; twinkle 6 s; 22 % → 100 % and ×1.6 when lit'], ['Thumb', 'a moon 18 × 18 drawn in the current phase']]],
      ['Continuous · Veil', [['Range', '0 – 100 %, step 1'], ['Fill', 'a trail of light, transparent → #E8E6DC 80 %, ending at the thumb'], ['Light', 'reach 120 → 35 px as the veil thickens'], ['Stars', 'a star point every 10 %, 12 below the line, fading under the veil'], ['Thumb', 'pearl 14 × 14, blurs up to 1.6 px with the veil']]],
      ['States', [['Idle', 'only the thumb’s pool of light shows the path'], ['Hover', 'a lantern (60 px) follows the pointer and reveals the hidden track and stops beneath it'], ['Pressed', 'the thumb blooms a 10 px halo'], ['Drag', 'the light leaves a long-exposure smear (≤ 35 % of the track, longer with speed) that fades on release; stops pull into focus as the light reaches them (blur 2.5 → 0)'], ['Release', 'drifts into place slowly (damping 1, 0.55 s), no bounce']]],
      ['Motion', [['Spring', 'damping 1, response 0.55 (slow, no bounce)'], ['Ambient', 'stars twinkle 6 s · mist drifts 40 s · reflection shimmers 5 s']]],
    ],
  },
]

/* ================= Figma draft thumbnail =================
   the enlarged draft is drawn above the page, so no section clips it */
const DRAFT_VERSION = 'wire-9'
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
